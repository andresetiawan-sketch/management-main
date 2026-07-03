import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const KATEGORI_LIST = ['Keamanan', 'Fasilitas', 'Kebersihan', 'Teknis', 'Personel', 'Lainnya'];
const TINGKAT_LIST = ['Rendah', 'Sedang', 'Tinggi', 'Kritis'];

const tingkatColor = {
  'Rendah': 'bg-gray-100 text-gray-600',
  'Sedang': 'bg-amber-100 text-amber-700',
  'Tinggi': 'bg-orange-100 text-orange-700',
  'Kritis': 'bg-red-100 text-red-700',
};

export default function KendalaLapanganForm({ value = [], onChange }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({
    deskripsi: '', kategori: 'Keamanan', tingkat: 'Sedang', tindakan: '', sudah_selesai: false
  });

  const addKendala = () => {
    if (!newItem.deskripsi.trim()) return;
    onChange([...value, { ...newItem }]);
    setNewItem({ deskripsi: '', kategori: 'Keamanan', tingkat: 'Sedang', tindakan: '', sudah_selesai: false });
    setShowAdd(false);
  };

  const removeKendala = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const toggleSelesai = (idx) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], sudah_selesai: !updated[idx].sudah_selesai };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-500" /> Kendala Lapangan
          {value.length > 0 && (
            <Badge className="bg-orange-100 text-orange-700 border-0 text-[10px] ml-1">{value.length}</Badge>
          )}
        </p>
        <button
          type="button"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs text-orange-600 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Tambah Kendala
        </button>
      </div>

      {value.length > 0 && (
        <div className="space-y-2 max-h-56 overflow-y-auto">
          {value.map((item, idx) => (
            <div key={idx} className={`rounded-lg border p-2.5 ${item.sudah_selesai ? 'bg-gray-50 opacity-70' : 'bg-orange-50 border-orange-200'}`}>
              <div className="flex items-start gap-2">
                <button type="button" onClick={() => toggleSelesai(idx)} className="mt-0.5 flex-shrink-0">
                  <CheckCircle2 className={`w-4 h-4 ${item.sudah_selesai ? 'text-emerald-500' : 'text-gray-300'}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${item.sudah_selesai ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {item.deskripsi}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    <Badge className="bg-indigo-100 text-indigo-700 border-0 text-[9px]">{item.kategori}</Badge>
                    <Badge className={`border-0 text-[9px] ${tingkatColor[item.tingkat]}`}>{item.tingkat}</Badge>
                    {item.sudah_selesai && <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[9px]">Terselesaikan</Badge>}
                  </div>
                  {item.tindakan && (
                    <p className="text-[10px] text-gray-500 mt-1">Tindakan: {item.tindakan}</p>
                  )}
                </div>
                <button type="button" onClick={() => removeKendala(idx)} className="text-red-400 hover:text-red-600 p-0.5 flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 space-y-2">
          <Textarea
            value={newItem.deskripsi}
            onChange={e => setNewItem(p => ({ ...p, deskripsi: e.target.value }))}
            placeholder="Deskripsi kendala..."
            className="h-16 text-xs resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Kategori</p>
              <Select value={newItem.kategori} onValueChange={v => setNewItem(p => ({ ...p, kategori: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_LIST.map(k => <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 mb-1">Tingkat</p>
              <Select value={newItem.tingkat} onValueChange={v => setNewItem(p => ({ ...p, tingkat: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TINGKAT_LIST.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input
            value={newItem.tindakan}
            onChange={e => setNewItem(p => ({ ...p, tindakan: e.target.value }))}
            placeholder="Tindakan yang sudah diambil (opsional)..."
            className="h-8 text-xs"
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => setShowAdd(false)} className="h-7 text-xs">Batal</Button>
            <Button type="button" size="sm" onClick={addKendala} className="h-7 text-xs bg-orange-600 hover:bg-orange-700 text-white">Tambah</Button>
          </div>
        </div>
      )}

      {value.length === 0 && !showAdd && (
        <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center">
          <p className="text-xs text-gray-400">Tidak ada kendala? Bagus! Klik "+ Tambah Kendala" jika ada.</p>
        </div>
      )}
    </div>
  );
}