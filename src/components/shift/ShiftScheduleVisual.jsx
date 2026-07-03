import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileSpreadsheet, FileText, Upload, Plus, Trash2, Pencil, X, Palette, Check, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";
const BULAN_NAME = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const REGU_LIST = ['Regu A','Regu B','Regu C','Regu D','Non Regu'];

// Default keterangan warna
const DEFAULT_KETERANGAN = [
  { kode: 'P', label: 'Pagi', warna: '#DCFCE7', warnaText: '#166534' },
  { kode: 'S', label: 'Siang/Sore', warna: '#FEF9C3', warnaText: '#854D0E' },
  { kode: 'M', label: 'Malam', warna: '#DBEAFE', warnaText: '#1E40AF' },
  { kode: 'L', label: 'Lembur', warna: '#FEE2E2', warnaText: '#991B1B' },
  { kode: 'Off', label: 'Off/Libur', warna: '#F3F4F6', warnaText: '#6B7280' },
];

const COLOR_PRESETS = [
  '#DCFCE7','#FEF9C3','#DBEAFE','#FEE2E2','#F3E8FF','#FFE4E6','#E0F2FE',
  '#FEF3C7','#D1FAE5','#FCE7F3','#E5E7EB','#F5F0FF','#FFF7ED','#ECFDF5'
];

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return [r,g,b];
}

function getSesiFromShift(shift) {
  if (!shift) return 'Off';
  const jam = shift.jam_mulai || '';
  const [h] = jam.split(':').map(Number);
  if (isNaN(h)) return 'P';
  if (h >= 23 || h < 7) return 'M';
  if (h >= 15) return 'S';
  return 'P';
}

