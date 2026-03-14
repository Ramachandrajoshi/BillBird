import React, { useState, useRef } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Toast } from 'primereact/toast';
import { useApp } from '../context/AppContext';

const PartnersPage = () => {
  const { partners, addPartner, updatePartner, deletePartner } = useApp();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const toast = useRef(null);

  const openDialog = (partner = null) => {
    if (partner) {
      setEditingPartner(partner);
      setFormData({
        name: partner.name,
        email: partner.email || '',
        phone: partner.phone || ''
      });
    } else {
      setEditingPartner(null);
      setFormData({
        name: '',
        email: '',
        phone: ''
      });
    }
    setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
    setEditingPartner(null);
    setFormData({
      name: '',
      email: '',
      phone: ''
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Please enter a partner name'
      });
      return;
    }

    try {
      if (editingPartner) {
        await updatePartner(editingPartner.id, formData);
      } else {
        await addPartner(formData);
      }
      closeDialog();
    } catch (error) {
      console.error('Error saving partner:', error);
    }
  };

  const handleDelete = (partner) => {
    confirmDialog({
      message: `Are you sure you want to delete "${partner.name}"?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptClassName: 'p-button-danger',
      accept: async () => {
        try {
          await deletePartner(partner.id);
        } catch (error) {
          console.error('Error deleting partner:', error);
        }
      }
    });
  };

  return (
    <div className="page-shell fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <section className="page-hero page-hero--compact">
        <div>
          <span className="page-hero__eyebrow">People</span>
          <h2 className="page-hero__title">Partners</h2>
          <p className="page-hero__description">
            Keep everyone organized with more readable partner cards and cleaner contact details.
          </p>
        </div>
        <div className="page-actions">
          <Button
            label="Add Partner"
            icon="pi pi-plus"
            onClick={() => openDialog()}
          />
        </div>
      </section>

      {partners.length > 0 ? (
        <div className="grid">
          {partners.map(partner => (
            <div key={partner.id} className="col-12 md:col-6 lg:col-4">
              <Card className="panel-card h-full">
                <div className="entity-card__header">
                  <div className="flex align-items-center gap-3">
                    <div className="partner-avatar">
                      {partner.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold m-0 mb-1">{partner.name}</h3>
                      {partner.email && (
                        <p className="text-sm text-color-secondary m-0">
                          <i className="pi pi-envelope mr-1"></i>
                          {partner.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      icon="pi pi-pencil"
                      className="p-button-text p-button-rounded p-button-sm"
                      onClick={() => openDialog(partner)}
                      tooltip="Edit"
                    />
                    <Button
                      icon="pi pi-trash"
                      className="p-button-text p-button-rounded p-button-sm p-button-danger"
                      onClick={() => handleDelete(partner)}
                      tooltip="Delete"
                    />
                  </div>
                </div>
                
                {partner.phone && (
                  <div className="flex align-items-center gap-2 text-sm text-color-secondary">
                    <i className="pi pi-phone"></i>
                    <span>{partner.phone}</span>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      ) : (
        <Card className="panel-card">
          <div className="empty-state">
            <i className="pi pi-users empty-state-icon"></i>
            <h3 className="empty-state-title">No Partners</h3>
            <p className="empty-state-description">
              Add partners to split bills with them
            </p>
            <Button
              label="Add Partner"
              icon="pi pi-plus"
              onClick={() => openDialog()}
            />
          </div>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        header={editingPartner ? 'Edit Partner' : 'Add Partner'}
        visible={dialogVisible}
        style={{ width: 'min(92vw, 450px)' }}
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
              label={editingPartner ? 'Update' : 'Create'}
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
            placeholder="Enter partner name"
            className="w-full"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <InputText
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="Enter email address"
            className="w-full"
            type="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Phone</label>
          <InputText
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Enter phone number"
            className="w-full"
          />
        </div>
      </Dialog>
    </div>
  );
};

export default PartnersPage;
