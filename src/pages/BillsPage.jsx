import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useApp } from '../context/AppContext';
import { format, isSameMonth } from 'date-fns';
import { generateBillPDF, generateAllBillsPDF } from '../utils/pdfGenerator';

const recalculateSplitAmounts = (entries, billType, totalAmountValue) => {
  if (!billType || entries.length === 0) {
    return entries;
  }

  const totalAmount = totalAmountValue || 0;

  switch (billType.splitType) {
    case 'equal': {
      const equalShare = entries.length > 0 ? totalAmount / entries.length : 0;
      return entries.map((entry) => ({
        ...entry,
        splitAmount: equalShare
      }));
    }

    case 'percentage': {
      const totalPercentage = entries.reduce((sum, entry) => sum + (entry.percentage || 0), 0);
      return entries.map((entry) => ({
        ...entry,
        splitAmount: totalPercentage > 0
          ? (totalAmount * (entry.percentage || 0)) / totalPercentage
          : 0
      }));
    }

    case 'usage': {
      const withUsage = entries.map((entry) => {
        const usageAmount = Math.max(0, (entry.currentUsage || 0) - (entry.lastUsage || 0));
        return {
          ...entry,
          usageAmount
        };
      });

      const totalUsage = withUsage.reduce((sum, entry) => sum + (entry.usageAmount || 0), 0);
      return withUsage.map((entry) => ({
        ...entry,
        splitAmount: totalUsage > 0
          ? (totalAmount * (entry.usageAmount || 0)) / totalUsage
          : 0
      }));
    }

    case 'ratio': {
      const totalRatio = entries.reduce((sum, entry) => sum + (entry.ratio || 1), 0);
      return entries.map((entry) => ({
        ...entry,
        splitAmount: totalRatio > 0
          ? (totalAmount * (entry.ratio || 1)) / totalRatio
          : 0
      }));
    }

    default:
      return entries;
  }
};

