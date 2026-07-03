import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ShiftRequirementManager({ open, onClose, areas }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ area_tugas: '', sesi: '', min_personel: 2, catatan: '' });

  const { data: requirements = [] } = useQuery({
    queryKey: ['shift-requirements'],
    queryFn: () => base44.entities.ShiftRequirement.list('area_tugas', 200),
    enabled: open
  });

  const createMutation = useMutation({
    mutationFn: (d) => base44.entities.ShiftRequirement.create(d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shift-requirements'] });
      setForm({ area_tugas: '', sesi: '', min_personel: 2, catatan: '' });
      toast.success('Kebutuhan shift disimpan');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftRequirement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shift-requirements'] })
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" /> Kebutuhan Personel per Shift
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Form tambah */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-dashed border-gray-300">
            <p className="text-xs font-semibold text-gray-500 uppercase">Tambah Kebutuhan</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Area</Label>
                <Select value={form.area_tugas} onValueChange={v => setForm(p => ({ ...p, area_tugas: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                  <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sesi Shift</Label>
                <Select value={form.sesi} onValueChange={v => setForm(p => ({ ...p, sesi: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih sesi..." /></SelectTrigger>
                  <SelectContent>
                    {['Pagi', 'Siang/Sore', 'Malam', 'Custom'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min. Personel</Label>
                <Input type="number" min={1} className="h-8 text-xs" value={form.min_personel}
                  onChange={e => setForm(p => ({ ...p, min_personel: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label className="text-xs">Catatan</Label>
                <Input className="h-8 text-xs" value={form.catatan} placeholder="Opsional..."
                  onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={() => createMutation.mutate(form)}
              disabled={!form.area_tugas || !form.sesi || createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full">
              <Plus className="w-3.5 h-3.5 mr-1" /> Simpan
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            {requirements.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-4">Belum ada kebutuhan personel</p>
            ) : requirements.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-800">{r.area_tugas}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs">{r.sesi}</Badge>
                    <span className="text-xs text-gray-500">Min. <strong>{r.min_personel}</strong> orang</span>
                    {r.catatan && <span className="text-xs text-gray-400">· {r.catatan}</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="w-7 h-7"
                  onClick={() => deleteMutation.mutate(r.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}