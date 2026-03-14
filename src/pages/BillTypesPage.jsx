import React, { useState, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useApp } from '../context/AppContext';

const BillTypesPage = () => {
  const { billTypes, addBillType, updateBillType, deleteBillType } = useApp();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'fixed',
    splitType: 'equal',
    fields: []
  });
  const toast = useRef(null);

  const categoryOptions = [
    { label: 'Fixed Amount', value: 'fixed' },
    { label: 'Usage Based', value: 'usage' }
  ];

  const splitTypeOptions = [
    { label: 'Equal Divide', value: 'equal' },
    { label: 'Percentage', value: 'percentage' },
    { label: 'Usage Based', value: 'usage' },
    { label: 'Ratio', value: 'ratio' }
  ];

  const fieldOptions = [
    { label: 'Last Usage', value: 'lastUsage' },
    { label: 'Current Usage', value: 'currentUsage' },
    { label: 'Last Read Date', value: 'lastReadDate' },
    { label: 'Current Read Date', value: 'currentReadDate' }
  ];

  const openDialog = (type = null) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        category: type.category,
        splitType: type.splitType,
        fields: type.fields || []
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        category: 'fixed',
        splitType: 'equal',
        fields: []
      });
    }
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setEditingType(null);
    setFormData({
      name: '',
      category: 'fixed',
      splitType: 'equal',
      fields: []
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Please enter a bill type name'
      });
      return;
    }

    try {
      if (editingType) {
        await updateBillType(editingType.id, formData);
      } else {
        await addBillType(formData);
      }
      closeDialog();
    } catch (error) {
      console.error('Error saving bill type:', error);
    }
  };

  const handleDelete = (type) => {
    confirmDialog({
      message: `Are you sure you want to delete "${type.name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deleteBillType(type.id);
        } catch (error) {
          console.error('Error deleting bill type:', error);
        }
      }
    });
  };

  const getCategoryLabel = (category) => {
    return category === 'usage' ? 'Usage Based' : 'Fixed Amount';
  };

  const getSplitTypeLabel = (splitType) => {
    const labels = {
      equal: 'Equal Divide',
      percentage: 'Percentage',
      usage: 'Usage Based',
      ratio: 'Ratio'
    };
    return labels[splitType] || splitType;
  };

  return (
    <div className="page-shell fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <section className="page-hero page-hero--compact">
        <div>
          <span className="page-hero__eyebrow">Configuration</span>
          <h2 className="page-hero__title">Bill Types</h2>
          <p className="page-hero__description">
            Define fixed and usage-based expense templates with cleaner cards and simpler actions.
          </p>
        </div>
        <div className="page-actions">
          <Button
            label="Add Bill Type"
            icon="pi pi-plus"
            onClick={() => openDialog()}
          />
        </div>
      </section>

      {billTypes.length > 0 ? (
        <div className="grid">
          {billTypes.map(type => (
            <div key={type.id} className="col-12 md:col-6 lg:col-4">
              <Card className="panel-card h-full">
                <div className="entity-card__header">
                  <div>
                    <h3 className="text-lg font-semibold m-0 mb-1">{type.name}</h3>
                    <span className="badge badge-info">{getCategoryLabel(type.category)}</span>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      icon="pi pi-pencil"
                      className="p-button-text p-button-rounded p-button-sm"
                      onClick={() => openDialog(type)}
                      tooltip="Edit"
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-text p-button-rounded p-button-sm p-button-danger"
                      onClick={() => handleDelete(type)}
                      tooltip="Delete"
                    />
                  </div>
                </div>

                <div className="entity-card__meta mb-3">
                  <span className="text-sm text-color-secondary">Split Type:</span>
                  <span className="ml-2 font-medium">{getSplitTypeLabel(type.splitType)}</span>
                </div>

                {type.category === 'usage' && type.fields?.length > 0 && (
                  <div>
                    <span className="text-sm text-color-secondary">Fields:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {type.fields.map(field => (
                        <span key={field} className="badge badge-success text-xs">
                          {field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card className="panel-card">
          <div className="empty-state">
            <i className="pi pi-tags empty-state-icon"></i>
            <h3 className="empty-state-title">No Bill Types</h3>
            <p className="empty-state-description">
              Create your first bill type to start managing bills
            </p>
            <Button
              label="Add Bill Type"
              icon="pi pi-plus"
              onClick={() => openDialog()}
            />
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        header={editingType ? 'Edit Bill Type' : 'Add Bill Type'}
        visible={dialogVisible}
        style={{ width: 'min(92vw, 500px)' }}
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
              label={editingType ? 'Update' : 'Create'}
              icon="pi pi-check"
              onClick={handleSubmit}
            />
          </div>
        }
      >
        <div className="form-group">
          <label className="form-label">Name *</label>
          <InputText
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Water, Electricity, Lunch"
            className="w-full"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category</label>
          <Dropdown
            value={formData.category}
            options={categoryOptions}
            onChange={(e) => setFormData({ ...formData, category: e.value })}
            placeholder="Select category"
            className="w-full"
            appendTo="body"
          />
          <small className="form-helper">
            Usage based bills track consumption over time
          </small>
        </div>

        <div className="form-group">
          <label className="form-label">Split Type</label>
          <Dropdown
            value={formData.splitType}
            options={splitTypeOptions}
            onChange={(e) => setFormData({ ...formData, splitType: e.value })}
            placeholder="Select split type"
            className="w-full"
            appendTo="body"
          />
          <small className="form-helper">
            How the bill amount should be divided among partners
          </small>
        </div>

        {formData.category === 'usage' && (
          <div className="form-group">
            <label className="form-label">Fields</label>
            <MultiSelect
              value={formData.fields}
              options={fieldOptions}
              onChange={(e) => setFormData({ ...formData, fields: e.value })}
              placeholder="Select fields"
              className="w-full"
              display="chip"
              appendTo="body"
            />
            <small className="form-helper">
              Fields to track for usage-based bills
            </small>
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default BillTypesPage;