const BillsPage = () => {
  const { 
    bills, 
    billTypes, 
    partners, 
    billEntries,
    addPartner,
    addBill, 
    updateBill, 
    deleteBill,
    getBillEntries,
    getLastUsage
  } = useApp();
  
  const [dialogVisible, setDialogVisible] = useState(false);
  const [detailsDialogVisible, setDetailsDialogVisible] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedBillEntries, setSelectedBillEntries] = useState([]);
  const [formData, setFormData] = useState({
    billTypeId: null,
    title: '',
    description: '',
    totalAmount: 0,
    billDate: new Date(),
    dueDate: null,
    status: 'pending',
    selectedPartners: []
  });
  const [partnerEntries, setPartnerEntries] = useState([]);
  const [isCompactEntryView, setIsCompactEntryView] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < 768;
  });
  const [isMobileBillsView, setIsMobileBillsView] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < 992;
  });
  const [usageReadDates, setUsageReadDates] = useState({
    previousReadDate: null,
    currentReadDate: null
  });
  const [exportMonth, setExportMonth] = useState(new Date());
  const [quickPartnerName, setQuickPartnerName] = useState('');
  const toast = useRef(null);
  const overlayTarget = typeof window !== 'undefined' ? document.body : undefined;

  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' }
  ];

  // Get selected bill type
  const selectedBillType = useMemo(() => {
    return billTypes.find(t => t.id === formData.billTypeId);
  }, [billTypes, formData.billTypeId]);

  const monthlyBills = useMemo(() => {
    return bills.filter((bill) => isSameMonth(new Date(bill.billDate), exportMonth));
  }, [bills, exportMonth]);

  const latestUsageTemplate = useMemo(() => {
    if (!selectedBillType || selectedBillType.category !== 'usage') {
      return null;
    }

    const latestBill = [...bills]
      .filter((bill) => bill.billTypeId === selectedBillType.id)
      .sort((a, b) => new Date(b.billDate) - new Date(a.billDate))[0];

    if (!latestBill) {
      return null;
    }

    const entries = billEntries.filter((entry) => entry.billId === latestBill.id);
    if (entries.length === 0) {
      return null;
    }

    return {
      bill: latestBill,
      entries
    };
  }, [selectedBillType, bills, billEntries]);

  const billsForDisplay = useMemo(() => {
    return [...bills].sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
  }, [bills]);

  useEffect(() => {
    const syncResponsiveLayouts = () => {
      setIsCompactEntryView(window.innerWidth < 768);
      setIsMobileBillsView(window.innerWidth < 992);
    };

    window.addEventListener('resize', syncResponsiveLayouts);
    return () => window.removeEventListener('resize', syncResponsiveLayouts);
  }, []);

  // Initialize partner entries when partners are selected
  useEffect(() => {
    if (!selectedBillType) {
      return;
    }

    if (formData.selectedPartners.length === 0) {
      setPartnerEntries([]);
      return;
    }

    setPartnerEntries((previousEntries) => {
      const newEntries = formData.selectedPartners.map((partnerId) => {
        const existingEntry = previousEntries.find((entry) => entry.partnerId === partnerId);
        if (existingEntry) {
          return existingEntry;
        }

        return {
          partnerId,
          lastUsage: 0,
          currentUsage: 0,
          lastReadDate: null,
          currentReadDate: null,
          usageAmount: 0,
          splitAmount: 0,
          percentage: 0,
          ratio: 1,
          paid: false,
          paidDate: null,
          usageLocked: false
        };
      });

      return recalculateSplitAmounts(newEntries, selectedBillType, formData.totalAmount);
    });
  }, [formData.selectedPartners, selectedBillType, formData.totalAmount]);

  // Auto-populate last usage for usage-based bills
  useEffect(() => {
    const populateLastUsage = async () => {
      if (
        selectedBillType?.category !== 'usage' ||
        formData.selectedPartners.length === 0 ||
        editingBill
      ) {
        return;
      }

      const lastUsageByPartner = new Map();
      await Promise.all(
        formData.selectedPartners.map(async (partnerId) => {
          const lastUsageData = await getLastUsage(formData.billTypeId, partnerId);
          lastUsageByPartner.set(partnerId, lastUsageData);
        })
      );

      setPartnerEntries((previousEntries) => {
        const updatedEntries = previousEntries.map((entry) => {
          const lastUsageData = lastUsageByPartner.get(entry.partnerId);
          if (lastUsageData) {
            return {
              ...entry,
              lastUsage: lastUsageData.currentUsage || 0,
              lastReadDate: lastUsageData.currentReadDate || null,
              usageLocked: true
            };
          }

          return {
            ...entry,
            usageLocked: false
          };
        });

        return recalculateSplitAmounts(updatedEntries, selectedBillType, formData.totalAmount);
      });

      const firstHistoricalReadDate = [...lastUsageByPartner.values()].find((value) => value?.currentReadDate)?.currentReadDate;
      if (firstHistoricalReadDate) {
        setUsageReadDates((previousDates) => ({
          ...previousDates,
          previousReadDate: previousDates.previousReadDate || new Date(firstHistoricalReadDate)
        }));
      }
    };

    populateLastUsage();
  }, [selectedBillType, formData.selectedPartners, formData.billTypeId, editingBill, getLastUsage, formData.totalAmount]);

  // Calculate split amounts
  useEffect(() => {
    setPartnerEntries((previousEntries) =>
      recalculateSplitAmounts(previousEntries, selectedBillType, formData.totalAmount)
    );
  }, [formData.totalAmount, selectedBillType]);

  const openDialog = (bill = null) => {
    if (bill) {
      setEditingBill(bill);
      const entries = billEntries.filter(e => e.billId === bill.id);
      const firstEntry = entries[0];
      setFormData({
        billTypeId: bill.billTypeId,
        title: bill.title,
        description: bill.description || '',
        totalAmount: bill.totalAmount,
        billDate: new Date(bill.billDate),
        dueDate: bill.dueDate ? new Date(bill.dueDate) : null,
        status: bill.status,
        selectedPartners: entries.map(e => e.partnerId)
      });
      setUsageReadDates({
        previousReadDate: firstEntry?.lastReadDate ? new Date(firstEntry.lastReadDate) : null,
        currentReadDate: firstEntry?.currentReadDate ? new Date(firstEntry.currentReadDate) : null
      });
      setPartnerEntries(entries.map((entry) => ({
        ...entry,
        usageLocked: false
      })));
    } else {
      setEditingBill(null);
      setFormData({
        billTypeId: null,
        title: '',
        description: '',
        totalAmount: 0,
        billDate: new Date(),
        dueDate: null,
        status: 'pending',
        selectedPartners: []
      });
      setUsageReadDates({
        previousReadDate: null,
        currentReadDate: null
      });
      setPartnerEntries([]);
      setQuickPartnerName('');
    }
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setEditingBill(null);
    setFormData({
      billTypeId: null,
      title: '',
      description: '',
      totalAmount: 0,
      billDate: new Date(),
      dueDate: null,
      status: 'pending',
      selectedPartners: []
    });
    setUsageReadDates({
      previousReadDate: null,
      currentReadDate: null
    });
    setPartnerEntries([]);
    setQuickPartnerName('');
  };

  const handleQuickPartnerAdd = async () => {
    const name = quickPartnerName.trim();
    if (!name) {
      return;
    }

    const existingPartner = partners.find(
      (partner) => partner.name.toLowerCase() === name.toLowerCase()
    );

    try {
      const partnerId = existingPartner ? existingPartner.id : await addPartner({ name, email: '', phone: '' });

      setFormData((previous) => ({
        ...previous,
        selectedPartners: previous.selectedPartners.includes(partnerId)
          ? previous.selectedPartners
          : [...previous.selectedPartners, partnerId]
      }));

      setQuickPartnerName('');
    } catch (error) {
      console.error('Error adding partner from quick action:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.billTypeId) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a bill type'
      });
      return;
    }

    if (!formData.title.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Please enter a bill title'
      });
      return;
    }

    if (formData.selectedPartners.length === 0) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select at least one partner'
      });
      return;
    }

    if (selectedBillType?.category === 'usage') {
      const invalidUsage = partnerEntries.find((entry) => (entry.currentUsage || 0) < (entry.lastUsage || 0));
      if (invalidUsage) {
        toast.current.show({
          severity: 'error',
          summary: 'Invalid Usage',
          detail: `Current usage cannot be less than previous usage for ${getPartnerName(invalidUsage.partnerId)}`
        });
        return;
      }

      if (!usageReadDates.previousReadDate || !usageReadDates.currentReadDate) {
        toast.current.show({
          severity: 'error',
          summary: 'Read Dates Required',
          detail: 'Please provide previous and current read dates once for all partners.'
        });
        return;
      }
    }

    try {
      const billData = {
        billTypeId: formData.billTypeId,
        title: formData.title,
        description: formData.description,
        totalAmount: formData.totalAmount,
        billDate: formData.billDate,
        dueDate: formData.dueDate,
        status: formData.status
      };

      const entriesForSave = selectedBillType?.category === 'usage'
        ? partnerEntries.map((entry) => ({
          ...entry,
          lastReadDate: usageReadDates.previousReadDate,
          currentReadDate: usageReadDates.currentReadDate
        }))
        : partnerEntries;

      if (editingBill) {
        await updateBill(editingBill.id, billData, entriesForSave);
      } else {
        await addBill(billData, entriesForSave);
      }
      closeDialog();
    } catch (error) {
      console.error('Error saving bill:', error);
    }
  };

  const handleDelete = (bill) => {
    confirmDialog({
      message: `Are you sure you want to delete "${bill.title}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deleteBill(bill.id);
        } catch (error) {
          console.error('Error deleting bill:', error);
        }
      }
    });
  };

  const viewBillDetails = async (bill) => {
    setSelectedBill(bill);
    const entries = await getBillEntries(bill.id);
    setSelectedBillEntries(entries);
    setDetailsDialogVisible(true);
  };

  const handleExportPDF = (bill) => {
    const entries = billEntries.filter(e => e.billId === bill.id);
    const billType = billTypes.find(t => t.id === bill.billTypeId);
    generateBillPDF(bill, entries, partners, billType);
  };

  const handleExportAllPDF = () => {
    if (bills.length === 0) return;
    generateAllBillsPDF(bills, billEntries, partners, billTypes);
  };

  const handleExportMonthlyPDF = () => {
    if (monthlyBills.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary: 'No Bills',
        detail: `No bills found for ${format(exportMonth, 'MMMM yyyy')}`
      });
      return;
    }

    generateAllBillsPDF(monthlyBills, billEntries, partners, billTypes, {
      reportTitle: `BillBird - ${format(exportMonth, 'MMMM yyyy')} Bills Report`,
      reportSubTitle: `Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')} | Month: ${format(exportMonth, 'MMMM yyyy')}`,
      fileName: `billbird_report_${format(exportMonth, 'yyyy-MM')}.pdf`
    });
  };

  const applyLastMonthTemplate = () => {
    if (!latestUsageTemplate) {
      return;
    }

    const { bill, entries } = latestUsageTemplate;
    const selectedPartners = entries.map((entry) => entry.partnerId);

    setFormData((previous) => ({
      ...previous,
      title: previous.title || `${selectedBillType.name} - ${format(new Date(), 'MMM yyyy')}`,
      description: bill.description || previous.description,
      totalAmount: previous.totalAmount || bill.totalAmount || 0,
      selectedPartners
    }));

    const templateEntries = entries.map((entry) => ({
      partnerId: entry.partnerId,
      lastUsage: entry.currentUsage || 0,
      currentUsage: entry.currentUsage || 0,
      lastReadDate: null,
      currentReadDate: null,
      usageAmount: 0,
      splitAmount: 0,
      percentage: entry.percentage || 0,
      ratio: entry.ratio || 1,
      paid: false,
      paidDate: null,
      usageLocked: true
    }));

    const sharedPreviousReadDate = entries.find((entry) => entry.currentReadDate)?.currentReadDate || bill.billDate;
    setUsageReadDates({
      previousReadDate: sharedPreviousReadDate ? new Date(sharedPreviousReadDate) : null,
      currentReadDate: new Date()
    });

    setPartnerEntries(
      recalculateSplitAmounts(templateEntries, selectedBillType, formData.totalAmount || bill.totalAmount || 0)
    );

    toast.current.show({
      severity: 'success',
      summary: 'Template Loaded',
      detail: 'Last month usage setup applied. Update current usage and create bill.'
    });
  };

  const handleBillTypeChange = (billTypeId) => {
    const chosenType = billTypes.find((type) => type.id === billTypeId);

    setFormData((previous) => ({
      ...previous,
      billTypeId,
      title: previous.title || (chosenType ? `${chosenType.name} - ${format(new Date(), 'MMM yyyy')}` : previous.title)
    }));
  };

  const updatePartnerEntry = (partnerId, field, value) => {
    setPartnerEntries((previousEntries) => {
      const updatedEntries = previousEntries.map((entry) => (
        entry.partnerId === partnerId
          ? { ...entry, [field]: value }
          : entry
      ));

      return recalculateSplitAmounts(updatedEntries, selectedBillType, formData.totalAmount);
    });
  };

  const getBillTypeName = (billTypeId) => {
    const type = billTypes.find(t => t.id === billTypeId);
    return type ? type.name : 'Unknown';
  };

  const getPartnerName = (partnerId) => {
    const partner = partners.find(p => p.id === partnerId);
    return partner ? partner.name : 'Unknown';
  };

  const getStatusSeverity = (status) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'danger';
      default:
        return 'info';
    }
  };

  return (
    <div className="page-shell fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <section className="page-hero page-hero--compact">
        <div>
          <span className="page-hero__eyebrow">Operations</span>
          <h2 className="page-hero__title">Bills</h2>
          <p className="page-hero__description">
            Manage active bills, open details quickly, and keep table actions usable on smaller screens.
          </p>
        </div>
        <div className="page-actions bills-export-toolbar">
          <div className="bills-export-toolbar__month">
            <label className="form-label">Export Month</label>
            <Calendar
              value={exportMonth}
              onChange={(e) => setExportMonth(e.value || new Date())}
              view="month"
              dateFormat="mm/yy"
              showIcon
              className="w-full"
              appendTo={overlayTarget}
            />
          </div>
          <Button
            label="Export Selected Month"
            icon="pi pi-calendar"
            className="p-button-outlined"
            onClick={handleExportMonthlyPDF}
          />
          <Button
            label="Export All Months"
            icon="pi pi-file-pdf"
            className="p-button-outlined"
            onClick={handleExportAllPDF}
            disabled={bills.length === 0}
          />
          <Button
            label="Add Bill"
            icon="pi pi-plus"
            onClick={() => openDialog()}
          />
        </div>
      </section>

      {bills.length > 0 ? (
        <Card className="panel-card bills-panel-card">
          {isMobileBillsView ? (
            <div className="bills-mobile-list">
              {billsForDisplay.map((bill) => (
                <article key={bill.id} className="bills-mobile-card">
                  <div className="bills-mobile-card__header">
                    <div>
                      <h3 className="bills-mobile-card__title">{bill.title}</h3>
                      <p className="bills-mobile-card__subtitle">{getBillTypeName(bill.billTypeId)}</p>
                    </div>
                    <Tag
                      value={bill.status}
                      severity={getStatusSeverity(bill.status)}
                    />
                  </div>

                  <div className="bills-mobile-card__meta">
                    <span>Amount</span>
                    <strong>₹{bill.totalAmount?.toFixed(2)}</strong>
                  </div>
                  <div className="bills-mobile-card__meta">
                    <span>Date</span>
                    <strong>{format(new Date(bill.billDate), 'dd MMM yyyy')}</strong>
                  </div>

                  <div className="bills-mobile-card__actions">
                    <Button
                      label="View"
                      icon="pi pi-eye"
                      className="p-button-text p-button-sm"
                      onClick={() => viewBillDetails(bill)}
                    />
                    <Button
                      label="Edit"
                      icon="pi pi-pencil"
                      className="p-button-text p-button-sm"
                      onClick={() => openDialog(bill)}
                    />
                    <Button
                      label="PDF"
                      icon="pi pi-file-pdf"
                      className="p-button-text p-button-sm"
                      onClick={() => handleExportPDF(bill)}
                    />
                    <Button
                      label="Delete"
                      icon="pi pi-trash"
                      className="p-button-text p-button-danger p-button-sm"
                      onClick={() => handleDelete(bill)}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <DataTable
              value={billsForDisplay}
              paginator
              rows={10}
              rowsPerPageOptions={[5, 10, 25]}
              className="p-datatable-sm bills-table"
              responsiveLayout="scroll"
              emptyMessage="No bills found"
            >
              <Column field="title" header="Title" sortable />
              <Column 
                field="billTypeId" 
                header="Type" 
                sortable
                body={(rowData) => getBillTypeName(rowData.billTypeId)}
              />
              <Column 
                field="totalAmount" 
                header="Amount" 
                sortable
                body={(rowData) => `₹${rowData.totalAmount?.toFixed(2)}`}
              />
              <Column 
                field="billDate" 
                header="Date" 
                sortable
                body={(rowData) => format(new Date(rowData.billDate), 'dd MMM yyyy')}
              />
              <Column 
                field="status" 
                header="Status" 
                sortable
                body={(rowData) => (
                  <Tag 
                    value={rowData.status} 
                    severity={getStatusSeverity(rowData.status)}
                  />
                )}
              />
              <Column
                header="Actions"
                body={(rowData) => (
                  <div className="table-actions">
                    <Button
                      icon="pi pi-eye"
                      className="p-button-text p-button-rounded p-button-sm"
                      onClick={() => viewBillDetails(rowData)}
                      tooltip="View Details"
                    />
                    <Button
                      icon="pi pi-pencil"
                      className="p-button-text p-button-rounded p-button-sm"
                      onClick={() => openDialog(rowData)}
                      tooltip="Edit"
                    />
                    <Button
                      icon="pi pi-file-pdf"
                      className="p-button-text p-button-rounded p-button-sm"
                      onClick={() => handleExportPDF(rowData)}
                      tooltip="Export PDF"
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-text p-button-rounded p-button-sm p-button-danger"
                      onClick={() => handleDelete(rowData)}
                      tooltip="Delete"
                    />
                  </div>
                )}
              />
            </DataTable>
          )}
        </Card>
      ) : (
        <Card className="panel-card">
          <div className="empty-state">
            <i className="pi pi-file empty-state-icon"></i>
            <h3 className="empty-state-title">No Bills</h3>
            <p className="empty-state-description">
              Create your first bill to start tracking expenses
            </p>
            <Button
              label="Add Bill"
              icon="pi pi-plus"
              onClick={() => openDialog()}
            />
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        header={editingBill ? 'Edit Bill' : 'Add Bill'}
        visible={dialogVisible}
        style={{ width: 'min(96vw, 700px)' }}
        breakpoints={{ '960px': '96vw', '640px': '100vw' }}
        className="bills-dialog"
        onHide={closeDialog}
        footer={
          <div className="dialog-actions">
            <Button
              label="Cancel"
              icon="pi pi-times"
              className="p-button-text"
              onClick={closeDialog}
            />
            <Button
              label={editingBill ? 'Update' : 'Create'}
              icon="pi pi-check"
              onClick={handleSubmit}
            />
          </div>
        }
      >
        <div className="grid">
          <div className="col-12 md:col-6">
            <div className="form-group">
              <label className="form-label">Bill Type *</label>
              <Dropdown
                value={formData.billTypeId}
                options={billTypes.map(t => ({ label: t.name, value: t.id }))}
                onChange={(e) => handleBillTypeChange(e.value)}
                placeholder="Select bill type"
                className="w-full"
                appendTo={overlayTarget}
              />
            </div>
          </div>
          <div className="col-12 md:col-6">
            <div className="form-group">
              <label className="form-label">Status</label>
              <Dropdown
                value={formData.status}
                options={statusOptions}
                onChange={(e) => setFormData({ ...formData, status: e.value })}
                className="w-full"
                appendTo={overlayTarget}
              />
            </div>
          </div>
          <div className="col-12">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <InputText
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter bill title"
                className="w-full"
              />
            </div>
          </div>
          <div className="col-12">
            <div className="form-group">
              <label className="form-label">Description</label>
              <InputTextarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter description"
                rows={2}
                className="w-full"
              />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Total Amount *</label>
              <InputNumber
                value={formData.totalAmount}
                onValueChange={(e) => setFormData({ ...formData, totalAmount: e.value })}
                mode="currency"
                currency="INR"
                locale="en-IN"
                className="w-full"
              />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Bill Date *</label>
              <Calendar
                value={formData.billDate}
                onChange={(e) => setFormData({ ...formData, billDate: e.value })}
                dateFormat="dd/mm/yy"
                showIcon
                className="w-full"
                appendTo={overlayTarget}
              />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <Calendar
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.value })}
                dateFormat="dd/mm/yy"
                showIcon
                className="w-full"
                appendTo={overlayTarget}
              />
            </div>
          </div>
          <div className="col-12">
            <div className="form-group">
              <label className="form-label">Select Partners *</label>
              <MultiSelect
                value={formData.selectedPartners}
                options={partners.map(p => ({ label: p.name, value: p.id }))}
                onChange={(e) => setFormData({ ...formData, selectedPartners: e.value })}
                placeholder="Select partners"
                className="w-full"
                display="chip"
                appendTo={overlayTarget}
              />
            </div>
            <div className="bills-quick-partner">
              <InputText
                value={quickPartnerName}
                onChange={(e) => setQuickPartnerName(e.target.value)}
                placeholder="Type partner name and add instantly"
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickPartnerAdd();
                  }
                }}
              />
              <Button
                type="button"
                label="Add Partner"
                icon="pi pi-user-plus"
                className="p-button-outlined"
                onClick={handleQuickPartnerAdd}
              />
            </div>
          </div>

          {selectedBillType?.category === 'usage' && (
            <>
              <div className="col-12 md:col-6">
                <div className="form-group">
                  <label className="form-label">Previous Read Date *</label>
                  <Calendar
                    value={usageReadDates.previousReadDate}
                    onChange={(e) => setUsageReadDates((previous) => ({ ...previous, previousReadDate: e.value }))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                    appendTo={overlayTarget}
                  />
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="form-group">
                  <label className="form-label">Current Read Date *</label>
                  <Calendar
                    value={usageReadDates.currentReadDate}
                    onChange={(e) => setUsageReadDates((previous) => ({ ...previous, currentReadDate: e.value }))}
                    dateFormat="dd/mm/yy"
                    showIcon
                    className="w-full"
                    appendTo={overlayTarget}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {!editingBill && selectedBillType?.category === 'usage' && latestUsageTemplate && (
          <div className="bills-template-quick">
            <p>
              Fast monthly entry available: load partners and previous readings from
              {' '}
              {format(new Date(latestUsageTemplate.bill.billDate), 'MMMM yyyy')}.
            </p>
            <Button
              label="Load Last Month Setup"
              icon="pi pi-history"
              className="p-button-sm"
              onClick={applyLastMonthTemplate}
            />
          </div>
        )}

        {/* Partner Entries */}
        {formData.selectedPartners.length > 0 && selectedBillType && (
          <div className="mt-4">
            <div className="bills-partner-header mb-3">
              <h4>Partner Split Details</h4>
            </div>
            {isCompactEntryView ? (
              <div className="usage-entry-cards">
                {partnerEntries.map((entry) => (
                  <div key={entry.partnerId} className="usage-entry-card">
                    <div className="usage-entry-card__header">
                      <span className="usage-entry-card__name">{getPartnerName(entry.partnerId)}</span>
                      <span className="usage-entry-card__amount">₹{entry.splitAmount?.toFixed(2)}</span>
                    </div>

                    {selectedBillType.category === 'usage' && (
                      <>
                        <div className="usage-entry-grid">
                          <div className="usage-entry-field">
                            <label className="form-label">Previous Usage</label>
                            <InputNumber
                              value={entry.lastUsage}
                              onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'lastUsage', e.value)}
                              className="w-full"
                              disabled={entry.usageLocked}
                            />
                          </div>

                          <div className="usage-entry-field">
                            <label className="form-label">Current Usage</label>
                            <InputNumber
                              value={entry.currentUsage}
                              onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'currentUsage', e.value)}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="usage-entry-card__meta">
                          <span className="text-color-secondary">Usage</span>
                          <strong>{Math.max(0, (entry.currentUsage || 0) - (entry.lastUsage || 0))}</strong>
                        </div>
                      </>
                    )}

                    {selectedBillType.splitType === 'percentage' && (
                      <div className="usage-entry-field">
                        <label className="form-label">Percentage</label>
                        <InputNumber
                          value={entry.percentage}
                          onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'percentage', e.value)}
                          suffix="%"
                          className="w-full"
                        />
                      </div>
                    )}

                    {selectedBillType.splitType === 'ratio' && (
                      <div className="usage-entry-field">
                        <label className="form-label">Ratio</label>
                        <InputNumber
                          value={entry.ratio}
                          onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'ratio', e.value)}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <DataTable
                value={partnerEntries}
                className="p-datatable-sm"
                responsiveLayout="scroll"
              >
                <Column
                  field="partnerId"
                  header="Partner"
                  body={(rowData) => <span className="font-medium">{getPartnerName(rowData.partnerId)}</span>}
                />

                {selectedBillType.category === 'usage' && (
                  <Column
                    field="lastUsage"
                    header="Last Usage"
                    body={(rowData) => (
                      <InputNumber
                        value={rowData.lastUsage}
                        onValueChange={(e) => updatePartnerEntry(rowData.partnerId, 'lastUsage', e.value)}
                        className="w-full"
                        disabled={rowData.usageLocked}
                      />
                    )}
                  />
                )}

                {selectedBillType.category === 'usage' && (
                  <Column
                    field="currentUsage"
                    header="Current Usage"
                    body={(rowData) => (
                      <InputNumber
                        value={rowData.currentUsage}
                        onValueChange={(e) => updatePartnerEntry(rowData.partnerId, 'currentUsage', e.value)}
                        className="w-full"
                      />
                    )}
                  />
                )}

                {selectedBillType.category === 'usage' && (
                  <Column
                    header="Usage"
                    body={(rowData) => (
                      <span className="font-medium">
                        {Math.max(0, (rowData.currentUsage || 0) - (rowData.lastUsage || 0))}
                      </span>
                    )}
                  />
                )}

                {selectedBillType.splitType === 'percentage' && (
                  <Column
                    field="percentage"
                    header="Percentage"
                    body={(rowData) => (
                      <InputNumber
                        value={rowData.percentage}
                        onValueChange={(e) => updatePartnerEntry(rowData.partnerId, 'percentage', e.value)}
                        suffix="%"
                        className="w-full"
                      />
                    )}
                  />
                )}

                {selectedBillType.splitType === 'ratio' && (
                  <Column
                    field="ratio"
                    header="Ratio"
                    body={(rowData) => (
                      <InputNumber
                        value={rowData.ratio}
                        onValueChange={(e) => updatePartnerEntry(rowData.partnerId, 'ratio', e.value)}
                        className="w-full"
                      />
                    )}
                  />
                )}

                <Column
                  field="splitAmount"
                  header="Split Amount"
                  body={(rowData) => <span className="font-medium">₹{rowData.splitAmount?.toFixed(2)}</span>}
                />
              </DataTable>
            )}
          </div>
        )}
      </Dialog>

      {/* Bill Details Dialog */}
      <Dialog
        header="Bill Details"
        visible={detailsDialogVisible}
        style={{ width: '600px' }}
        breakpoints={{ '960px': '96vw', '640px': '100vw' }}
        className="bill-details-dialog"
        onHide={() => setDetailsDialogVisible(false)}
        footer={
          <div className="dialog-actions">
            <Button
              label="Close"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setDetailsDialogVisible(false)}
            />
            <Button
              label="Export PDF"
              icon="pi pi-file-pdf"
              onClick={() => {
                if (selectedBill) {
                  handleExportPDF(selectedBill);
                }
              }}
              disabled={!selectedBill}
            />
          </div>
        }
      >
        {selectedBill && (
          <div>
            <div className="grid mb-4">
              <div className="col-12 md:col-6">
                <span className="text-color-secondary">Title:</span>
                <p className="font-medium m-0">{selectedBill.title}</p>
              </div>
              <div className="col-12 md:col-6">
                <span className="text-color-secondary">Type:</span>
                <p className="font-medium m-0">{getBillTypeName(selectedBill.billTypeId)}</p>
              </div>
              <div className="col-12 md:col-6">
                <span className="text-color-secondary">Total Amount:</span>
                <p className="font-medium m-0">₹{selectedBill.totalAmount?.toFixed(2)}</p>
              </div>
              <div className="col-12 md:col-6">
                <span className="text-color-secondary">Status:</span>
                <Tag 
                  value={selectedBill.status} 
                  severity={getStatusSeverity(selectedBill.status)}
                />
              </div>
              <div className="col-12 md:col-6">
                <span className="text-color-secondary">Bill Date:</span>
                <p className="font-medium m-0">
                  {format(new Date(selectedBill.billDate), 'dd MMM yyyy')}
                </p>
              </div>
              {selectedBill.dueDate && (
                <div className="col-12 md:col-6">
                  <span className="text-color-secondary">Due Date:</span>
                  <p className="font-medium m-0">
                    {format(new Date(selectedBill.dueDate), 'dd MMM yyyy')}
                  </p>
                </div>
              )}
            </div>

            {selectedBill.description && (
              <div className="mb-4">
                <span className="text-color-secondary">Description:</span>
                <p className="m-0">{selectedBill.description}</p>
              </div>
            )}

            <h4 className="mb-3">Partner Split</h4>
            {isCompactEntryView ? (
              <div className="bill-details-split-cards">
                {selectedBillEntries.map((entry) => (
                  <article key={entry.id} className="bill-details-split-card">
                    <div className="bill-details-split-card__row">
                      <span className="text-color-secondary">Partner</span>
                      <strong>{getPartnerName(entry.partnerId)}</strong>
                    </div>
                    <div className="bill-details-split-card__row">
                      <span className="text-color-secondary">Amount</span>
                      <strong>₹{entry.splitAmount?.toFixed(2)}</strong>
                    </div>
                    <div className="bill-details-split-card__row">
                      <span className="text-color-secondary">Status</span>
                      <Tag
                        value={entry.paid ? 'Paid' : 'Pending'}
                        severity={entry.paid ? 'success' : 'warning'}
                      />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <DataTable value={selectedBillEntries} className="p-datatable-sm" responsiveLayout="scroll">
                <Column 
                  field="partnerId" 
                  header="Partner"
                  body={(rowData) => getPartnerName(rowData.partnerId)}
                />
                <Column 
                  field="splitAmount" 
                  header="Amount"
                  body={(rowData) => `₹${rowData.splitAmount?.toFixed(2)}`}
                />
                <Column 
                  field="paid" 
                  header="Status"
                  body={(rowData) => (
                    <Tag 
                      value={rowData.paid ? 'Paid' : 'Pending'} 
                      severity={rowData.paid ? 'success' : 'warning'}
                    />
                  )}
                />
              </DataTable>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default BillsPage;
