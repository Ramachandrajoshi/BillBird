import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock functions
const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockAutoTable = vi.fn();

// Mock jsPDF before importing the module
vi.mock('jspdf', () => {
  const MockJsPDF = vi.fn().mockImplementation(function() {
    this.save = mockSave;
    this.text = mockText;
    this.setFontSize = mockSetFontSize;
    this.setTextColor = mockSetTextColor;
    this.autoTable = mockAutoTable;
    this.internal = {
      pageSize: {
        height: 297
      }
    };
    this.lastAutoTable = {
      finalY: 100
    };
  });
  
  return {
    default: MockJsPDF
  };
});

vi.mock('jspdf-autotable', () => ({}));

// Import after mocking
import { generateBillPDF, generateAllBillsPDF } from '../utils/pdfGenerator';

describe('PDF Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBillPDF', () => {
    const mockBill = {
      id: 1,
      title: 'Test Bill',
      totalAmount: 1000,
      billDate: new Date('2024-01-15'),
      status: 'pending',
      description: 'Test description',
      dueDate: new Date('2024-01-30')
    };

    const mockEntries = [
      {
        id: 1,
        billId: 1,
        partnerId: 1,
        lastUsage: 100,
        currentUsage: 150,
        splitAmount: 500,
        paid: true
      },
      {
        id: 2,
        billId: 1,
        partnerId: 2,
        lastUsage: 200,
        currentUsage: 250,
        splitAmount: 500,
        paid: false
      }
    ];

    const mockPartners = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];

    const mockBillType = {
      id: 1,
      name: 'Electricity',
      category: 'usage',
      splitType: 'usage'
    };

    it('should generate PDF for a single bill', () => {
      generateBillPDF(mockBill, mockEntries, mockPartners, mockBillType);

      expect(mockSetFontSize).toHaveBeenCalled();
      expect(mockSetTextColor).toHaveBeenCalled();
      expect(mockText).toHaveBeenCalled();
      expect(mockAutoTable).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should call save with correct filename format', () => {
      generateBillPDF(mockBill, mockEntries, mockPartners, mockBillType);

      expect(mockSave).toHaveBeenCalledWith(
        expect.stringContaining('Test_Bill')
      );
      expect(mockSave).toHaveBeenCalledWith(
        expect.stringContaining('2024-01-15')
      );
    });

    it('should include bill details in PDF', () => {
      generateBillPDF(mockBill, mockEntries, mockPartners, mockBillType);

      // Check that text was called with bill title
      expect(mockText).toHaveBeenCalledWith(
        'Test Bill',
        expect.any(Number),
        expect.any(Number)
      );

      // Check that text was called with total amount
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('1000'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should include partner split details in table', () => {
      generateBillPDF(mockBill, mockEntries, mockPartners, mockBillType);

      expect(mockAutoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          head: expect.arrayContaining([expect.arrayContaining(['Partner'])]),
          body: expect.any(Array)
        })
      );
    });

    it('should include usage details for usage-based bills', () => {
      generateBillPDF(mockBill, mockEntries, mockPartners, mockBillType);

      expect(mockAutoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          head: expect.arrayContaining([
            expect.arrayContaining(['Last Usage', 'Current Usage', 'Usage'])
          ])
        })
      );
    });

    it('should not include usage details for fixed bills', () => {
      const fixedBillType = {
        id: 2,
        name: 'Internet',
        category: 'fixed',
        splitType: 'equal'
      };

      generateBillPDF(mockBill, mockEntries, mockPartners, fixedBillType);

      expect(mockAutoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          head: expect.arrayContaining([
            expect.not.arrayContaining(['Last Usage', 'Current Usage', 'Usage'])
          ])
        })
      );
    });

    it('should include summary section', () => {
      generateBillPDF(mockBill, mockEntries, mockPartners, mockBillType);

      // Check for summary text
      expect(mockText).toHaveBeenCalledWith(
        'Summary',
        expect.any(Number),
        expect.any(Number)
      );

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Total Paid'),
        expect.any(Number),
        expect.any(Number)
      );

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Total Pending'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should calculate paid and pending amounts correctly', () => {
      generateBillPDF(mockBill, mockEntries, mockPartners, mockBillType);

      // Total paid should be 500 (first entry)
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('500.00'),
        expect.any(Number),
        expect.any(Number)
      );

      // Total pending should be 500 (second entry)
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('500.00'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle bill without description', () => {
      const billWithoutDescription = {
        ...mockBill,
        description: undefined
      };

      generateBillPDF(billWithoutDescription, mockEntries, mockPartners, mockBillType);

      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle bill without due date', () => {
      const billWithoutDueDate = {
        ...mockBill,
        dueDate: undefined
      };

      generateBillPDF(billWithoutDueDate, mockEntries, mockPartners, mockBillType);

      expect(mockSave).toHaveBeenCalled();
    });

    it('should handle unknown partner', () => {
      const entriesWithUnknownPartner = [
        {
          id: 1,
          billId: 1,
          partnerId: 999, // Non-existent partner
          lastUsage: 100,
          currentUsage: 150,
          splitAmount: 500,
          paid: false
        }
      ];

      generateBillPDF(mockBill, entriesWithUnknownPartner, mockPartners, mockBillType);

      expect(mockAutoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.arrayContaining([expect.stringContaining('Unknown')])
          ])
        })
      );
    });
  });

  describe('generateAllBillsPDF', () => {
    const mockBills = [
      {
        id: 1,
        billTypeId: 1,
        title: 'Bill 1',
        totalAmount: 1000,
        billDate: new Date('2024-01-15'),
        status: 'paid'
      },
      {
        id: 2,
        billTypeId: 2,
        title: 'Bill 2',
        totalAmount: 2000,
        billDate: new Date('2024-01-20'),
        status: 'pending'
      }
    ];

    const mockBillTypes = [
      { id: 1, name: 'Electricity', category: 'usage', splitType: 'usage' },
      { id: 2, name: 'Internet', category: 'fixed', splitType: 'equal' }
    ];

    const mockPartners = [
      { id: 1, name: 'John Doe', email: 'john@example.com' }
    ];

    const mockBillEntries = [
      { id: 1, billId: 1, partnerId: 1, splitAmount: 1000, paid: true }
    ];

    it('should generate PDF report for all bills', () => {
      generateAllBillsPDF(mockBills, mockBillEntries, mockPartners, mockBillTypes);

      expect(mockSetFontSize).toHaveBeenCalled();
      expect(mockSetTextColor).toHaveBeenCalled();
      expect(mockText).toHaveBeenCalled();
      expect(mockAutoTable).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });

    it('should call save with correct filename format', () => {
      generateAllBillsPDF(mockBills, mockBillEntries, mockPartners, mockBillTypes);

      expect(mockSave).toHaveBeenCalledWith(
        expect.stringContaining('billbird_report')
      );
    });

    it('should include summary statistics', () => {
      generateAllBillsPDF(mockBills, mockBillEntries, mockPartners, mockBillTypes);

      // Check for total bills count
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('2'),
        expect.any(Number),
        expect.any(Number)
      );

      // Check for total amount
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('3000'),
        expect.any(Number),
        expect.any(Number)
      );

      // Check for paid/pending counts
      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Paid: 1'),
        expect.any(Number),
        expect.any(Number)
      );

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('Pending: 1'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should include bills table with correct columns', () => {
      generateAllBillsPDF(mockBills, mockBillEntries, mockPartners, mockBillTypes);

      expect(mockAutoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          head: expect.arrayContaining([
            expect.arrayContaining(['Title', 'Type', 'Amount', 'Date', 'Status'])
          ])
        })
      );
    });

    it('should include all bills in table body', () => {
      generateAllBillsPDF(mockBills, mockBillEntries, mockPartners, mockBillTypes);

      expect(mockAutoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.arrayContaining(['Bill 1']),
            expect.arrayContaining(['Bill 2'])
          ])
        })
      );
    });

    it('should handle empty bills array', () => {
      generateAllBillsPDF([], mockBillEntries, mockPartners, mockBillTypes);

      expect(mockText).toHaveBeenCalledWith(
        expect.stringContaining('0'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should handle unknown bill type', () => {
      const billsWithUnknownType = [
        {
          id: 1,
          billTypeId: 999, // Non-existent bill type
          title: 'Bill 1',
          totalAmount: 1000,
          billDate: new Date('2024-01-15'),
          status: 'paid'
        }
      ];

      generateAllBillsPDF(billsWithUnknownType, mockBillEntries, mockPartners, mockBillTypes);

      expect(mockAutoTable).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.arrayContaining([
            expect.arrayContaining([expect.stringContaining('Unknown')])
          ])
        })
      );
    });
  });
});
