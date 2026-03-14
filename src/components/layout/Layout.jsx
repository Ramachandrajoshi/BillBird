import React from 'react';
import { Toast } from 'primereact/toast';
import { useRef, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useApp } from '../../context/AppContext';

const Layout = ({ children }) => {
  const { sidebarVisible, toast, clearToast } = useApp();
  const toastRef = useRef(null);

  useEffect(() => {
    if (toast && toastRef.current) {
      toastRef.current.show({
        severity: toast.severity,
        summary: toast.summary,
        detail: toast.detail,
        life: toast.life
      });
      clearToast();
    }
  }, [toast, clearToast]);

  return (
    <div className="app-shell">
      <Toast ref={toastRef} position="top-right" />
      <Sidebar />
      <div className={`app-main ${sidebarVisible ? 'sidebar-open' : ''}`}>
        <Header />
        <main className="app-content fade-in">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
