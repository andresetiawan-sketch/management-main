import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_STYLES = {
  'Pending Leader': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Pending Supervisor': 'bg-blue-100 text-blue-700 border-blue-200',
  'Disetujui': 'bg-green-100 text-green-700 border-green-200',
  'Ditolak': 'bg-red-100 text-red-700 border-red-200',
};

function OvertimeCard({ claim, employee, onAction }) {
  const [catatan, setCatatan] = useState('');
  const [processing, setProcessing] = useState(false);
  const isLeader = ['Leader Security', 'Leader Facility'].includes(employee?.jabatan || employee?.role);
  const isSupervisor = ['Master Admin', 'Chief Security', 'Supervisor Facility', 'Admin Pos'].includes(employee?.jabatan || employee?.role);

  const canApproveLeader = isLeader && claim.status === 'Pending Leader';
  const canApproveSupervisor = isSupervisor && (claim.status === 'Pending Leader' || claim.status === 'Pending Supervisor');
  const canApprove = canApproveLeader || canApproveSupervisor;

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="font-semibold text-gray-800">{claim.nama_karyawan}</p>
              <span className="text-xs text-gray-400">{claim.nik_karyawan}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <div className="flex items-center gap-1 text-orange-600">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-sm font-semibold">{claim.durasi_jam} jam lembur</span>
              </div>
              <span className="text-xs text-gray-500">{claim.tanggal}</span>
              <span className="text-xs text-gray-500">{claim.jam_mulai_lembur} – {claim.jam_selesai_lembur}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{claim.alasan}</p>
            {claim.approval_leader_nama && (
              <p className="text-xs text-gray-400 mt-1">
                Leader: {claim.approval_leader_nama} · {claim.approval_leader_catatan || 'Tanpa catatan'}
              </p>
            )}
          </div>
          <Badge className={`${STATUS_STYLES[claim.status] || ''} border text-xs flex-shrink-0`}>
            {claim.status}
          </Badge>
        </div>

        {canApprove && (
          <>
            <Textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              placeholder="Catatan (opsional)..."
              rows={2}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm"
                onClick={async () => { setProcessing(true); await onAction(claim, 'approve', catatan); setProcessing(false); }}
                disabled={processing}
                className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="w-3.5 h-3.5 mr-1" /> Setujui
              </Button>
              <Button size="sm" variant="outline"
                onClick={async () => { setProcessing(true); await onAction(claim, 'reject', catatan); setProcessing(false); }}
                disabled={processing}
                className="text-red-600 border-red-200 hover:bg-red-50">
                <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function OvertimeApprovalList({ claims, employee }) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OvertimeClaim.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-overtime'] });
      queryClient.invalidateQueries({ queryKey: ['my-overtime'] });
    }
  });

  const handleAction = async (claim, action, catatan) => {
    const isLeader = ['Leader Security', 'Leader Facility'].includes(employee?.jabatan || employee?.role);
    const isSupervisor = !isLeader;
    const waktu = format(new Date(), 'yyyy-MM-dd HH:mm');

    let updateData = {};
    if (action === 'reject') {
      updateData = {
        status: 'Ditolak',
        ...(isLeader ? {
          approval_leader_nik: employee.nik_karyawan,
          approval_leader_nama: employee.nama_lengkap,
          approval_leader_catatan: catatan,
          approval_leader_waktu: waktu
        } : {
          approval_supervisor_nik: employee.nik_karyawan,
          approval_supervisor_nama: employee.nama_lengkap,
          approval_supervisor_catatan: catatan,
          approval_supervisor_waktu: waktu
        })
      };
    } else {
      if (isLeader && claim.status === 'Pending Leader') {
        updateData = {
          status: 'Pending Supervisor',
          approval_leader_nik: employee.nik_karyawan,
          approval_leader_nama: employee.nama_lengkap,
          approval_leader_catatan: catatan,
          approval_leader_waktu: waktu
        };
      } else {
        updateData = {
          status: 'Disetujui',
          approval_supervisor_nik: employee.nik_karyawan,
          approval_supervisor_nama: employee.nama_lengkap,
          approval_supervisor_catatan: catatan,
          approval_supervisor_waktu: waktu
        };
        // Notify employee
        base44.entities.ShiftNotification.create({
          nik_karyawan: claim.nik_karyawan,
          nama_karyawan: claim.nama_karyawan,
          judul: 'Lembur Disetujui',
          pesan: `Klaim lembur Anda pada ${claim.tanggal} (${claim.durasi_jam} jam) telah disetujui.`,
          tipe: 'Lembur Disetujui',
          tanggal_jadwal: claim.tanggal,
          dibaca: false
        });
      }
    }

    await approveMutation.mutateAsync({ id: claim.id, data: updateData });

    if (action === 'reject') {
      base44.entities.ShiftNotification.create({
        nik_karyawan: claim.nik_karyawan,
        nama_karyawan: claim.nama_karyawan,
        judul: 'Lembur Ditolak',
        pesan: `Klaim lembur Anda pada ${claim.tanggal} ditolak. ${catatan ? 'Catatan: ' + catatan : ''}`,
        tipe: 'Lembur Ditolak',
        tanggal_jadwal: claim.tanggal,
        dibaca: false
      });
      toast.error('Klaim lembur ditolak');
    } else {
      toast.success(updateData.status === 'Disetujui' ? 'Klaim lembur disetujui!' : 'Diteruskan ke Supervisor');
    }
  };

  const pending = claims.filter(c => ['Pending Leader', 'Pending Supervisor'].includes(c.status));
  const done = claims.filter(c => ['Disetujui', 'Ditolak'].includes(c.status));

  return (
    <div className="space-y-4">
      {pending.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-200" />
          <p>Tidak ada klaim lembur yang perlu diproses</p>
        </div>
      ) : pending.map(c => (
        <OvertimeCard key={c.id} claim={c} employee={employee} onAction={handleAction} />
      ))}
      {done.length > 0 && (
        <>
          <p className="text-xs text-gray-400 font-semibold uppercase pt-2">Sudah Diproses</p>
          {done.slice(0, 5).map(c => (
            <OvertimeCard key={c.id} claim={c} employee={employee} onAction={handleAction} />
          ))}
        </>
      )}
    </div>
  );
}