function generateDateRange(startDate, endDate) {
  const dates = [];
  // Parse manually to avoid timezone issues
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  while (cur <= end) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, '0');
    const d = String(cur.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function ShiftScheduleVisual({ areas, isMasterAdmin, employeeArea }) {
  const today = new Date();
  const defaultStart = new Date(today.getFullYear(), today.getMonth() - 1, 24);
  const defaultEnd = new Date(today.getFullYear(), today.getMonth(), 23);
  const formatDate = (d) => d.toISOString().slice(0,10);

  const [open, setOpen] = useState(false);
  const [exportArea, setExportArea] = useState(isMasterAdmin ? '' : (employeeArea || ''));
  const [exportRegu, setExportRegu] = useState('');
  const [startDate, setStartDate] = useState(formatDate(defaultStart));
  const [endDate, setEndDate] = useState(formatDate(defaultEnd));
  const [keterangan, setKeterangan] = useState(DEFAULT_KETERANGAN);
  const [showKetEditor, setShowKetEditor] = useState(false);
  const [editKetIdx, setEditKetIdx] = useState(null);
  const [newKet, setNewKet] = useState({ kode: '', label: '', warna: '#FFFFFF', warnaText: '#000000' });
  const [ttdPembuat, setTtdPembuat] = useState('');
  const [ttdMengetahui, setTtdMengetahui] = useState('');
  const [ttdMenyetujui, setTtdMenyetujui] = useState('');
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState('');
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  // overrides: { [nik_karyawan]: { [tanggal]: 'P'|'S'|'M'|'L'|kode } }
  const [overrides, setOverrides] = useState({});
  // popover sel aktif
  const [activeCell, setActiveCell] = useState(null); // { nik, date }
  // baris yang disembunyikan di mode edit
  const [hiddenRows, setHiddenRows] = useState([]);
  const uploadRef = useRef(null);
  const queryClient = useQueryClient();

  const periodDates = generateDateRange(startDate, endDate);
  const startD = new Date(startDate);
  const endD = new Date(endDate);
  const periodLabel = `${startD.getDate()} ${BULAN_NAME[startD.getMonth()]} ${startD.getFullYear()} – ${endD.getDate()} ${BULAN_NAME[endD.getMonth()]} ${endD.getFullYear()}`;

  const { data: employees = [] } = useQuery({
    queryKey: ['visual-employees', exportArea],
    queryFn: () => base44.entities.Employee.filter({ area_tugas: exportArea, status_aktif: 'Aktif' }, 'nama_lengkap', 500),
    enabled: !!exportArea && open
  });

  const filteredEmployees = exportRegu ? employees.filter(e => e.regu === exportRegu) : employees;
  // Sort: Non Regu dulu, lalu Regu A, B, C, D; dalam tiap regu: leader dulu, lalu nama
  const REGU_ORDER = ['Non Regu', 'Regu A', 'Regu B', 'Regu C', 'Regu D'];
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const reguIdxA = REGU_ORDER.indexOf(a.regu || 'Non Regu');
    const reguIdxB = REGU_ORDER.indexOf(b.regu || 'Non Regu');
    if (reguIdxA !== reguIdxB) return (reguIdxA === -1 ? 99 : reguIdxA) - (reguIdxB === -1 ? 99 : reguIdxB);
    const isLeaderA = ['Leader','Chief','Supervisor'].some(k => (a.jabatan||'').includes(k));
    const isLeaderB = ['Leader','Chief','Supervisor'].some(k => (b.jabatan||'').includes(k));
    if (isLeaderA && !isLeaderB) return -1;
    if (!isLeaderA && isLeaderB) return 1;
    return (a.nama_lengkap||'').localeCompare(b.nama_lengkap||'');
  });


  // Hitung tanggal periode sebelumnya (1 hari sebelum startDate)
  const prevDateObj = (() => {
    const [y, m, d] = startDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d - 1);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  })();

  const { data: shifts = [] } = useQuery({
    queryKey: ['visual-shifts', exportArea, startDate, endDate],
    queryFn: async () => {
      const results = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.ShiftSchedule.filter({ area_tugas: exportArea }, 'tanggal', 500, skip);
        results.push(...batch);
        if (batch.length < 500) break;
        skip += 500;
      }
      // Ambil shift periode ini + 1 hari sebelumnya untuk infer tanggal pertama
      return results.filter(s => s.tanggal >= prevDateObj && s.tanggal <= endDate);
    },
    enabled: !!exportArea && open
  });

  // Fetch attendance untuk deteksi lembur (Off yang tetap absen = "L")
  const { data: attendances = [] } = useQuery({
    queryKey: ['visual-attendance', exportArea, startDate, endDate],
    queryFn: () => base44.entities.Attendance.filter({ area_tugas: exportArea }, 'tanggal', 1000),
    enabled: !!exportArea && open,
    select: (data) => data.filter(a => a.tanggal >= startDate && a.tanggal <= endDate)
  });

  // Map attendance: { nik: { tanggal: attendanceRecord } }
  const attendMap = {};
  attendances.forEach(a => {
    if (!attendMap[a.nik_karyawan]) attendMap[a.nik_karyawan] = {};
    attendMap[a.nik_karyawan][a.tanggal] = a;
  });

  // Buat shiftByEmpByDate map
  const shiftMap = {};
  shifts.forEach(s => {
    const ids = Array.isArray(s.karyawan_ids) ? s.karyawan_ids : [];
    const targets = ids.length > 0 ? ids : null;
    sortedEmployees.forEach(emp => {
      const belongs = targets ? targets.includes(emp.nik_karyawan) : (s.regu ? s.regu === emp.regu : true);
      if (belongs) {
        if (!shiftMap[emp.nik_karyawan]) shiftMap[emp.nik_karyawan] = {};
        if (!shiftMap[emp.nik_karyawan][s.tanggal]) shiftMap[emp.nik_karyawan][s.tanggal] = s;
      }
    });
  });

  const getKetForSesi = (sesi) => {
    if (!sesi) return { warna: '#F3F4F6', warnaText: '#6B7280', label: 'Off' };
    return keterangan.find(k => k.kode === sesi) || { warna: '#FFFFFF', warnaText: '#000000', label: sesi };
  };

  // Ambil nilai akhir sel (override > shiftMap > hari sebelumnya untuk tanggal pertama)
  const getCellSesi = (nik, date) => {
    if (overrides[nik]?.[date] !== undefined) return overrides[nik][date];
    const shift = shiftMap[nik]?.[date];
    const sesi = getSesiFromShift(shift);

    // Jika tanggal pertama & tidak ada shift → cek hari sebelumnya
    if (sesi === 'Off' && date === startDate) {
      const prevShift = shiftMap[nik]?.[prevDateObj];
      if (prevShift) return getSesiFromShift(prevShift);
      // Jika tidak ada shift di hari sebelumnya juga, tetap Off
    }

    // Jika Off tapi karyawan tetap absen (lembur) → tampilkan "L"
    if (sesi === 'Off') {
      const attend = attendMap[nik]?.[date];
      if (attend && (attend.status === 'Hadir' || attend.status === 'Backup')) {
        return 'L';
      }
    }

    return sesi;
  };

  const handleCellClick = (nik, date) => {
    if (!editMode) return;
    setActiveCell(prev => (prev?.nik === nik && prev?.date === date) ? null : { nik, date });
  };

  const setCellValue = (nik, date, kode) => {
    setOverrides(prev => ({
      ...prev,
      [nik]: { ...(prev[nik] || {}), [date]: kode }
    }));
    setActiveCell(null);
  };

  const resetOverrides = () => { setOverrides({}); setActiveCell(null); setHiddenRows([]); };
  const hideRow = (nik) => { setHiddenRows(prev => [...prev, nik]); setActiveCell(null); };

  const handleUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') { toast.error('Hanya file PDF yang diizinkan'); return; }
    setUploadingPdf(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedPdfUrl(file_url);
      toast.success('PDF berhasil diupload');
    } catch (err) {
      toast.error('Gagal upload: ' + err.message);
    }
    setUploadingPdf(false);
  };

  // ── Export Excel ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!exportArea) { toast.error('Pilih area terlebih dahulu'); return; }
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      const ws_data = [];

      // Baris 1: judul
      ws_data.push([`JADWAL SHIFT PERIODE ${startD.getDate()} ${BULAN_NAME[startD.getMonth()].toUpperCase()} ${startD.getFullYear()} - ${endD.getDate()} ${BULAN_NAME[endD.getMonth()].toUpperCase()} ${endD.getFullYear()}`]);
      ws_data.push([`AREA TUGAS: ${exportArea.toUpperCase()}${exportRegu ? ' | REGU: '+exportRegu.toUpperCase() : ''}`]);
      ws_data.push([]);

      // Baris bulan (KET di akhir)
      const bulanRow = ['NO', 'NIK', 'NAMA KARYAWAN', 'JABATAN', 'AREA TUGAS', 'REGU'];
      periodDates.forEach(d => bulanRow.push(BULAN_NAME[parseInt(d.slice(5,7))-1].slice(0,3).toUpperCase()));
      bulanRow.push('KETERANGAN');
      ws_data.push(bulanRow);

      // Baris tanggal
      const headerRow = ['', '', '', '', '', ''];
      periodDates.forEach(d => headerRow.push(String(parseInt(d.slice(8,10)))));
      headerRow.push('');
      ws_data.push(headerRow);

      // Data karyawan (filter hidden rows)
      const visibleEmps = sortedEmployees.filter(emp => !hiddenRows.includes(emp.nik_karyawan));
      visibleEmps.forEach((emp, idx) => {
        const sesiCount = {};
        periodDates.forEach(date => {
          const s = getCellSesi(emp.nik_karyawan, date);
          sesiCount[s] = (sesiCount[s] || 0) + 1;
        });
        const ketStr = Object.entries(sesiCount).map(([k, v]) => `${k}=${v}`).join(', ');
        const row = [
          idx + 1,
          emp.nik_karyawan || '-',
          (emp.nama_lengkap || '-').toUpperCase(),
          (emp.jabatan || '-').toUpperCase(),
          (emp.area_tugas || '-').toUpperCase(),
          (emp.regu || '-').toUpperCase(),
        ];
        periodDates.forEach(date => {
          row.push(getCellSesi(emp.nik_karyawan, date));
        });
        row.push(ketStr);
        ws_data.push(row);
      });

      ws_data.push([]);
      // Keterangan
      ws_data.push(['KETERANGAN:']);
      keterangan.forEach(k => ws_data.push([`${k.kode} = ${k.label}`]));
      ws_data.push([]);
      ws_data.push([]);

      // TTD row (total kolom = 6 + tanggal + 1 KET)
      const totalColsForTtd = 6 + periodDates.length + 1;
      const ttdRow = new Array(totalColsForTtd).fill('');
      ttdRow[0] = 'Yang Membuat,';
      ttdRow[Math.floor(totalColsForTtd / 3)] = 'Yang Mengetahui,';
      ttdRow[Math.floor(totalColsForTtd * 2 / 3)] = 'Yang Menyetujui,';
      ws_data.push(ttdRow);
      ws_data.push(new Array(totalColsForTtd).fill(''));
      ws_data.push(new Array(totalColsForTtd).fill(''));
      ws_data.push(new Array(totalColsForTtd).fill(''));
      const namaRow = new Array(totalColsForTtd).fill('');
      namaRow[0] = (ttdPembuat || '(_________________)').toUpperCase();
      namaRow[Math.floor(totalColsForTtd / 3)] = (ttdMengetahui || '(_________________)').toUpperCase();
      namaRow[Math.floor(totalColsForTtd * 2 / 3)] = (ttdMenyetujui || '(_________________)').toUpperCase();
      ws_data.push(namaRow);

      const ws = XLSX.utils.aoa_to_sheet(ws_data);

      // Lebar kolom (NO, NIK, Nama, Jabatan, Area, Regu, ...tanggal..., KET)
      const totalCols = 6 + periodDates.length + 1;
      ws['!cols'] = [
        { wch: 4 }, { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 10 },
        ...periodDates.map(() => ({ wch: 4 })),
        { wch: 20 }
      ];

      // Warna header
      const thinB = { style: 'thin', color: { rgb: 'AAAAAA' } };
      const bord = { top: thinB, bottom: thinB, left: thinB, right: thinB };
      const headerStyle = { fill: { fgColor: { rgb: '7B1A2C' } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: 8 }, border: bord, alignment: { horizontal: 'center', vertical: 'center' } };

      // Header baris 3 (bulan) & 4 (tanggal) = index 3 & 4
      for (let c = 0; c < totalCols; c++) {
        const r3 = XLSX.utils.encode_cell({ r: 3, c });
        const r4 = XLSX.utils.encode_cell({ r: 4, c });
        if (!ws[r3]) ws[r3] = { v: '', t: 's' };
        if (!ws[r4]) ws[r4] = { v: '', t: 's' };
        ws[r3].s = headerStyle;
        ws[r4].s = headerStyle;
      }

      // Border & warna data (hanya visible employees)
      const dataStartRow = 5;
      visibleEmps.forEach((emp, empIdx) => {
        const rowIdx = dataStartRow + empIdx;
        // Fixed cols (6 kolom: NO NIK NAMA JABATAN AREA REGU)
        for (let c = 0; c < 6; c++) {
          const ref = XLSX.utils.encode_cell({ r: rowIdx, c });
          if (!ws[ref]) ws[ref] = { v: '', t: 's' };
          ws[ref].s = { border: bord, font: { sz: 8 }, fill: { fgColor: { rgb: empIdx % 2 === 0 ? 'F9FAFB' : 'FFFFFF' } } };
        }
        // Tanggal cols
        periodDates.forEach((date, dayIdx) => {
          const colIdx = 6 + dayIdx;
          const ref = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
          if (!ws[ref]) ws[ref] = { v: '', t: 's' };
          const sesi = getCellSesi(emp.nik_karyawan, date);
          const ket = getKetForSesi(sesi);
          const bg = (ket.warna || '#FFFFFF').replace('#','');
          const fg = (ket.warnaText || '#000000').replace('#','');
          ws[ref].s = { fill: { fgColor: { rgb: bg } }, font: { bold: true, sz: 8, color: { rgb: fg } }, border: bord, alignment: { horizontal: 'center', vertical: 'center' } };
        });
        // KET col (terakhir)
        const ketColIdx = 6 + periodDates.length;
        const ketRef = XLSX.utils.encode_cell({ r: rowIdx, c: ketColIdx });
        if (!ws[ketRef]) ws[ketRef] = { v: '', t: 's' };
        ws[ketRef].s = { border: bord, font: { sz: 7, italic: true }, fill: { fgColor: { rgb: empIdx % 2 === 0 ? 'F9FAFB' : 'FFFFFF' } } };
      });

      XLSX.utils.book_append_sheet(wb, ws, 'Jadwal Shift');
      XLSX.writeFile(wb, `JadwalShift_${exportArea}_${startDate}_${endDate}.xlsx`);
      toast.success('Excel berhasil diunduh');
    } catch (e) {
      toast.error('Gagal: ' + e.message);
    }
    setLoading(false);
  };

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    if (!exportArea) { toast.error('Pilih area terlebih dahulu'); return; }
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const marginL = 7, marginR = 7;

      const drawHeader = () => {
        // Header background
        doc.setFillColor(123, 26, 44);
        doc.rect(0, 0, pw, 28, 'F');
        // Logo area (putih lingkaran)
        doc.setFillColor(255,255,255);
        doc.circle(18, 14, 10, 'F');
        // Text header
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`PERIODE ${startD.getDate()} ${BULAN_NAME[startD.getMonth()].toUpperCase()} ${startD.getFullYear()} - ${endD.getDate()} ${BULAN_NAME[endD.getMonth()].toUpperCase()} ${endD.getFullYear()}`, pw / 2, 13, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`AREA: ${(exportArea || '').toUpperCase()}${exportRegu ? ' | REGU: ' + exportRegu.toUpperCase() : ''}`, pw / 2, 21, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      };

      drawHeader();

      // Kolom tetap: NO, NIK, Nama, Jabatan, Area, Regu (KET dipindah ke akhir)
      const fixedW = [7, 18, 32, 22, 22, 14];
      const ketColW = 28;
      const usedFixed = fixedW.reduce((a, b) => a + b, 0) + ketColW;
      const tableWidth = pw - marginL - marginR;
      const dateColW = Math.max(3.5, (tableWidth - usedFixed) / periodDates.length);
      const rowH = 5.5, headerH = 9;
      let yPos = 31;

      const drawTableHeader = () => {
        doc.setFillColor(123, 26, 44);
        doc.rect(marginL, yPos, tableWidth, headerH, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5);

        let x = marginL + 0.5;
        ['NO', 'NIK', 'NAMA KARYAWAN', 'JABATAN', 'AREA TUGAS', 'REGU'].forEach((label, i) => {
          doc.text(label, x + 0.5, yPos + 6);
          x += fixedW[i];
        });

        // Kolom tanggal
        periodDates.forEach(date => {
          const day = parseInt(date.slice(8,10));
          const bIdx = parseInt(date.slice(5,7)) - 1;
          doc.setFontSize(3.5);
          doc.text(BULAN_NAME[bIdx].slice(0,3).toUpperCase(), x + dateColW/2, yPos + 4, { align: 'center' });
          doc.setFontSize(5);
          doc.text(String(day), x + dateColW/2, yPos + 7.5, { align: 'center' });
          x += dateColW;
        });
        // Kolom KET (terakhir)
        doc.setFontSize(5);
        doc.text('KETERANGAN', x + ketColW/2, yPos + 6, { align: 'center' });

        doc.setTextColor(0, 0, 0);
        yPos += headerH;
      };

      drawTableHeader();

      const pdfVisibleEmps = sortedEmployees.filter(emp => !hiddenRows.includes(emp.nik_karyawan));
      pdfVisibleEmps.forEach((emp, idx) => {
        if (yPos > ph - 35) {
          doc.addPage();
          drawHeader();
          yPos = 31;
          drawTableHeader();
        }

        const rowBg = idx % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
        doc.setFillColor(...rowBg);
        doc.rect(marginL, yPos, tableWidth, rowH, 'F');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(4.5);
        doc.setTextColor(30, 30, 30);

        let x = marginL + 0.5;
        [
          String(idx + 1),
          (emp.nik_karyawan || '-').slice(0, 16),
          (emp.nama_lengkap || '-').toUpperCase().slice(0, 24),
          (emp.jabatan || '-').toUpperCase().slice(0, 18),
          (emp.area_tugas || '-').toUpperCase().slice(0, 18),
          (emp.regu || '-').toUpperCase().slice(0, 10),
        ].forEach((val, i) => {
          doc.text(val, x + 0.5, yPos + 3.8);
          x += fixedW[i];
        });

        // Kolom tanggal
        const dateStartX = x;
        periodDates.forEach(date => {
          const sesi = getCellSesi(emp.nik_karyawan, date);
          const ket = getKetForSesi(sesi);
          const bg = hexToRgb(ket.warna || '#FFFFFF');
          const fg = hexToRgb(ket.warnaText || '#000000');
          doc.setFillColor(...bg);
          doc.rect(x, yPos, dateColW, rowH, 'F');
          doc.setTextColor(...fg);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(4.5);
          doc.text(sesi, x + dateColW/2, yPos + 3.8, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 30, 30);
          x += dateColW;
        });

        // Kolom KET di akhir
        const sesiCount = {};
        periodDates.forEach(date => {
          const s = getCellSesi(emp.nik_karyawan, date);
          sesiCount[s] = (sesiCount[s] || 0) + 1;
        });
        const ketStr = Object.entries(sesiCount).map(([k, v]) => `${k}=${v}`).join(' ');
        doc.setFontSize(4);
        doc.setTextColor(80, 80, 80);
        doc.text(ketStr, x + 1, yPos + 3.8);
        doc.setTextColor(30, 30, 30);

        yPos += rowH;
      });

      // Border garis horizontal
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.12);
      const tblStartY = 31 + headerH;
      for (let r = 0; r <= pdfVisibleEmps.length; r++) {
        const ly = tblStartY + r * rowH;
        doc.line(marginL, ly, marginL + tableWidth, ly);
      }
      // Garis vertikal fixed cols
      let vx = marginL;
      fixedW.forEach(w => { vx += w; doc.line(vx, 31, vx, tblStartY + pdfVisibleEmps.length * rowH); });
      for (let di = 0; di <= periodDates.length; di++) {
        doc.line(vx + di * dateColW, 31, vx + di * dateColW, tblStartY + pdfVisibleEmps.length * rowH);
      }
      // Garis vertikal KET col
      doc.line(vx + periodDates.length * dateColW + ketColW, 31, vx + periodDates.length * dateColW + ketColW, tblStartY + pdfVisibleEmps.length * rowH);

      yPos += 5;
      if (yPos > ph - 55) { doc.addPage(); drawHeader(); yPos = 32; }

      // Keterangan
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.text('KETERANGAN:', marginL, yPos);
      yPos += 4;
      let kx = marginL;
      keterangan.forEach(k => {
        const bg = hexToRgb(k.warna || '#FFFFFF');
        const fg = hexToRgb(k.warnaText || '#000000');
        doc.setFillColor(...bg);
        doc.rect(kx, yPos - 3, 22, 5, 'F');
        doc.setDrawColor(180,180,180);
        doc.rect(kx, yPos - 3, 22, 5, 'S');
        doc.setTextColor(...fg);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.text(`${k.kode} = ${k.label}`, kx + 1, yPos + 0.5);
        doc.setTextColor(30, 30, 30);
        kx += 25;
      });

      yPos += 10;
      if (yPos > ph - 40) { doc.addPage(); drawHeader(); yPos = 32; }

      // TTD 3 pihak
      const col1 = marginL + 10;
      const col2 = pw / 2 - 20;
      const col3 = pw - marginR - 50;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 30, 30);
      doc.text('Yang Membuat,', col1, yPos);
      doc.text('Yang Mengetahui,', col2, yPos);
      doc.text('Yang Menyetujui,', col3, yPos);

      yPos += 18;
      // Garis TTD
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(col1, yPos, col1 + 40, yPos);
      doc.line(col2, yPos, col2 + 40, yPos);
      doc.line(col3, yPos, col3 + 40, yPos);

      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text((ttdPembuat || '( ................................ )').toUpperCase(), col1, yPos);
      doc.text((ttdMengetahui || '( ................................ )').toUpperCase(), col2, yPos);
      doc.text((ttdMenyetujui || '( ................................ )').toUpperCase(), col3, yPos);

      const fn = `JadwalShift_${exportArea}_${startDate}_${endDate}.pdf`;
      doc.save(fn);
      toast.success('PDF berhasil diunduh');
    } catch (e) {
      toast.error('Gagal export PDF: ' + e.message);
    }
    setLoading(false);
  };

  const addKet = () => {
    if (!newKet.kode || !newKet.label) { toast.error('Kode dan label wajib diisi'); return; }
    setKeterangan(prev => [...prev, { ...newKet }]);
    setNewKet({ kode: '', label: '', warna: '#FFFFFF', warnaText: '#000000' });
  };

  const removeKet = (idx) => setKeterangan(prev => prev.filter((_, i) => i !== idx));

  // Tabel preview visual (tampilan Excel-like di layar)
  const previewVisible = !!exportArea && sortedEmployees.length > 0 && periodDates.length > 0;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        className="border-orange-500 text-orange-600 hover:bg-orange-50"
      >
        <FileSpreadsheet className="w-4 h-4 mr-2" /> Jadwal Visual
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[98vw] w-full max-h-[95vh] overflow-y-auto p-0">
          <div className="sticky top-0 z-10 bg-white border-b px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={LOGO_URL} alt="Logo" className="w-9 h-9 object-contain rounded-full" />
              <div>
                <h2 className="font-bold text-gray-800 text-sm">Jadwal Shift Visual (Excel-Style)</h2>
                {exportArea && <p className="text-xs text-gray-500">{exportArea}{exportRegu ? ` · ${exportRegu}` : ''} · {periodLabel}</p>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}><X className="w-4 h-4" /></Button>
          </div>

          <div className="p-5 space-y-4">
            {/* === Filter === */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {isMasterAdmin ? (
                <div>
                  <Label className="text-xs">Area Tugas *</Label>
                  <Select value={exportArea} onValueChange={setExportArea}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pilih area..." /></SelectTrigger>
                    <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.nama_area}>{a.nama_area}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex items-end">
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-700 w-full">Area: <span className="font-semibold">{exportArea}</span></div>
                </div>
              )}
              <div>
                <Label className="text-xs">Regu (opsional)</Label>
                <Select value={exportRegu} onValueChange={setExportRegu}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Semua Regu" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Semua Regu</SelectItem>
                    {REGU_LIST.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tanggal Mulai *</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 text-xs" />
              </div>
              <div>
                <Label className="text-xs">Tanggal Akhir *</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 text-xs" />
              </div>
            </div>

            {/* === Keterangan Warna === */}
            <div className="border rounded-xl p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700 flex items-center gap-1"><Palette className="w-3.5 h-3.5" /> Keterangan Warna</span>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowKetEditor(v => !v)}>
                  {showKetEditor ? 'Sembunyikan' : 'Edit Keterangan'}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {keterangan.map((k, idx) => (
                  <div key={idx} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold border" style={{ background: k.warna, color: k.warnaText, borderColor: k.warna }}>
                    {k.kode} = {k.label}
                    {showKetEditor && (
                      <button onClick={() => removeKet(idx)} className="ml-1 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                    )}
                  </div>
                ))}
              </div>
              {showKetEditor && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                  <div>
                    <Label className="text-xs">Kode</Label>
                    <Input value={newKet.kode} onChange={e => setNewKet(p => ({...p, kode: e.target.value.toUpperCase().slice(0,3)}))} placeholder="P" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Label</Label>
                    <Input value={newKet.label} onChange={e => setNewKet(p => ({...p, label: e.target.value}))} placeholder="Pagi" className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Warna Latar</Label>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {COLOR_PRESETS.slice(0,7).map(c => (
                        <button key={c} onClick={() => setNewKet(p => ({...p, warna: c}))} className="w-5 h-5 rounded border-2" style={{ background: c, borderColor: newKet.warna === c ? '#000' : 'transparent' }} />
                      ))}
                      <input type="color" value={newKet.warna} onChange={e => setNewKet(p => ({...p, warna: e.target.value}))} className="w-5 h-5 rounded cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Warna Teks</Label>
                    <input type="color" value={newKet.warnaText} onChange={e => setNewKet(p => ({...p, warnaText: e.target.value}))} className="w-8 h-8 rounded cursor-pointer border" />
                  </div>
                  <Button onClick={addKet} size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah
                  </Button>
                </div>
              )}
            </div>

            {/* === Preview Tabel Excel-like === */}
            {previewVisible && (
              <div className="border rounded-xl overflow-hidden">
                {/* Toolbar Edit */}
                <div className="bg-gray-100 border-b px-3 py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditMode(v => !v); setActiveCell(null); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${editMode ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-400 hover:bg-orange-50'}`}
                    >
                      <PenLine className="w-3.5 h-3.5" />
                      {editMode ? 'Mode Edit AKTIF – Klik Sel' : 'Edit Manual'}
                    </button>
                    {editMode && (Object.keys(overrides).some(k => Object.keys(overrides[k]).length > 0) || hiddenRows.length > 0) && (
                      <button onClick={resetOverrides} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-red-500 border border-red-300 bg-white hover:bg-red-50">
                        <X className="w-3 h-3" /> Reset Edit {hiddenRows.length > 0 ? `(${hiddenRows.length} baris disembunyikan)` : ''}
                      </button>
                    )}
                  </div>
                  {editMode && (
                    <span className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1">
                      Klik sel tanggal untuk mengubah sesi
                    </span>
                  )}
                </div>

                {/* Header dokumen */}
                <div className="bg-[#7B1A2C] text-white p-3 flex items-center gap-3">
                  <img src={LOGO_URL} alt="Logo" className="w-10 h-10 object-contain rounded-full bg-white p-0.5" />
                  <div>
                    <p className="font-bold text-sm">PERIODE {String(startD.getDate()).padStart(2,'0')} {BULAN_NAME[startD.getMonth()].toUpperCase()} {startD.getFullYear()} – {String(endD.getDate()).padStart(2,'0')} {BULAN_NAME[endD.getMonth()].toUpperCase()} {endD.getFullYear()}</p>
                    <p className="text-xs opacity-75">AREA: {(exportArea||'').toUpperCase()}{exportRegu ? ' | REGU: '+exportRegu.toUpperCase() : ''}</p>
                  </div>
                </div>

                {/* Tabel scroll horizontal */}
                <div className="overflow-x-auto max-h-96" onClick={() => setActiveCell(null)}>
                  <table className="text-[10px] border-collapse w-full min-w-max">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-[#7B1A2C] text-white">
                        {editMode && <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[24px]"></th>}
                        <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[24px]">NO</th>
                        <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[80px] text-left">NIK</th>
                        <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[140px] text-left">NAMA KARYAWAN</th>
                        <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[100px] text-left">JABATAN</th>
                        <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[100px] text-left">AREA TUGAS</th>
                        <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[65px] text-left">REGU</th>
                        {periodDates.map(date => {
                          const day = parseInt(date.slice(8,10));
                          const bIdx = parseInt(date.slice(5,7)) - 1;
                          return (
                            <th key={date} className="border border-[#9B2C3E] px-0.5 py-0.5 font-bold min-w-[22px] text-center">
                              <div className="text-[7px] opacity-75">{BULAN_NAME[bIdx].slice(0,3)}</div>
                              <div>{day}</div>
                            </th>
                          );
                        })}
                        <th className="border border-[#9B2C3E] px-1 py-1 font-bold min-w-[100px] text-left">KETERANGAN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEmployees.filter(emp => !hiddenRows.includes(emp.nik_karyawan)).map((emp, idx) => {
                        // Hitung keterangan sesi unik untuk baris ini
                        const sesiCount = {};
                        periodDates.forEach(date => {
                          const s = getCellSesi(emp.nik_karyawan, date);
                          sesiCount[s] = (sesiCount[s] || 0) + 1;
                        });
                        const ketSummary = Object.entries(sesiCount).map(([kode, cnt]) => {
                          const k = getKetForSesi(kode);
                          return `${kode}=${cnt}`;
                        }).join(', ');
                        return (
                        <tr key={emp.nik_karyawan} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          {editMode && (
                            <td className="border border-gray-200 px-0.5 py-0.5 text-center">
                              <button
                                onClick={() => hideRow(emp.nik_karyawan)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-0.5"
                                title="Hapus baris ini"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          )}
                          <td className="border border-gray-200 px-1 py-0.5 text-center text-gray-500">{idx+1}</td>
                          <td className="border border-gray-200 px-1 py-0.5 font-mono">{emp.nik_karyawan || '-'}</td>
                          <td className="border border-gray-200 px-1 py-0.5 font-medium">{(emp.nama_lengkap||'-').toUpperCase()}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-gray-600">{(emp.jabatan||'-').toUpperCase()}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-gray-600">{(emp.area_tugas||'-').toUpperCase()}</td>
                          <td className="border border-gray-200 px-1 py-0.5 text-gray-600">{(emp.regu||'-').toUpperCase()}</td>
                          {periodDates.map(date => {
                            const sesi = getCellSesi(emp.nik_karyawan, date);
                            const ket = getKetForSesi(sesi);
                            const isActive = activeCell?.nik === emp.nik_karyawan && activeCell?.date === date;
                            const isOverridden = overrides[emp.nik_karyawan]?.[date] !== undefined;
                            return (
                              <td
                                key={date}
                                className={`border border-gray-200 px-0.5 py-0.5 text-center font-bold relative ${editMode ? 'cursor-pointer hover:ring-2 hover:ring-orange-400 hover:ring-inset' : ''} ${isActive ? 'ring-2 ring-orange-500 ring-inset z-20' : ''}`}
                                style={{ background: ket.warna, color: ket.warnaText }}
                                onClick={() => handleCellClick(emp.nik_karyawan, date)}
                              >
                                {sesi}
                                {isOverridden && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-orange-500 rounded-full" title="Diedit manual" />}
                                {/* Dropdown pilih sesi */}
                                {isActive && (
                                  <div className="absolute top-full left-0 z-50 mt-0.5 bg-white border border-orange-300 rounded-lg shadow-xl p-1 min-w-[80px]" onClick={e => e.stopPropagation()}>
                                    <div className="text-[9px] text-gray-400 px-1 pb-1 font-normal">Pilih Sesi:</div>
                                    {keterangan.map(k => (
                                      <button
                                        key={k.kode}
                                        onClick={(e) => { e.stopPropagation(); setCellValue(emp.nik_karyawan, date, k.kode); }}
                                        className="flex items-center gap-1 w-full px-1.5 py-0.5 rounded hover:bg-gray-100 text-left"
                                        style={{ color: k.warnaText }}
                                      >
                                        <span className="w-5 h-4 rounded text-[9px] font-bold flex items-center justify-center" style={{ background: k.warna, color: k.warnaText }}>{k.kode}</span>
                                        <span className="text-[9px] text-gray-700 font-normal">{k.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td className="border border-gray-200 px-1 py-0.5 text-gray-500 text-[9px] whitespace-nowrap">{ketSummary}</td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Keterangan bawah */}
                <div className="bg-gray-50 border-t px-3 py-2 flex flex-wrap gap-2">
                  {keterangan.map((k, idx) => (
                    <span key={idx} className="text-xs font-bold px-2 py-0.5 rounded border" style={{ background: k.warna, color: k.warnaText, borderColor: k.warna }}>
                      {k.kode} = {k.label}
                    </span>
                  ))}
                </div>

                {/* TTD section */}
                <div className="border-t px-4 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Yang Membuat,</p>
                      <div className="h-14 border-b border-gray-400 flex items-end justify-center pb-1">
                        <span className="text-xs text-gray-400 italic">TTD</span>
                      </div>
                      <p className="text-xs font-semibold mt-1 uppercase">{ttdPembuat || '(_____________)'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Yang Mengetahui,</p>
                      <div className="h-14 border-b border-gray-400 flex items-end justify-center pb-1">
                        <span className="text-xs text-gray-400 italic">TTD</span>
                      </div>
                      <p className="text-xs font-semibold mt-1 uppercase">{ttdMengetahui || '(_____________)'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Yang Menyetujui,</p>
                      <div className="h-14 border-b border-gray-400 flex items-end justify-center pb-1">
                        <span className="text-xs text-gray-400 italic">TTD</span>
                      </div>
                      <p className="text-xs font-semibold mt-1 uppercase">{ttdMenyetujui || '(_____________)'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* === TTD Input === */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Nama Yang Membuat</Label>
                <Input value={ttdPembuat} onChange={e => setTtdPembuat(e.target.value.toUpperCase())} placeholder="Nama pembuat..." className="h-8 text-xs uppercase" />
              </div>
              <div>
                <Label className="text-xs">Nama Yang Mengetahui</Label>
                <Input value={ttdMengetahui} onChange={e => setTtdMengetahui(e.target.value.toUpperCase())} placeholder="Nama yang mengetahui..." className="h-8 text-xs uppercase" />
              </div>
              <div>
                <Label className="text-xs">Nama Yang Menyetujui</Label>
                <Input value={ttdMenyetujui} onChange={e => setTtdMenyetujui(e.target.value.toUpperCase())} placeholder="Nama yang menyetujui..." className="h-8 text-xs uppercase" />
              </div>
            </div>

            {/* === Upload PDF TTD === */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Upload PDF Sudah Ditandatangani (3 Pihak)</p>
                  <p className="text-xs text-gray-400 mt-0.5">Upload dokumen jadwal yang sudah ditandatangani oleh semua pihak</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={uploadingPdf}
                  onClick={() => uploadRef.current?.click()}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  {uploadingPdf ? 'Uploading...' : 'Upload PDF'}
                </Button>
                <input ref={uploadRef} type="file" accept="application/pdf" className="hidden" onChange={handleUploadPdf} />
              </div>
              {uploadedPdfUrl && (
                <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-green-800">PDF berhasil diupload</p>
                    <a href={uploadedPdfUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 underline truncate block">{uploadedPdfUrl.split('/').pop()}</a>
                  </div>
                  <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setUploadedPdfUrl('')}>
                    <X className="w-3 h-3 text-red-400" />
                  </Button>
                </div>
              )}
            </div>

            {/* === Tombol Download === */}
            <div className="flex gap-3 pt-1">
              <Button onClick={exportExcel} disabled={loading || !exportArea} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <FileSpreadsheet className="w-4 h-4 mr-2" /> {loading ? 'Memproses...' : 'Export Excel'}
              </Button>
              <Button onClick={exportPDF} disabled={loading || !exportArea} className="flex-1 bg-[#7B1A2C] hover:bg-[#5A1220] text-white">
                <FileText className="w-4 h-4 mr-2" /> {loading ? 'Memproses...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}