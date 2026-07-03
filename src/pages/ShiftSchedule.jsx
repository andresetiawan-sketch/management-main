import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarClock, Wand2, User, Download, FileText, Pencil, Trash2, AlertCircle, Users, Eye, Settings } from 'lucide-react';
import ConflictChecker from '@/components/shift/ConflictChecker';
import ShiftScheduleExport from '@/components/shift/ShiftScheduleExport';
import ShiftScheduleVisual from '@/components/shift/ShiftScheduleVisual';
import EmployeeAvailability from '@/components/shift/EmployeeAvailability';
import ShiftRequirementManager from '@/components/shift/ShiftRequirementManager';
import PersonelChecker from '@/components/shift/PersonelChecker';
import { base44 as base44Client } from '@/api/cloudflareClient';
import { Checkbox } from "@/components/ui/checkbox";
import jsPDF from 'jspdf';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// Jadwal shift otomatis bulanan
// Pola rotasi berdasarkan tipe shift
// 6-2: Pagi(2) → Siang(2) → Malam(2) → Off(2) → repeat
// 4-2: Pagi(2) → Siang(2) → Off(2) → repeat
// 5-2 (Non Regu): Pagi(5) → Off(2) → repeat

// Aturan penamaan shift berdasarkan jam:
// 07:00/08:00 - 15:00/16:00 = Pagi
// 15:00/16:00 - 23:00/24:00 = Siang/Sore
// 23:00/00:00 - 07:00/08:00 = Malam
function getShiftName(jam_mulai) {
  if (!jam_mulai) return 'Pagi';
  const [h] = jam_mulai.split(':').map(Number);
  if (h >= 23 || h < 7) return 'Malam';
  if (h >= 15) return 'Siang/Sore';
  return 'Pagi';
}

function getShiftHours(tipe_shift, jam_masuk, jam_pulang) {
  if (tipe_shift === '6-2') {
    // 3 giliran × 8 jam
    const [h] = jam_masuk.split(':').map(Number);
    const siangH = (h + 8) % 24;
    const malamH = (h + 16) % 24;
    const siangMulai = `${String(siangH).padStart(2, '0')}:00`;
    const malamMulai = `${String(malamH).padStart(2, '0')}:00`;
    return {
      [getShiftName(jam_masuk)]: { mulai: jam_masuk, selesai: jam_pulang },
      [getShiftName(siangMulai)]: { mulai: siangMulai, selesai: `${String((siangH + 8) % 24).padStart(2, '0')}:00` },
      [getShiftName(malamMulai)]: { mulai: malamMulai, selesai: `${String((malamH + 8) % 24).padStart(2, '0')}:00` }
    };
  }
  const shiftNama = getShiftName(jam_masuk);
  return {
    [shiftNama]: { mulai: jam_masuk, selesai: jam_pulang }
  };
}

function getPatternDescription(tipe_shift, jam_masuk, jam_pulang) {
  if (tipe_shift === '6-2') {
    const [h] = jam_masuk.split(':').map(Number);
    const siangH = (h + 8) % 24;
    const malamH = (h + 16) % 24;
    return [
    `Pagi (P×2): ${jam_masuk} – ${String(siangH).padStart(2, '0')}:00`,
    `Siang/Sore (S×2): ${String(siangH).padStart(2, '0')}:00 – ${String(malamH).padStart(2, '0')}:00`,
    `Malam (M×2): ${String(malamH).padStart(2, '0')}:00 – ${jam_masuk}`,
    `Libur/Off (O×2): istirahat`];

  }
  if (tipe_shift === '4-2') return [
  `Pagi (P×2): 07:00 – 15:00`,
  `Siang/Sore (S×2): 15:00 – 23:00`,
  `Malam (M×2): 23:00 – 07:00`,
  `Libur/Off (O×2): istirahat`];

  if (tipe_shift === '5-2') return [`Pagi (P×5): ${jam_masuk} – ${jam_pulang}`, `Off (O×2): istirahat`];
  return [`Custom: ${jam_masuk} – ${jam_pulang}`];
}

function addHours(time, hours) {
  const [h, m] = time.split(':').map(Number);
  const total = (h + hours) % 24;
  return `${String(total).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function generateMonthlySchedule({ area_tugas, regu, tahun, bulan, tipe_shift, jam_masuk, jam_pulang }) {
  const days = new Date(tahun, bulan, 0).getDate();
  const schedules = [];

  // For 4-2: 3 distinct shifts rotated: P=Pagi, S=Sore, M=Malam, O=Off
  // Pagi: jam_masuk → jam_masuk+8, Sore: jam_masuk+8 → jam_masuk+16, Malam: jam_masuk+16 → jam_masuk+24
  let pattern = [];
  let shiftMap = {};

  if (tipe_shift === '6-2') {
    const pagiMulai = jam_masuk;
    const pagiSelesai = addHours(jam_masuk, 8);
    const soreMulai = pagiSelesai;
    const soreSelesai = addHours(jam_masuk, 16);
    const malamMulai = soreSelesai;
    const malamSelesai = jam_masuk; // next day
    shiftMap = {
      'P': { mulai: pagiMulai, selesai: pagiSelesai, label: 'Pagi' },
      'S': { mulai: soreMulai, selesai: soreSelesai, label: 'Siang/Sore' },
      'M': { mulai: malamMulai, selesai: malamSelesai, label: 'Malam' }
    };
    pattern = ['P', 'P', 'S', 'S', 'M', 'M', 'O', 'O'];
  } else if (tipe_shift === '4-2') {
    const pagiMulai = '07:00';
    const pagiSelesai = '15:00';
    const soreMulai = '15:00';
    const soreSelesai = '23:00';
    const malamMulai = '23:00';
    const malamSelesai = '07:00';
    shiftMap = {
      'P': { mulai: pagiMulai, selesai: pagiSelesai, label: 'Pagi' },
      'S': { mulai: soreMulai, selesai: soreSelesai, label: 'Siang/Sore' },
      'M': { mulai: malamMulai, selesai: malamSelesai, label: 'Malam' }
    };
    // 4-2: P,P,S,S,M,M,O,O,O,O,... repeat 4 kerja 2 off per blok (P2S2M2O2 = 8 hari)
    pattern = ['P', 'P', 'S', 'S', 'M', 'M', 'O', 'O'];
  } else if (tipe_shift === '5-2') {
    shiftMap = { 'P': { mulai: jam_masuk, selesai: jam_pulang, label: 'Pagi' } };
    pattern = ['P', 'P', 'P', 'P', 'P', 'O', 'O'];
  } else {
    shiftMap = { 'P': { mulai: jam_masuk, selesai: jam_pulang, label: 'Custom' } };
    pattern = ['P'];
  }

  for (let d = 1; d <= days; d++) {
    const idx = (d - 1) % pattern.length;
    const sesi = pattern[idx];
    if (sesi === 'O') continue;
    const tanggal = `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const jam = shiftMap[sesi];
    schedules.push({ area_tugas, regu, tanggal, jam_mulai: jam.mulai, jam_selesai: jam.selesai, tipe_shift, catatan: jam.label });
  }
  return schedules;
}

