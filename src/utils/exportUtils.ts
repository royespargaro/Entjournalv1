import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

export const exportToPDF = async (trades: any[], traderName: string = 'Trader', dateRange: string = 'All Time', chartElementId: string = 'equity-curve-chart') => {
  const doc = new jsPDF();
  
  doc.text(`ENTJournal Export`, 14, 15);
  doc.text(`Trader: ${traderName}`, 14, 22);
  doc.text(`Date Range: ${dateRange}`, 14, 29);
  
  // Equity Curve Chart
  const chartElement = document.getElementById(chartElementId);
  if (chartElement) {
    const canvas = await html2canvas(chartElement);
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 14, 40, 180, 80);
  }

  const tableColumn = ["Date", "Pair", "Direction", "Entry", "Exit", "Lot", "PnL", "Result"];
  const tableRows: any[] = trades.map(trade => [
      trade.date,
      trade.pair,
      trade.dir,
      trade.entry,
      trade.exit,
      trade.lot,
      trade.pnl,
      trade.result,
  ]);

  autoTable(doc, { 
    head: [tableColumn],
    body: tableRows,
    startY: 130
  });

  doc.save(`ENTJournal-report-${new Date().toISOString().split('T')[0]}.pdf`);
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
