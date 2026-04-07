'use client';

import { Download } from 'lucide-react';

export default function ExportCSV({ data, filename }: { data: any[], filename: string }) {
  
  const handleExport = () => {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={handleExport}
      className="btn-primary" 
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px' }}
      disabled={!data || data.length === 0}
    >
      <Download size={16} />
      Export CSV
    </button>
  );
}
