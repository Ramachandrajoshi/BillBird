import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, initializeDefaultBillTypes, billTypesTable, partnersTable, billsTable, billEntriesTable } from '../db/database';

describe('Database Operations', () => {
  beforeEach(async () => {
    // Clear all tables before each test
    await db.billTypes.clear();
    await db.partners.clear();
    await db.bills.clear();
    await db.billEntries.clear();
  });

  afterEach(async () => {
    // Clear all tables after each test
    await db.billTypes.clear();
    await db.partners.clear();
    await db.bills.clear();
    await db.billEntries.clear();
  });

  describe('initializeDefaultBillTypes', () => {
    it('should initialize default bill types when database is empty', async () => {
      await initializeDefaultBillTypes();
      
      const billTypes = await billTypesTable.toArray();
      expect(billTypes.length).toBe(5);
      
      // Check for specific default bill types
      const waterBill = billTypes.find(bt => bt.name === 'Water');
      expect(waterBill).toBeDefined();
      expect(waterBill.category).toBe('usage');
      expect(waterBill.splitType).toBe('usage');
      
      const electricityBill = billTypes.find(bt => bt.name === 'Electricity');
      expect(electricityBill).toBeDefined();
      expect(electricityBill.category).toBe('usage');
      
      const lunchBill = billTypes.find(bt => bt.name === 'Lunch');
      expect(lunchBill).toBeDefined();
      expect(lunchBill.category).toBe('fixed');
      expect(lunchBill.splitType).toBe('equal');

      const cabBill = billTypes.find(bt => bt.name === 'Cab Fee');
      expect(cabBill).toBeDefined();
      expect(cabBill.splitType).toBe('ratio');

      const gasBill = billTypes.find(bt => bt.name === 'Gas');
      expect(gasBill).toBeUndefined();
    });

    it('should not add duplicate bill types if already initialized', async () => {
      await initializeDefaultBillTypes();
      const firstCount = await billTypesTable.count();
      
      await initializeDefaultBillTypes();
      const secondCount = await billTypesTable.count();
      
      expect(firstCount).toBe(secondCount);
    });

    it('should not create duplicates when called concurrently (React StrictMode)', async () => {
      await Promise.all([
        initializeDefaultBillTypes(),
        initializeDefaultBillTypes(),
        initializeDefaultBillTypes(),
      ]);
      const billTypes = await billTypesTable.toArray();
      expect(billTypes.length).toBe(5);
    });

    it('should deduplicate existing entries already in the database', async () => {
      // Simulate duplicates already written (e.g. from a previous buggy run)
      const now = new Date();
      await billTypesTable.bulkAdd([
        { name: 'Water', category: 'usage', splitType: 'usage', fields: [], createdAt: now, updatedAt: now },
        { name: 'Water', category: 'usage', splitType: 'usage', fields: [], createdAt: now, updatedAt: now },
        { name: 'Electricity', category: 'usage', splitType: 'usage', fields: [], createdAt: now, updatedAt: now },
        { name: 'Electricity', category: 'usage', splitType: 'usage', fields: [], createdAt: now, updatedAt: now },
      ]);

      await initializeDefaultBillTypes();

      const billTypes = await billTypesTable.toArray();
      const names = billTypes.map((bt) => bt.name);
      // Each name should appear exactly once
      expect(names.filter((n) => n === 'Water').length).toBe(1);
      expect(names.filter((n) => n === 'Electricity').length).toBe(1);
    });

    it('should preserve existing records and add missing default bill types', async () => {
      await billTypesTable.bulkAdd([
        {
          name: 'Water',
          category: 'usage',
          splitType: 'usage',
          fields: ['lastUsage', 'currentUsage', 'lastReadDate', 'currentReadDate'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Gas',
          category: 'usage',
          splitType: 'usage',
          fields: ['lastUsage', 'currentUsage', 'lastReadDate', 'currentReadDate'],
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          name: 'Dinner',
          category: 'fixed',
          splitType: 'equal',
          fields: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]);

      await initializeDefaultBillTypes();

      const billTypes = await billTypesTable.toArray();
      expect(billTypes.find(bt => bt.name === 'Gas')).toBeDefined();
      expect(billTypes.find(bt => bt.name === 'Dinner')).toBeDefined();
      expect(billTypes.find(bt => bt.name === 'Water')).toBeDefined();
      expect(billTypes.find(bt => bt.name === 'Electricity')).toBeDefined();
      expect(billTypes.find(bt => bt.name === 'Cab Fee')).toBeDefined();
      expect(billTypes.find(bt => bt.name === 'Travel Fee')).toBeDefined();
    });

    it('should keep legacy default bill types that are already in use', async () => {
      const legacyTypeId = await billTypesTable.add({
        name: 'Gas',
        category: 'usage',
        splitType: 'usage',
        fields: ['lastUsage', 'currentUsage', 'lastReadDate', 'currentReadDate'],
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await billsTable.add({
        billTypeId: legacyTypeId,
        title: 'Gas Bill',
        totalAmount: 1000,
        billDate: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await initializeDefaultBillTypes();

      const retainedBillType = await billTypesTable.get(legacyTypeId);
      expect(retainedBillType).toBeDefined();
      expect(retainedBillType.name).toBe('Gas');
    });
  });

  describe('Bill Types CRUD', () => {
    it('should add a new bill type', async () => {
      const newBillType = {
        name: 'Custom Bill',
        category: 'fixed',
        splitType: 'percentage',
        fields: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const id = await billTypesTable.add(newBillType);
      expect(id).toBeDefined();
      
      const retrieved = await billTypesTable.get(id);
      expect(retrieved.name).toBe('Custom Bill');
      expect(retrieved.category).toBe('fixed');
    });

    it('should update a bill type', async () => {
      const id = await billTypesTable.add({
        name: 'Test Bill',
        category: 'fixed',
        splitType: 'equal',
        fields: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await billTypesTable.update(id, { name: 'Updated Bill', splitType: 'percentage' });
      
      const updated = await billTypesTable.get(id);
      expect(updated.name).toBe('Updated Bill');
      expect(updated.splitType).toBe('percentage');
    });

    it('should delete a bill type', async () => {
      const id = await billTypesTable.add({
        name: 'Test Bill',
        category: 'fixed',
        splitType: 'equal',
        fields: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await billTypesTable.delete(id);
      
      const deleted = await billTypesTable.get(id);
      expect(deleted).toBeUndefined();
    });

    it('should get all bill types', async () => {
      await billTypesTable.bulkAdd([
        { name: 'Bill 1', category: 'fixed', splitType: 'equal', fields: [], createdAt: new Date(), updatedAt: new Date() },
        { name: 'Bill 2', category: 'usage', splitType: 'usage', fields: [], createdAt: new Date(), updatedAt: new Date() }
      ]);
      
      const allBillTypes = await billTypesTable.toArray();
      expect(allBillTypes.length).toBe(2);
    });
  });

  describe('Partners CRUD', () => {
    it('should add a new partner', async () => {
      const newPartner = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        createdAt: new Date()
      };
      
      const id = await partnersTable.add(newPartner);
      expect(id).toBeDefined();
      
      const retrieved = await partnersTable.get(id);
      expect(retrieved.name).toBe('John Doe');
      expect(retrieved.email).toBe('john@example.com');
    });

    it('should update a partner', async () => {
      const id = await partnersTable.add({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '0987654321',
        createdAt: new Date()
      });
      
      await partnersTable.update(id, { name: 'Jane Smith', phone: '1111111111' });
      
      const updated = await partnersTable.get(id);
      expect(updated.name).toBe('Jane Smith');
      expect(updated.phone).toBe('1111111111');
    });

    it('should delete a partner', async () => {
      const id = await partnersTable.add({
        name: 'Test Partner',
        email: 'test@example.com',
        phone: '1234567890',
        createdAt: new Date()
      });
      
      await partnersTable.delete(id);
      
      const deleted = await partnersTable.get(id);
      expect(deleted).toBeUndefined();
    });
  });

  describe('Bills CRUD', () => {
    let billTypeId;
    
    beforeEach(async () => {
      billTypeId = await billTypesTable.add({
        name: 'Test Bill Type',
        category: 'fixed',
        splitType: 'equal',
        fields: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });

    it('should add a new bill', async () => {
      const newBill = {
        billTypeId,
        title: 'Test Bill',
        description: 'Test description',
        totalAmount: 1000,
        billDate: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const id = await billsTable.add(newBill);
      expect(id).toBeDefined();
      
      const retrieved = await billsTable.get(id);
      expect(retrieved.title).toBe('Test Bill');
      expect(retrieved.totalAmount).toBe(1000);
    });

    it('should update a bill', async () => {
      const id = await billsTable.add({
        billTypeId,
        title: 'Original Bill',
        totalAmount: 500,
        billDate: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await billsTable.update(id, { title: 'Updated Bill', totalAmount: 750, status: 'paid' });
      
      const updated = await billsTable.get(id);
      expect(updated.title).toBe('Updated Bill');
      expect(updated.totalAmount).toBe(750);
      expect(updated.status).toBe('paid');
    });

    it('should delete a bill', async () => {
      const id = await billsTable.add({
        billTypeId,
        title: 'Test Bill',
        totalAmount: 100,
        billDate: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await billsTable.delete(id);
      
      const deleted = await billsTable.get(id);
      expect(deleted).toBeUndefined();
    });

    it('should get bills by bill type', async () => {
      const anotherBillTypeId = await billTypesTable.add({
        name: 'Another Bill Type',
        category: 'fixed',
        splitType: 'equal',
        fields: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await billsTable.bulkAdd([
        { billTypeId, title: 'Bill 1', totalAmount: 100, billDate: new Date(), status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { billTypeId, title: 'Bill 2', totalAmount: 200, billDate: new Date(), status: 'pending', createdAt: new Date(), updatedAt: new Date() },
        { billTypeId: anotherBillTypeId, title: 'Bill 3', totalAmount: 300, billDate: new Date(), status: 'pending', createdAt: new Date(), updatedAt: new Date() }
      ]);
      
      const billsForType = await billsTable.where('billTypeId').equals(billTypeId).toArray();
      expect(billsForType.length).toBe(2);
    });
  });

  describe('Bill Entries CRUD', () => {
    let billId, partnerId;
    
    beforeEach(async () => {
      const billTypeId = await billTypesTable.add({
        name: 'Test Bill Type',
        category: 'usage',
        splitType: 'usage',
        fields: ['lastUsage', 'currentUsage'],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      billId = await billsTable.add({
        billTypeId,
        title: 'Test Bill',
        totalAmount: 1000,
        billDate: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      partnerId = await partnersTable.add({
        name: 'Test Partner',
        email: 'test@example.com',
        phone: '1234567890',
        createdAt: new Date()
      });
    });

    it('should add a new bill entry', async () => {
      const newEntry = {
        billId,
        partnerId,
        lastUsage: 100,
        currentUsage: 150,
        splitAmount: 500,
        paid: false
      };
      
      const id = await billEntriesTable.add(newEntry);
      expect(id).toBeDefined();
      
      const retrieved = await billEntriesTable.get(id);
      expect(retrieved.billId).toBe(billId);
      expect(retrieved.partnerId).toBe(partnerId);
      expect(retrieved.lastUsage).toBe(100);
      expect(retrieved.currentUsage).toBe(150);
    });

    it('should update a bill entry', async () => {
      const id = await billEntriesTable.add({
        billId,
        partnerId,
        lastUsage: 100,
        currentUsage: 150,
        splitAmount: 500,
        paid: false
      });
      
      await billEntriesTable.update(id, { currentUsage: 200, splitAmount: 600, paid: true });
      
      const updated = await billEntriesTable.get(id);
      expect(updated.currentUsage).toBe(200);
      expect(updated.splitAmount).toBe(600);
      expect(updated.paid).toBe(true);
    });

    it('should delete a bill entry', async () => {
      const id = await billEntriesTable.add({
        billId,
        partnerId,
        lastUsage: 100,
        currentUsage: 150,
        splitAmount: 500,
        paid: false
      });
      
      await billEntriesTable.delete(id);
      
      const deleted = await billEntriesTable.get(id);
      expect(deleted).toBeUndefined();
    });

    it('should get entries by bill id', async () => {
      const partner2Id = await partnersTable.add({
        name: 'Partner 2',
        email: 'partner2@example.com',
        phone: '0987654321',
        createdAt: new Date()
      });
      
      await billEntriesTable.bulkAdd([
        { billId, partnerId, lastUsage: 100, currentUsage: 150, splitAmount: 500, paid: false },
        { billId, partnerId: partner2Id, lastUsage: 200, currentUsage: 250, splitAmount: 500, paid: false }
      ]);
      
      const entriesForBill = await billEntriesTable.where('billId').equals(billId).toArray();
      expect(entriesForBill.length).toBe(2);
    });

    it('should get entries by partner id', async () => {
      const bill2Id = await billsTable.add({
        billTypeId: (await billTypesTable.toArray())[0].id,
        title: 'Test Bill 2',
        totalAmount: 2000,
        billDate: new Date(),
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await billEntriesTable.bulkAdd([
        { billId, partnerId, lastUsage: 100, currentUsage: 150, splitAmount: 500, paid: false },
        { billId: bill2Id, partnerId, lastUsage: 200, currentUsage: 300, splitAmount: 1000, paid: false }
      ]);
      
      const entriesForPartner = await billEntriesTable.where('partnerId').equals(partnerId).toArray();
      expect(entriesForPartner.length).toBe(2);
    });
  });
});
