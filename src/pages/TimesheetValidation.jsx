import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { createPageUrl } from '@/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Download, Pencil, Users, ArrowLeft, Image, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const BULAN_NAME = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const REGU_LIST = ['Regu A', 'Regu B', 'Regu C', 'Regu D', 'Non Regu'];
const STATUS_LIST = ['Hadir', 'Backup', 'Sakit', 'Izin', 'Cuti', 'Alfa'];

// Keterangan tambahan di luar status bawaan
const EXTRA_KET = ['Lembur', 'Dinas Luar', 'Libur Nasional'];

function statusBadgeColor(status) {
  const m = {
    Hadir: 'bg-emerald-100 text-emerald-700',
    Backup: 'bg-blue-100 text-blue-700',
    Sakit: 'bg-orange-100 text-orange-700',
    Izin: 'bg-amber-100 text-amber-700',
    Cuti: 'bg-purple-100 text-purple-700',
    Alfa: 'bg-red-100 text-red-700',
    Lembur: 'bg-indigo-100 text-indigo-700'
  };
  return m[status] || 'bg-gray-100 text-gray-700';
}

export default function TimesheetValidation() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const MANAGEMENT_ROLES = ['Chief Security', 'Chief', 'Supervisor Facility', 'Supervisor Security', 'Supervisor', 'Admin Pos', 'Admin Pos Security', 'Admin Security', 'Admin Facility', 'SPV Security', 'Leader Security', 'Leader Facility'];
  const canAccess = true;

  const today = new Date();
  const queryClient = useQueryClient();
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [filterArea, setFilterArea] = useState(employee?.area_tugas || '');
  const [filterRegu, setFilterRegu] = useState('');
  const [filterBulan, setFilterBulan] = useState(String(today.getMonth() + 1));
  const [filterTahun, setFilterTahun] = useState(String(today.getFullYear()));
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'list'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Periode: 24 bulan lalu s/d 23 bulan ini
  // Contoh: filterBulan=5, filterTahun=2026 → 24 Apr 2026 s/d 23 Mei 2026
  const getPeriodRange = (bulan, tahun) => {
    const b = parseInt(bulan);
    const t = parseInt(tahun);
    // Bulan sebelumnya
    const prevMonth = b === 1 ? 12 : b - 1;
    const prevYear = b === 1 ? t - 1 : t;
    const startDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-24`;
    const endDate = `${t}-${String(b).padStart(2, '0')}-23`;
    return { startDate, endDate };
  };

  const { startDate, endDate } = getPeriodRange(filterBulan, filterTahun);
  const periodLabel = `24 ${BULAN_NAME[parseInt(filterBulan) === 1 ? 11 : parseInt(filterBulan) - 2]} ${parseInt(filterBulan) === 1 ? parseInt(filterTahun) - 1 : filterTahun} – 23 ${BULAN_NAME[parseInt(filterBulan) - 1]} ${filterTahun}`;

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-ts'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['ts-employees', filterArea],
    queryFn: () => base44.entities.Employee.filter({ area_tugas: filterArea, status_aktif: 'Aktif' }, 'nama_lengkap', 500),
    enabled: !!filterArea
  });

  const { data: attendances = [], isLoading: loadAtt } = useQuery({
    queryKey: ['ts-att', filterArea, filterRegu, startDate, endDate],
    queryFn: () => {
      const q = { area_tugas: filterArea };
      if (filterRegu) q.regu = filterRegu;
      return base44.entities.Attendance.filter(q, '-tanggal', 2000);
    },
    enabled: !!filterArea
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['ts-shifts', filterArea, filterRegu, startDate, endDate],
    queryFn: () => {
      const q = { area_tugas: filterArea };
      if (filterRegu) q.regu = filterRegu;
      return base44.entities.ShiftSchedule.filter(q, '-tanggal', 2000);
    },
    enabled: !!filterArea
  });

  // Generate list of dates in period: startDate to endDate
  const periodDates = useMemo(() => {
    const dates = [];
    const cur = new Date(startDate);
    const end = new Date(endDate);
    while (cur <= end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  const days = periodDates.length;
  const periodAttend = attendances.filter((a) => a.tanggal >= startDate && a.tanggal <= endDate);
  const periodShifts = shifts.filter((s) => s.tanggal >= startDate && s.tanggal <= endDate);

  // Employees filtered by regu
  const filteredEmployees = useMemo(() => {
    if (!filterRegu) return allEmployees;
    return allEmployees.filter((e) => e.regu === filterRegu);
  }, [allEmployees, filterRegu]);

  // Build per-employee monthly timesheet
  const employeeTimesheets = useMemo(() => {
    return filteredEmployees.map((emp) => {
      const empAtt = periodAttend.filter((a) => a.nik_karyawan === emp.nik_karyawan);
      const attByDate = {};
      empAtt.forEach((a) => {attByDate[a.tanggal] = a;});

      let hadir = 0,alfa = 0,sakit = 0,izin = 0,cuti = 0,lembur = 0,backup = 0,custom = 0;
      const dailyRows = [];

      for (let idx = 0; idx < periodDates.length; idx++) {
        const dateStr = periodDates[idx];
        const d = parseInt(dateStr.slice(8, 10));
        const att = attByDate[dateStr];
        const shift = periodShifts.find((s) => s.tanggal === dateStr && (s.regu === emp.regu || !emp.regu));

        const status = att?.status || (shift ? 'Alfa' : '');
        if (status === 'Hadir') hadir++;else
        if (status === 'Alfa') alfa++;else
        if (status === 'Sakit') sakit++;else
        if (status === 'Izin') izin++;else
        if (status === 'Cuti') cuti++;else
        if (status === 'Backup') backup++;else
        if (status === 'Lembur') lembur++;else
        if (status && !STATUS_LIST.includes(status)) custom++;

        dailyRows.push({ dateStr, d, att, shift, status });
      }

      return { emp, dailyRows, summary: { hadir, alfa, sakit, izin, cuti, lembur, backup, custom } };
    });
  }, [filteredEmployees, periodAttend, periodShifts, days, filterTahun, filterBulan]);

  const updateAttMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Attendance.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ts-att'] });
      setEditRow(null);
      toast.success('Data berhasil diupdate');
    }
  });

  const createAttMutation = useMutation({
    mutationFn: (data) => base44.entities.Attendance.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ts-att'] });
      setEditRow(null);
      toast.success('Data absensi ditambahkan');
    }
  });

  const handleEditCell = (emp, row) => {
    setEditRow({ emp, row });
    setEditForm({
      nik_karyawan: emp.nik_karyawan,
      nama_karyawan: emp.nama_lengkap,
      area_tugas: filterArea,
      regu: emp.regu || '',
      jabatan: emp.jabatan || '',
      tanggal: row.dateStr,
      jam_hadir: row.att?.jam_hadir || '',
      jam_pulang: row.att?.jam_pulang || '',
      status: row.att?.status || 'Hadir',
      keterangan: row.att?.keterangan || '',
      foto_hadir: row.att?.foto_hadir || '',
      foto_pulang: row.att?.foto_pulang || ''
    });
  };

  const handleSaveEdit = () => {
    if (editRow.row.att?.id) {
      updateAttMutation.mutate({ id: editRow.row.att.id, data: editForm });
    } else {
      createAttMutation.mutate(editForm);
    }
  };

  // Summary totals across all employees
  const grandSummary = useMemo(() => {
    let hadir = 0,alfa = 0,sakit = 0,izin = 0,cuti = 0,lembur = 0;
    employeeTimesheets.forEach((et) => {
      hadir += et.summary.hadir;
      alfa += et.summary.alfa;
      sakit += et.summary.sakit;
      izin += et.summary.izin;
      cuti += et.summary.cuti;
      lembur += et.summary.lembur;
    });
    return { hadir, alfa, sakit, izin, cuti, lembur };
  }, [employeeTimesheets]);

  const exportExcel = () => {
    if (!filterArea) {toast.error('Pilih area terlebih dahulu');return;}

    const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const rows = [];

    // Header info
    rows.push([`TIMESHEET BULANAN — ${filterArea} | Regu: ${filterRegu || 'Semua'} | Periode: ${periodLabel}`]);
    rows.push([`Dicetak: ${new Date().toLocaleDateString('id-ID')}`]);
    rows.push([]);

    // Column headers
    rows.push([
    'Nama Karyawan', 'NIK', 'Jabatan', 'Area', 'Regu',
    'Tanggal', 'Hari', 'Tipe Shift', 'Jam Shift Mulai', 'Jam Shift Selesai',
    'Status', 'Jam Hadir', 'Jam Pulang', 'Keterangan',
    'Total Hadir', 'Total Alfa', 'Total Sakit', 'Total Izin', 'Total Cuti', 'Total Backup', 'Total Lembur']
    );

    employeeTimesheets.forEach(({ emp, dailyRows, summary }) => {
      dailyRows.forEach((row, idx) => {
        if (!row.shift && !row.att) return;
        const dayName = DAYS_ID[new Date(row.dateStr + 'T00:00:00').getDay()];
        rows.push([
        emp.nama_lengkap,
        emp.nik_karyawan,
        emp.jabatan || '-',
        emp.area_tugas || filterArea,
        emp.regu || '-',
        row.dateStr,
        dayName,
        row.shift?.tipe_shift || '-',
        row.shift?.jam_mulai || '-',
        row.shift?.jam_selesai || '-',
        row.att?.status || (row.shift ? 'Alfa' : '-'),
        row.att?.jam_hadir || '-',
        row.att?.jam_pulang || '-',
        row.att?.keterangan || '-',
        idx === 0 ? summary.hadir : '',
        idx === 0 ? summary.alfa : '',
        idx === 0 ? summary.sakit : '',
        idx === 0 ? summary.izin : '',
        idx === 0 ? summary.cuti : '',
        idx === 0 ? summary.backup : '',
        idx === 0 ? summary.lembur : '']
        );
      });
      // Empty row between employees
      rows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
    { wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 20 }, { wch: 10 },
    { wch: 13 }, { wch: 6 }, { wch: 10 }, { wch: 13 }, { wch: 13 },
    { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 22 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
    XLSX.writeFile(wb, `Timesheet_${filterArea}_${startDate}_${endDate}.xlsx`);
    toast.success('File Excel berhasil diunduh');
  };

  const exportPDF = async () => {
    if (!filterArea) {toast.error('Pilih area terlebih dahulu');return;}
    setExportingPdf(true);
    toast.info('Menyiapkan PDF...');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();

    const addHeader = () => {
      doc.setFillColor(100, 10, 20);
      doc.rect(0, 0, pw, 20, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);doc.setFont('helvetica', 'bold');
      doc.text('TIMESHEET BULANAN', 14, 13);
      doc.setFontSize(8);
      doc.text(`Area: ${filterArea} | Regu: ${filterRegu || 'Semua'} | Periode: ${periodLabel}`, pw / 2, 10, { align: 'center' });
      doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pw - 14, 13, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    };

    addHeader();

    // For each employee, render a timesheet block
    let yPos = 25;

    for (let ei = 0; ei < employeeTimesheets.length; ei++) {
      const { emp, dailyRows, summary } = employeeTimesheets[ei];

      if (yPos > ph - 60) {doc.addPage();addHeader();yPos = 25;}

      // Employee header
      doc.setFillColor(220, 220, 220);
      doc.rect(10, yPos, pw - 20, 7, 'F');
      doc.setFontSize(8);doc.setFont('helvetica', 'bold');doc.setTextColor(30, 30, 30);
      doc.text(`${emp.nama_lengkap} | NIK: ${emp.nik_karyawan} | Jabatan: ${emp.jabatan || '-'} | Regu: ${emp.regu || '-'}`, 12, yPos + 5);
      yPos += 7;

      // Column headers
      const colW = (pw - 20) / 11;
      const cols = ['Tgl', 'Hari', 'Shift', 'Status', 'Jam Hadir', 'Jam Pulang', 'Keterangan', 'Foto Hadir', 'Foto Pulang'];
      doc.setFillColor(150, 20, 30);
      doc.rect(10, yPos, pw - 20, 6, 'F');
      doc.setFontSize(6);doc.setTextColor(255, 255, 255);doc.setFont('helvetica', 'bold');
      const cws = [12, 16, 18, 16, 18, 18, 24, 24, 24];
      let cx = 11;
      cols.forEach((c, i) => {doc.text(c, cx, yPos + 4.2);cx += cws[i];});
      yPos += 6;

      // Daily rows
      const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
      for (const row of dailyRows) {
        if (!row.shift && !row.att && !row.status) continue;
        if (yPos > ph - 20) {doc.addPage();addHeader();yPos = 25;}

        const bg = row.d % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
        doc.setFillColor(...bg);
        doc.rect(10, yPos, pw - 20, 7, 'F');
        doc.setFontSize(6);doc.setTextColor(40, 40, 40);doc.setFont('helvetica', 'normal');

        const dayName = DAYS_ID[new Date(row.dateStr + 'T00:00:00').getDay()];
        const vals = [
        String(row.d).padStart(2, '0'),
        dayName,
        row.shift?.tipe_shift || '-',
        row.att?.status || (row.shift ? 'Alfa' : '-'),
        row.att?.jam_hadir || '-',
        row.att?.jam_pulang || '-',
        row.att?.keterangan || '-'];

        cx = 11;
        vals.forEach((v, i) => {
          doc.text(String(v).slice(0, 16), cx, yPos + 4.5);
          cx += cws[i];
        });

        // Add foto hadir placeholder / URL reference
        if (row.att?.foto_hadir) {
          doc.setTextColor(0, 80, 200);
          doc.text('[foto]', cx, yPos + 4.5);
          doc.setTextColor(40, 40, 40);
        } else {
          doc.text('-', cx, yPos + 4.5);
        }
        cx += cws[7];
        if (row.att?.foto_pulang) {
          doc.setTextColor(0, 80, 200);
          doc.text('[foto]', cx, yPos + 4.5);
          doc.setTextColor(40, 40, 40);
        } else {
          doc.text('-', cx, yPos + 4.5);
        }

        yPos += 7;
      }

      // Summary row
      doc.setFillColor(240, 240, 240);
      doc.rect(10, yPos, pw - 20, 7, 'F');
      doc.setFont('helvetica', 'bold');doc.setFontSize(6.5);
      doc.text(`Hadir: ${summary.hadir}  Alfa: ${summary.alfa}  Sakit: ${summary.sakit}  Izin: ${summary.izin}  Cuti: ${summary.cuti}  Backup: ${summary.backup}  Lembur: ${summary.lembur}`, 12, yPos + 4.5);
      yPos += 10;
    }

    doc.save(`Timesheet_${filterArea}_${startDate}_${endDate}.pdf`);
    toast.success('PDF berhasil diunduh');
    setExportingPdf(false);
  };

  const selectedEmpData = selectedEmployee ? employeeTimesheets.find((et) => et.emp.nik_karyawan === selectedEmployee) : null;

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-500" />
        <p className="text-gray-600 font-medium">Anda tidak memiliki akses ke halaman ini.</p>
        <Button variant="outline" onClick={() => window.history.back()}>Kembali</Button>
      </div>);

  }

  return (
    <div className="space-y-4">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-gray-500 hover:text-gray-800 -ml-1">
        <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
      </Button>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
        {isMasterAdmin && (
          <div className="flex-1 min-w-36">
            <p className="text-xs text-gray-500 mb-1 font-medium">Area</p>
            <Select value={filterArea} onValueChange={(v) => {setFilterArea(v);setSelectedEmployee(null);}}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih Area" /></SelectTrigger>
              <SelectContent>
                {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Regu</p>
          <Select value={filterRegu} onValueChange={setFilterRegu}>
            <SelectTrigger className="h-9 w-32 text-sm"><SelectValue placeholder="Semua" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Semua</SelectItem>
              {REGU_LIST.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Bulan</p>
          <Select value={filterBulan} onValueChange={setFilterBulan}>
            <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BULAN_NAME.map((b, i) => <SelectItem key={i + 1} value={String(i + 1)}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1 font-medium">Tahun</p>
          <Input value={filterTahun} onChange={(e) => setFilterTahun(e.target.value)} className="h-9 w-24 text-sm" />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('monthly')} className="bg-[#140101] text-white px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-red-800">

            
            <Users className="w-4 h-4 mr-1" /> Per Karyawan
          </Button>
          <Button onClick={exportPDF} variant="outline" disabled={exportingPdf} className="border-red-200 text-red-700 hover:bg-red-50">
            <Download className="w-4 h-4 mr-1" /> {exportingPdf ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button onClick={exportExcel} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50">
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Export Excel
          </Button>
        </div>
      </div>

      {/* Grand Summary Cards */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
        { label: 'Hadir', value: grandSummary.hadir, color: 'bg-emerald-50 text-emerald-700' },
        { label: 'Alfa', value: grandSummary.alfa, color: 'bg-red-50 text-red-700' },
        { label: 'Sakit', value: grandSummary.sakit, color: 'bg-orange-50 text-orange-700' },
        { label: 'Izin', value: grandSummary.izin, color: 'bg-amber-50 text-amber-700' },
        { label: 'Cuti', value: grandSummary.cuti, color: 'bg-purple-50 text-purple-700' },
        { label: 'Lembur', value: grandSummary.lembur, color: 'bg-indigo-50 text-indigo-700' }].
        map((s) =>
        <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs">{s.label}</p>
          </div>
        )}
      </div>

      {loadAtt && <Skeleton className="h-64 rounded-2xl" />}

      {!loadAtt && filterArea &&
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Employee list for selecting detail */}
          {!selectedEmployee ?
        <>
              <div className="p-4 border-b bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">
                  {filteredEmployees.length} Karyawan — {periodLabel}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Klik nama karyawan untuk melihat detail timesheet bulanan</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80">
                      <TableHead className="text-xs">Nama Karyawan</TableHead>
                      <TableHead className="text-xs">NIK</TableHead>
                      <TableHead className="text-xs">Regu</TableHead>
                      <TableHead className="text-xs">Jabatan</TableHead>
                      <TableHead className="text-xs text-emerald-700">Hadir</TableHead>
                      <TableHead className="text-xs text-red-700">Alfa</TableHead>
                      <TableHead className="text-xs text-orange-700">Sakit</TableHead>
                      <TableHead className="text-xs text-amber-700">Izin</TableHead>
                      <TableHead className="text-xs text-purple-700">Cuti</TableHead>
                      <TableHead className="text-xs text-indigo-700">Lembur</TableHead>
                      <TableHead className="text-xs">Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.length === 0 ?
                <TableRow><TableCell colSpan={11} className="text-center py-10 text-gray-400">
                        {filterArea ? 'Tidak ada karyawan di area ini' : 'Pilih area untuk melihat data'}
                      </TableCell></TableRow> :
                employeeTimesheets.map(({ emp, summary }) =>
                <TableRow key={emp.nik_karyawan} className="hover:bg-gray-50/70 cursor-pointer" onClick={() => setSelectedEmployee(emp.nik_karyawan)}>
                        <TableCell className="text-sm font-medium">{emp.nama_lengkap}</TableCell>
                        <TableCell className="text-xs font-mono">{emp.nik_karyawan}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{emp.regu || '-'}</Badge></TableCell>
                        <TableCell className="text-xs text-gray-500">{emp.jabatan || '-'}</TableCell>
                        <TableCell><span className="text-sm font-semibold text-emerald-700">{summary.hadir}</span></TableCell>
                        <TableCell><span className="text-sm font-semibold text-red-700">{summary.alfa}</span></TableCell>
                        <TableCell><span className="text-sm font-semibold text-orange-700">{summary.sakit}</span></TableCell>
                        <TableCell><span className="text-sm font-semibold text-amber-700">{summary.izin}</span></TableCell>
                        <TableCell><span className="text-sm font-semibold text-purple-700">{summary.cuti}</span></TableCell>
                        <TableCell><span className="text-sm font-semibold text-indigo-700">{summary.lembur}</span></TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" className="h-7 text-xs">Lihat Detail</Button>
                        </TableCell>
                      </TableRow>
                )}
                  </TableBody>
                </Table>
              </div>
            </> : (

        /* Detail monthly timesheet for selected employee */
        selectedEmpData &&
        <>
                <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                  <div>
                    <button onClick={() => setSelectedEmployee(null)} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-1">
                      <ArrowLeft className="w-3 h-3" /> Kembali ke daftar
                    </button>
                    <p className="text-sm font-semibold text-gray-800">{selectedEmpData.emp.nama_lengkap}</p>
                    <p className="text-xs text-gray-500">{selectedEmpData.emp.nik_karyawan} · {selectedEmpData.emp.jabatan} · {selectedEmpData.emp.regu}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {[
              ['Hadir', selectedEmpData.summary.hadir, 'text-emerald-700'],
              ['Alfa', selectedEmpData.summary.alfa, 'text-red-700'],
              ['Sakit', selectedEmpData.summary.sakit, 'text-orange-700'],
              ['Izin', selectedEmpData.summary.izin, 'text-amber-700'],
              ['Cuti', selectedEmpData.summary.cuti, 'text-purple-700'],
              ['Lembur', selectedEmpData.summary.lembur, 'text-indigo-700']].
              map(([k, v, c]) =>
              <div key={k} className="text-center">
                        <p className={`text-lg font-bold ${c}`}>{v}</p>
                        <p className="text-gray-500">{k}</p>
                      </div>
              )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/80">
                        <TableHead className="text-xs">Tgl</TableHead>
                        <TableHead className="text-xs">Hari</TableHead>
                        <TableHead className="text-xs">Shift</TableHead>
                        <TableHead className="text-xs">Jam Shift</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs">Jam Hadir</TableHead>
                        <TableHead className="text-xs">Foto Hadir</TableHead>
                        <TableHead className="text-xs">Jam Pulang</TableHead>
                        <TableHead className="text-xs">Foto Pulang</TableHead>
                        <TableHead className="text-xs">Keterangan</TableHead>
                        <TableHead className="text-xs">Edit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedEmpData.dailyRows.map((row, i) => {
                  const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
                  const rowDate = new Date(row.dateStr + 'T00:00:00');
                  const dayName = DAYS_ID[rowDate.getDay()];
                  const isWeekend = rowDate.getDay() === 0 || rowDate.getDay() === 6;
                  return (
                    <TableRow key={i} className={`hover:bg-gray-50/50 ${isWeekend ? 'bg-blue-50/30' : ''} ${row.att?.status === 'Alfa' || !row.att && row.shift ? 'bg-red-50/30' : ''}`}>
                            <TableCell className="text-sm font-mono font-medium">{row.dateStr.slice(5)}</TableCell>
                            <TableCell className={`text-xs font-medium ${isWeekend ? 'text-blue-700' : 'text-gray-600'}`}>{dayName}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{row.shift?.tipe_shift || '-'}</Badge></TableCell>
                            <TableCell className="text-xs text-gray-500">{row.shift ? `${row.shift.jam_mulai}–${row.shift.jam_selesai}` : '-'}</TableCell>
                            <TableCell>
                              {row.att ?
                        <Badge className={`${statusBadgeColor(row.att.status)} border-0 text-xs`}>{row.att.status}</Badge> :
                        row.shift ?
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">Alfa</Badge> :

                        <span className="text-xs text-gray-300">-</span>
                        }
                            </TableCell>
                            <TableCell className="text-sm">{row.att?.jam_hadir || '-'}</TableCell>
                            <TableCell>
                              {row.att?.foto_hadir ?
                        <button onClick={() => setPreviewPhoto(row.att.foto_hadir)} className="text-blue-500 hover:text-blue-700">
                                  <Image className="w-4 h-4" />
                                </button> :
                        <span className="text-gray-300 text-xs">-</span>}
                            </TableCell>
                            <TableCell className="text-sm">{row.att?.jam_pulang || '-'}</TableCell>
                            <TableCell>
                              {row.att?.foto_pulang ?
                        <button onClick={() => setPreviewPhoto(row.att.foto_pulang)} className="text-blue-500 hover:text-blue-700">
                                  <Image className="w-4 h-4" />
                                </button> :
                        <span className="text-gray-300 text-xs">-</span>}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">{row.att?.keterangan || '-'}</TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => handleEditCell(selectedEmpData.emp, row)}>
                                <Pencil className="w-3 h-3 text-blue-500" />
                              </Button>
                            </TableCell>
                          </TableRow>);

                })}
                    </TableBody>
                  </Table>
                </div>
              </>)

        }
        </div>
      }

      {!filterArea &&
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          Pilih area untuk menampilkan timesheet bulanan karyawan
        </div>
      }

      {/* Edit Dialog */}
      <Dialog open={!!editRow} onOpenChange={() => setEditRow(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Absensi</DialogTitle>
          </DialogHeader>
          {editRow &&
          <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium">{editRow.emp.nama_lengkap} — {editRow.row.dateStr}</p>
                <p className="text-xs text-gray-500">{editRow.emp.regu} · {editRow.emp.jabatan}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Jam Hadir</label>
                  <Input type="time" value={editForm.jam_hadir} onChange={(e) => setEditForm({ ...editForm, jam_hadir: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Jam Pulang</label>
                  <Input type="time" value={editForm.jam_pulang} onChange={(e) => setEditForm({ ...editForm, jam_pulang: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...STATUS_LIST, ...EXTRA_KET].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Keterangan Custom</label>
                <Input value={editForm.keterangan || ''} onChange={(e) => setEditForm({ ...editForm, keterangan: e.target.value })} placeholder="Misal: Dinas Luar, Lembur, dll..." />
              </div>
              {/* Show photos if exist */}
              <div className="grid grid-cols-2 gap-2">
                {editForm.foto_hadir &&
              <div>
                    <p className="text-xs text-gray-500 mb-1">Foto Hadir</p>
                    <img src={editForm.foto_hadir} className="w-full h-24 object-cover rounded-lg border" alt="foto hadir" />
                  </div>
              }
                {editForm.foto_pulang &&
              <div>
                    <p className="text-xs text-gray-500 mb-1">Foto Pulang</p>
                    <img src={editForm.foto_pulang} className="w-full h-24 object-cover rounded-lg border" alt="foto pulang" />
                  </div>
              }
              </div>
            </div>
          }
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRow(null)}>Batal</Button>
            <Button onClick={handleSaveEdit} disabled={updateAttMutation.isPending || createAttMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {updateAttMutation.isPending || createAttMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Photo preview dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={() => setPreviewPhoto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Foto Absensi</DialogTitle></DialogHeader>
          {previewPhoto && <img src={previewPhoto} className="w-full rounded-xl" alt="preview" />}
        </DialogContent>
      </Dialog>
    </div>);

}