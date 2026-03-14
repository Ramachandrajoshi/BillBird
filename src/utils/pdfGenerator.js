import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

export const generateBillPDF = (bill, entries, partners, billType, allBills = []) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110); // Primary teal color
  doc.text('BillBird', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Secondary color
  doc.text('Bill Dividing App', 14, 30);
  
  // Bill Title
  doc.setFontSize(16);
  doc.setTextColor(30, 41, 59); // Text color
  doc.text(bill.title, 14, 45);
  
  // Bill Details
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  
  const details = [
    ['Bill Type:', billType?.name || 'Unknown'],
    ['Bill Date:', format(new Date(bill.billDate), 'dd MMM yyyy')],
    ['Total Amount:', `${Number(bill.totalAmount || 0).toFixed(4)}`],
    ['Status:', bill.status.charAt(0).toUpperCase() + bill.status.slice(1)]
  ];

  if (billType?.category === 'usage') {
    const firstEntry = entries[0];
    details.push(['Old Reading Date:', firstEntry?.lastReadDate ? format(new Date(firstEntry.lastReadDate), 'dd MMM yyyy') : '-']);
    details.push(['Current Reading Date:', firstEntry?.currentReadDate ? format(new Date(firstEntry.currentReadDate), 'dd MMM yyyy') : '-']);
  }
  
  if (bill.dueDate) {
    details.push(['Due Date:', format(new Date(bill.dueDate), 'dd MMM yyyy')]);
  }
  
  if (bill.description) {
    details.push(['Description:', bill.description]);
  }
  
  let yPos = 55;
  details.forEach(([label, value]) => {
    doc.setTextColor(100, 116, 139);
    doc.text(label, 14, yPos);
    doc.setTextColor(30, 41, 59);
    doc.text(value, 60, yPos);
    yPos += 7;
  });
  
  // Partner Split Table
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text('Partner Split Details', 14, yPos);
  
  yPos += 5;
  
  const totalUsage = entries.reduce((sum, entry) => sum + Math.max(0, (entry.currentUsage || 0) - (entry.lastUsage || 0)), 0);

  let previousBillAmount = 0;
  if (billType?.category === 'usage' && Array.isArray(allBills)) {
    const olderBill = [...allBills]
      .filter((candidate) => candidate.billTypeId === bill.billTypeId && new Date(candidate.billDate) < new Date(bill.billDate))
      .sort((a, b) => new Date(b.billDate) - new Date(a.billDate))[0];
    previousBillAmount = Number(olderBill?.totalAmount || 0);
  }

  // Prepare table data
  const tableData = entries.map(entry => {
    const partner = partners.find(p => p.id === entry.partnerId);
    const partnerName = partner ? partner.name : 'Unknown';
    const used = Math.max(0, (entry.currentUsage || 0) - (entry.lastUsage || 0));
    const usedPct = totalUsage > 0 ? (used / totalUsage) * 100 : 0;
    const currentSplit = Number(entry.splitAmount || 0);
    const previousSplitByPct = previousBillAmount > 0 ? (previousBillAmount * usedPct) / 100 : 0;

    if (billType?.category === 'usage') {
      return [
        partnerName,
        Number(entry.lastUsage || 0).toFixed(4),
        Number(entry.currentUsage || 0).toFixed(4),
        used.toFixed(4),
        usedPct.toFixed(6),
        currentSplit.toFixed(4),
        previousSplitByPct.toFixed(6)
      ];
    }

    return [
      partnerName,
      Number(entry.splitAmount || 0).toFixed(4),
      entry.paid ? 'Paid' : 'Pending'
    ];
  });
  
  // Table headers
  const headers = billType?.category === 'usage'
    ? ['Partner', 'Old Reading', 'Current Reading', 'Used', '% Used', 'Current Split', 'Prev Bill by %']
    : ['Partner', 'Amount', 'Status'];
  
  // Generate table
  doc.autoTable({
    head: [headers],
    body: tableData,
    startY: yPos,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 253, 250]
    },
    columnStyles: billType?.category === 'usage'
      ? {
        0: { cellWidth: 30 },
        1: { cellWidth: 22, halign: 'right' },
        2: { cellWidth: 22, halign: 'right' },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 18, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 26, halign: 'right' }
      }
      : {
        0: { cellWidth: 40 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 25, halign: 'center' }
      }
  });
  
  // Summary
  const finalY = doc.lastAutoTable.finalY + 10;
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('Summary', 14, finalY);
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  
  const totalPaid = entries.filter(e => e.paid).reduce((sum, e) => sum + (e.splitAmount || 0), 0);
  const totalPending = entries.filter(e => !e.paid).reduce((sum, e) => sum + (e.splitAmount || 0), 0);
  
  doc.text(`Total Amount: ${Number(bill.totalAmount || 0).toFixed(4)}`, 14, finalY + 8);
  doc.text(`Total Paid: ${totalPaid.toFixed(4)}`, 14, finalY + 15);
  doc.text(`Total Pending: ${totalPending.toFixed(4)}`, 14, finalY + 22);

  if (billType?.category === 'usage') {
    doc.text(`Total Used: ${totalUsage.toFixed(4)}`, 14, finalY + 29);
    if (previousBillAmount > 0) {
      doc.text(`Previous Bill Amount: ${previousBillAmount.toFixed(4)}`, 14, finalY + 36);
    }
  }
  
  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Generated by BillBird on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    14,
    pageHeight - 10
  );
  
  // Save PDF
  const fileName = `${bill.title.replace(/[^a-z0-9]/gi, '_')}_${format(new Date(bill.billDate), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
};

export const generateAllBillsPDF = (bills, billEntries, partners, billTypes, options = {}) => {
  const {
    reportTitle = 'BillBird - Bills Report',
    reportSubTitle = `Generated on ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`,
    fileName = `billbird_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`
  } = options;

  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(15, 118, 110);
  doc.text(reportTitle, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(reportSubTitle, 14, 30);
  
  // Summary
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.totalAmount || 0), 0);
  const paidBills = bills.filter(b => b.status === 'paid').length;
  const pendingBills = bills.filter(b => b.status === 'pending').length;
  
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`Total Bills: ${bills.length}`, 14, 45);
  doc.text(`Total Amount: ${totalAmount.toFixed(4)}`, 14, 52);
  doc.text(`Paid: ${paidBills} | Pending: ${pendingBills}`, 14, 59);
  
  // Bills Table
  const tableData = bills.map(bill => {
    const billType = billTypes.find(t => t.id === bill.billTypeId);
    return [
      bill.title,
      billType?.name || 'Unknown',
      Number(bill.totalAmount || 0).toFixed(4),
      format(new Date(bill.billDate), 'dd/MM/yyyy'),
      bill.status.charAt(0).toUpperCase() + bill.status.slice(1)
    ];
  });
  
  doc.autoTable({
    head: [['Title', 'Type', 'Amount', 'Date', 'Status']],
    body: tableData,
    startY: 70,
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [240, 253, 250]
    }
  });
  
  doc.save(fileName);
};
