import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Package } from 'lucide-react';

const KONDISI_LIST = ['Baik', 'Cukup', 'Rusak'];

const DEFAULT_ITEMS = [
  { nama_item: 'HT (Handy Talky)', jumlah: 1, kondisi: 'Baik', catatan: '' },
  { nama_item: 'Senter', jumlah: 1, kondisi: 'Baik', catatan: '' },
  { nama_item: 'ID Card', jumlah: 1, kondisi: 'Baik', catatan: '' },
  { nama_item: 'Buku Mutasi', jumlah: 1, kondisi: 'Baik', catatan: '' },
];

const kondisiColor = {
  'Baik': 'bg-emerald-100 text-emerald-700',
  'Cukup': 'bg-amber-100 text-amber-700',
  'Rusak': 'bg-red-100 text-red-700',
};

export default function InventarisHandoverForm({ value = [], onChange }) {
  const [newItem, setNewItem] = useState({ nama_item: '', jumlah: 1, kondisi: 'Baik', catatan: '' });

  const addItem = () => {
    if (!newItem.nama_item.trim()) return;
    onChange([...value, { ...newItem }]);
    setNewItem({ nama_item: '', jumlah: 1, kondisi: 'Baik', catatan: '' });
  };

  const removeItem = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, val) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], [field]: val };
    onChange(updated);
  };

  const loadDefaults = () => {
    onChange([...DEFAULT_ITEMS]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-indigo-500" /> Inventaris Serah Terima
        </p>
        {value.length === 0 && (
          <button type="button" onClick={loadDefaults} className="text-xs text-indigo-600 hover:underline">
            + Muat default perlengkapan
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {value.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
              <div className="flex-1 text-xs font-medium text-gray-700 truncate">{item.nama_item}</div>
              <div className="text-xs text-gray-400 w-6 text-center">{item.jumlah}x</div>
              <Select value={item.kondisi} onValueChange={v => updateItem(idx, 'kondisi', v)}>
                <SelectTrigger className="h-6 w-20 text-[10px] border-0 bg-white shadow-sm px-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KONDISI_LIST.map(k => <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>)}
                </SelectContent>
              </Select>
              <Badge className={`border-0 text-[9px] px-1.5 ${kondisiColor[item.kondisi]}`}>{item.kondisi}</Badge>
              <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-0.5">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add new item */}
      <div className="flex gap-1.5">
        <Input
          value={newItem.nama_item}
          onChange={e => setNewItem(p => ({ ...p, nama_item: e.target.value }))}
          placeholder="Nama barang..."
          className="h-8 text-xs flex-1"
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
        />
        <Input
          type="number"
          min={1}
          value={newItem.jumlah}
          onChange={e => setNewItem(p => ({ ...p, jumlah: Number(e.target.value) }))}
          className="h-8 text-xs w-14"
        />
        <Select value={newItem.kondisi} onValueChange={v => setNewItem(p => ({ ...p, kondisi: v }))}>
          <SelectTrigger className="h-8 text-xs w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            {KONDISI_LIST.map(k => <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button type="button" size="sm" onClick={addItem} className="h-8 px-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}