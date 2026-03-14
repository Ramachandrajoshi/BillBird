import React from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from 'primereact/button';
import { useApp } from '../../context/AppContext';

const Sidebar = () => {
  const { sidebarVisible, toggleSidebar } = useApp();

  const menuItems = [
    { path: '/', icon: 'pi pi-home', label: 'Dashboard' },
    { path: '/bill-types', icon: 'pi pi-tags', label: 'Bill Types' },
    { path: '/bills', icon: 'pi pi-file', label: 'Bills' },
    { path: '/partners', icon: 'pi pi-users', label: 'Partners' },
    { path: '/settings', icon: 'pi pi-cog', label: 'Settings' }
  ];

  return (
    <>
      {sidebarVisible && (
        <div className="app-overlay hide-desktop" onClick={toggleSidebar} />
      )}

      <aside
        className={`app-sidebar ${sidebarVisible ? 'is-visible' : ''}`}
      >
        <div className="app-sidebar__top">
          <div className="app-sidebar__brand">
            <div className="app-sidebar__logo">
              <i className="pi pi-wallet"></i>
            </div>
            <div>
              <span className="app-sidebar__title">BillBird</span>
              <p className="app-sidebar__caption">Shared expenses, tuned for daily use.</p>
            </div>
          </div>
          <Button
            icon="pi pi-times"
            className="p-button-text p-button-rounded p-button-sm hide-desktop"
            onClick={toggleSidebar}
          />
        </div>

        <div className="app-sidebar__section-label">Navigation</div>

        <nav className="app-sidebar__nav">
          <ul className="app-sidebar__list">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `app-sidebar__link ${isActive ? 'is-active' : ''}`
                  }
                  onClick={() => {
                    if (window.innerWidth < 992) {
                      toggleSidebar();
                    }
                  }}
                >
                  <span className="app-sidebar__icon">
                    <i className={item.icon}></i>
                  </span>
                  <span className="app-sidebar__text">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__footer-card">
            <span className="app-sidebar__footer-title">Mobile-first workspace</span>
            <p>Track bills, partners, and backups comfortably from a phone or tablet.</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
