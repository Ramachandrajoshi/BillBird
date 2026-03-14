import Dexie from 'dexie';

export const db = new Dexie('BillBirdDB');

db.version(1).stores({
  billTypes: '++id, name, category, splitType, createdAt, updatedAt',
  partners: '++id, name, email, phone, createdAt',
  bills: '++id, billTypeId, title, totalAmount, billDate, status, createdAt, updatedAt',
  billEntries: '++id, billId, partnerId, lastUsage, currentUsage, splitAmount, paid'
});

db.version(2)
  .stores({
    billTypes: '++id, name, category, splitType, createdAt, updatedAt',
    partners: '++id, name, email, phone, createdAt',
    bills: '++id, billTypeId, title, totalAmount, billDate, status, createdAt, updatedAt',
    billEntries: '++id, billId, billTypeId, partnerId, [partnerId+billTypeId], lastUsage, currentUsage, splitAmount, paid'
  })
  .upgrade(async (tx) => {
    const bills = await tx.table('bills').toArray();
    const billTypeMap = new Map(bills.map((bill) => [bill.id, bill.billTypeId]));

    await tx
      .table('billEntries')
      .toCollection()
      .modify((entry) => {
        if (!entry.billTypeId) {
          entry.billTypeId = billTypeMap.get(entry.billId) || null;
        }
      });
  });

// Bill Types
export const billTypesTable = db.billTypes;
export const partnersTable = db.partners;
export const billsTable = db.bills;
export const billEntriesTable = db.billEntries;

const defaultBillTypeDefinitions = [
  { name: 'Water', category: 'usage', splitType: 'usage', fields: ['lastUsage', 'currentUsage', 'lastReadDate', 'currentReadDate'] },
  { name: 'Electricity', category: 'usage', splitType: 'usage', fields: ['lastUsage', 'currentUsage', 'lastReadDate', 'currentReadDate'] },
  { name: 'Lunch', category: 'fixed', splitType: 'equal', fields: [] },
  { name: 'Cab Fee', category: 'fixed', splitType: 'ratio', fields: [] },
  { name: 'Travel Fee', category: 'fixed', splitType: 'percentage', fields: [] },
];

// Singleton promise — ensures concurrent calls (e.g. React 18 Strict Mode double-effect)
// share one execution. Resets after completion so subsequent independent calls run fresh.
let _initPromise = null;

export const initializeDefaultBillTypes = () => {
  if (!_initPromise) {
    _initPromise = _runInitialization();
    _initPromise.finally(() => { _initPromise = null; });
  }
  return _initPromise;
};

const _runInitialization = async () => {
  const existing = await billTypesTable.toArray();

  // 1. Deduplicate by name — keep the record with the lowest id, delete extras
  const seenNames = new Set();
  const dupIds = [];
  for (const bt of [...existing].sort((a, b) => a.id - b.id)) {
    if (seenNames.has(bt.name)) {
      dupIds.push(bt.id);
    } else {
      seenNames.add(bt.name);
    }
  }
  if (dupIds.length > 0) {
    await billTypesTable.bulkDelete(dupIds);
  }

  // 2. Add any default types that are still missing
  const currentNames = new Set((await billTypesTable.toArray()).map((bt) => bt.name));
  const toAdd = defaultBillTypeDefinitions
    .filter((dt) => !currentNames.has(dt.name))
    .map((dt) => ({ ...dt, createdAt: new Date(), updatedAt: new Date() }));
  if (toAdd.length > 0) {
    await billTypesTable.bulkAdd(toAdd);
  }
};

export default db;
