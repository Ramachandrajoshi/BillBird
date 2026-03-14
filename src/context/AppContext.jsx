import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, initializeDefaultBillTypes } from '../db/database';
import { useLiveQuery } from 'dexie-react-hooks';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.innerWidth >= 1100;
  });
  const [toast, setToast] = useState(null);

  // Live queries for real-time data
  const billTypes = useLiveQuery(() => db.billTypes.toArray(), []);
  const partners = useLiveQuery(() => db.partners.toArray(), []);
  const bills = useLiveQuery(() => db.bills.toArray(), []);
  const billEntries = useLiveQuery(() => db.billEntries.toArray(), []);

  // Initialize database
  useEffect(() => {
    const init = async () => {
      try {
        await initializeDefaultBillTypes();
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const syncSidebarWithViewport = () => {
      setSidebarVisible(window.innerWidth >= 1100);
    };

    window.addEventListener('resize', syncSidebarWithViewport);
    return () => window.removeEventListener('resize', syncSidebarWithViewport);
  }, []);

  // Toast notifications
  const showToast = useCallback((severity, summary, detail, life = 3000) => {
    setToast({ severity, summary, detail, life });
  }, []);

  const clearToast = useCallback(() => {
    setToast(null);
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  // Bill Type operations
  const addBillType = async (billType) => {
    try {
      const id = await db.billTypes.add({
        ...billType,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      showToast('success', 'Success', 'Bill type created successfully');
      return id;
    } catch (error) {
      showToast('error', 'Error', 'Failed to create bill type');
      throw error;
    }
  };

  const updateBillType = async (id, updates) => {
    try {
      await db.billTypes.update(id, {
        ...updates,
        updatedAt: new Date()
      });
      showToast('success', 'Success', 'Bill type updated successfully');
    } catch (error) {
      showToast('error', 'Error', 'Failed to update bill type');
      throw error;
    }
  };

  const deleteBillType = async (id) => {
    try {
      await db.billTypes.delete(id);
      showToast('success', 'Success', 'Bill type deleted successfully');
    } catch (error) {
      showToast('error', 'Error', 'Failed to delete bill type');
      throw error;
    }
  };

  // Partner operations
  const addPartner = async (partner) => {
    try {
      const id = await db.partners.add({
        ...partner,
        createdAt: new Date()
      });
      showToast('success', 'Success', 'Partner added successfully');
      return id;
    } catch (error) {
      showToast('error', 'Error', 'Failed to add partner');
      throw error;
    }
  };

  const updatePartner = async (id, updates) => {
    try {
      await db.partners.update(id, updates);
      showToast('success', 'Success', 'Partner updated successfully');
    } catch (error) {
      showToast('error', 'Error', 'Failed to update partner');
      throw error;
    }
  };

  const deletePartner = async (id) => {
    try {
      await db.partners.delete(id);
      showToast('success', 'Success', 'Partner deleted successfully');
    } catch (error) {
      showToast('error', 'Error', 'Failed to delete partner');
      throw error;
    }
  };

  // Bill operations
  const addBill = async (bill, entries) => {
    try {
      const billId = await db.bills.add({
        ...bill,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const entriesWithBillId = entries.map(entry => ({
        ...entry,
        billId,
        billTypeId: bill.billTypeId
      }));

      await db.billEntries.bulkAdd(entriesWithBillId);
      showToast('success', 'Success', 'Bill created successfully');
      return billId;
    } catch (error) {
      showToast('error', 'Error', 'Failed to create bill');
      throw error;
    }
  };

  const updateBill = async (id, billUpdates, entries) => {
    try {
      await db.bills.update(id, {
        ...billUpdates,
        updatedAt: new Date()
      });

      // Delete old entries and add new ones
      await db.billEntries.where('billId').equals(id).delete();
      const entriesWithBillId = entries.map(entry => ({
        ...entry,
        billId: id,
        billTypeId: billUpdates.billTypeId
      }));
      await db.billEntries.bulkAdd(entriesWithBillId);

      showToast('success', 'Success', 'Bill updated successfully');
    } catch (error) {
      showToast('error', 'Error', 'Failed to update bill');
      throw error;
    }
  };

  const deleteBill = async (id) => {
    try {
      await db.billEntries.where('billId').equals(id).delete();
      await db.bills.delete(id);
      showToast('success', 'Success', 'Bill deleted successfully');
    } catch (error) {
      showToast('error', 'Error', 'Failed to delete bill');
      throw error;
    }
  };

  // Get bill entries for a specific bill
  const getBillEntries = async (billId) => {
    return await db.billEntries.where('billId').equals(billId).toArray();
  };

  // Get last usage for a bill type and partner
  const getLastUsage = async (billTypeId, partnerId) => {
    const relevantEntries = await db.billEntries
      .where('[partnerId+billTypeId]')
      .equals([partnerId, billTypeId])
      .toArray();

    if (relevantEntries.length === 0) return null;

    // Sort by bill date descending
    const sortedEntries = relevantEntries.sort((a, b) => {
      const dateA = a.currentReadDate || a.createdAt || 0;
      const dateB = b.currentReadDate || b.createdAt || 0;
      return new Date(dateB) - new Date(dateA);
    });

    return sortedEntries[0];
  };

  // Export all data
  const exportData = async () => {
    try {
      const data = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        billTypes: await db.billTypes.toArray(),
        partners: await db.partners.toArray(),
        bills: await db.bills.toArray(),
        billEntries: await db.billEntries.toArray()
      };
      return data;
    } catch (error) {
      showToast('error', 'Error', 'Failed to export data');
      throw error;
    }
  };

  // Import data
  const importData = async (data) => {
    try {
      await db.transaction('rw', db.billTypes, db.partners, db.bills, db.billEntries, async () => {
        // Clear existing data
        await db.billTypes.clear();
        await db.partners.clear();
        await db.bills.clear();
        await db.billEntries.clear();

        // Import new data
        if (data.billTypes?.length) {
          await db.billTypes.bulkAdd(data.billTypes);
        }
        if (data.partners?.length) {
          await db.partners.bulkAdd(data.partners);
        }
        if (data.bills?.length) {
          await db.bills.bulkAdd(data.bills);
        }
        if (data.billEntries?.length) {
          const normalizedEntries = data.billEntries.map((entry) => {
            if (entry.billTypeId) {
              return entry;
            }

            const matchedBill = data.bills?.find((bill) => bill.id === entry.billId);
            return {
              ...entry,
              billTypeId: matchedBill?.billTypeId || null
            };
          });

          await db.billEntries.bulkAdd(normalizedEntries);
        }
      });
      showToast('success', 'Success', 'Data imported successfully');
    } catch (error) {
      showToast('error', 'Error', 'Failed to import data');
      throw error;
    }
  };

  const value = {
    loading,
    sidebarVisible,
    toggleSidebar,
    toast,
    showToast,
    clearToast,
    billTypes: billTypes || [],
    partners: partners || [],
    bills: bills || [],
    billEntries: billEntries || [],
    addBillType,
    updateBillType,
    deleteBillType,
    addPartner,
    updatePartner,
    deletePartner,
    addBill,
    updateBill,
    deleteBill,
    getBillEntries,
    getLastUsage,
    exportData,
    importData
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
