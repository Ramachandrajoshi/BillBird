import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Calendar } from 'primereact/calendar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { Toast } from 'primereact/toast';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { generateBillPDF } from '../utils/pdfGenerator';

const UsageBillLedgerPage = () => {
  const { billId } = useParams();
  const navigate = useNavigate();
  const toast = useRef(null);
  const overlayTarget = typeof window !== 'undefined' ? document.body : undefined;

  const {
    bills,
    billTypes,
    partners,
    billEntries,
    addPartner,
    updateBill,
    getLastUsage
  } = useApp();

  const numericBillId = Number(billId);
  const bill = useMemo(() => bills.find((item) => item.id === numericBillId), [bills, numericBillId]);
  const billType = useMemo(() => billTypes.find((type) => type.id === bill?.billTypeId), [billTypes, bill]);

  const historyBills = useMemo(() => {
    if (!bill || !billType) {
      return [];
    }

    return bills
      .filter((item) => item.billTypeId === bill.billTypeId && item.id !== bill.id)
      .sort((a, b) => new Date(b.billDate) - new Date(a.billDate))
      .map((item) => {
        const entries = billEntries.filter((entry) => entry.billId === item.id);
        const totalUsage = entries.reduce((sum, entry) => sum + Math.max(0, (entry.currentUsage || 0) - (entry.lastUsage || 0)), 0);
        return {
          ...item,
          entryCount: entries.length,
          totalUsage,
          oldReadDate: entries.find((entry) => entry.lastReadDate)?.lastReadDate || null,
          newReadDate: entries.find((entry) => entry.currentReadDate)?.currentReadDate || null
        };
      });
  }, [bill, billType, bills, billEntries]);

  const [selectedPartners, setSelectedPartners] = useState([]);
  const [quickPartnerName, setQuickPartnerName] = useState('');
  const [readDates, setReadDates] = useState({
    previousReadDate: null,
    currentReadDate: null
  });
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    if (!bill || !billType || billType.category !== 'usage') {
      return;
    }

    const existingEntries = billEntries.filter((entry) => entry.billId === bill.id);
    const partnerIds = existingEntries.map((entry) => entry.partnerId);

    setSelectedPartners(partnerIds);
    setEntries(existingEntries.map((entry) => ({ ...entry, usageLocked: false })));

    const firstEntry = existingEntries[0];
    setReadDates({
      previousReadDate: firstEntry?.lastReadDate ? new Date(firstEntry.lastReadDate) : null,
      currentReadDate: firstEntry?.currentReadDate ? new Date(firstEntry.currentReadDate) : null
    });
  }, [bill, billType, billEntries]);

  useEffect(() => {
    const hydrateUsageDefaults = async () => {
      if (!bill || !billType || billType.category !== 'usage') {
        return;
      }

      if (selectedPartners.length === 0) {
        setEntries([]);
        return;
      }

      const nextRows = [];
      for (const partnerId of selectedPartners) {
        const existing = entries.find((entry) => entry.partnerId === partnerId);
        if (existing) {
          nextRows.push(existing);
          continue;
        }

        const lastUsage = await getLastUsage(bill.billTypeId, partnerId);
        nextRows.push({
          partnerId,
          billId: bill.id,
          billTypeId: bill.billTypeId,
          lastUsage: Number(lastUsage?.currentUsage || 0),
          currentUsage: Number(lastUsage?.currentUsage || 0),
          splitAmount: 0,
          percentage: 0,
          paid: false,
          usageLocked: Boolean(lastUsage),
          lastReadDate: lastUsage?.currentReadDate || null,
          currentReadDate: null
        });
      }

      const totalUsed = nextRows.reduce((sum, row) => sum + Math.max(0, (row.currentUsage || 0) - (row.lastUsage || 0)), 0);
      const amount = Number(bill.totalAmount || 0);

      const calculatedRows = nextRows.map((row) => {
        const used = Math.max(0, (row.currentUsage || 0) - (row.lastUsage || 0));
        return {
          ...row,
          splitAmount: totalUsed > 0 ? (amount * used) / totalUsed : 0,
          percentage: totalUsed > 0 ? (used / totalUsed) * 100 : 0
        };
      });

      setEntries(calculatedRows);

      const autoReadDate = nextRows.find((row) => row.lastReadDate)?.lastReadDate;
      if (autoReadDate) {
        setReadDates((previous) => ({
          ...previous,
          previousReadDate: previous.previousReadDate || new Date(autoReadDate)
        }));
      }
    };

    hydrateUsageDefaults();
  }, [selectedPartners, bill, billType, getLastUsage]);

  const needsManualPreviousRead = useMemo(
    () => entries.some((entry) => !entry.usageLocked),
    [entries]
  );

  const totals = useMemo(() => {
    const totalUsed = entries.reduce((sum, row) => sum + Math.max(0, (row.currentUsage || 0) - (row.lastUsage || 0)), 0);
    const totalSplit = entries.reduce((sum, row) => sum + Number(row.splitAmount || 0), 0);
    return { totalUsed, totalSplit };
  }, [entries]);

  const updateEntryValue = (partnerId, field, value) => {
    setEntries((previous) => {
      const updatedRows = previous.map((row) => (row.partnerId === partnerId ? { ...row, [field]: value || 0 } : row));
      const totalUsed = updatedRows.reduce((sum, row) => sum + Math.max(0, (row.currentUsage || 0) - (row.lastUsage || 0)), 0);
      const amount = Number(bill?.totalAmount || 0);

      return updatedRows.map((row) => {
        const used = Math.max(0, (row.currentUsage || 0) - (row.lastUsage || 0));
        return {
          ...row,
          splitAmount: totalUsed > 0 ? (amount * used) / totalUsed : 0,
          percentage: totalUsed > 0 ? (used / totalUsed) * 100 : 0
        };
      });
    });
  };

  const handleQuickPartnerAdd = async () => {
    const name = quickPartnerName.trim();
    if (!name) {
      return;
    }

    const existing = partners.find((partner) => partner.name.toLowerCase() === name.toLowerCase());
    const partnerId = existing ? existing.id : await addPartner({ name, email: '', phone: '' });

    setSelectedPartners((previous) => (previous.includes(partnerId) ? previous : [...previous, partnerId]));
    setQuickPartnerName('');
  };

  const handleSaveLedger = async () => {
    if (!bill || !billType) {
      return;
    }

    if (!readDates.currentReadDate) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please provide current reading date.' });
      return;
    }

    if (needsManualPreviousRead && !readDates.previousReadDate) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please provide previous reading date for new partner entries.' });
      return;
    }

    const invalidRow = entries.find((row) => (row.currentUsage || 0) < (row.lastUsage || 0));
    if (invalidRow) {
      const partner = partners.find((item) => item.id === invalidRow.partnerId);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: `Current usage cannot be lower than old usage for ${partner?.name || 'partner'}.`
      });
      return;
    }

    const entriesForSave = entries.map((row) => ({
      ...row,
      billId: bill.id,
      billTypeId: bill.billTypeId,
      lastReadDate: readDates.previousReadDate,
      currentReadDate: readDates.currentReadDate,
      usageAmount: Math.max(0, (row.currentUsage || 0) - (row.lastUsage || 0))
    }));

    const billPayload = {
      billTypeId: bill.billTypeId,
      title: bill.title,
      description: bill.description,
      totalAmount: bill.totalAmount,
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      status: bill.status
    };

    await updateBill(bill.id, billPayload, entriesForSave);
    toast.current.show({ severity: 'success', summary: 'Saved', detail: 'Usage ledger saved successfully.' });
  };

  const getPartnerName = (partnerId) => {
    const partner = partners.find((item) => item.id === partnerId);
    return partner ? partner.name : 'Unknown';
  };

  if (!bill || !billType || billType.category !== 'usage') {
    return (
      <div className="page-shell fade-in">
        <Card className="panel-card">
          <div className="empty-state">
            <i className="pi pi-exclamation-triangle empty-state-icon"></i>
            <h3 className="empty-state-title">Usage Ledger Not Found</h3>
            <p className="empty-state-description">This bill is missing or is not a usage bill type.</p>
            <Button label="Back to Usage Bills" icon="pi pi-arrow-left" onClick={() => navigate('/usage-bills')} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-shell fade-in">
      <Toast ref={toast} />

      <section className="page-hero page-hero--compact">
        <div>
          <span className="page-hero__eyebrow">Usage Workflow</span>
          <h2 className="page-hero__title">Usage Ledger</h2>
          <p className="page-hero__description">
            {bill.title} · Enter partner readings for this cycle. Old readings auto-fill from previous records when available.
          </p>
        </div>
        <div className="page-actions button-group">
          <Button label="Back" icon="pi pi-arrow-left" className="p-button-outlined" onClick={() => navigate('/usage-bills')} />
          <Button label="Export PDF" icon="pi pi-file-pdf" className="p-button-outlined" onClick={() => generateBillPDF(bill, entries, partners, billType, bills)} />
          <Button label="Save Ledger" icon="pi pi-check" onClick={handleSaveLedger} />
        </div>
      </section>

      <Card className="panel-card">
        <div className="grid">
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Bill Amount</label>
              <InputNumber value={Number(bill.totalAmount || 0)} disabled minFractionDigits={0} maxFractionDigits={4} className="w-full" />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Previous Read Date {needsManualPreviousRead ? '*' : '(Auto if available)'}</label>
              <Calendar value={readDates.previousReadDate} onChange={(e) => setReadDates((prev) => ({ ...prev, previousReadDate: e.value }))} dateFormat="dd/mm/yy" showIcon className="w-full" disabled={!needsManualPreviousRead} appendTo={overlayTarget} />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Current Read Date *</label>
              <Calendar value={readDates.currentReadDate} onChange={(e) => setReadDates((prev) => ({ ...prev, currentReadDate: e.value }))} dateFormat="dd/mm/yy" showIcon className="w-full" appendTo={overlayTarget} />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Partners</label>
          <Dropdown
            value={null}
            options={partners
              .filter((partner) => !selectedPartners.includes(partner.id))
              .map((partner) => ({ label: partner.name, value: partner.id }))}
            onChange={(e) => {
              if (!e.value) {
                return;
              }
              setSelectedPartners((previous) => [...previous, e.value]);
            }}
            placeholder="Add existing partner"
            className="w-full"
            appendTo={overlayTarget}
          />
        </div>

        <div className="bills-quick-partner mb-3">
          <InputText
            value={quickPartnerName}
            onChange={(e) => setQuickPartnerName(e.target.value)}
            placeholder="Type partner name and add"
            className="w-full"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickPartnerAdd();
              }
            }}
          />
          <Button type="button" label="Add Partner" icon="pi pi-user-plus" className="p-button-outlined" onClick={handleQuickPartnerAdd} />
        </div>

        <DataTable value={entries} className="p-datatable-sm" responsiveLayout="scroll" emptyMessage="No partners yet. Add partners to start usage entry.">
          <Column field="partnerId" header="Partner" body={(rowData) => getPartnerName(rowData.partnerId)} />
          <Column
            field="lastUsage"
            header="Old Reading"
            body={(rowData) => (
              <InputNumber
                value={rowData.lastUsage}
                onValueChange={(e) => updateEntryValue(rowData.partnerId, 'lastUsage', e.value)}
                disabled={rowData.usageLocked}
                minFractionDigits={0}
                maxFractionDigits={4}
                className="w-full"
              />
            )}
          />
          <Column
            field="currentUsage"
            header="Current Reading"
            body={(rowData) => (
              <InputNumber
                value={rowData.currentUsage}
                onValueChange={(e) => updateEntryValue(rowData.partnerId, 'currentUsage', e.value)}
                minFractionDigits={0}
                maxFractionDigits={4}
                className="w-full"
              />
            )}
          />
          <Column
            header="Used"
            body={(rowData) => Math.max(0, (rowData.currentUsage || 0) - (rowData.lastUsage || 0)).toFixed(4)}
          />
          <Column
            header="% Used"
            body={(rowData) => Number(rowData.percentage || 0).toFixed(6)}
          />
          <Column
            header="Split Amount"
            body={(rowData) => Number(rowData.splitAmount || 0).toFixed(4)}
          />
        </DataTable>

        <div className="grid mt-3">
          <div className="col-12 md:col-6">
            <Card className="panel-card h-full">
              <h4 className="m-0 mb-2">Cycle Totals</h4>
              <p className="m-0">Total Used: {totals.totalUsed.toFixed(4)}</p>
              <p className="m-0">Total Split: {totals.totalSplit.toFixed(4)}</p>
              <p className="m-0">Bill Amount: {Number(bill.totalAmount || 0).toFixed(4)}</p>
            </Card>
          </div>
          <div className="col-12 md:col-6">
            <Card className="panel-card h-full">
              <h4 className="m-0 mb-2">Split Match</h4>
              <Tag
                value={Math.abs(totals.totalSplit - Number(bill.totalAmount || 0)) < 0.0001 ? 'Matched' : 'Recalculate Needed'}
                severity={Math.abs(totals.totalSplit - Number(bill.totalAmount || 0)) < 0.0001 ? 'success' : 'warning'}
              />
            </Card>
          </div>
        </div>
      </Card>

      <Card className="panel-card">
        <div className="card-header">
          <h3 className="card-title">Previous Entries</h3>
        </div>
        <DataTable value={historyBills} className="p-datatable-sm" responsiveLayout="scroll" emptyMessage="No previous usage bills for this type.">
          <Column field="title" header="Bill" />
          <Column field="billDate" header="Bill Date" body={(rowData) => format(new Date(rowData.billDate), 'dd MMM yyyy')} />
          <Column field="oldReadDate" header="Old Read Date" body={(rowData) => rowData.oldReadDate ? format(new Date(rowData.oldReadDate), 'dd MMM yyyy') : '-'} />
          <Column field="newReadDate" header="New Read Date" body={(rowData) => rowData.newReadDate ? format(new Date(rowData.newReadDate), 'dd MMM yyyy') : '-'} />
          <Column field="entryCount" header="Partners" />
          <Column field="totalUsage" header="Total Used" body={(rowData) => Number(rowData.totalUsage || 0).toFixed(4)} />
          <Column field="totalAmount" header="Bill Amount" body={(rowData) => Number(rowData.totalAmount || 0).toFixed(4)} />
        </DataTable>
      </Card>
    </div>
  );
};

export default UsageBillLedgerPage;
