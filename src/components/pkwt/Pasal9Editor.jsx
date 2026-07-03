import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import { DEFAULT_PASAL_9_AYAT } from './PKWTTemplate';

export default function Pasal9Editor({ ayat, onChange }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [newText, setNewText] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const list = (ayat && ayat.length > 0) ? ayat : DEFAULT_PASAL_9_AYAT;

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditText(list[idx].isi);
  };

  const saveEdit = () => {
    const updated = list.map((a, i) => i === editIdx ? { ...a, isi: editText } : a);
    onChange(updated);
    setEditIdx(null);
    setEditText('');
  };

  const deleteAyat = (idx) => {
    onChange(list.filter((_, i) => i !== idx));
  };

  const addAyat = () => {
    if (!newText.trim()) return;
    onChange([...list, { id: Date.now(), isi: newText.trim() }]);
    setNewText('');
    setShowAdd(false);
  };

  return (
    <div className="border rounded-xl p-4 bg-amber-50 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-900">📋 Pasal 9 – Lain-Lain</p>
          <p className="text-xs text-amber-700 mt-0.5">Edit atau tambah ayat pada Pasal 9. Klik ✏️ untuk mengedit ayat.</p>
        </div>
        <Button
          type="button" size="sm" variant="outline"
          className="border-amber-400 text-amber-800 hover:bg-amber-100 text-xs h-7"
          onClick={() => setShowAdd(!showAdd)}
        >
          <Plus className="w-3 h-3 mr-1" /> Tambah Ayat
        </Button>
      </div>

      {/* Daftar ayat */}
      <div className="space-y-2">
        {list.map((item, idx) => (
          <div key={idx} className="bg-white rounded-lg border border-amber-200 p-2.5 group">
            {editIdx === idx ? (
              <div className="space-y-2">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm min-h-[70px] resize-y focus:outline-none focus:ring-1 focus:ring-amber-400"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="button" size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={saveEdit}>
                    <Check className="w-3 h-3 mr-1" /> Simpan
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditIdx(null)}>
                    <X className="w-3 h-3 mr-1" /> Batal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold text-amber-700 shrink-0 mt-0.5 w-5">{idx + 1}.</span>
                <p className="text-xs text-gray-700 flex-1 leading-relaxed">{item.isi}</p>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(idx)}
                    className="p-1 rounded text-blue-500 hover:bg-blue-50"
                    title="Edit ayat"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAyat(idx)}
                    className="p-1 rounded text-red-400 hover:bg-red-50"
                    title="Hapus ayat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form tambah ayat */}
      {showAdd && (
        <div className="bg-white border border-amber-300 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800">Tambah Ayat Baru</p>
          <textarea
            placeholder="Tulis isi ayat..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm min-h-[70px] resize-y focus:outline-none focus:ring-1 focus:ring-amber-400"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" className="h-7 text-xs bg-amber-600 hover:bg-amber-700" onClick={addAyat}>
              <Plus className="w-3 h-3 mr-1" /> Tambahkan
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setShowAdd(false); setNewText(''); }}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}