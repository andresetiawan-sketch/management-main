import { useState } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ReturnModal({ item, onClose, onSuccess }) {
  const [kondisiKembali, setKondisiKembali] = useState('Baik');
  const [catatan, setCatatan] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: loans = [] } = useQuery({
    queryKey: ['active-loan', item.kode_barang],
    queryFn: () => base44.entities.LoanRecord.filter({ kode_barang: item.kode_barang, status: 'Dipinjam' }),
  });

  const handleReturn = async () => {
    setSaving(true);
    const today = new Date().toISOString().split('T')[0];
    if (loans.length > 0) {
      await base44.entities.LoanRecord.update(loans[0].id, {
        status: 'Dikembalikan', kondisi_kembali: kondisiKembali,
        tanggal_kembali_aktual: today, catatan
      });
    }
    await base44.entities.Inventory.update(item.id, {
      status: 'Tersedia', kondisi: kondisiKembali,
      nik_peminjam: '', nama_peminjam: ''
    });
    toast.success('Barang berhasil dikembalikan');
    setSaving(false);
    onSuccess();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Kembalikan: {item.nama_barang}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Peminjam: <span className="font-semibold text-gray-700">{item.nama_peminjam}</span></p>
          <div>
            <Label className="text-xs">Kondisi Saat Dikembalikan</Label>
            <Select value={kondisiKembali} onValueChange={setKondisiKembali}>
              <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Baik','Cukup','Rusak'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Catatan</Label>
            <Input value={catatan} onChange={e => setCatatan(e.target.value)} className="mt-1 h-9 text-sm" placeholder="Opsional..." />
          </div>
          <Button onClick={handleReturn} disabled={saving} className="w-full bg-orange-500 hover:bg-orange-600 text-white">
            {saving ? 'Memproses...' : 'Konfirmasi Pengembalian'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}