import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { useApp } from '../../context/AppContext';

const Header = () => {
  const { toggleSidebar, sidebarVisible } = useApp();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const isIOS = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  }, []);

  const isSafari = useMemo(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('crios') && !ua.includes('android');
  }, []);

  useEffect(() => {
    const updateStandaloneState = () => {
      const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      setIsStandalone(standaloneMode);
    };

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      updateStandaloneState();
    };

    updateStandaloneState();
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openInstallExperience = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return;
    }

    setShowInstallHelp(true);
  };

  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(new Date());

  return (
    <header className="app-header">
      <div className="app-header__intro">
        <Button
          icon={sidebarVisible ? 'pi pi-times' : 'pi pi-bars'}
          className="p-button-text p-button-rounded app-header__menu hide-desktop"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        />
        <div>
          <div className="app-header__eyebrow">Household finance cockpit</div>
          <div className="app-header__brand-row">
            <div className="app-header__brand-mark">
              <i className="pi pi-wallet"></i>
            </div>
            <div>
              <h1 className="app-header__brand">BillBird</h1>
              <p className="app-header__subtitle">Cleaner bill tracking, faster splits, better mobile flow.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="app-header__meta">
        {!isStandalone && (
          <Button
            label={deferredPrompt ? 'Install App' : 'Install Help'}
            icon="pi pi-download"
            className="p-button-sm p-button-outlined"
            onClick={openInstallExperience}
          />
        )}
        {isStandalone && (
          <div className="app-pill hide-mobile">
            <i className="pi pi-check-circle"></i>
            <span>App Installed</span>
          </div>
        )}
        <div className="app-pill">
          <i className="pi pi-calendar"></i>
          <span>{today}</span>
        </div>
      </div>

      <Dialog
        header="Install BillBird"
        visible={showInstallHelp}
        style={{ width: 'min(92vw, 540px)' }}
        onHide={() => setShowInstallHelp(false)}
        footer={(
          <div className="dialog-actions">
            <Button
              label="Close"
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setShowInstallHelp(false)}
            />
          </div>
        )}
      >
        {isIOS && isSafari ? (
          <div>
            <p className="mb-2">iPhone and iPad Safari do not show an automatic install prompt.</p>
            <ol className="pl-3 m-0">
              <li>Tap the Share button in Safari.</li>
              <li>Select Add to Home Screen.</li>
              <li>Tap Add to install BillBird.</li>
            </ol>
          </div>
        ) : (
          <div>
            <p className="mb-2">If install prompt did not appear automatically:</p>
            <ol className="pl-3 m-0">
              <li>Open browser menu (three dots or settings).</li>
              <li>Choose Install app or Add to Home screen.</li>
              <li>Confirm install.</li>
            </ol>
          </div>
        )}
      </Dialog>
    </header>
  );
};

export default Header;
