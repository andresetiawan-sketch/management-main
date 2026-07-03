import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

function toCSV(data, columns) {
  if (!data || data.length === 0) return '';
  const headers = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key] ?? '';
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headers, ...rows].join('\n');
}

function downloadCSV(csv, filename) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * ExportExcelButton
 * @param {Array} data - filtered data array to export
 * @param {Array} columns - [{key, label}]
 * @param {string} filename - output filename without extension
 */
export default function ExportExcelButton({ data = [], columns = [], filename = 'export', disabled }) {
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data.length) { toast.error('Tidak ada data untuk diekspor'); return; }
    setLoading(true);
    try {
      const csv = toCSV(data, columns);
      downloadCSV(csv, `${filename}_${new Date().toLocaleDateString('id-ID').replace(/\//g, '-')}.csv`);
      toast.success(`${data.length} baris berhasil diekspor`);
    } catch (e) {
      toast.error('Gagal mengekspor data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      onClick={handleExport}
      disabled={disabled || loading || !data.length}
    >
      <Download className="w-3.5 h-3.5" />
      {loading ? 'Mengekspor...' : `Export CSV (${data.length})`}
    </Button>
  );
}