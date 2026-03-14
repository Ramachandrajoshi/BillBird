import React from 'react';
import { Button } from 'primereact/button';
import { useApp } from '../../context/AppContext';

const Header = () => {
  const { toggleSidebar, sidebarVisible } = useApp();
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
        <div className="app-pill hide-mobile">
          <i className="pi pi-mobile"></i>
          <span>PWA ready</span>
        </div>
        <div className="app-pill">
          <i className="pi pi-calendar"></i>
          <span>{today}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
