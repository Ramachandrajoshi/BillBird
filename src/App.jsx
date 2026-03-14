import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { PrimeReactProvider } from 'primereact/api';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import BillTypesPage from './pages/BillTypesPage';
import BillsPage from './pages/BillsPage';
import PartnersPage from './pages/PartnersPage';
import SettingsPage from './pages/SettingsPage';
import { AppProvider } from './context/AppContext';

function App() {
  return (
    <PrimeReactProvider>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/bill-types" element={<BillTypesPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </AppProvider>
    </PrimeReactProvider>
  );
}

export default App;
