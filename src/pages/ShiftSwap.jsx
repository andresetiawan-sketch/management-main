import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter } from
'@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue } from
'@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Users,
  AlertCircle,
  FileText,
  Trash2 } from
'lucide-react';
import { createPageUrl } from '@/utils';

const statusColors = {
  'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Disetujui Atasan': 'bg-green-100 text-green-800 border-green-200',
  'Ditolak': 'bg-red-100 text-red-800 border-red-200',
  'Selesai': 'bg-blue-100 text-blue-800 border-blue-200'
};

const statusIcons = {
  'Pending': Clock,
  'Disetujui Atasan': CheckCircle,
  'Ditolak': XCircle,
  'Selesai': CheckCircle
};

export default function ShiftSwapPage() {
  const [employee, setEmployee] = useState(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [catatanAtasan, setCatatanAtasan] = useState('');

  const [requestForm, setRequestForm] = useState({
    nik_penerima: '',
    shift_tanggal: '',
    shift_id_pemohon: '',
    shift_id_penerima: '',
    alasan: ''
  });

  useEffect(() => {
    const stored = localStorage.getItem('pis_employee');
    if (!stored) {
      window.location.href = createPageUrl('EmployeeLogin');
      return;
    }
    setEmployee(JSON.parse(stored));
  }, []);

  const { data: shiftSwaps = [], isLoading, refetch } = useQuery({
    queryKey: ['shiftSwaps', employee?.nik_karyawan],
    queryFn: async () => {
      if (!employee) return [];

      // Get all shift swaps where employee is pemohon or penerima
      const allSwaps = await base44.entities.ShiftSwap.list('-tanggal_pengajuan', 100);

      return allSwaps.filter((swap) =>
      swap.nik_pemohon === employee.nik_karyawan ||
      swap.nik_penerima === employee.nik_karyawan
      );
    },
    enabled: !!employee
  });

  const { data: mySchedules = [] } = useQuery({
    queryKey: ['myShiftSchedules', employee?.nik_karyawan],
    queryFn: async () => {
      if (!employee) return [];
      const all = await base44.entities.ShiftSchedule.list('', 500);
      return all.filter((s) =>
      (s.karyawan_ids || []).includes(employee.nik_karyawan)
      );
    },
    enabled: !!employee
  });

  const { data: colleagues = [] } = useQuery({
    queryKey: ['colleagues', employee?.area_tugas],
    queryFn: async () => {
      if (!employee) return [];
      const all = await base44.entities.Employee.filter({
        status_aktif: 'Aktif',
        area_tugas: employee.area_tugas
      });
      return all.filter((e) => e.nik_karyawan !== employee.nik_karyawan);
    },
    enabled: !!employee
  });

  const requestMutation = useMutation({
    mutationFn: async (data) => {
      const swapData = {
        ...data,
        nik_pemohon: employee.nik_karyawan,
        nama_pemohon: employee.nama_lengkap,
        area_tugas: employee.area_tugas,
        tanggal_pengajuan: new Date().toISOString().slice(0, 10),
        status: 'Pending'
      };

      // Get nama_penerima
      const penerima = colleagues.find((c) => c.nik_karyawan === data.nik_penerima);
      if (penerima) {
        swapData.nama_penerima = penerima.nama_lengkap;
      }

      return base44.entities.ShiftSwap.create(swapData);
    },
    onSuccess: () => {
      toast.success('Pengajuan tukar shift berhasil dikirim');
      setShowRequestDialog(false);
      setRequestForm({
        nik_penerima: '',
        shift_tanggal: '',
        shift_id_pemohon: '',
        shift_id_penerima: '',
        alasan: ''
      });
      refetch();
    },
    onError: (error) => {
      toast.error('Gagal mengajukan tukar shift: ' + error.message);
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ shiftSwapId, approved, catatan }) => {
      const response = await base44.functions.invoke('approveShiftSwap', {
        shiftSwapId,
        approved,
        catatan
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Shift swap berhasil diproses');
      setShowDetailDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error('Gagal memproses: ' + error.message);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (shiftSwapId) => {
      const response = await base44.functions.invoke('cancelShiftSwap', { shiftSwapId });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Pengajuan dibatalkan');
      refetch();
    }
  });

  const handleRequest = () => {
    if (!requestForm.nik_penerima || !requestForm.shift_tanggal || !requestForm.alasan) {
      toast.error('Mohon lengkapi semua field');
      return;
    }
    requestMutation.mutate(requestForm);
  };

  const handleApprove = (approved) => {
    if (!selectedSwap) return;
    approveMutation.mutate({
      shiftSwapId: selectedSwap.id,
      approved,
      catatan: catatanAtasan
    });
  };

  const isAtasan = ['Leader Security', 'Leader Facility', 'Chief Security', 'Supervisor Facility', 'Supervisor Security'].includes(employee?.role);

  if (!employee) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tukar Shift</h1>
          <p className="text-sm text-gray-500">Ajukan atau kelola pengajuan tukar shift</p>
        </div>
        <Button onClick={() => setShowRequestDialog(true)} className="hover:bg-[var(--maroon-light)] bg-[hsl(var(--foreground))] text-[hsl(var(--sidebar-accent))]">
          <ArrowLeftRight className="w-4 h-4 mr-2 text-[hsl(var(--background))]" />
          Ajukan Tukar Shift
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{shiftSwaps.filter((s) => s.status === 'Pending').length}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{shiftSwaps.filter((s) => s.status === 'Disetujui Atasan').length}</p>
                <p className="text-xs text-gray-500">Disetujui</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{shiftSwaps.filter((s) => s.status === 'Ditolak').length}</p>
                <p className="text-xs text-gray-500">Ditolak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{colleagues.length}</p>
                <p className="text-xs text-gray-500">Rekan Kerja</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Swaps List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Riwayat Pengajuan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ?
          <div className="text-center py-8 text-gray-400">Loading...</div> :
          shiftSwaps.length === 0 ?
          <div className="text-center py-8 text-gray-400">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Belum ada pengajuan tukar shift</p>
            </div> :

          <div className="space-y-2">
              {shiftSwaps.map((swap) => {
              const StatusIcon = statusIcons[swap.status] || Clock;
              const isMyRequest = swap.nik_pemohon === employee.nik_karyawan;

              return (
                <div
                  key={swap.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedSwap(swap);
                    setShowDetailDialog(true);
                  }}>
                  
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={statusColors[swap.status]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {swap.status}
                          </Badge>
                          {isMyRequest ?
                        <Badge variant="outline" className="text-xs">Pengajuan Saya</Badge> :

                        <Badge variant="outline" className="text-xs">Untuk Saya</Badge>
                        }
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Dari:</span>
                            <span className="ml-2 font-medium">{swap.nama_pemohon}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Kepada:</span>
                            <span className="ml-2 font-medium">{swap.nama_penerima}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Tanggal:</span>
                            <span className="ml-2 font-medium">{swap.shift_tanggal}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Diajukan:</span>
                            <span className="ml-2 font-medium">{swap.tanggal_pengajuan}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <ArrowLeftRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>);

            })}
            </div>
          }
        </CardContent>
      </Card>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-[var(--maroon)]" />
              Ajukan Tukar Shift
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rekan Kerja *</Label>
              <Select
                value={requestForm.nik_penerima}
                onValueChange={(v) => setRequestForm((p) => ({ ...p, nik_penerima: v }))}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Pilih rekan kerja..." />
                </SelectTrigger>
                <SelectContent>
                  {colleagues.map((c) =>
                  <SelectItem key={c.nik_karyawan} value={c.nik_karyawan}>
                      {c.nama_lengkap} - {c.nik_karyawan}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift Anda yang akan ditukar *</Label>
              <Select
                value={requestForm.shift_id_pemohon}
                onValueChange={(v) => {
                  const schedule = mySchedules.find((s) => s.id === v);
                  setRequestForm((p) => ({
                    ...p,
                    shift_id_pemohon: v,
                    shift_tanggal: schedule?.tanggal || p.shift_tanggal
                  }));
                }}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Pilih shift Anda..." />
                </SelectTrigger>
                <SelectContent>
                  {mySchedules.map((s) =>
                  <SelectItem key={s.id} value={s.id}>
                      {s.tanggal} - {s.catatan} ({s.jam_mulai}-{s.jam_selesai})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Shift rekan yang akan diambil (opsional)</Label>
              <Select
                value={requestForm.shift_id_penerima}
                onValueChange={(v) => setRequestForm((p) => ({ ...p, shift_id_penerima: v }))}>
                
                <SelectTrigger>
                  <SelectValue placeholder="Opsional - jika ada shift spesifik" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Tidak ada shift spesifik</SelectItem>
                  {mySchedules.map((s) =>
                  <SelectItem key={s.id} value={s.id}>
                      {s.tanggal} - {s.catatan}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Kosongkan jika hanya ingin mengambil shift rekan tanpa memberikan shift Anda
              </p>
            </div>
            <div>
              <Label>Alasan *</Label>
              <Textarea
                value={requestForm.alasan}
                onChange={(e) => setRequestForm((p) => ({ ...p, alasan: e.target.value }))}
                placeholder="Jelaskan alasan pengajuan tukar shift..."
                className="min-h-[100px]" />
              
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>Batal</Button>
            <Button
              onClick={handleRequest}
              disabled={requestMutation.isPending}
              className="hover:bg-[var(--maroon-light)] text-[hsl(var(--foreground))] bg-[hsl(var(--sidebar-primary-foreground))]">
              
              {requestMutation.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedSwap &&
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Detail Pengajuan Tukar Shift
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[selectedSwap.status]}>
                  {statusIcons[selectedSwap.status] &&
                React.createElement(statusIcons[selectedSwap.status], { className: "w-3 h-3 mr-1" })
                }
                  {selectedSwap.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Pemohon</Label>
                  <p className="font-medium">{selectedSwap.nama_pemohon}</p>
                  <p className="text-sm text-gray-500">{selectedSwap.nik_pemohon}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Penerima</Label>
                  <p className="font-medium">{selectedSwap.nama_penerima}</p>
                  <p className="text-sm text-gray-500">{selectedSwap.nik_penerima}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Tanggal Shift</Label>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {selectedSwap.shift_tanggal}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Tanggal Pengajuan</Label>
                  <p className="font-medium">{selectedSwap.tanggal_pengajuan}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-gray-500">Alasan</Label>
                <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedSwap.alasan}</p>
              </div>

              {selectedSwap.status !== 'Pending' &&
            <div>
                  <Label className="text-xs text-gray-500">Approval</Label>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-sm font-medium">{selectedSwap.nama_atasan}</p>
                    <p className="text-xs text-gray-500">{selectedSwap.tanggal_approval}</p>
                    {selectedSwap.catatan_atasan &&
                <p className="text-sm mt-2 italic">"{selectedSwap.catatan_atasan}"</p>
                }
                  </div>
                </div>
            }

              {selectedSwap.status === 'Pending' && isAtasan && selectedSwap.nik_penerima === employee.nik_karyawan &&
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-2 block">Approve Pengajuan Ini?</Label>
                  <Textarea
                value={catatanAtasan}
                onChange={(e) => setCatatanAtasan(e.target.value)}
                placeholder="Catatan approval (opsional)..."
                className="mb-3" />
              
                  <div className="flex gap-2">
                    <Button
                  onClick={() => handleApprove(true)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={approveMutation.isPending}>
                  
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Setujui
                    </Button>
                    <Button
                  onClick={() => handleApprove(false)}
                  variant="destructive"
                  disabled={approveMutation.isPending}>
                  
                      <XCircle className="w-4 h-4 mr-2" />
                      Tolak
                    </Button>
                  </div>
                </div>
            }

              {selectedSwap.status === 'Pending' && selectedSwap.nik_pemohon === employee.nik_karyawan &&
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate(selectedSwap.id)}
              className="w-full"
              disabled={cancelMutation.isPending}>
              
                  <Trash2 className="w-4 h-4 mr-2" />
                  Batalkan Pengajuan
                </Button>
            }
            </div>
          </DialogContent>
        </Dialog>
      }
    </div>);

}