function generateMonthlyScheduleWithOffset({ area_tugas, regu, tahun, bulan, tipe_shift, jam_masuk, jam_pulang, startOffset = 0 }) {
  const days = new Date(tahun, bulan, 0).getDate();
  const schedules = [];
  let pattern = [];
  let shiftMap = {};

  if (tipe_shift === '6-2') {
    const pagiMulai = jam_masuk;
    const pagiSelesai = addHours(jam_masuk, 8);
    const soreMulai = pagiSelesai;
    const soreSelesai = addHours(jam_masuk, 16);
    const malamMulai = soreSelesai;
    shiftMap = {
      'P': { mulai: pagiMulai, selesai: pagiSelesai, label: 'Pagi' },
      'S': { mulai: soreMulai, selesai: soreSelesai, label: 'Siang/Sore' },
      'M': { mulai: malamMulai, selesai: jam_masuk, label: 'Malam' }
    };
    pattern = ['P', 'P', 'S', 'S', 'M', 'M', 'O', 'O'];
  } else if (tipe_shift === '4-2') {
    shiftMap = {
      'P': { mulai: '07:00', selesai: '15:00', label: 'Pagi' },
      'S': { mulai: '15:00', selesai: '23:00', label: 'Siang/Sore' },
      'M': { mulai: '23:00', selesai: '07:00', label: 'Malam' }
    };
    pattern = ['P', 'P', 'S', 'S', 'M', 'M', 'O', 'O'];
  } else if (tipe_shift === '5-2') {
    shiftMap = { 'P': { mulai: jam_masuk, selesai: jam_pulang, label: 'Pagi' } };
    pattern = ['P', 'P', 'P', 'P', 'P', 'O', 'O'];
  } else {
    shiftMap = { 'P': { mulai: jam_masuk, selesai: jam_pulang, label: 'Custom' } };
    pattern = ['P'];
  }

  for (let d = 1; d <= days; d++) {
    const idx = (d - 1 + startOffset) % pattern.length;
    const sesi = pattern[idx];
    if (sesi === 'O') continue;
    const tanggal = `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const jam = shiftMap[sesi];
    schedules.push({ area_tugas, regu, tanggal, jam_mulai: jam.mulai, jam_selesai: jam.selesai, tipe_shift, catatan: jam.label });
  }
  return schedules;
}

export default function ShiftSchedule() {
  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');

  const [showForm, setShowForm] = useState(false);
  const [showAuto, setShowAuto] = useState(false);
  const [showIndividual, setShowIndividual] = useState(false);
  const [editSchedule, setEditSchedule] = useState(null);
  const [form, setForm] = useState({ area_tugas: '', regu: '', tanggal: '', jam_mulai: '', jam_selesai: '', tipe_shift: '' });
  const defaultIndividual = { nik_karyawan: '', nama_karyawan: '', area_tugas: employee?.area_tugas || '', regu: '', tgl_mulai: '', tgl_selesai: '', jam_mulai: '08:00', jam_selesai: '17:00', tipe_shift: 'Custom', catatan: '' };
  const [individualForm, setIndividualForm] = useState({ ...defaultIndividual });
  const [employeeSearch, setEmployeeSearch] = useState('');
  // Periode default: 24 bulan lalu s/d 23 bulan ini
  const defaultPeriode = () => {
    const now = new Date();
    const y = now.getFullYear(),m = now.getMonth(); // m=0-based
    const prevM = m === 0 ? 11 : m - 1;
    const prevY = m === 0 ? y - 1 : y;
    return {
      tgl_mulai: `${prevY}-${String(prevM + 1).padStart(2, '0')}-24`,
      tgl_selesai: `${y}-${String(m + 1).padStart(2, '0')}-23`
    };
  };
  const [autoForm, setAutoForm] = useState({ area_tugas: employee?.area_tugas || '', regu: '', tipe_shift: '', ...defaultPeriode(), jam_masuk: '06:00', jam_pulang: '14:00', semua_regu: false });
  const [generating, setGenerating] = useState(false);
  const [filterArea, setFilterArea] = useState('');
  const [filterRegu, setFilterRegu] = useState('');

  // Filter bulan dan tahun untuk tampilan
  const now = new Date();
  const [filterBulan, setFilterBulan] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [filterTahun, setFilterTahun] = useState(String(now.getFullYear()));

  // Helper untuk menghitung jumlah hari dalam periode
  const countDaysInPeriod = (tgl_mulai, tgl_selesai) => {
    const start = new Date(tgl_mulai + 'T00:00:00');
    const end = new Date(tgl_selesai + 'T00:00:00');
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays + 1; // Include both start and end date
  };

  // Periode: 24 bulan lalu s/d 23 bulan ini (untuk data yang di-fetch)
  const getPeriodDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    // tanggal 24 bulan lalu
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const startDate = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-24`;
    // tanggal 23 bulan ini
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-23`;
    return { startDate, endDate };
  };
  const { startDate, endDate } = getPeriodDates();

  const [showAvailability, setShowAvailability] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const queryClient = useQueryClient();
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const canManage = true;
  const [selected, setSelected] = useState(new Set());

  const generateTimesheetPDF = async (area, regu, bulan, tahun) => {
    const datePrefix = `${tahun}-${String(bulan).padStart(2, '0')}`;
    const [shiftData, attendData] = await Promise.all([
    base44.entities.ShiftSchedule.filter({ area_tugas: area, regu }),
    base44.entities.Attendance.filter({ area_tugas: area, regu })]
    );
    const periodShifts = shiftData.filter((s) => s.tanggal?.startsWith(datePrefix));
    const periodAttend = attendData.filter((a) => a.tanggal?.startsWith(datePrefix));

    const BULAN_NAME = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const periodLabel = `${BULAN_NAME[bulan - 1]} ${tahun}`;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(100, 10, 20);
    doc.rect(0, 0, pw, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);doc.setFont('helvetica', 'bold');
    doc.text('TIMESHEET', 14, 12);
    doc.setFontSize(8);doc.setFont('helvetica', 'normal');
    doc.text('PT. Putra Indonesia Solusi & PT. Prestasi Indonesia Solusi', 14, 19);
    doc.text(`Area: ${area} | Regu: ${regu} | Periode: ${periodLabel}`, pw / 2, 17, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    let y = 35;
    const headers = ['Tanggal', 'Shift', 'Jam Shift', 'Nama', 'Status', 'Jam Hadir', 'Jam Pulang', 'Keterangan'];
    const tableW = pw - 20;const colW = tableW / headers.length;

    doc.setFillColor(100, 10, 20);doc.rect(10, y, tableW, 7, 'F');
    doc.setTextColor(255, 255, 255);doc.setFontSize(7);doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => doc.text(h, 10 + i * colW + 1, y + 5));
    y += 7;

    const days = new Date(tahun, bulan, 0).getDate();
    for (let d = 1; d <= days; d++) {
      const dateStr = `${tahun}-${String(bulan).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const shift = periodShifts.find((s) => s.tanggal === dateStr);
      const attend = periodAttend.find((a) => a.tanggal === dateStr);
      if (!shift && !attend) continue;

      if (y > 185) {doc.addPage();y = 14;}
      const bg = d % 2 === 0 ? [248, 248, 248] : [255, 255, 255];
      doc.setFillColor(...bg);doc.rect(10, y, tableW, 7, 'F');
      doc.setTextColor(40, 40, 40);doc.setFont('helvetica', 'normal');
      const row = [
      dateStr, shift?.tipe_shift || '-',
      shift ? `${shift.jam_mulai}-${shift.jam_selesai}` : '-',
      attend?.nama_karyawan || '-',
      attend?.status || (shift ? 'Belum Absen' : '-'),
      attend?.jam_hadir || '-', attend?.jam_pulang || '-',
      shift?.catatan || '-'];

      row.forEach((v, i) => doc.text(String(v).slice(0, 18), 10 + i * colW + 1, y + 5));
      y += 7;
    }

    doc.save(`Timesheet_${area}_${regu}_${periodLabel.replace(' ', '_')}.pdf`);
    toast.success('Timesheet berhasil diunduh');
  };

  const employeeArea = employee?.area_tugas || '';

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['schedules', filterArea, filterRegu, employeeArea, isMasterAdmin, startDate, endDate, filterBulan, filterTahun],
    queryFn: async () => {
      const q = {};
      if (!isMasterAdmin) q.area_tugas = employeeArea;else
      if (filterArea) q.area_tugas = filterArea;
      if (filterRegu) q.regu = filterRegu;
      const all = Object.keys(q).length ?
      await base44.entities.ShiftSchedule.filter(q, '-tanggal', 1000) :
      await base44.entities.ShiftSchedule.list('-tanggal', 1000);
      // Filter periode: 24 bulan lalu s/d 23 bulan ini
      const filteredByPeriod = all.filter((s) => s.tanggal >= startDate && s.tanggal <= endDate);
      // Filter tambahan berdasarkan bulan dan tahun yang dipilih (hanya untuk tampilan)
      const filteredByMonth = filteredByPeriod.filter((s) => {
        const sTahun = s.tanggal.slice(0, 4);
        const sBulan = s.tanggal.slice(5, 7);
        return sTahun === filterTahun && sBulan === filterBulan;
      });
      return filteredByMonth;
    }
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas-shift'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const { data: activeEmployees = [] } = useQuery({
    queryKey: ['employees-active-shift'],
    queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }, 'nama_lengkap', 200),
    enabled: showIndividual
  });

  const createMutation = useMutation({
    mutationFn: (d) => editSchedule ? base44.entities.ShiftSchedule.update(editSchedule.id, d) : base44.entities.ShiftSchedule.create(d),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowForm(false);
      const wasEditing = !!editSchedule;
      setEditSchedule(null);
      setForm({ area_tugas: '', regu: '', tanggal: '', jam_mulai: '', jam_selesai: '', tipe_shift: '' });
      toast.success(wasEditing ? 'Jadwal diperbarui' : 'Jadwal berhasil dibuat');

      // Notifikasi jika ada karyawan_ids terdampak (edit)
      if (wasEditing && variables.karyawan_ids?.length > 0) {
        variables.karyawan_ids.forEach((nik) => {
          base44Client.functions.invoke('notifyShiftChange', {
            nik_karyawan: nik,
            tipe: 'Jadwal Berubah',
            tanggal_jadwal: variables.tanggal
          }).catch(() => {});
        });
      }
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftSchedule.delete(id),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['schedules'] });toast.success('Jadwal dihapus');}
  });

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Hapus ${selected.size} jadwal yang dipilih?`)) return;
    const ids = [...selected];
    const BATCH = 5;
    for (let i = 0; i < ids.length; i += BATCH) {
      await Promise.allSettled(ids.slice(i, i + BATCH).map((id) => base44.entities.ShiftSchedule.delete(id)));
      if (i + BATCH < ids.length) await new Promise((r) => setTimeout(r, 400));
    }
    queryClient.invalidateQueries({ queryKey: ['schedules'] });
    setSelected(new Set());
    toast.success(`${ids.length} jadwal dihapus`);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === schedules.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(schedules.map((s) => s.id)));
    }
  };

  // Helper: generate date range array (timezone-safe)
  const genDateRange = (tgl_mulai, tgl_selesai) => {
    const dates = [];
    const [sy, sm, sd] = tgl_mulai.split('-').map(Number);
    const [ey, em, ed] = tgl_selesai.split('-').map(Number);
    const cur = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    while (cur <= end) {
      const y = cur.getFullYear(), mo = String(cur.getMonth()+1).padStart(2,'0'), da = String(cur.getDate()).padStart(2,'0');
      dates.push(`${y}-${mo}-${da}`);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  const createIndividualMutation = useMutation({
    mutationFn: async (d) => {
      const { tgl_mulai, tgl_selesai, ...baseData } = d;
      const dates = genDateRange(tgl_mulai, tgl_selesai);
      const toCreate = [];

      // Ambil regu members sekali (untuk excludes dari jadwal regu)
      const reguMembers = d.regu ? await base44.entities.Employee.filter({ area_tugas: d.area_tugas, regu: d.regu, status_aktif: 'Aktif' }) : [];

      for (const tanggal of dates) {
        const singleData = { ...baseData, tanggal, karyawan_ids: [d.nik_karyawan] };

        // Exclude NIK dari jadwal regu di tanggal ini
        const existingRegu = await base44.entities.ShiftSchedule.filter({ area_tugas: d.area_tugas, regu: d.regu, tanggal });
        for (const existing of existingRegu) {
          if (!existing.karyawan_ids || existing.karyawan_ids.length === 0) {
            const idsWithoutThis = reguMembers.map(e => e.nik_karyawan).filter(nik => nik !== d.nik_karyawan);
            if (idsWithoutThis.length > 0) await base44.entities.ShiftSchedule.update(existing.id, { karyawan_ids: idsWithoutThis });
          } else {
            const newIds = existing.karyawan_ids.filter(nik => nik !== d.nik_karyawan);
            if (newIds.length !== existing.karyawan_ids.length) await base44.entities.ShiftSchedule.update(existing.id, { karyawan_ids: newIds });
          }
        }

        // Update jika jadwal perorangan sudah ada
        const existingAll = await base44.entities.ShiftSchedule.filter({ area_tugas: d.area_tugas, tanggal });
        const myExisting = existingAll.find(s => Array.isArray(s.karyawan_ids) && s.karyawan_ids.length === 1 && s.karyawan_ids[0] === d.nik_karyawan);
        if (myExisting) {
          await base44.entities.ShiftSchedule.update(myExisting.id, singleData);
        } else {
          toCreate.push(singleData);
        }
      }
      if (toCreate.length > 0) await base44.entities.ShiftSchedule.bulkCreate(toCreate);

      // Kirim notifikasi ke karyawan
      base44Client.functions.invoke('notifyShiftChange', {
        nik_karyawan: d.nik_karyawan,
        tipe: 'Jadwal Perorangan Baru',
        tanggal_jadwal: tgl_mulai
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['visual-shifts'] });
      setShowIndividual(false);
      setIndividualForm({ ...defaultIndividual });
      toast.success('Jadwal perorangan berhasil disimpan & notifikasi dikirim');
    }
  });

  const handleShiftType = (type) => {
    const defaultTimes = { '6-2': ['06:00', '14:00'], '4-2': ['06:00', '14:00'], '5-2': ['08:00', '17:00'], 'Custom': ['08:00', '16:00'] };
    const times = defaultTimes[type] || ['08:00', '16:00'];
    setForm((prev) => ({ ...prev, tipe_shift: type, jam_mulai: times[0], jam_selesai: times[1] }));
  };

  // Auto-detect tipe shift from jam masuk/pulang
  const getAutoTipeShift = (jam_masuk, jam_pulang) => {
    if (!jam_masuk || !jam_pulang) return '';
    const [h1, m1] = jam_masuk.split(':').map(Number);
    const [h2, m2] = jam_pulang.split(':').map(Number);
    let diff = h2 * 60 + m2 - (h1 * 60 + m1);
    if (diff < 0) diff += 1440;
    const hours = diff / 60;
    if (hours >= 22) return '6-2';
    if (hours >= 9 && hours <= 10) return '5-2';
    return '4-2';
  };

  const handleJamChange = (field, val) => {
    const newForm = { ...autoForm, [field]: val };
    const detected = getAutoTipeShift(
      field === 'jam_masuk' ? val : autoForm.jam_masuk,
      field === 'jam_pulang' ? val : autoForm.jam_pulang
    );
    setAutoForm({ ...newForm, tipe_shift: detected });
  };

  const handleGenerateAuto = async () => {
    if (!autoForm.area_tugas) {
      toast.error('Pilih area tugas terlebih dahulu');
      return;
    }
    if (!autoForm.tipe_shift) {
      toast.error('Pilih tipe shift terlebih dahulu');
      return;
    }
    if (!autoForm.semua_regu && !autoForm.regu) {
      toast.error('Pilih regu atau aktifkan "Generate Semua Regu"');
      return;
    }
    if (!autoForm.tgl_mulai || !autoForm.tgl_selesai) {
      toast.error('Tentukan periode tanggal terlebih dahulu');
      return;
    }
    if (new Date(autoForm.tgl_mulai) > new Date(autoForm.tgl_selesai)) {
      toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai');
      return;
    }

    setGenerating(true);

    const REGU_ORDER = ['Regu A', 'Regu B', 'Regu C', 'Regu D'];
    const SHIFT_OFFSET = { 'Regu A': 0, 'Regu B': 2, 'Regu C': 4, 'Regu D': 6 };

    // Generate jadwal berdasarkan range tanggal
    // Fungsi bantu format tanggal dari Date object (timezone-safe)
    const fmtDate = (dt) => {
      const y = dt.getFullYear();
      const m = String(dt.getMonth() + 1).padStart(2, '0');
      const d = String(dt.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const generateByDateRange = (area_tugas, regu, tgl_mulai, tgl_selesai, tipe_shift, jam_masuk, jam_pulang, startOffset = 0) => {
      const result = [];
      let pattern = [];
      let localShiftMap = {};

      if (tipe_shift === '6-2') {
        const pagiSelesai = addHours(jam_masuk, 8);
        const soreSelesai = addHours(jam_masuk, 16);
        localShiftMap = {
          'P': { mulai: jam_masuk, selesai: pagiSelesai, label: 'Pagi' },
          'S': { mulai: pagiSelesai, selesai: soreSelesai, label: 'Siang/Sore' },
          'M': { mulai: soreSelesai, selesai: jam_masuk, label: 'Malam' }
        };
        pattern = ['P', 'P', 'S', 'S', 'M', 'M', 'O', 'O'];
      } else if (tipe_shift === '4-2') {
        localShiftMap = {
          'P': { mulai: '07:00', selesai: '15:00', label: 'Pagi' },
          'S': { mulai: '15:00', selesai: '23:00', label: 'Siang/Sore' },
          'M': { mulai: '23:00', selesai: '07:00', label: 'Malam' }
        };
        pattern = ['P', 'P', 'S', 'S', 'M', 'M', 'O', 'O'];
      } else if (tipe_shift === '5-2') {
        localShiftMap = { 'P': { mulai: jam_masuk, selesai: jam_pulang, label: 'Pagi' } };
        pattern = ['P', 'P', 'P', 'P', 'P', 'O', 'O'];
      } else {
        localShiftMap = { 'P': { mulai: jam_masuk, selesai: jam_pulang, label: 'Custom' } };
        pattern = ['P'];
      }

      // Parse manual (timezone-safe)
      const [sy, sm, sd] = tgl_mulai.split('-').map(Number);
      const [ey, em, ed] = tgl_selesai.split('-').map(Number);
      const cur = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      let dayIdx = 0;
      while (cur <= end) {
        const idx = (dayIdx + startOffset) % pattern.length;
        const sesi = pattern[idx];
        if (sesi !== 'O') {
          const tanggal = fmtDate(cur);
          const jam = localShiftMap[sesi];
          result.push({ area_tugas, regu, tanggal, jam_mulai: jam.mulai, jam_selesai: jam.selesai, tipe_shift, catatan: jam.label });
        }
        cur.setDate(cur.getDate() + 1);
        dayIdx++;
      }
      return result;
    };

    try {
      let allList = [];
      const reguList = autoForm.semua_regu ? REGU_ORDER : [autoForm.regu];

      // Ambil jadwal yang sudah ada untuk area & regu ini, untuk menghitung offset lanjutan
      toast('Memeriksa jadwal sebelumnya...', { duration: 2000 });
      const existingShifts = await base44.entities.ShiftSchedule.filter(
        { area_tugas: autoForm.area_tugas },
        'tanggal',
        2000
      );

      let patternLength = 8; // default 8 untuk 6-2 dan 4-2
      if (autoForm.tipe_shift === '5-2') patternLength = 7;
      if (autoForm.tipe_shift === 'Custom') patternLength = 1;

      for (const regu of reguList) {
        // Cari jadwal terakhir regu ini sebelum tgl_mulai
        const reguExisting = existingShifts.
        filter((s) => s.regu === regu && s.tipe_shift === autoForm.tipe_shift && s.tanggal < autoForm.tgl_mulai).
        sort((a, b) => b.tanggal.localeCompare(a.tanggal));

        let startOffset = autoForm.semua_regu ? SHIFT_OFFSET[regu] || 0 : 0;

        if (reguExisting.length > 0) {
          // Cari jadwal pertama regu ini untuk menentukan titik awal pola
          const reguAll = existingShifts.
          filter((s) => s.regu === regu && s.tipe_shift === autoForm.tipe_shift).
          sort((a, b) => a.tanggal.localeCompare(b.tanggal));

          if (reguAll.length > 0) {
            // Hitung diff hari secara timezone-safe (parse manual)
            const [fy, fm, fd] = reguAll[0].tanggal.split('-').map(Number);
            const [ny, nm, nd] = autoForm.tgl_mulai.split('-').map(Number);
            const firstDate = new Date(fy, fm - 1, fd);
            const newStartDate = new Date(ny, nm - 1, nd);
            const diffDays = Math.round((newStartDate - firstDate) / (1000 * 60 * 60 * 24));

            let pattern = [];
            if (autoForm.tipe_shift === '6-2' || autoForm.tipe_shift === '4-2') {
              pattern = ['P', 'P', 'S', 'S', 'M', 'M', 'O', 'O'];
            } else if (autoForm.tipe_shift === '5-2') {
              pattern = ['P', 'P', 'P', 'P', 'P', 'O', 'O'];
            } else {
              pattern = ['P'];
            }
            const baseOffset = autoForm.semua_regu ? SHIFT_OFFSET[regu] || 0 : 0;
            startOffset = (diffDays + baseOffset) % pattern.length;
            if (startOffset < 0) startOffset += pattern.length;
          }
        }

        // Cek apakah sudah ada jadwal di periode yang sama (untuk skip duplikat)
        const existingDates = new Set(
          existingShifts.
          filter((s) => s.regu === regu && s.tanggal >= autoForm.tgl_mulai && s.tanggal <= autoForm.tgl_selesai).
          map((s) => s.tanggal)
        );

        const list = generateByDateRange(
          autoForm.area_tugas, regu,
          autoForm.tgl_mulai, autoForm.tgl_selesai,
          autoForm.tipe_shift, autoForm.jam_masuk, autoForm.jam_pulang, startOffset
        );

        // Filter jadwal yang belum ada (hindari penimpaan)
        const newList = list.filter((s) => !existingDates.has(s.tanggal));
        const skipped = list.length - newList.length;
        if (skipped > 0) {
          toast(`${skipped} jadwal ${regu} sudah ada, dilewati`, { duration: 3000 });
        }

        allList = [...allList, ...newList];
      }

      if (allList.length === 0) {
        toast.error('Tidak ada jadwal baru yang perlu dibuat. Semua tanggal sudah memiliki jadwal.');
        setGenerating(false);
        return;
      }

      await base44.entities.ShiftSchedule.bulkCreate(allList);

      // Auto-update filter bulan dan tahun sesuai periode jadwal yang di-generate
      const generatedBulan = autoForm.tgl_mulai.slice(5, 7);
      const generatedTahun = autoForm.tgl_mulai.slice(0, 4);
      setFilterBulan(generatedBulan);
      setFilterTahun(generatedTahun);

      queryClient.invalidateQueries({ queryKey: ['schedules'] });

      const daysCount = countDaysInPeriod(autoForm.tgl_mulai, autoForm.tgl_selesai);
      toast.success(`${allList.length} jadwal berhasil dibuat untuk ${daysCount} hari (${autoForm.tgl_mulai} s/d ${autoForm.tgl_selesai}). Filter otomatis diubah ke bulan ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(generatedBulan) - 1]} ${generatedTahun}`);

      const bulanNotif = parseInt(autoForm.tgl_selesai.slice(5, 7));
      const tahunNotif = parseInt(autoForm.tgl_selesai.slice(0, 4));
      base44Client.functions.invoke('notifyBulkShift', {
        area_tugas: autoForm.area_tugas,
        bulan: bulanNotif,
        tahun: tahunNotif,
        tipe: 'Jadwal Baru'
      }).catch(() => {});
    } catch (error) {
      toast.error('Gagal membuat jadwal: ' + error.message);
    }

    setGenerating(false);
    setShowAuto(false);
  };

  if (isLoading) return <Skeleton className="h-64 rounded-2xl" />;

  return (
    <div className="space-y-4">
      <ConflictChecker schedules={schedules} />
      <PersonelChecker schedules={schedules} filterArea={filterArea} />
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-gray-500">{schedules.length} jadwal shift</p>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Periode: {startDate} s/d {endDate}</span>
          {canManage &&
          <>
              {isMasterAdmin &&
            <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Filter Area" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Semua Area</SelectItem>
                    {areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}
                  </SelectContent>
                </Select>
            }
              {!isMasterAdmin && employeeArea &&
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">Area: {employeeArea}</span>
            }
              <Select value={filterRegu} onValueChange={setFilterRegu}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Filter Regu" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Semua Regu</SelectItem>
                  {["Regu A", "Regu B", "Regu C", "Regu D", "Non Regu"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterBulan} onValueChange={setFilterBulan}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Bulan" /></SelectTrigger>
                <SelectContent>
                  {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((b) =>
                <SelectItem key={b} value={b}>{['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][parseInt(b) - 1]}</SelectItem>
                )}
                </SelectContent>
              </Select>
              <Select value={filterTahun} onValueChange={setFilterTahun}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Tahun" /></SelectTrigger>
                <SelectContent>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((t) =>
                <SelectItem key={t} value={String(t)}>{t}</SelectItem>
                )}
                </SelectContent>
              </Select>
            </>
          }
        </div>
        <div className="flex gap-2 flex-wrap">
          {canManage && selected.size > 0 &&
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="w-4 h-4 mr-1" /> Hapus {selected.size} Dipilih
            </Button>
          }
          {canManage && filterArea && filterRegu &&
          <Button variant="outline" size="sm" onClick={() => generateTimesheetPDF(filterArea, filterRegu, new Date().getMonth() + 1, new Date().getFullYear())}>
              <FileText className="w-4 h-4 mr-1" /> Timesheet PDF
            </Button>
          }
          {canManage &&
          <>
              <Button variant="outline" onClick={() => setShowRequirements(true)} className="border-purple-500 text-purple-600 hover:bg-purple-50">
                <Settings className="w-4 h-4 mr-2" /> Kebutuhan Personel
              </Button>
              <Button variant="outline" onClick={() => setShowAvailability(true)} className="border-emerald-500 text-emerald-600 hover:bg-emerald-50">
                <Eye className="w-4 h-4 mr-2" /> Cek Ketersediaan
              </Button>
              <Button variant="outline" onClick={() => setShowIndividual(true)} className="border-blue-500 text-blue-600 hover:bg-blue-50">
                <User className="w-4 h-4 mr-2" /> Jadwal Perorangan
              </Button>
              <Button variant="outline" onClick={() => setShowAuto(true)} className="border-[var(--maroon)] text-[var(--maroon)] hover:bg-[var(--maroon-50)]">
                <Wand2 className="w-4 h-4 mr-2" /> Generate Bulanan
              </Button>
              <ShiftScheduleExport
              areas={areas}
              isMasterAdmin={isMasterAdmin}
              employeeArea={employeeArea} />
            
              <ShiftScheduleVisual
              areas={areas}
              isMasterAdmin={isMasterAdmin}
              employeeArea={employeeArea} />
            
            </>
          }
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              {canManage && <TableHead className="w-10"><Checkbox checked={schedules.length > 0 && selected.size === schedules.length} onCheckedChange={toggleSelectAll} /></TableHead>}
              <TableHead className="text-xs">Tanggal</TableHead>
              <TableHead className="text-xs">Area</TableHead>
              <TableHead className="text-xs">Regu</TableHead>
              <TableHead className="text-xs">Tipe Shift</TableHead>
              <TableHead className="text-xs">Sesi</TableHead>
              <TableHead className="text-xs">Jam</TableHead>
              {canManage && <TableHead className="text-xs">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.length === 0 ?
            <TableRow><TableCell colSpan={canManage ? 8 : 7} className="text-center py-10 text-gray-400">Belum ada jadwal</TableCell></TableRow> :
            schedules.map((s) =>
            <TableRow key={s.id} className={`hover:bg-gray-50/50 ${selected.has(s.id) ? 'bg-blue-50' : ''}`}>
                {canManage && <TableCell><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} /></TableCell>}
                <TableCell className="text-sm">{s.tanggal}</TableCell>
                <TableCell className="text-sm font-medium">{s.area_tugas}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{s.regu}</Badge></TableCell>
                <TableCell><Badge className="bg-[var(--maroon-50)] text-[var(--maroon)] text-xs border-0">{s.tipe_shift}</Badge></TableCell>
                <TableCell className="text-xs text-gray-500">{s.catatan || getShiftName(s.jam_mulai)}</TableCell>
                <TableCell className="text-sm">{s.jam_mulai} - {s.jam_selesai}</TableCell>
                {canManage &&
              <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => {setEditSchedule(s);setForm({ area_tugas: s.area_tugas, regu: s.regu, tanggal: s.tanggal, jam_mulai: s.jam_mulai, jam_selesai: s.jam_selesai, tipe_shift: s.tipe_shift });setShowForm(true);}}>
                        <Pencil className="w-3 h-3 text-blue-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => {if (confirm('Hapus jadwal ini?')) deleteMutation.mutate(s.id);}}>
                        <Trash2 className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
              }
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Manual Form */}
      <Dialog open={showForm} onOpenChange={(v) => {if (!v) {setEditSchedule(null);}setShowForm(v);}}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editSchedule ? 'Edit Jadwal Shift' : 'Buat Jadwal Shift Manual'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Area Tugas</Label>
              <Select value={form.area_tugas} onValueChange={(v) => setForm({ ...form, area_tugas: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Regu</Label>
              <Select value={form.regu} onValueChange={(v) => setForm({ ...form, regu: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih regu..." /></SelectTrigger>
                <SelectContent>{["Regu A", "Regu B", "Regu C", "Regu D", "Non Regu"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
            <div>
              <Label>Tipe Shift</Label>
              <Select value={form.tipe_shift} onValueChange={handleShiftType}>
                <SelectTrigger><SelectValue placeholder="Pilih tipe..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6-2">6-2 (Pagi/Siang/Malam 2hr + Off 2hr)</SelectItem>
                  <SelectItem value="4-2">4-2 (Pagi/Siang 2hr + Off 2hr)</SelectItem>
                  <SelectItem value="5-2">5-2 (Pagi 5hr + Off 2hr)</SelectItem>
                  <SelectItem value="Custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Jam Mulai</Label><Input type="time" value={form.jam_mulai} onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })} /></div>
              <div><Label>Jam Selesai</Label><Input type="time" value={form.jam_selesai} onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setShowForm(false);setEditSchedule(null);}}>Batal</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="bg-[var(--maroon)] hover:bg-[var(--maroon-light)]">{editSchedule ? 'Update' : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Schedule Dialog */}
      <Dialog open={showIndividual} onOpenChange={(v) => {setShowIndividual(v);if (!v) setEmployeeSearch('');}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><User className="w-5 h-5 text-blue-600" /> Jadwal Shift Perorangan</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Pilih Karyawan *</Label>
              <Select
                value={individualForm.nik_karyawan}
                onValueChange={(v) => {
                  const emp = activeEmployees.find((e) => e.nik_karyawan === v);
                  if (emp) {
                    setIndividualForm((p) => ({
                      ...p,
                      nik_karyawan: emp.nik_karyawan,
                      nama_karyawan: emp.nama_lengkap,
                      area_tugas: emp.area_tugas || p.area_tugas,
                      regu: emp.regu || p.regu
                    }));
                  }
                }}>
                
                <SelectTrigger><SelectValue placeholder="Pilih karyawan aktif..." /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((e) =>
                  <SelectItem key={e.nik_karyawan} value={e.nik_karyawan}>
                      {e.nama_lengkap} — {e.nik_karyawan} ({e.area_tugas || '-'})
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            {individualForm.nik_karyawan &&
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800 grid grid-cols-3 gap-2">
                <div><span className="text-gray-500">NIK:</span> {individualForm.nik_karyawan}</div>
                <div><span className="text-gray-500">Area:</span> {individualForm.area_tugas || '-'}</div>
                <div><span className="text-gray-500">Regu:</span> {individualForm.regu || '-'}</div>
              </div>
            }
            <div>
              <Label>Area Tugas</Label>
              {isMasterAdmin ?
              <Select value={individualForm.area_tugas} onValueChange={(v) => setIndividualForm((p) => ({ ...p, area_tugas: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                  <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
                </Select> :

              <div className="mt-1 h-9 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700">{individualForm.area_tugas || '-'}</div>
              }
            </div>
            <div>
              <Label>Regu</Label>
              <Select value={individualForm.regu} onValueChange={(v) => setIndividualForm((p) => ({ ...p, regu: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih regu..." /></SelectTrigger>
                <SelectContent>{["Regu A", "Regu B", "Regu C", "Regu D", "Non Regu"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Mulai *</Label>
                <Input type="date" value={individualForm.tgl_mulai} onChange={(e) => setIndividualForm((p) => ({ ...p, tgl_mulai: e.target.value }))} />
              </div>
              <div>
                <Label>Tanggal Selesai *</Label>
                <Input type="date" value={individualForm.tgl_selesai} onChange={(e) => setIndividualForm((p) => ({ ...p, tgl_selesai: e.target.value }))} />
              </div>
            </div>
            {individualForm.tgl_mulai && individualForm.tgl_selesai && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 text-center">
                {genDateRange(individualForm.tgl_mulai, individualForm.tgl_selesai).length} hari ({individualForm.tgl_mulai} s/d {individualForm.tgl_selesai})
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jam Mulai</Label>
                <Input type="time" value={individualForm.jam_mulai} onChange={(e) => {
                  const j = e.target.value;
                  const detected = getAutoTipeShift(j, individualForm.jam_selesai);
                  setIndividualForm((p) => ({ ...p, jam_mulai: j, tipe_shift: detected || p.tipe_shift }));
                }} />
              </div>
              <div>
                <Label>Jam Selesai</Label>
                <Input type="time" value={individualForm.jam_selesai} onChange={(e) => {
                  const j = e.target.value;
                  const detected = getAutoTipeShift(individualForm.jam_mulai, j);
                  setIndividualForm((p) => ({ ...p, jam_selesai: j, tipe_shift: detected || p.tipe_shift }));
                }} />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
              <span className="font-semibold">Tipe Shift Terdeteksi: </span>
              <span className="font-bold text-blue-700">{individualForm.tipe_shift || 'Masukkan jam dulu'}</span>
              <span className="text-blue-400 ml-1">(otomatis)</span>
            </div>
            <div><Label>Catatan</Label><Input value={individualForm.catatan} onChange={(e) => setIndividualForm((p) => ({ ...p, catatan: e.target.value }))} placeholder="Opsional..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndividual(false)}>Batal</Button>
            <Button onClick={() => createIndividualMutation.mutate(individualForm)} disabled={createIndividualMutation.isPending || !individualForm.nik_karyawan || !individualForm.tgl_mulai || !individualForm.tgl_selesai} className="bg-blue-600 hover:bg-blue-700 text-white">
              {createIndividualMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmployeeAvailability open={showAvailability} onClose={() => setShowAvailability(false)} />
      <ShiftRequirementManager open={showRequirements} onClose={() => setShowRequirements(false)} areas={areas} />

      {/* Auto Generate Bulanan */}
      <Dialog open={showAuto} onOpenChange={setShowAuto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[var(--maroon)]" /> Generate Jadwal Bulanan Otomatis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {autoForm.tipe_shift ?
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Keterangan Pola {autoForm.tipe_shift}:</p>
                {getPatternDescription(autoForm.tipe_shift, autoForm.jam_masuk || '06:00', autoForm.jam_pulang || '14:00').map((p, i) =>
              <p key={i}>• {p}</p>
              )}
              </div> :

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <p className="font-semibold">Masukkan jam masuk & pulang — tipe shift dan pola akan terdeteksi otomatis.</p>
              </div>
            }
            <div>
              <Label>Area Tugas</Label>
              {isMasterAdmin ?
              <Select value={autoForm.area_tugas} onValueChange={(v) => setAutoForm((p) => ({ ...p, area_tugas: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                  <SelectContent>{areas.map((a) => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
                </Select> :

              <div className="mt-1 h-9 px-3 flex items-center rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700">{autoForm.area_tugas || '-'}</div>
              }
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Regu</Label>
                <label className="flex items-center gap-2 text-xs text-blue-700 cursor-pointer">
                  <Checkbox checked={autoForm.semua_regu} onCheckedChange={(v) => setAutoForm((p) => ({ ...p, semua_regu: !!v, regu: '' }))} />
                  <Users className="w-3 h-3" /> Generate Semua Regu (Rotasi A→B→C→D)
                </label>
              </div>
              {!autoForm.semua_regu &&
              <Select value={autoForm.regu} onValueChange={(v) => setAutoForm((p) => ({ ...p, regu: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih regu..." /></SelectTrigger>
                  <SelectContent>{["Regu A", "Regu B", "Regu C", "Regu D", "Non Regu"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              }
              {autoForm.semua_regu &&
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
                  Regu A=Pagi, Regu B=Siang/Sore, Regu C=Malam, Regu D=Pagi (bergilir otomatis)
                </div>
              }
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jam Masuk</Label>
                <Input type="time" value={autoForm.jam_masuk} onChange={(e) => handleJamChange('jam_masuk', e.target.value)} />
              </div>
              <div>
                <Label>Jam Pulang</Label>
                <Input type="time" value={autoForm.jam_pulang} onChange={(e) => handleJamChange('jam_pulang', e.target.value)} />
              </div>
            </div>
            {/* Tipe Shift auto-detected */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
              <span className="font-semibold">Tipe Shift Terdeteksi: </span>
              <span className="font-bold text-blue-700">{autoForm.tipe_shift || 'Belum terdeteksi'}</span>
              <span className="text-blue-500 ml-2">(otomatis dari durasi jam kerja)</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Periode Generate</Label>
                {autoForm.tgl_mulai && autoForm.tgl_selesai &&
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {countDaysInPeriod(autoForm.tgl_mulai, autoForm.tgl_selesai)} hari
                  </Badge>
                }
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
                <p className="font-semibold">💡 Periode Fleksibel & Anti-Overlap</p>
                <p className="mt-0.5">Generate otomatis <span className="font-bold">melanjutkan pola shift sebelumnya</span> — tidak ada jadwal yang ditimpa.</p>
                <p className="mt-1 text-green-700">Tanggal yang sudah ada jadwal akan dilewati secara otomatis. Pola rotasi disambung dari jadwal terakhir.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500">Dari Tanggal</Label>
                  <Input type="date" value={autoForm.tgl_mulai} onChange={(e) => setAutoForm((p) => ({ ...p, tgl_mulai: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Sampai Tanggal</Label>
                  <Input type="date" value={autoForm.tgl_selesai} onChange={(e) => setAutoForm((p) => ({ ...p, tgl_selesai: e.target.value }))} />
                </div>
              </div>
              {autoForm.tgl_mulai && autoForm.tgl_selesai &&
              <div className="space-y-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-700 text-center">
                    <p className="font-semibold">Periode: {autoForm.tgl_mulai} s/d {autoForm.tgl_selesai}</p>
                    <p className="mt-0.5">Total: <span className="font-bold">{countDaysInPeriod(autoForm.tgl_mulai, autoForm.tgl_selesai)} hari</span></p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
                    <p className="font-semibold">💡 Tips:</p>
                    <p className="mt-0.5">Setelah generate, gunakan <span className="font-bold">filter Bulan & Tahun</span> di atas untuk melihat jadwal yang baru dibuat.</p>
                  </div>
                </div>
              }
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAuto(false)} className="text-gray-950">Batal</Button>
            <Button onClick={handleGenerateAuto} disabled={generating} className="bg-slate-950 text-primary-foreground px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-9 hover:bg-[var(--maroon-light)]">
              <Wand2 className="w-4 h-4 mr-2 bg-[hsl(var(--foreground))]" /> {generating ? 'Membuat...' : 'Generate Jadwal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>);

}