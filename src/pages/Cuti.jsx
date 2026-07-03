import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/cloudflareClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, User, CalendarDays, Clock, ChevronRight, AlertCircle, Upload } from "lucide-react";
import { format } from "date-fns";
import OvertimeClaimForm from "@/components/overtime/OvertimeClaimForm";
import OvertimeApprovalList from "@/components/overtime/OvertimeApprovalList";
import ShiftNotificationBell from "@/components/shift/ShiftNotificationBell";

const MASTER_ADMIN_ROLES = ['Master Admin'];
const MANAGEMENT_ROLES = ['Admin Pos', 'Chief Security', 'Supervisor Facility', 'Admin Security', 'Admin Facility', 'SPV Security', 'Admin Pos Security', 'Supervisor Security'];
const LEADER_ROLES = ['Leader Security', 'Leader Facility'];

// ── Status helpers ────────────────────────────────────
const STATUS_MAP = {
  'Pending Leader':     { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Menunggu Leader' },
  'Pending Supervisor': { color: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Menunggu Supervisor' },
  'Disetujui':          { color: 'bg-green-100 text-green-700 border-green-200', label: 'Disetujui' },
  'Ditolak':            { color: 'bg-red-100 text-red-700 border-red-200', label: 'Ditolak' },
  // legacy support
  'Pending':            { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Menunggu' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP['Pending'];
  return <Badge className={`${s.color} border text-xs`}>{s.label}</Badge>;
}

function ApprovalFlow({ req }) {
  const steps = [
    { label: 'Pengaju', name: req.nama_karyawan, date: req.created_date?.slice(0,10), done: true },
    { label: 'Leader', name: req.nama_approver_leader, date: req.tanggal_approval_leader, done: !!req.nama_approver_leader, catatan: req.catatan_leader },
    { label: 'Supervisor', name: req.nama_approver_supervisor, date: req.tanggal_approval_supervisor, done: !!req.nama_approver_supervisor, catatan: req.catatan_supervisor },
  ];
  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={`text-xs px-2 py-0.5 rounded-full border ${step.done ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
            <span className="font-medium">{step.label}</span>
            {step.name && <span className="ml-1 opacity-75">· {step.name}</span>}
            {step.date && <span className="ml-1 opacity-50">{step.date}</span>}
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300" />}
        </div>
      ))}
    </div>
  );
}

// ── ApprovalCard (for leader/supervisor) ─────────────
function ApprovalCard({ req, onApprove, onReject, approverRole }) {
  const [catatan, setCatatan] = useState('');
  const [processing, setProcessing] = useState(false);

  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <p className="font-semibold text-gray-800">{req.nama_karyawan}</p>
              <span className="text-xs text-gray-400">{req.nik_karyawan}</span>
              <span className="text-xs text-gray-400">· {req.jabatan}</span>
            </div>
            <p className="text-sm text-gray-700 mt-1 font-medium">{req.jenis_cuti} <span className="font-normal text-gray-500">· {req.jumlah_hari} hari</span></p>
            <p className="text-sm text-gray-500">{req.tanggal_mulai} s/d {req.tanggal_selesai}</p>
            <p className="text-sm text-gray-600 mt-1">{req.alasan}</p>
            <ApprovalFlow req={req} />
          </div>
          <StatusBadge status={req.status} />
        </div>
        <Textarea
          value={catatan}
          onChange={e => setCatatan(e.target.value)}
          placeholder="Catatan untuk karyawan (opsional)..."
          rows={2}
          className="text-sm"
        />
        <div className="flex gap-3">
          <Button
            size="sm"
            onClick={async () => { setProcessing(true); await onApprove(req, catatan); setProcessing(false); setCatatan(''); }}
            disabled={processing}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" /> Setujui
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => { setProcessing(true); await onReject(req, catatan); setProcessing(false); setCatatan(''); }}
            disabled={processing}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" /> Tolak
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────
export default function Cuti() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const queryClient = useQueryClient();

  const empRole = employee?.role || employee?.jabatan || '';
  const isMasterAdmin = MASTER_ADMIN_ROLES.includes(empRole);
  const isManagement = MANAGEMENT_ROLES.includes(empRole);
  const isLeader = LEADER_ROLES.includes(empRole);
  const isAdmin = isMasterAdmin || isManagement || isLeader;
  const canApproveOvertime = isAdmin;

  const [form, setForm] = useState({ jenis_cuti: "", tanggal_mulai: "", tanggal_selesai: "", alasan: "", dokumen_pendukung: "" });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [activeTab, setActiveTab] = useState("riwayat");
  const currentYear = new Date().getFullYear();

  // ── Queries ──
  const { data: myRequests = [], refetch: refetchMy } = useQuery({
    queryKey: ['leave-my', employee?.nik_karyawan],
    queryFn: () => base44.entities.LeaveRequest.filter({ nik_karyawan: employee.nik_karyawan }, '-created_date', 50),
    enabled: !!employee?.nik_karyawan
  });

  const { data: pendingRequests = [], refetch: refetchPending } = useQuery({
    queryKey: ['leave-pending', employee?.nik_karyawan, empRole],
    queryFn: async () => {
      if (isMasterAdmin) return base44.entities.LeaveRequest.list('-created_date', 300);
      if (isManagement) {
        // Supervisor lihat yg sudah lewat leader (Pending Supervisor) + area mereka
        return base44.entities.LeaveRequest.filter({ area_tugas: employee.area_tugas }, '-created_date', 200);
      }
      if (isLeader) {
        // Leader lihat Pending Leader di area mereka
        return base44.entities.LeaveRequest.filter({ area_tugas: employee.area_tugas, status: 'Pending Leader' }, '-created_date', 100);
      }
      return [];
    },
    enabled: !!employee?.nik_karyawan && isAdmin
  });

  const { data: myQuota } = useQuery({
    queryKey: ['leave-quota', employee?.nik_karyawan, currentYear],
    queryFn: async () => {
      const quotas = await base44.entities.LeaveQuota.filter({ nik_karyawan: employee.nik_karyawan, tahun: currentYear });
      if (quotas.length === 0) {
        return base44.entities.LeaveQuota.create({
          nik_karyawan: employee.nik_karyawan,
          nama_karyawan: employee.nama_lengkap,
          tahun: currentYear,
          kuota_total: 12,
          kuota_terpakai: 0
        });
      }
      return quotas[0];
    },
    enabled: !!employee?.nik_karyawan
  });

  const { data: myOvertimes = [] } = useQuery({
    queryKey: ['my-overtime', employee?.nik_karyawan],
    queryFn: () => base44.entities.OvertimeClaim.filter({ nik_karyawan: employee.nik_karyawan }, '-created_date', 50),
    enabled: !!employee?.nik_karyawan
  });

  const { data: allOvertimes = [] } = useQuery({
    queryKey: ['all-overtime', employee?.area_tugas],
    queryFn: () => isMasterAdmin
      ? base44.entities.OvertimeClaim.list('-created_date', 200)
      : base44.entities.OvertimeClaim.filter({ area_tugas: employee.area_tugas }, '-created_date', 200),
    enabled: !!employee?.nik_karyawan && canApproveOvertime
  });

  // ── Mutations ──
  const submitMutation = useMutation({
    mutationFn: async (data) => base44.entities.LeaveRequest.create(data),
    onSuccess: () => {
      setForm({ jenis_cuti: "", tanggal_mulai: "", tanggal_selesai: "", alasan: "", dokumen_pendukung: "" });
      refetchMy();
      queryClient.invalidateQueries({ queryKey: ['leave-quota'] });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ req, catatan }) => {
      const now = format(new Date(), 'yyyy-MM-dd HH:mm');
      let nextStatus = 'Disetujui';
      let updateData = { catatan_atasan: catatan };

      if (isLeader && (req.status === 'Pending Leader' || req.status === 'Pending')) {
        // Leader approve → lanjut ke Supervisor
        nextStatus = 'Pending Supervisor';
        updateData = {
          ...updateData,
          nik_approver_leader: employee.nik_karyawan,
          nama_approver_leader: employee.nama_lengkap,
          tanggal_approval_leader: now,
          catatan_leader: catatan
        };
      } else {
        // Management/MasterAdmin approve → final
        nextStatus = 'Disetujui';
        updateData = {
          ...updateData,
          nik_approver_supervisor: employee.nik_karyawan,
          nama_approver_supervisor: employee.nama_lengkap,
          tanggal_approval_supervisor: now,
          catatan_supervisor: catatan,
          nik_approver: employee.nik_karyawan,
          nama_approver: employee.nama_lengkap,
          tanggal_approval: now.slice(0, 10)
        };
        // Kurangi kuota jika Cuti Tahunan
        if (req.jenis_cuti === 'Cuti Tahunan') {
          const quotas = await base44.entities.LeaveQuota.filter({ nik_karyawan: req.nik_karyawan, tahun: currentYear });
          if (quotas.length > 0) {
            await base44.entities.LeaveQuota.update(quotas[0].id, {
              kuota_terpakai: (quotas[0].kuota_terpakai || 0) + (req.jumlah_hari || 0)
            });
          }
        }
      }

      await base44.entities.LeaveRequest.update(req.id, { status: nextStatus, ...updateData });

      // Notifikasi ke karyawan
      const pesanMap = {
        'Pending Supervisor': `Pengajuan ${req.jenis_cuti} Anda (${req.tanggal_mulai} – ${req.tanggal_selesai}) telah disetujui leader dan diteruskan ke supervisor.`,
        'Disetujui': `Pengajuan ${req.jenis_cuti} Anda (${req.tanggal_mulai} – ${req.tanggal_selesai}) telah DISETUJUI oleh ${employee.nama_lengkap}.`
      };
      await base44.entities.ShiftNotification.create({
        nik_karyawan: req.nik_karyawan,
        nama_karyawan: req.nama_karyawan,
        judul: nextStatus === 'Disetujui' ? 'Cuti Disetujui ✅' : 'Cuti Diteruskan ke Supervisor',
        pesan: pesanMap[nextStatus] || '',
        tipe: nextStatus === 'Disetujui' ? 'Cuti Disetujui' : 'Jadwal Baru',
        tanggal_jadwal: req.tanggal_mulai,
        dibaca: false
      });
    },
    onSuccess: () => { refetchPending(); refetchMy(); queryClient.invalidateQueries({ queryKey: ['leave-quota'] }); }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ req, catatan }) => {
      const now = format(new Date(), 'yyyy-MM-dd HH:mm');
      await base44.entities.LeaveRequest.update(req.id, {
        status: 'Ditolak',
        catatan_atasan: catatan,
        nik_approver: employee.nik_karyawan,
        nama_approver: employee.nama_lengkap,
        tanggal_approval: now.slice(0, 10)
      });
      await base44.entities.ShiftNotification.create({
        nik_karyawan: req.nik_karyawan,
        nama_karyawan: req.nama_karyawan,
        judul: 'Cuti Ditolak ❌',
        pesan: `Pengajuan ${req.jenis_cuti} Anda ditolak oleh ${employee.nama_lengkap}.${catatan ? ' Catatan: ' + catatan : ''}`,
        tipe: 'Cuti Ditolak',
        tanggal_jadwal: req.tanggal_mulai,
        dibaca: false
      });
    },
    onSuccess: () => { refetchPending(); refetchMy(); }
  });

  // ── Helpers ──
  const hitungHari = () => {
    if (!form.tanggal_mulai || !form.tanggal_selesai) return 0;
    return Math.max(Math.ceil((new Date(form.tanggal_selesai) - new Date(form.tanggal_mulai)) / 86400000) + 1, 0);
  };

  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(p => ({ ...p, dokumen_pendukung: file_url }));
    setUploadingDoc(false);
  };

  const handleSubmit = () => {
    if (!form.jenis_cuti || !form.tanggal_mulai || !form.tanggal_selesai || !form.alasan) return;
    const hari = hitungHari();
    const kuotaSisa = (myQuota?.kuota_total || 12) - (myQuota?.kuota_terpakai || 0);
    if (form.jenis_cuti === 'Cuti Tahunan' && hari > kuotaSisa) {
      alert(`Sisa kuota cuti tahunan Anda hanya ${kuotaSisa} hari, pengajuan ${hari} hari tidak bisa diproses.`);
      return;
    }
    submitMutation.mutate({
      nik_karyawan: employee.nik_karyawan,
      nama_karyawan: employee.nama_lengkap,
      jabatan: employee.jabatan || '',
      area_tugas: employee.area_tugas || '',
      jenis_cuti: form.jenis_cuti,
      tanggal_mulai: form.tanggal_mulai,
      tanggal_selesai: form.tanggal_selesai,
      jumlah_hari: hari,
      alasan: form.alasan,
      dokumen_pendukung: form.dokumen_pendukung || '',
      status: 'Pending Leader'
    });
  };

  // ── Derived counts ──
  const kuotaTotal = myQuota?.kuota_total || 12;
  const kuotaTerpakai = myQuota?.kuota_terpakai || 0;
  const kuotaSisa = kuotaTotal - kuotaTerpakai;

  // Untuk leader: hanya Pending Leader; untuk management/admin: Pending Supervisor + Pending Leader
  const myPendingApprovals = pendingRequests.filter(r => {
    if (isLeader && !isManagement && !isMasterAdmin) return r.status === 'Pending Leader';
    if (isManagement || isMasterAdmin) return ['Pending Supervisor', 'Pending Leader', 'Pending'].includes(r.status);
    return false;
  });
  const pendingCount = myPendingApprovals.length;
  const pendingOvertimeCount = allOvertimes.filter(o => ['Pending Leader', 'Pending Supervisor'].includes(o.status)).length;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Cuti, Izin & Lembur</h2>
        {employee && <ShiftNotificationBell nik_karyawan={employee.nik_karyawan} />}
      </div>

      {/* Kuota Cuti */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">Kuota Cuti Tahunan {currentYear}</h3>
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm bg-blue-50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{kuotaTotal}</p>
              <p className="text-xs text-blue-500 mt-1 font-medium">Total Kuota</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-orange-50">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-700">{kuotaTerpakai}</p>
              <p className="text-xs text-orange-500 mt-1 font-medium">Terpakai</p>
            </CardContent>
          </Card>
          <Card className={`border-0 shadow-sm ${kuotaSisa <= 3 ? 'bg-red-50' : 'bg-green-50'}`}>
            <CardContent className="p-4 text-center">
              <p className={`text-3xl font-bold ${kuotaSisa <= 3 ? 'text-red-700' : 'text-green-700'}`}>{kuotaSisa}</p>
              <p className={`text-xs mt-1 font-medium ${kuotaSisa <= 3 ? 'text-red-500' : 'text-green-500'}`}>
                {kuotaSisa <= 3 && kuotaSisa > 0 ? '⚠️ Hampir Habis' : kuotaSisa === 0 ? '❌ Habis' : 'Sisa Kuota'}
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${kuotaSisa <= 3 ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${Math.min((kuotaTerpakai / kuotaTotal) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">{kuotaTerpakai} dari {kuotaTotal} hari terpakai</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100 flex flex-wrap w-full gap-1">
          <TabsTrigger value="riwayat">Riwayat Cuti</TabsTrigger>
          <TabsTrigger value="pengajuan">Ajukan Cuti</TabsTrigger>
          <TabsTrigger value="lembur" className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Klaim Lembur
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="persetujuan" className="flex items-center gap-1">
              Persetujuan Cuti
              {pendingCount > 0 && <span className="ml-1 bg-red-600 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingCount}</span>}
            </TabsTrigger>
          )}
          {canApproveOvertime && (
            <TabsTrigger value="approval-lembur" className="flex items-center gap-1">
              Approval Lembur
              {pendingOvertimeCount > 0 && <span className="ml-1 bg-orange-600 text-white text-[10px] rounded-full px-1.5 py-0.5">{pendingOvertimeCount}</span>}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ── Riwayat ── */}
        <TabsContent value="riwayat" className="mt-4">
          <div className="space-y-3">
            {myRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <CalendarDays className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p>Belum ada riwayat pengajuan cuti</p>
              </div>
            ) : myRequests.map(req => (
              <Card key={req.id} className="border border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800">{req.jenis_cuti}</p>
                        <span className="text-xs text-gray-400">· {req.jumlah_hari} hari</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{req.tanggal_mulai} s/d {req.tanggal_selesai}</p>
                      <p className="text-sm text-gray-600 mt-1">{req.alasan}</p>
                      {req.catatan_atasan && (
                        <p className="text-xs text-orange-600 mt-1 italic">📝 {req.catatan_atasan}</p>
                      )}
                      <ApprovalFlow req={req} />
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Pengajuan ── */}
        <TabsContent value="pengajuan" className="mt-4">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Form Pengajuan Cuti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Alur persetujuan info */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                <p className="font-semibold mb-1">📋 Alur Persetujuan Bertingkat:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-white border border-blue-200 rounded px-2 py-0.5">Anda</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="bg-white border border-blue-200 rounded px-2 py-0.5">Leader</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="bg-white border border-blue-200 rounded px-2 py-0.5">Supervisor / Management</span>
                  <ChevronRight className="w-3 h-3" />
                  <span className="bg-green-100 border border-green-300 rounded px-2 py-0.5 font-semibold text-green-700">Disetujui</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Jenis Cuti *</label>
                <Select value={form.jenis_cuti} onValueChange={v => setForm({ ...form, jenis_cuti: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih jenis cuti" /></SelectTrigger>
                  <SelectContent>
                    {['Cuti Tahunan', 'Cuti Sakit', 'Cuti Melahirkan', 'Cuti Darurat', 'Cuti Lainnya'].map(j => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.jenis_cuti === 'Cuti Tahunan' && kuotaSisa <= 0 && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Kuota cuti tahunan Anda sudah habis. Tidak bisa mengajukan Cuti Tahunan.
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tanggal Mulai *</label>
                  <Input type="date" value={form.tanggal_mulai} onChange={e => setForm({ ...form, tanggal_mulai: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tanggal Selesai *</label>
                  <Input type="date" value={form.tanggal_selesai} min={form.tanggal_mulai} onChange={e => setForm({ ...form, tanggal_selesai: e.target.value })} />
                </div>
              </div>

              {form.tanggal_mulai && form.tanggal_selesai && hitungHari() > 0 && (
                <div className={`rounded-lg px-4 py-2.5 ${form.jenis_cuti === 'Cuti Tahunan' && hitungHari() > kuotaSisa ? 'bg-red-50 border border-red-200' : 'bg-blue-50'}`}>
                  <p className="text-sm font-medium">
                    Total: <span className="text-xl font-bold">{hitungHari()}</span> hari cuti
                    {form.jenis_cuti === 'Cuti Tahunan' && (
                      <span className={`ml-2 text-sm ${hitungHari() > kuotaSisa ? 'text-red-600' : 'text-green-600'}`}>
                        (sisa kuota: {kuotaSisa} hari)
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Alasan Cuti *</label>
                <Textarea
                  value={form.alasan}
                  onChange={e => setForm({ ...form, alasan: e.target.value })}
                  placeholder="Tuliskan alasan pengajuan cuti..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Dokumen Pendukung (opsional)</label>
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 hover:bg-gray-50 ${uploadingDoc ? 'opacity-50' : ''}`}>
                      <Upload className="w-4 h-4" />
                      {uploadingDoc ? 'Mengupload...' : form.dokumen_pendukung ? 'Ganti Dokumen' : 'Upload Dokumen'}
                    </div>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUploadDoc} disabled={uploadingDoc} />
                  </label>
                  {form.dokumen_pendukung && (
                    <a href={form.dokumen_pendukung} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline">Lihat dokumen</a>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitMutation.isPending || !form.jenis_cuti || !form.tanggal_mulai || !form.tanggal_selesai || !form.alasan || (form.jenis_cuti === 'Cuti Tahunan' && kuotaSisa <= 0)}
                className="w-full bg-red-700 hover:bg-red-800 text-white h-11"
              >
                {submitMutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan Cuti'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Klaim Lembur ── */}
        <TabsContent value="lembur" className="mt-4 space-y-4">
          {employee && <OvertimeClaimForm employee={employee} />}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Riwayat Klaim Lembur Saya</h3>
            {myOvertimes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">Belum ada klaim lembur</div>
            ) : myOvertimes.map(ot => (
              <Card key={ot.id} className="border border-gray-100 shadow-sm mb-2">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-orange-500" />
                        <span className="font-medium text-sm text-gray-800">{ot.durasi_jam} jam</span>
                        <span className="text-xs text-gray-400">· {ot.tanggal}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{ot.jam_mulai_lembur} – {ot.jam_selesai_lembur}</p>
                      <p className="text-xs text-gray-600 mt-1">{ot.alasan}</p>
                    </div>
                    <Badge className={`text-xs border flex-shrink-0 ${
                      ot.status === 'Disetujui' ? 'bg-green-100 text-green-700 border-green-200' :
                      ot.status === 'Ditolak' ? 'bg-red-100 text-red-700 border-red-200' :
                      'bg-yellow-100 text-yellow-700 border-yellow-200'
                    }`}>{ot.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── Persetujuan Cuti ── */}
        {isAdmin && (
          <TabsContent value="persetujuan" className="mt-4">
            {/* Role info */}
            <div className="mb-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
              {isLeader && !isManagement && !isMasterAdmin
                ? '👤 Anda sebagai Leader: dapat menyetujui pengajuan tahap pertama (Pending Leader).'
                : '👥 Anda sebagai Management/Admin: dapat menyetujui semua tahap (termasuk final approval).'}
            </div>
            <div className="space-y-3">
              {myPendingApprovals.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-200" />
                  <p>Tidak ada pengajuan yang perlu disetujui</p>
                </div>
              ) : myPendingApprovals.map(req => (
                <ApprovalCard
                  key={req.id}
                  req={req}
                  approverRole={isLeader ? 'leader' : 'supervisor'}
                  onApprove={(r, c) => approveMutation.mutateAsync({ req: r, catatan: c })}
                  onReject={(r, c) => rejectMutation.mutateAsync({ req: r, catatan: c })}
                />
              ))}
            </div>

            {/* Semua riwayat persetujuan */}
            {(isMasterAdmin || isManagement) && pendingRequests.filter(r => r.status !== 'Pending Leader' && r.status !== 'Pending Supervisor' && r.status !== 'Pending').length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-500 mb-3 uppercase">Riwayat Persetujuan</h3>
                <div className="space-y-2">
                  {pendingRequests.filter(r => ['Disetujui', 'Ditolak'].includes(r.status)).slice(0, 20).map(req => (
                    <Card key={req.id} className="border border-gray-100 shadow-sm opacity-80">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{req.nama_karyawan}</span>
                              <span className="text-xs text-gray-400">{req.jenis_cuti} · {req.jumlah_hari}h</span>
                            </div>
                            <p className="text-xs text-gray-500">{req.tanggal_mulai} – {req.tanggal_selesai}</p>
                          </div>
                          <StatusBadge status={req.status} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* ── Approval Lembur ── */}
        {canApproveOvertime && (
          <TabsContent value="approval-lembur" className="mt-4">
            <OvertimeApprovalList claims={allOvertimes} employee={employee} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}