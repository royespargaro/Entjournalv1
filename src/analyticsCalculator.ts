import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { PDFExportTemplate } from '../components/PDFExportTemplate';

export const exportToPDF = async (trades: any[], traderName: string = 'Trader', dateRange: string = 'All Time', stats: any, chartElementId: string = 'equity-curve-chart') => {
  const chartElement = document.getElementById(chartElementId);
  let chartImage = null;
  
  if (chartElement) {
    const canvas = await html2canvas(chartElement);
    chartImage = canvas.toDataURL('image/png');
  }

  // Render the PDF template to a hidden div
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  document.body.appendChild(div);
  
  const root = createRoot(div);
  root.render(<PDFExportTemplate trades={trades} traderName={traderName} dateRange={dateRange} stats={stats} chartImage={chartImage} />);
  
  // Wait a bit for images/fonts to render
  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = await html2canvas(div, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  // Handle pagination if content is taller than A4 page height
  let heightLeft = pdfHeight;
  let position = 0;
  
  doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= doc.internal.pageSize.getHeight();
  
  while (heightLeft >= 0) {
    position = heightLeft - pdfHeight;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= doc.internal.pageSize.getHeight();
  }

  doc.save(`ENTJournal-report-${new Date().toISOString().split('T')[0]}.pdf`);
  
  root.unmount();
  document.body.removeChild(div);
};

export const exportToCSV = (trades: any[]) => {
    const csvContent = [
        ["Date", "Pair", "Direction", "Entry", "Exit", "Lot", "PnL", "Result", "Session", "Setup"],
        ...trades.map(t => [t.date, t.pair, t.dir, t.entry, t.exit, t.lot, t.pnl, t.result, t.session, t.setup])
    ].map(e => e.join(",")).join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ENTJournal-trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
};

export const exportToJSON = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ENTJournal-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
};
