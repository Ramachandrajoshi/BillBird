import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import { generateBillPDF } from '../utils/pdfGenerator';

const UsageBillsPage = () => {
  const { bills, billTypes, partners, billEntries, addBill, updateBill, deleteBill } = useApp();
  const navigate = useNavigate();
  const toast = useRef(null);
  const overlayTarget = typeof window !== 'undefined' ? document.body : undefined;

  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMobileDialog, setIsMobileDialog] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.innerWidth < 640;
  });
  const [formData, setFormData] = useState({
    billTypeId: null,
    title: '',
    description: '',
    totalAmount: 0,
    billDate: new Date(),
    dueDate: null,
    status: 'pending'
  });

  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' }
  ];

  const usageBillTypes = useMemo(
    () => billTypes.filter((type) => type.category === 'usage'),
    [billTypes]
  );

  useEffect(() => {
    const syncMobileDialog = () => {
      setIsMobileDialog(window.innerWidth < 640);
    };

    window.addEventListener('resize', syncMobileDialog);
    return () => window.removeEventListener('resize', syncMobileDialog);
  }, []);

  const autoTitle = useMemo(() => {
    const selectedType = usageBillTypes.find((type) => type.id === formData.billTypeId);
    if (!selectedType) {
      return '';
    }
    return `${selectedType.name} - ${format(formData.billDate || new Date(), 'MMM yyyy')}`;
  }, [usageBillTypes, formData.billTypeId, formData.billDate]);

  const usageBills = useMemo(() => {
    const usageTypeIds = new Set(usageBillTypes.map((type) => type.id));
    return bills
      .filter((bill) => usageTypeIds.has(bill.billTypeId))
      .sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
  }, [bills, usageBillTypes]);

  const getBillTypeName = (billTypeId) => {
    const type = billTypes.find((item) => item.id === billTypeId);
    return type ? type.name : 'Unknown';
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

  const openDialog = (bill = null) => {
    setShowAdvanced(false);

    if (bill) {
      setEditingBill(bill);
      setFormData({
        billTypeId: bill.billTypeId,
        title: bill.title,
        description: bill.description || '',
        totalAmount: bill.totalAmount,
        billDate: new Date(bill.billDate),
        dueDate: bill.dueDate ? new Date(bill.dueDate) : null,
        status: bill.status
      });
    } else {
      setEditingBill(null);
      setFormData({
        billTypeId: usageBillTypes[0]?.id || null,
        title: usageBillTypes[0] ? `${usageBillTypes[0].name} - ${format(new Date(), 'MMM yyyy')}` : '',
        description: '',
        totalAmount: 0,
        billDate: new Date(),
        dueDate: null,
        status: 'pending'
      });
    }

    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setEditingBill(null);
  };

  const handleBillTypeChange = (billTypeId) => {
    const selectedType = usageBillTypes.find((type) => type.id === billTypeId);

    setFormData((previous) => ({
      ...previous,
      billTypeId,
      title: selectedType ? `${selectedType.name} - ${format(previous.billDate || new Date(), 'MMM yyyy')}` : previous.title
    }));
  };

  const handleSubmit = async (openLedgerAfterSave = false) => {
    if (!formData.billTypeId) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please select a usage bill type' });
      return;
    }

    if (!formData.title.trim()) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please enter a bill title' });
      return;
    }

    try {
      const billData = {
        billTypeId: formData.billTypeId,
        title: formData.title?.trim() || autoTitle,
        description: formData.description,
        totalAmount: formData.totalAmount,
        billDate: formData.billDate,
        dueDate: formData.dueDate,
        status: formData.status
      };

      if (editingBill) {
        const existingEntries = billEntries.filter((entry) => entry.billId === editingBill.id);
        await updateBill(editingBill.id, billData, existingEntries);
        if (openLedgerAfterSave) {
          closeDialog();
          navigate(`/usage-bills/${editingBill.id}/ledger`);
          return;
        }
      } else {
        const createdId = await addBill(billData, []);
        if (openLedgerAfterSave) {
          closeDialog();
          navigate(`/usage-bills/${createdId}/ledger`);
          return;
        }
      }

      closeDialog();
    } catch (error) {
      console.error('Error saving usage bill:', error);
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
          console.error('Error deleting usage bill:', error);
        }
      }
    });
  };

  const handleExportPDF = (bill) => {
    const entries = billEntries.filter((entry) => entry.billId === bill.id);
    const billType = billTypes.find((type) => type.id === bill.billTypeId);
    generateBillPDF(bill, entries, partners, billType, bills);
  };

  return (
    <div className="page-shell fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <section className="page-hero page-hero--compact">
        <div>
          <span className="page-hero__eyebrow">Usage Workflow</span>
          <h2 className="page-hero__title">Usage Bills</h2>
          <p className="page-hero__description">
            Step 1: create usage bill shells for each cycle. Step 2: open ledger and add partner readings.
          </p>
        </div>
        <div className="page-actions">
          <Button label="Add Usage Bill" icon="pi pi-plus" onClick={() => openDialog()} />
        </div>
      </section>

      {usageBills.length > 0 ? (
        <Card className="panel-card bills-panel-card">
          <DataTable value={usageBills} paginator rows={10} rowsPerPageOptions={[5, 10, 25]} className="p-datatable-sm bills-table" responsiveLayout="scroll" emptyMessage="No usage bills found">
            <Column field="title" header="Title" sortable />
            <Column field="billTypeId" header="Type" sortable body={(rowData) => getBillTypeName(rowData.billTypeId)} />
            <Column field="totalAmount" header="Bill Amount" sortable body={(rowData) => Number(rowData.totalAmount || 0).toFixed(4)} />
            <Column field="billDate" header="Bill Date" sortable body={(rowData) => format(new Date(rowData.billDate), 'dd MMM yyyy')} />
            <Column field="status" header="Status" sortable body={(rowData) => <Tag value={rowData.status} severity={getStatusSeverity(rowData.status)} />} />
            <Column
              header="Actions"
              body={(rowData) => (
                <div className="table-actions">
                  <Button icon="pi pi-table" className="p-button-text p-button-rounded p-button-sm" onClick={() => navigate(`/usage-bills/${rowData.id}/ledger`)} tooltip="Open Ledger" />
                  <Button icon="pi pi-pencil" className="p-button-text p-button-rounded p-button-sm" onClick={() => openDialog(rowData)} tooltip="Edit Bill" />
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
            <i className="pi pi-sliders-h empty-state-icon"></i>
            <h3 className="empty-state-title">No Usage Bills</h3>
            <p className="empty-state-description">Create your first usage bill, then open its ledger to capture partner readings.</p>
            <Button label="Add Usage Bill" icon="pi pi-plus" onClick={() => openDialog()} />
          </div>
        </Card>
      )}

      <Dialog
        header={editingBill ? 'Edit Usage Bill' : 'Add Usage Bill'}
        visible={dialogVisible}
        style={{ width: isMobileDialog ? '100vw' : 'min(96vw, 700px)' }}
        breakpoints={{ '960px': '96vw', '640px': '100vw' }}
        className="bills-dialog usage-bill-dialog"
        onHide={closeDialog}
        footer={
          <div className="dialog-actions">
            {editingBill && (
              <Button
                label="Open Ledger"
                icon="pi pi-table"
                className="p-button-outlined"
                onClick={() => {
                  closeDialog();
                  navigate(`/usage-bills/${editingBill.id}/ledger`);
                }}
              />
            )}
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={closeDialog} />
            <Button
              label={editingBill ? 'Save & Open Ledger' : 'Create & Open Ledger'}
              icon="pi pi-check"
              onClick={() => handleSubmit(true)}
            />
          </div>
        }
      >
        <div className="grid">
          <div className="col-12 md:col-6">
            <div className="form-group">
              <label className="form-label">Usage Bill Type *</label>
              <Dropdown
                value={formData.billTypeId}
                options={usageBillTypes.map((type) => ({ label: type.name, value: type.id }))}
                onChange={(e) => handleBillTypeChange(e.value)}
                placeholder="Select usage bill type"
                className="w-full"
                appendTo={overlayTarget}
              />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Bill Amount *</label>
              <InputNumber value={formData.totalAmount} onValueChange={(e) => setFormData({ ...formData, totalAmount: e.value || 0 })} minFractionDigits={0} maxFractionDigits={4} className="w-full" />
            </div>
          </div>
          <div className="col-12 md:col-4">
            <div className="form-group">
              <label className="form-label">Bill Date *</label>
              <Calendar
                value={formData.billDate}
                onChange={(e) => {
                  const billDate = e.value;
                  setFormData((previous) => ({
                    ...previous,
                    billDate,
                    title: previous.title ? previous.title : autoTitle
                  }));
                }}
                dateFormat="dd/mm/yy"
                showIcon
                className="w-full"
                appendTo={overlayTarget}
              />
            </div>
          </div>

          <div className="col-12">
            <div className="usage-bill-mobile-note">
              <strong>Auto title:</strong> {formData.title?.trim() || autoTitle}
            </div>
          </div>

          <div className="col-12">
            <Button
              type="button"
              label={showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              icon={showAdvanced ? 'pi pi-chevron-up' : 'pi pi-chevron-down'}
              className="p-button-text p-button-sm"
              onClick={() => setShowAdvanced((previous) => !previous)}
            />
          </div>

          {showAdvanced && (
            <>
              <div className="col-12 md:col-6">
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <Dropdown value={formData.status} options={statusOptions} onChange={(e) => setFormData({ ...formData, status: e.value })} className="w-full" appendTo={overlayTarget} />
                </div>
              </div>
              <div className="col-12 md:col-6">
                <div className="form-group">
                  <label className="form-label">Due Date</label>
                  <Calendar value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.value })} dateFormat="dd/mm/yy" showIcon className="w-full" appendTo={overlayTarget} />
                </div>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label className="form-label">Title Override</label>
                  <InputText value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder={autoTitle} className="w-full" />
                </div>
              </div>
              <div className="col-12">
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <InputTextarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Optional notes for this cycle" rows={2} className="w-full" />
                </div>
              </div>
            </>
          )}

          <div className="col-12">
            <div className="bills-template-quick mt-0">
              <p>Create the bill shell first, then add readings partner-wise inside the ledger in the next step.</p>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default UsageBillsPage;
