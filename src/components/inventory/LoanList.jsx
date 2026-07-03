import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const statusColor = { Dipinjam: 'bg-orange-100 text-orange-800', Dikembalikan: 'bg-emerald-100 text-emerald-800' };

export default function LoanList() {
  const [search, setSearch] = useState('');

  const { data: loans = [] } = useQuery({
    queryKey: ['loans'],
    queryFn: () => base44.entities.LoanRecord.list('-created_date', 500),
  });

  const filtered = loans.filter(l =>
    l.nama_peminjam?.toLowerCase().includes(search.toLowerCase()) ||
    l.nama_barang?.toLowerCase().includes(search.toLowerCase()) ||
    l.nik_peminjam?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari riwayat..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="text-xs font-semibold">Barang</TableHead>
              <TableHead className="text-xs font-semibold">Peminjam</TableHead>
              <TableHead className="text-xs font-semibold">Tgl Pinjam</TableHead>
              <TableHead className="text-xs font-semibold">Rencana Kembali</TableHead>
              <TableHead className="text-xs font-semibold">Tgl Kembali</TableHead>
              <TableHead className="text-xs font-semibold">Kondisi</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Belum ada riwayat peminjaman</TableCell></TableRow>
            ) : filtered.map(l => (
              <TableRow key={l.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <p className="font-medium text-sm">{l.nama_barang}</p>
                  <p className="text-xs font-mono text-orange-600">{l.kode_barang}</p>
                </TableCell>
                <TableCell>
                  <p className="text-sm">{l.nama_peminjam}</p>
                  <p className="text-xs text-gray-400">{l.nik_peminjam}</p>
                </TableCell>
                <TableCell className="text-xs text-gray-600">{l.tanggal_pinjam}</TableCell>
                <TableCell className="text-xs text-gray-600">{l.tanggal_kembali_rencana || '-'}</TableCell>
                <TableCell className="text-xs text-gray-600">{l.tanggal_kembali_aktual || '-'}</TableCell>
                <TableCell>
                  <p className="text-xs">Pinjam: {l.kondisi_pinjam}</p>
                  {l.kondisi_kembali && <p className="text-xs">Kembali: {l.kondisi_kembali}</p>}
                </TableCell>
                <TableCell><Badge className={`text-xs ${statusColor[l.status]}`}>{l.status}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}