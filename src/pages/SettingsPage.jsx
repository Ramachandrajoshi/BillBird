import React, { useRef, useState } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { Toast } from 'primereact/toast';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Divider } from 'primereact/divider';
import { useApp } from '../context/AppContext';

const SettingsPage = () => {
  const { exportData, importData, showToast } = useApp();
  const toast = useRef(null);
  const fileUploadRef = useRef(null);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `billbird-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.current.show({
        severity: 'success',
        summary: 'Success',
        detail: 'Data exported successfully. You can now upload this file to Google Drive or any cloud storage.'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to export data'
      });
    }
  };

  const handleImport = async (event) => {
    const file = event.files[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validate data structure
        if (!data.version || !data.billTypes || !data.partners || !data.bills) {
          throw new Error('Invalid backup file format');
        }

        confirmDialog({
          message: 'This will replace all existing data. Are you sure you want to continue?',
          header: 'Import Confirmation',
          icon: 'pi pi-exclamation-triangle',
          acceptClassName: 'p-button-warning',
          accept: async () => {
            try {
              await importData(data);
              toast.current.show({
                severity: 'success',
                summary: 'Success',
                detail: 'Data imported successfully'
              });
            } catch (error) {
              console.error('Import error:', error);
              toast.current.show({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to import data'
              });
            } finally {
              setImporting(false);
              if (fileUploadRef.current) {
                fileUploadRef.current.clear();
              }
            }
          },
          reject: () => {
            setImporting(false);
            if (fileUploadRef.current) {
              fileUploadRef.current.clear();
            }
          }
        });
      } catch (error) {
        console.error('Parse error:', error);
        toast.current.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Invalid backup file. Please select a valid BillBird backup file.'
        });
        setImporting(false);
        if (fileUploadRef.current) {
          fileUploadRef.current.clear();
        }
      }
    };

    reader.onerror = () => {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to read file'
      });
      setImporting(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="page-shell fade-in">
      <Toast ref={toast} />
      <ConfirmDialog />

      <section className="page-hero page-hero--compact">
        <div>
          <span className="page-hero__eyebrow">Maintenance</span>
          <h2 className="page-hero__title">Settings</h2>
          <p className="page-hero__description">
            Backup, restore, and understand the product from a settings view that stays readable on mobile.
          </p>
        </div>
      </section>

      <div className="grid">
        <div className="col-12 lg:col-6">
          <Card className="panel-card h-full">
            <div className="card-header">
              <h3 className="card-title">
                <i className="pi pi-database mr-2"></i>
                Data Management
              </h3>
            </div>
            
            <p className="text-color-secondary mb-4">
              Export your data to backup or transfer to another device. 
              Import data from a previous backup.
            </p>

            <div className="flex flex-column gap-3">
              <div>
                <h4 className="mb-2">Export Data</h4>
                <p className="text-sm text-color-secondary mb-3">
                  Download all your data as a JSON file. You can upload this file to 
                  Google Drive, Dropbox, or any cloud storage for safekeeping.
                </p>
                <Button
                  label="Export to File"
                  icon="pi pi-download"
                  onClick={handleExport}
                  className="w-full"
                />
              </div>

              <Divider />

              <div>
                <h4 className="mb-2">Import Data</h4>
                <p className="text-sm text-color-secondary mb-3">
                  Import data from a previously exported backup file. 
                  You can select files from your device or from Google Drive.
                </p>
                <FileUpload
                  ref={fileUploadRef}
                  mode="basic"
                  name="backup"
                  accept=".json"
                  maxFileSize={10000000}
                  onSelect={handleImport}
                  chooseLabel="Import from File"
                  chooseIcon="pi pi-upload"
                  className="w-full"
                  disabled={importing}
                  auto={false}
                />
                {importing && (
                  <small className="text-color-secondary mt-2 block">
                    <i className="pi pi-spin pi-spinner mr-1"></i>
                    Importing data...
                  </small>
                )}
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12 lg:col-6">
          <Card className="panel-card h-full">
            <div className="card-header">
              <h3 className="card-title">
                <i className="pi pi-cloud mr-2"></i>
                Google Drive Integration
              </h3>
            </div>

            <div className="mb-4">
              <h4 className="mb-2">
                <i className="pi pi-upload mr-2 text-primary"></i>
                How to Backup to Google Drive
              </h4>
              <ol className="pl-4 text-sm text-color-secondary">
                <li className="mb-2">Click "Export to File" to download your data</li>
                <li className="mb-2">Open Google Drive in your browser or app</li>
                <li className="mb-2">Click "New" → "File upload"</li>
                <li className="mb-2">Select the downloaded JSON file</li>
                <li>Your data is now safely stored in Google Drive!</li>
              </ol>
            </div>

            <Divider />

            <div>
              <h4 className="mb-2">
                <i className="pi pi-download mr-2 text-primary"></i>
                How to Restore from Google Drive
              </h4>
              <ol className="pl-4 text-sm text-color-secondary">
                <li className="mb-2">Open Google Drive and find your backup file</li>
                <li className="mb-2">Download the file to your device</li>
                <li className="mb-2">Click "Import from File" above</li>
                <li className="mb-2">Select the downloaded JSON file</li>
                <li>Confirm the import to restore your data</li>
              </ol>
            </div>
          </Card>
        </div>

        <div className="col-12">
          <Card className="panel-card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="pi pi-info-circle mr-2"></i>
                About BillBird
              </h3>
            </div>

            <div className="grid">
              <div className="col-12 md:col-4">
                <div className="text-center p-3">
                  <i className="pi pi-wallet text-primary" style={{ fontSize: '3rem' }}></i>
                  <h4 className="mt-2 mb-1">BillBird</h4>
                  <p className="text-sm text-color-secondary m-0">Version 1.0.0</p>
                </div>
              </div>
              <div className="col-12 md:col-8">
                <p className="text-color-secondary mb-3">
                  BillBird is a Progressive Web App (PWA) designed to help you split bills 
                  among partners easily. Track usage-based bills like water and electricity, 
                  or split fixed expenses like rent and groceries.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-info">PWA</span>
                  <span className="badge badge-info">Offline Support</span>
                  <span className="badge badge-info">IndexedDB</span>
                  <span className="badge badge-info">React</span>
                  <span className="badge badge-info">PrimeReact</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="col-12">
          <Card className="panel-card">
            <div className="card-header">
              <h3 className="card-title">
                <i className="pi pi-star mr-2"></i>
                Features
              </h3>
            </div>

            <div className="grid">
              <div className="col-12 md:col-6 lg:col-4">
                <div className="flex align-items-start gap-3 p-3">
                  <i className="pi pi-tags text-primary text-xl"></i>
                  <div>
                    <h4 className="m-0 mb-1">Multiple Bill Types</h4>
                    <p className="text-sm text-color-secondary m-0">
                      Create custom bill types for water, electricity, rent, and more
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-12 md:col-6 lg:col-4">
                <div className="flex align-items-start gap-3 p-3">
                  <i className="pi pi-percentage text-primary text-xl"></i>
                  <div>
                    <h4 className="m-0 mb-1">Flexible Splitting</h4>
                    <p className="text-sm text-color-secondary m-0">
                      Split bills equally, by percentage, usage, or custom ratios
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-12 md:col-6 lg:col-4">
                <div className="flex align-items-start gap-3 p-3">
                  <i className="pi pi-chart-line text-primary text-xl"></i>
                  <div>
                    <h4 className="m-0 mb-1">Usage Tracking</h4>
                    <p className="text-sm text-color-secondary m-0">
                      Track consumption for utility bills with automatic history
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-12 md:col-6 lg:col-4">
                <div className="flex align-items-start gap-3 p-3">
                  <i className="pi pi-file-pdf text-primary text-xl"></i>
                  <div>
                    <h4 className="m-0 mb-1">PDF Export</h4>
                    <p className="text-sm text-color-secondary m-0">
                      Generate detailed PDF reports for any bill
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-12 md:col-6 lg:col-4">
                <div className="flex align-items-start gap-3 p-3">
                  <i className="pi pi-mobile text-primary text-xl"></i>
                  <div>
                    <h4 className="m-0 mb-1">Installable PWA</h4>
                    <p className="text-sm text-color-secondary m-0">
                      Install as an app on your phone or desktop
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-12 md:col-6 lg:col-4">
                <div className="flex align-items-start gap-3 p-3">
                  <i className="pi pi-cloud text-primary text-xl"></i>
                  <div>
                    <h4 className="m-0 mb-1">Cloud Backup</h4>
                    <p className="text-sm text-color-secondary m-0">
                      Export and import data to Google Drive or any storage
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
