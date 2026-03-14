import React, { useMemo, useRef, useState } from 'react';
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
      return entries.map((entry) => ({ ...entry, splitAmount: equalShare }));
    }

    case 'percentage': {
      const totalPercentage = entries.reduce((sum, entry) => sum + (entry.percentage || 0), 0);
      return entries.map((entry) => ({
        ...entry,
        splitAmount: totalPercentage > 0 ? (totalAmount * (entry.percentage || 0)) / totalPercentage : 0
      }));
    }

    case 'ratio': {
      const totalRatio = entries.reduce((sum, entry) => sum + (entry.ratio || 1), 0);
      return entries.map((entry) => ({
        ...entry,
        splitAmount: totalRatio > 0 ? (totalAmount * (entry.ratio || 1)) / totalRatio : 0
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
    getBillEntries
  } = useApp();

  const toast = useRef(null);
  const overlayTarget = typeof window !== 'undefined' ? document.body : undefined;

  const [dialogVisible, setDialogVisible] = useState(false);
  const [detailsDialogVisible, setDetailsDialogVisible] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedBillEntries, setSelectedBillEntries] = useState([]);
  const [quickPartnerName, setQuickPartnerName] = useState('');
  const [exportMonth, setExportMonth] = useState(new Date());
  const [partnerEntries, setPartnerEntries] = useState([]);

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

  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' }
  ];

  const quickBillTypes = useMemo(
    () => billTypes.filter((type) => type.category !== 'usage'),
    [billTypes]
  );

  const quickBills = useMemo(() => {
    const quickTypeIds = new Set(quickBillTypes.map((type) => type.id));
    return bills
      .filter((bill) => quickTypeIds.has(bill.billTypeId))
      .sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
  }, [bills, quickBillTypes]);

  const selectedBillType = useMemo(() => {
    return quickBillTypes.find((type) => type.id === formData.billTypeId);
  }, [quickBillTypes, formData.billTypeId]);

  const monthlyBills = useMemo(() => {
    return quickBills.filter((bill) => isSameMonth(new Date(bill.billDate), exportMonth));
  }, [quickBills, exportMonth]);

  const getBillTypeName = (billTypeId) => {
    const type = billTypes.find((item) => item.id === billTypeId);
    return type ? type.name : 'Unknown';
  };

  const getPartnerName = (partnerId) => {
    const partner = partners.find((item) => item.id === partnerId);
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

  const syncPartnerEntries = (selectedPartnerIds, totalAmount, billType) => {
    setPartnerEntries((previousEntries) => {
      const nextEntries = selectedPartnerIds.map((partnerId) => {
        const existingEntry = previousEntries.find((entry) => entry.partnerId === partnerId);
        if (existingEntry) {
          return existingEntry;
        }

        return {
          partnerId,
          splitAmount: 0,
          percentage: 0,
          ratio: 1,
          paid: false
        };
      });

      return recalculateSplitAmounts(nextEntries, billType, totalAmount);
    });
  };

  const openDialog = (bill = null) => {
    if (bill) {
      setEditingBill(bill);
      const entries = billEntries.filter((entry) => entry.billId === bill.id);
      setFormData({
        billTypeId: bill.billTypeId,
        title: bill.title,
        description: bill.description || '',
        totalAmount: bill.totalAmount,
        billDate: new Date(bill.billDate),
        dueDate: bill.dueDate ? new Date(bill.dueDate) : null,
        status: bill.status,
        selectedPartners: entries.map((entry) => entry.partnerId)
      });
      setPartnerEntries(entries);
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
      setPartnerEntries([]);
    }

    setQuickPartnerName('');
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setEditingBill(null);
    setPartnerEntries([]);
    setQuickPartnerName('');
  };

  const handleQuickPartnerAdd = async () => {
    const name = quickPartnerName.trim();
    if (!name) {
      return;
    }

    const existingPartner = partners.find((partner) => partner.name.toLowerCase() === name.toLowerCase());

    try {
      const partnerId = existingPartner ? existingPartner.id : await addPartner({ name, email: '', phone: '' });

      setFormData((previous) => {
        const selectedPartners = previous.selectedPartners.includes(partnerId)
          ? previous.selectedPartners
          : [...previous.selectedPartners, partnerId];

        syncPartnerEntries(selectedPartners, previous.totalAmount, selectedBillType);

        return {
          ...previous,
          selectedPartners
        };
      });

      setQuickPartnerName('');
    } catch (error) {
      console.error('Error adding partner from quick action:', error);
    }
  };

  const handleBillTypeChange = (billTypeId) => {
    const chosenType = quickBillTypes.find((type) => type.id === billTypeId);

    setFormData((previous) => ({
      ...previous,
      billTypeId,
      title: previous.title || (chosenType ? `${chosenType.name} - ${format(new Date(), 'MMM yyyy')}` : previous.title)
    }));

    syncPartnerEntries(formData.selectedPartners, formData.totalAmount, chosenType);
  };

  const updatePartnerEntry = (partnerId, field, value) => {
    setPartnerEntries((previousEntries) => {
      const updatedEntries = previousEntries.map((entry) => (
        entry.partnerId === partnerId ? { ...entry, [field]: value } : entry
      ));

      return recalculateSplitAmounts(updatedEntries, selectedBillType, formData.totalAmount);
    });
  };

  const handleSubmit = async () => {
    if (!formData.billTypeId) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please select a bill type' });
      return;
    }

    if (!formData.title.trim()) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please enter a bill title' });
      return;
    }

    if (formData.selectedPartners.length === 0) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please select at least one partner' });
      return;
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

      if (editingBill) {
        await updateBill(editingBill.id, billData, partnerEntries);
      } else {
        await addBill(billData, partnerEntries);
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
    const entries = billEntries.filter((entry) => entry.billId === bill.id);
    const billType = billTypes.find((type) => type.id === bill.billTypeId);
    generateBillPDF(bill, entries, partners, billType, bills);
  };

  const handleExportAllPDF = () => {
    if (quickBills.length === 0) {
      return;
    }
    generateAllBillsPDF(quickBills, billEntries, partners, billTypes);
  };

  const handleExportMonthlyPDF = () => {
    if (monthlyBills.length === 0) {
      toast.current.show({
        severity: 'warn',
        summary: 'No Bills',
        detail: `No quick split bills found for ${format(exportMonth, 'MMMM yyyy')}`
      });
      return;
    }

    generateAllBillsPDF(monthlyBills, billEntries, partners, billTypes, {
      reportTitle: `BillBird - ${format(exportMonth, 'MMMM yyyy')} Quick Split Report`,
      reportSubTitle: `Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')} | Month: ${format(exportMonth, 'MMMM yyyy')}`,
      fileName: `billbird_quick_split_${format(exportMonth, 'yyyy-MM')}.pdf`
    });
  };

  return (
    <div className="page-shell fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <section className="page-hero page-hero--compact">
        <div>
          <span className="page-hero__eyebrow">Operations</span>
          <h2 className="page-hero__title">Quick Bill Split</h2>
          <p className="page-hero__description">
            Fast workflow for non-usage bills like lunch, cab, travel, and fixed expenses.
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
          <Button label="Export Selected Month" icon="pi pi-calendar" className="p-button-outlined" onClick={handleExportMonthlyPDF} />
          <Button label="Export All Months" icon="pi pi-file-pdf" className="p-button-outlined" onClick={handleExportAllPDF} disabled={quickBills.length === 0} />
          <Button label="Add Quick Bill" icon="pi pi-plus" onClick={() => openDialog()} />
        </div>
      </section>

      {quickBills.length > 0 ? (
        <Card className="panel-card bills-panel-card">
          <DataTable value={quickBills} paginator rows={10} rowsPerPageOptions={[5, 10, 25]} className="p-datatable-sm bills-table" responsiveLayout="scroll" emptyMessage="No quick bills found">
            <Column field="title" header="Title" sortable />
            <Column field="billTypeId" header="Type" sortable body={(rowData) => getBillTypeName(rowData.billTypeId)} />
            <Column field="totalAmount" header="Amount" sortable body={(rowData) => Number(rowData.totalAmount || 0).toFixed(4)} />
            <Column field="billDate" header="Date" sortable body={(rowData) => format(new Date(rowData.billDate), 'dd MMM yyyy')} />
            <Column field="status" header="Status" sortable body={(rowData) => <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />} />
            <Column
              header="Actions"
              body={(rowData) => (
                <div className="table-actions">
                  <Button icon="pi pi-eye" className="p-button-text p-button-rounded p-button-sm" onClick={() => viewBillDetails(rowData)} tooltip="View Details" />
                  <Button icon="pi pi-pencil" className="p-button-text p-button-rounded p-button-sm" onClick={() => openDialog(rowData)} tooltip="Edit" />
                  <Button icon="pi pi-file-pdf" className="p-button-text p-button-rounded p-button-sm" onClick={() => handleExportPDF(rowData)} tooltip="Export PDF" />
                  <Button icon="pi pi-trash" className="p-button-text p-button-rounded p-button-sm p-button-danger" onClick={() => handleDelete(rowData)} tooltip="Delete" />
                </div>
              )}
            />
          </DataTable>
        </Card>
      ) : (
        <Card className="panel-card">
          <div className="empty-state">
            <i className="pi pi-file empty-state-icon"></i>
            <h3 className="empty-state-title">No Quick Bills</h3>
            <p className="empty-state-description">Create your first quick bill split entry.</p>
            <Button label="Add Quick Bill" icon="pi pi-plus" onClick={() => openDialog()} />
          </div>
        </Card>
      )}

      <Dialog
        header={editingBill ? 'Edit Quick Bill' : 'Add Quick Bill'}
        visible={dialogVisible}
        style={{ width: 'min(96vw, 700px)' }}
        breakpoints={{ '960px': '96vw', '640px': '100vw' }}
        className="bills-dialog"
        onHide={closeDialog}
        footer={
          <div className="dialog-actions">
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={closeDialog} />
            <Button label={editingBill ? 'Update' : 'Create'} icon="pi pi-check" onClick={handleSubmit} />
          </div>
        }
      >
        <div className="grid">
          <div className="col-12 md:col-6">
            <div className="form-group">
              <label className="form-label">Bill Type *</label>
              <Dropdown
                value={formData.billTypeId}
                options={quickBillTypes.map((type) => ({ label: type.name, value: type.id }))}
                onChange={(e) => handleBillTypeChange(e.value)}
                placeholder="Select quick bill type"
                className="w-full"
                appendTo={overlayTarget}
              />
            </div>
          </div>
          <div className="col-12 md:col-6">
            <div className="form-group">
              <label className="form-label">Status</label>
              <Dropdown value={formData.status} options={statusOptions} onChange={(e) => setFormData({ ...formData, status: e.value })} className="w-full" appendTo={overlayTarget} />
            </div>
          </div>
          <div className="col-12">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <InputText value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter bill title" className="w-full" />
            </div>
          </div>
          <div className="col-12">
            <div className="form-group">
              <label className="form-label">Description</label>
              <InputTextarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter description" rows={2} className="w-full" />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Bill Amount *</label>
              <InputNumber
                value={formData.totalAmount}
                onValueChange={(e) => {
                  const nextValue = e.value || 0;
                  setFormData({ ...formData, totalAmount: nextValue });
                  setPartnerEntries((previousEntries) => recalculateSplitAmounts(previousEntries, selectedBillType, nextValue));
                }}
                minFractionDigits={0}
                maxFractionDigits={4}
                className="w-full"
              />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Bill Date *</label>
              <Calendar value={formData.billDate} onChange={(e) => setFormData({ ...formData, billDate: e.value })} dateFormat="dd/mm/yy" showIcon className="w-full" appendTo={overlayTarget} />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <Calendar value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.value })} dateFormat="dd/mm/yy" showIcon className="w-full" appendTo={overlayTarget} />
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Select Partners *</label>
          <MultiSelect
            value={formData.selectedPartners}
            options={partners.map((partner) => ({ label: partner.name, value: partner.id }))}
            onChange={(e) => {
              const selectedPartners = e.value || [];
              setFormData({ ...formData, selectedPartners });
              syncPartnerEntries(selectedPartners, formData.totalAmount, selectedBillType);
            }}
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
          <Button type="button" label="Add Partner" icon="pi pi-user-plus" className="p-button-outlined" onClick={handleQuickPartnerAdd} />
        </div>

        {formData.selectedPartners.length > 0 && (
          <div className="mt-4">
            <h4 className="mb-3">Partner Split Details</h4>
            <DataTable value={partnerEntries} className="p-datatable-sm" responsiveLayout="scroll">
              <Column field="partnerId" header="Partner" body={(rowData) => <span className="font-medium">{getPartnerName(rowData.partnerId)}</span>} />

              {selectedBillType?.splitType === 'percentage' && (
                <Column
                  field="percentage"
                  header="Percentage"
                  body={(rowData) => (
                    <InputNumber value={rowData.percentage} onValueChange={(e) => updatePartnerEntry(rowData.partnerId, 'percentage', e.value)} suffix="%" className="w-full" />
                  )}
                />
              )}

              {selectedBillType?.splitType === 'ratio' && (
                <Column
                  field="ratio"
                  header="Ratio"
                  body={(rowData) => (
                    <InputNumber value={rowData.ratio} onValueChange={(e) => updatePartnerEntry(rowData.partnerId, 'ratio', e.value)} className="w-full" />
                  )}
                />
              )}

              <Column field="splitAmount" header="Split Amount" body={(rowData) => <span className="font-medium">{Number(rowData.splitAmount || 0).toFixed(4)}</span>} />
            </DataTable>
          </div>
        )}
      </Dialog>

      <Dialog
        header="Quick Bill Details"
        visible={detailsDialogVisible}
        style={{ width: '600px' }}
        breakpoints={{ '960px': '96vw', '640px': '100vw' }}
        className="bill-details-dialog"
        onHide={() => setDetailsDialogVisible(false)}
        footer={
          <div className="dialog-actions">
            <Button label="Close" icon="pi pi-times" className="p-button-text" onClick={() => setDetailsDialogVisible(false)} />
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
                <span className="text-color-secondary">Bill Amount:</span>
                <p className="font-medium m-0">{Number(selectedBill.totalAmount || 0).toFixed(4)}</p>
              </div>
              <div className="col-12 md:col-6">
                <span className="text-color-secondary">Status:</span>
                <Tag value={selectedBill.status} severity={getStatusSeverity(selectedBill.status)} />
              </div>
              <div className="col-12 md:col-6">
                <span className="text-color-secondary">Bill Date:</span>
                <p className="font-medium m-0">{format(new Date(selectedBill.billDate), 'dd MMM yyyy')}</p>
              </div>
            </div>

            {selectedBill.description && (
              <div className="mb-4">
                <span className="text-color-secondary">Description:</span>
                <p className="m-0">{selectedBill.description}</p>
              </div>
            )}

            <h4 className="mb-3">Partner Split</h4>
            <DataTable value={selectedBillEntries} className="p-datatable-sm" responsiveLayout="scroll">
              <Column field="partnerId" header="Partner" body={(rowData) => getPartnerName(rowData.partnerId)} />
              <Column field="splitAmount" header="Amount" body={(rowData) => Number(rowData.splitAmount || 0).toFixed(4)} />
            </DataTable>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default BillsPage;
