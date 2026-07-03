import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import ApplicantTable from '@/components/dashboard/ApplicantTable';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import BulkDeleteBar from '@/components/common/BulkDeleteBar';
import { Checkbox } from '@/components/ui/checkbox';
import * as XLSX from 'xlsx';

const STATUS_COLOR = {
  Pending: 'bg-yellow-100 text-yellow-700',
  Approved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
};

const downloadApplicantTemplate = () => {
  const headers = ['nama_lengkap', 'nik_ektp', 'no_telepon', 'area_client', 'posisi_diinginkan', 'branch', 'jenis_kelamin', 'tempat_lahir', 'tanggal_lahir', 'email', 'alamat_ektp'];
  const currentPeriod = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const exampleRows = [
    ['Budi Santoso', '1234567890123456', '08123456789', 'Area Jakarta', 'Security', 'Jakarta Pusat', 'Laki-laki', 'Jakarta', '1990-01-01', 'budi@email.com', 'Jl. Contoh No. 123'],
    ['Siti Aminah', '6543210987654321', '08987654321', 'Area Bandung', 'Admin', 'Bandung', 'Perempuan', 'Bandung', '1992-05-15', 'siti@email.com', 'Jl. Merdeka No. 45']
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  ws['!cols'] = headers.map(h => ({ wch: 20 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `template_pelamar_${currentPeriod.replace(' ', '_')}.xlsx`);
};

export default function Applicants() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const queryClient = useQueryClient();

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data: applicants = [], isLoading, refetch } = useQuery({
    queryKey: ['all-applicants'],
    queryFn: () => base44.entities.Applicant.list('-created_date', 500),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Applicant.update(id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['all-applicants'] }); toast.success('Status pelamar diperbarui'); }
  });

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkDeleting(true);
    for (const id of selectedIds) {
      await base44.entities.Applicant.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ['all-applicants'] });
    toast.success(`${selectedIds.length} pelamar berhasil dihapus`);
    setSelectedIds([]);
    setBulkDeleting(false);
  };

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-3">
        <Button variant="outline" size="sm" onClick={downloadApplicantTemplate}>
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Template XLSX
        </Button>
      </div>
      <BulkDeleteBar selectedCount={selectedIds.length} onDelete={handleBulkDelete} onClear={() => setSelectedIds([])} isDeleting={bulkDeleting} />
      <ApplicantTable
        applicants={applicants}
        onRefresh={refetch}
        isMasterAdmin={isMasterAdmin}
        selectedIds={selectedIds}
        onToggleSelect={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
        onToggleAll={(ids) => setSelectedIds(prev => prev.length === ids.length ? [] : ids)}
        renderStatusCell={isMasterAdmin ? (applicant) => (
          <Select value={applicant.status || 'Pending'} onValueChange={v => updateStatusMutation.mutate({ id: applicant.id, status: v })}>
            <SelectTrigger className="w-32 h-7 text-xs border-0 p-0">
              <Badge className={`${STATUS_COLOR[applicant.status] || STATUS_COLOR.Pending} border-0 text-xs cursor-pointer`}>{applicant.status || 'Pending'}</Badge>
            </SelectTrigger>
            <SelectContent>
              {['Pending','Approved','Rejected'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
      />
    </div>
  );
}