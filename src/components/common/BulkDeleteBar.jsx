import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Reusable bulk delete bar
 * Props:
 *   selectedCount  - number of selected items
 *   onDelete       - function to call when delete confirmed
 *   onClear        - function to clear selection
 *   isDeleting     - boolean loading state
 */
export default function BulkDeleteBar({ selectedCount, onDelete, onClear, isDeleting }) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-gray-700 animate-in slide-in-from-bottom-4">
      <span className="text-sm font-medium">{selectedCount} item dipilih</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="text-gray-400 hover:text-white hover:bg-gray-700 h-8 px-2"
      >
        <X className="w-4 h-4" />
      </Button>
      <Button
        size="sm"
        onClick={onDelete}
        disabled={isDeleting}
        className="bg-red-600 hover:bg-red-700 text-white h-8 px-3"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1" />
        {isDeleting ? 'Menghapus...' : 'Hapus'}
      </Button>
    </div>
  );
}