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
import { format } from 'date-fns';
import { generateBillPDF, generateAllBillsPDF } from '../utils/pdfGenerator';

const BillsPage = () => {
  const { 
    bills, 
    billTypes, 
    partners, 
    billEntries,
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
  const toast = useRef(null);

  const statusOptions = [
    { label: 'Pending', value: 'pending' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' }
  ];

  // Get selected bill type
  const selectedBillType = useMemo(() => {
    return billTypes.find(t => t.id === formData.billTypeId);
  }, [billTypes, formData.billTypeId]);

  // Initialize partner entries when partners are selected
  useEffect(() => {
    if (formData.selectedPartners.length > 0 && selectedBillType) {
      const newEntries = formData.selectedPartners.map(partnerId => {
        const existingEntry = partnerEntries.find(e => e.partnerId === partnerId);
        if (existingEntry) return existingEntry;

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
          paidDate: null
        };
      });
      setPartnerEntries(newEntries);
    }
  }, [formData.selectedPartners, selectedBillType]);

  // Auto-populate last usage for usage-based bills
  useEffect(() => {
    const populateLastUsage = async () => {
      if (selectedBillType?.category === 'usage' && formData.selectedPartners.length > 0) {
        const updatedEntries = await Promise.all(
          partnerEntries.map(async (entry) => {
            const lastUsageData = await getLastUsage(formData.billTypeId, entry.partnerId);
            if (lastUsageData) {
              return {
                ...entry,
                lastUsage: lastUsageData.currentUsage || 0,
                lastReadDate: lastUsageData.currentReadDate || null
              };
            }
            return entry;
          })
        );
        setPartnerEntries(updatedEntries);
      }
    };
    populateLastUsage();
  }, [selectedBillType, formData.selectedPartners, formData.billTypeId]);

  // Calculate split amounts
  useEffect(() => {
    if (!selectedBillType || partnerEntries.length === 0) return;

    const totalAmount = formData.totalAmount || 0;
    let updatedEntries = [...partnerEntries];

    switch (selectedBillType.splitType) {
      case 'equal':
        const equalShare = totalAmount / partnerEntries.length;
        updatedEntries = updatedEntries.map(entry => ({
          ...entry,
          splitAmount: equalShare
        }));
        break;

      case 'percentage':
        const totalPercentage = updatedEntries.reduce((sum, e) => sum + (e.percentage || 0), 0);
        if (totalPercentage > 0) {
          updatedEntries = updatedEntries.map(entry => ({
            ...entry,
            splitAmount: (totalAmount * (entry.percentage || 0)) / totalPercentage
          }));
        }
        break;

      case 'usage':
        const totalUsage = updatedEntries.reduce((sum, e) => {
          const usage = (e.currentUsage || 0) - (e.lastUsage || 0);
          return sum + Math.max(0, usage);
        }, 0);
        
        if (totalUsage > 0) {
          updatedEntries = updatedEntries.map(entry => {
            const usage = Math.max(0, (entry.currentUsage || 0) - (entry.lastUsage || 0));
            return {
              ...entry,
              usageAmount: usage,
              splitAmount: (totalAmount * usage) / totalUsage
            };
          });
        }
        break;

      case 'ratio':
        const totalRatio = updatedEntries.reduce((sum, e) => sum + (e.ratio || 1), 0);
        if (totalRatio > 0) {
          updatedEntries = updatedEntries.map(entry => ({
            ...entry,
            splitAmount: (totalAmount * (entry.ratio || 1)) / totalRatio
          }));
        }
        break;
    }

    setPartnerEntries(updatedEntries);
  }, [formData.totalAmount, selectedBillType, partnerEntries.length]);

  const openDialog = (bill = null) => {
    if (bill) {
      setEditingBill(bill);
      const entries = billEntries.filter(e => e.billId === bill.id);
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
    setPartnerEntries([]);
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
    const entries = billEntries.filter(e => e.billId === bill.id);
    const billType = billTypes.find(t => t.id === bill.billTypeId);
    generateBillPDF(bill, entries, partners, billType);
  };

  const handleExportAllPDF = () => {
    if (bills.length === 0) return;
    generateAllBillsPDF(bills, billEntries, partners, billTypes);
  };

  const updatePartnerEntry = (partnerId, field, value) => {
    setPartnerEntries(prev => 
      prev.map(entry => 
        entry.partnerId === partnerId 
          ? { ...entry, [field]: value }
          : entry
      )
    );
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
        <div className="page-actions" style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Button
            label="Export Report"
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
        <Card className="panel-card">
          <DataTable
            value={bills}
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
                onChange={(e) => setFormData({ ...formData, billTypeId: e.value })}
                placeholder="Select bill type"
                className="w-full"
                appendTo="body"
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
                appendTo="body"
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
                appendTo="body"
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
                appendTo="body"
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
                appendTo="body"
              />
            </div>
          </div>
        </div>

        {/* Partner Entries */}
        {formData.selectedPartners.length > 0 && selectedBillType && (
          <div className="mt-4">
            <h4 className="mb-3">Partner Split Details</h4>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Partner</th>
                    {selectedBillType.category === 'usage' && (
                      <>
                        <th>Last Usage</th>
                        <th>Last Read Date</th>
                        <th>Current Usage</th>
                        <th>Current Read Date</th>
                        <th>Usage</th>
                      </>
                    )}
                    {selectedBillType.splitType === 'percentage' && <th>Percentage</th>}
                    {selectedBillType.splitType === 'ratio' && <th>Ratio</th>}
                    <th>Split Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerEntries.map(entry => (
                    <tr key={entry.partnerId}>
                      <td className="font-medium">{getPartnerName(entry.partnerId)}</td>
                      {selectedBillType.category === 'usage' && (
                        <>
                          <td>
                            <InputNumber
                              value={entry.lastUsage}
                              onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'lastUsage', e.value)}
                              className="w-full"
                              disabled
                            />
                          </td>
                          <td>
                            <InputText
                              value={entry.lastReadDate ? format(new Date(entry.lastReadDate), 'dd/MM/yyyy') : ''}
                              className="w-full"
                              disabled
                            />
                          </td>
                          <td>
                            <InputNumber
                              value={entry.currentUsage}
                              onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'currentUsage', e.value)}
                              className="w-full"
                            />
                          </td>
                          <td>
                            <Calendar
                              value={entry.currentReadDate ? new Date(entry.currentReadDate) : null}
                              onChange={(e) => updatePartnerEntry(entry.partnerId, 'currentReadDate', e.value)}
                              dateFormat="dd/mm/yy"
                              showIcon
                              className="w-full"
                              appendTo="body"
                            />
                          </td>
                          <td className="font-medium">
                            {Math.max(0, (entry.currentUsage || 0) - (entry.lastUsage || 0))}
                          </td>
                        </>
                      )}
                      {selectedBillType.splitType === 'percentage' && (
                        <td>
                          <InputNumber
                            value={entry.percentage}
                            onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'percentage', e.value)}
                            suffix="%"
                            className="w-full"
                          />
                        </td>
                      )}
                      {selectedBillType.splitType === 'ratio' && (
                        <td>
                          <InputNumber
                            value={entry.ratio}
                            onValueChange={(e) => updatePartnerEntry(entry.partnerId, 'ratio', e.value)}
                            className="w-full"
                          />
                        </td>
                      )}
                      <td className="font-medium">₹{entry.splitAmount?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Dialog>

      {/* Bill Details Dialog */}
      <Dialog
        header="Bill Details"
        visible={detailsDialogVisible}
        style={{ width: '600px' }}
        onHide={() => setDetailsDialogVisible(false)}
      >
        {selectedBill && (
          <div>
            <div className="grid mb-4">
              <div className="col-6">
                <span className="text-color-secondary">Title:</span>
                <p className="font-medium m-0">{selectedBill.title}</p>
              </div>
              <div className="col-6">
                <span className="text-color-secondary">Type:</span>
                <p className="font-medium m-0">{getBillTypeName(selectedBill.billTypeId)}</p>
              </div>
              <div className="col-6">
                <span className="text-color-secondary">Total Amount:</span>
                <p className="font-medium m-0">₹{selectedBill.totalAmount?.toFixed(2)}</p>
              </div>
              <div className="col-6">
                <span className="text-color-secondary">Status:</span>
                <Tag 
                  value={selectedBill.status} 
                  severity={getStatusSeverity(selectedBill.status)}
                />
              </div>
              <div className="col-6">
                <span className="text-color-secondary">Bill Date:</span>
                <p className="font-medium m-0">
                  {format(new Date(selectedBill.billDate), 'dd MMM yyyy')}
                </p>
              </div>
              {selectedBill.dueDate && (
                <div className="col-6">
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
            <DataTable value={selectedBillEntries} className="p-datatable-sm">
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
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default BillsPage;
