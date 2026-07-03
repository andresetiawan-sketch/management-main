import { useState, useRef, useMemo } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Upload, Eye, FileSpreadsheet, FileText, CheckCircle2, X, Plus, Pencil, Trash2, Square, CheckSquare } from 'lucide-react';
import PayslipExcelInput from '@/components/payslip/PayslipExcelInput';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

// ── terbilang ──────────────────────────────────────────
function angkaTerbilang(n) {
  const sat = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n < 12) return sat[n];
  if (n < 20) return sat[n - 10] + ' Belas';
  if (n < 100) return sat[Math.floor(n / 10)] + ' Puluh' + (n % 10 ? ' ' + sat[n % 10] : '');
  if (n < 200) return 'Seratus' + (n % 100 ? ' ' + angkaTerbilang(n % 100) : '');
  if (n < 1000) return sat[Math.floor(n / 100)] + ' Ratus' + (n % 100 ? ' ' + angkaTerbilang(n % 100) : '');
  if (n < 2000) return 'Seribu' + (n % 1000 ? ' ' + angkaTerbilang(n % 1000) : '');
  if (n < 1000000) return angkaTerbilang(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + angkaTerbilang(n % 1000) : '');
  if (n < 1000000000) return angkaTerbilang(Math.floor(n / 1000000)) + ' Juta' + (n % 1000000 ? ' ' + angkaTerbilang(n % 1000000) : '');
  return angkaTerbilang(Math.floor(n / 1000000000)) + ' Miliar' + (n % 1000000000 ? ' ' + angkaTerbilang(n % 1000000000) : '');
}
function toTerbilang(n) {
  if (!n || n === 0) return 'Nol Rupiah';
  return angkaTerbilang(Math.floor(n)) + ' Rupiah';
}

const fmt = (n) => {
  const num = typeof n === 'number' ? n : Number(n) || 0;
  return Math.round(num).toLocaleString('id-ID');
};

// ── Field definitions ──────────────────────────────────
const ALLOWANCE_FIELDS = [
['basic_salary', 'Basic Salary'],
['adjustment_salary', 'Adjustment Salary'],
['allowance_kehadiran', 'Allow. Kehadiran'],
['adjustment_new_employee', 'Adj. New Employee'],
['allowance_jabatan', 'Allow. Jabatan'],
['allowance_transport', 'Allow. Transport'],
['allowance_acting', 'Allow. Acting'],
['allowance_pulsa', 'Allow. Pulsa'],
['jht_company', 'JHT 3.7% (Perusahaan)'],
['jkk_company', 'JKK 0.24%'],
['jkm_company', 'JKM 0.3%'],
['bpjs_kes_company', 'BPJS KES 4%'],
['tunjangan_pensiun', 'Tunj. Pensiun 2%'],
['long_shift', 'Long Shift'],
['premi_in', 'Premi In'],
['ins_produktifitas', 'Ins. Produktifitas']];


const DEDUCTION_FIELDS = [
['ded_ketidakhadiran', 'Ketidakhadiran'],
['ded_pembayaran_lain', 'Pembayaran Lain'],
['ded_jht_37', 'JHT 3.7%'],
['ded_jht_employee', 'JHT Employee 2%'],
['ded_jkk', 'JKK'],
['ded_jkm', 'JKM'],
['ded_bpjs_kes', 'BPJS KES 5%'],
['ded_iuran_pensiun', 'Iuran Pensiun'],
['ded_iuran_pensiun_karyawan', 'Iuran Pensiun Kar.'],
['ded_premi_out', 'Premi Out'],
['ded_tax', 'Tax / PPh 21']];


const EMPTY_FORM = {
  nik_karyawan: '', nama_karyawan: '', jabatan: '', entity_pt: '', area_tugas: '', branch: '', bank: '', no_rekening: '', periode: '',
  basic_salary: 0, adjustment_salary: 0, allowance_kehadiran: 0, adjustment_new_employee: 0, allowance_jabatan: 0,
  allowance_transport: 0, allowance_acting: 0, allowance_pulsa: 0, jht_company: 0, jkk_company: 0, jkm_company: 0,
  bpjs_kes_company: 0, tunjangan_pensiun: 0, long_shift: 0, premi_in: 0, ins_produktifitas: 0, total_allowance: 0,
  ded_ketidakhadiran: 0, ded_pembayaran_lain: 0, ded_jht_37: 0, ded_jht_employee: 0, ded_jkk: 0, ded_jkm: 0,
  ded_bpjs_kes: 0, ded_iuran_pensiun: 0, ded_iuran_pensiun_karyawan: 0, ded_premi_out: 0, ded_tax: 0,
  total_deduction: 0, gaji_bersih: 0, gaji_diterima: 0, terbilang: ''
};

function calcTotals(form) {
  const totalAllow = ALLOWANCE_FIELDS.reduce((s, [k]) => s + (Number(form[k]) || 0), 0);
  const totalDed = DEDUCTION_FIELDS.reduce((s, [k]) => s + (Number(form[k]) || 0), 0);
  const gajiBersih = totalAllow - totalDed;
  return { total_allowance: totalAllow, total_deduction: totalDed, gaji_bersih: gajiBersih, gaji_diterima: gajiBersih, terbilang: toTerbilang(gajiBersih > 0 ? gajiBersih : 0) };
}

// ── PDF Generator (format resmi slip gaji) ─────────────
function generatePayslipPDF(p) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth(); // 210
  const margin = 12;

  // ── Header Band ──
  doc.setFillColor(123, 26, 44); // maroon
  doc.rect(0, 0, pw, 32, 'F');

  // Logo area (white circle bg)
  doc.setFillColor(255, 255, 255);
  doc.circle(margin + 8, 16, 8, 'F');

  // Company info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);doc.setFont('helvetica', 'bold');
  doc.text(p.entity_pt || 'PT. PUTRA INDONESIA SOLUSI', margin + 20, 11);
  doc.setFontSize(6.5);doc.setFont('helvetica', 'normal');
  doc.text('Jl. Raya Bukit Jl. Nusa Indah No.061, Serua, Ciputat, Tangerang Selatan 15414', margin + 20, 17);
  doc.text('Telp: (021) 27846500  |  Mobile: (+62) 811-8880-6919  |  Email: info@pissintegrated.com', margin + 20, 22);

  // SLIP GAJI title on right
  doc.setFontSize(14);doc.setFont('helvetica', 'bold');
  doc.text('SLIP GAJI', pw - margin, 13, { align: 'right' });
  doc.setFontSize(8);doc.setFont('helvetica', 'normal');
  doc.text(`Periode: ${p.periode || '-'}`, pw - margin, 21, { align: 'right' });

  doc.setTextColor(0, 0, 0);

  // ── Info Karyawan ──
  let y = 38;
  doc.setFillColor(248, 240, 242);
  doc.roundedRect(margin, y, pw - margin * 2, 26, 2, 2, 'F');
  doc.setDrawColor(200, 180, 185);
  doc.roundedRect(margin, y, pw - margin * 2, 26, 2, 2, 'S');

  const col1 = margin + 4;
  const col2 = col1 + 28;
  const col3 = pw / 2 + 4;
  const col4 = col3 + 32;

  const infoLeft = [
  ['Nama', p.nama_karyawan],
  ['NIK', p.nik_karyawan],
  ['Jabatan', p.jabatan]];

  const infoRight = [
  ['Area Tugas', p.area_tugas],
  ['Bank', p.bank],
  ['No. Rekening', p.no_rekening]];


  doc.setFontSize(7.5);
  infoLeft.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold');doc.setTextColor(100, 20, 40);
    doc.text(k, col1, y + 6 + i * 7);
    doc.text(':', col2 - 3, y + 6 + i * 7);
    doc.setFont('helvetica', 'normal');doc.setTextColor(30, 30, 30);
    doc.text(String(v || '-'), col2, y + 6 + i * 7);
  });
  infoRight.forEach(([k, v], i) => {
    doc.setFont('helvetica', 'bold');doc.setTextColor(100, 20, 40);
    doc.text(k, col3, y + 6 + i * 7);
    doc.text(':', col4 - 3, y + 6 + i * 7);
    doc.setFont('helvetica', 'normal');doc.setTextColor(30, 30, 30);
    doc.text(String(v || '-'), col4, y + 6 + i * 7);
  });

  doc.setTextColor(0, 0, 0);
  y += 32;

  // ── Section Headers: ALLOWANCE | DEDUCTION ──
  const halfW = (pw - margin * 2 - 4) / 2;
  const colAllStart = margin;
  const colDedStart = margin + halfW + 4;

  // Allowance header
  doc.setFillColor(123, 26, 44);
  doc.roundedRect(colAllStart, y, halfW, 7, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);doc.setFontSize(8);doc.setFont('helvetica', 'bold');
  doc.text('ALLOWANCE (PENDAPATAN)', colAllStart + halfW / 2, y + 5, { align: 'center' });

  // Deduction header
  doc.setFillColor(185, 28, 28);
  doc.roundedRect(colDedStart, y, halfW, 7, 1, 1, 'F');
  doc.text('DEDUCTION (POTONGAN)', colDedStart + halfW / 2, y + 5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 9;

  // Build rows
  const allRows = ALLOWANCE_FIELDS.filter(([k]) => p[k] > 0).map(([k, label]) => [label, p[k]]);
  const dedRows = DEDUCTION_FIELDS.filter(([k]) => p[k] > 0).map(([k, label]) => [label, p[k]]);
  const maxRows = Math.max(allRows.length, dedRows.length, 1);

  for (let i = 0; i < maxRows; i++) {
    const rowBg = i % 2 === 0 ? [255, 255, 255] : [250, 245, 246];
    doc.setFillColor(...rowBg);
    doc.rect(colAllStart, y, halfW, 5.5, 'F');
    doc.rect(colDedStart, y, halfW, 5.5, 'F');

    doc.setFontSize(7);doc.setFont('helvetica', 'normal');
    if (allRows[i]) {
      doc.setTextColor(60, 60, 60);
      doc.text(allRows[i][0], colAllStart + 2, y + 3.8);
      doc.setTextColor(30, 30, 30);
      doc.text('Rp ' + fmt(allRows[i][1]), colAllStart + halfW - 2, y + 3.8, { align: 'right' });
    }
    if (dedRows[i]) {
      doc.setTextColor(60, 60, 60);
      doc.text(dedRows[i][0], colDedStart + 2, y + 3.8);
      doc.setTextColor(160, 20, 20);
      doc.text('Rp ' + fmt(dedRows[i][1]), colDedStart + halfW - 2, y + 3.8, { align: 'right' });
    }
    // subtle row border
    doc.setDrawColor(230, 220, 222);
    doc.line(colAllStart, y + 5.5, colAllStart + halfW, y + 5.5);
    doc.line(colDedStart, y + 5.5, colDedStart + halfW, y + 5.5);
    y += 5.5;
  }

  // Totals row
  doc.setFillColor(245, 235, 237);
  doc.rect(colAllStart, y, halfW, 7, 'F');
  doc.rect(colDedStart, y, halfW, 7, 'F');
  doc.setFontSize(7.5);doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 20, 40);
  doc.text('Total Allowance', colAllStart + 2, y + 5);
  doc.text('Rp ' + fmt(p.total_allowance), colAllStart + halfW - 2, y + 5, { align: 'right' });
  doc.setTextColor(160, 20, 20);
  doc.text('Total Deduction', colDedStart + 2, y + 5);
  doc.text('Rp ' + fmt(p.total_deduction), colDedStart + halfW - 2, y + 5, { align: 'right' });
  y += 12;

  // ── Gaji Diterima ──
  doc.setFillColor(123, 26, 44);
  doc.roundedRect(margin, y, pw - margin * 2, 13, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);doc.setFont('helvetica', 'bold');
  doc.text('GAJI DITERIMA', margin + 5, y + 9);
  doc.setFontSize(11);
  doc.text('Rp ' + fmt(p.gaji_diterima || p.gaji_bersih), pw - margin - 5, y + 9, { align: 'right' });
  y += 18;

  // Terbilang
  if (p.terbilang) {
    doc.setFontSize(7);doc.setFont('helvetica', 'italic');doc.setTextColor(100, 100, 100);
    doc.text('Terbilang: ' + p.terbilang, margin, y);
    y += 8;
  }

  // ── Tanda Tangan ──
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pw - margin, y);
  y += 5;
  doc.setFontSize(7);doc.setFont('helvetica', 'normal');doc.setTextColor(120, 120, 120);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`, margin, y);
  doc.text('Dokumen ini dicetak secara digital oleh sistem INTEGRATED', pw / 2, y, { align: 'center' });

  // Signature boxes
  y += 8;
  const sigW = 55;
  const sig1x = margin;
  const sig2x = pw - margin - sigW;
  doc.setDrawColor(180, 180, 180);
  doc.rect(sig1x, y, sigW, 22, 'S');
  doc.rect(sig2x, y, sigW, 22, 'S');
  doc.setFontSize(7);doc.setTextColor(80, 80, 80);
  doc.text('Karyawan', sig1x + sigW / 2, y + 4, { align: 'center' });
  doc.text('(                                  )', sig1x + sigW / 2, y + 20, { align: 'center' });
  doc.text('HRD / Management', sig2x + sigW / 2, y + 4, { align: 'center' });
  doc.text('(                                  )', sig2x + sigW / 2, y + 20, { align: 'center' });

  doc.save(`SlipGaji_${p.nama_karyawan}_${p.periode || 'noperiode'}.pdf`);
}

// ── Excel Template Download ────────────────────────────
function downloadExcelTemplate(areas = []) {
  const headers = [
  'nik_karyawan', 'nama_karyawan', 'jabatan', 'entity_pt', 'area_tugas', 'branch', 'bank', 'no_rekening', 'periode',
  'basic_salary', 'adjustment_salary', 'allowance_kehadiran', 'adjustment_new_employee', 'allowance_jabatan',
  'allowance_transport', 'allowance_acting', 'allowance_pulsa', 'jht_company', 'jkk_company', 'jkm_company',
  'bpjs_kes_company', 'tunjangan_pensiun', 'long_shift', 'premi_in', 'ins_produktifitas', 'total_allowance',
  'ded_ketidakhadiran', 'ded_pembayaran_lain', 'ded_jht_37', 'ded_jht_employee', 'ded_jkk', 'ded_jkm',
  'ded_bpjs_kes', 'ded_iuran_pensiun', 'ded_iuran_pensiun_karyawan', 'ded_premi_out', 'ded_tax',
  'total_deduction', 'gaji_bersih', 'gaji_diterima', 'terbilang'];


  const currentPeriod = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const areaList = areas.length > 0 ? areas.map((a) => a.nama_area) : ['Area Contoh'];
  const exampleRows = areaList.map((area, i) => {
    const basic = 3500000;
    const allowKehadiran = 300000;
    const totalAllow = basic + allowKehadiran;
    const ded = 175000;
    const totalDed = ded;
    const gajiBersih = totalAllow - totalDed;
    return [
    `NIK00${i + 1}`, `Nama Karyawan ${i + 1}`, 'Staff', 'PT. PUTRA INDONESIA SOLUSI',
    area, 'Branch Utama', 'BCA', `123456789${i}`, currentPeriod,
    basic, 0, allowKehadiran, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, totalAllow,
    0, 0, ded, 0, 0, 0, 0, 0, 0, 0, 0,
    totalDed, gajiBersih, gajiBersih, toTerbilang(gajiBersih)];

  });

  const wsData = [headers, ...exampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style header row width
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Slip Gaji');

  // Add petunjuk sheet
  const petunjukData = [
  ['PETUNJUK PENGISIAN TEMPLATE SLIP GAJI'],
  [''],
  ['Kolom', 'Keterangan', 'Contoh'],
  ['nik_karyawan', 'NIK ID karyawan (wajib diisi)', 'NIK001'],
  ['nama_karyawan', 'Nama lengkap karyawan', 'Budi Santoso'],
  ['jabatan', 'Jabatan karyawan', 'Staff Security'],
  ['entity_pt', 'Nama PT', 'PT. PUTRA INDONESIA SOLUSI'],
  ['area_tugas', 'Area/lokasi penempatan', 'Gedung A'],
  ['branch', 'Branch/cabang', 'Jakarta Selatan'],
  ['bank', 'Nama bank rekening', 'BCA'],
  ['no_rekening', 'Nomor rekening bank', '1234567890'],
  ['periode', 'Bulan dan tahun slip gaji (wajib)', 'Mei 2026'],
  ['basic_salary', 'Gaji pokok (angka)', '3500000'],
  ['adjustment_salary', 'Penyesuaian gaji', '0'],
  ['allowance_kehadiran', 'Tunjangan kehadiran', '300000'],
  ['...dst', 'Isi 0 jika tidak ada', '0'],
  ['total_allowance', 'Otomatis dihitung (jumlah semua allowance)', ''],
  ['total_deduction', 'Otomatis dihitung (jumlah semua deduction)', ''],
  ['gaji_bersih', 'Total Allow - Total Ded', ''],
  ['gaji_diterima', 'Sama dengan gaji_bersih', ''],
  ['terbilang', 'Terbilang dalam huruf', 'Tiga Juta Enam Ratus Dua Puluh Lima Ribu Rupiah'],
  [''],
  ['CATATAN: Kolom total_allowance, total_deduction, gaji_bersih, gaji_diterima, terbilang'],
  ['akan dihitung ulang otomatis oleh sistem saat import.']];

  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
  wsPetunjuk['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk');

  XLSX.writeFile(wb, `template_slip_gaji_${new Date().toISOString().slice(0, 7)}.xlsx`);
}

// ── Main Component ─────────────────────────────────────
export default function Payslip() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showInputForm, setShowInputForm] = useState(false);
  const [editPayslip, setEditPayslip] = useState(null);
  const [inputForm, setInputForm] = useState({ ...EMPTY_FORM });
  const [empSearch, setEmpSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileRef = useRef(null);
  const queryClient = useQueryClient();

  const employee = JSON.parse(localStorage.getItem('pis_employee') || '{}');
  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const isManagement = ['Chief Security', 'Supervisor Facility', 'Admin Pos', 'Admin Security', 'Admin Facility', 'SPV Security', 'Admin Pos Security', 'Supervisor Security'].includes(employee?.jabatan || employee?.role || '');
  const canManage = isMasterAdmin || isManagement;

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payslip.create(data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['payslips'] });setShowInputForm(false);setInputForm({ ...EMPTY_FORM });toast.success('Slip gaji berhasil disimpan');}
  });
  const updatePayslipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payslip.update(id, data),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['payslips'] });setShowInputForm(false);setEditPayslip(null);setInputForm({ ...EMPTY_FORM });toast.success('Slip gaji diperbarui');}
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payslip.delete(id),
    onSuccess: () => {queryClient.invalidateQueries({ queryKey: ['payslips'] });toast.success('Slip gaji dihapus');}
  });

  // Fetch payslips — scoped by role
  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payslips', employee?.nik_karyawan, employee?.role],
    queryFn: () => {
      if (isMasterAdmin) return base44.entities.Payslip.list('-created_date', 500);
      if (isManagement) return base44.entities.Payslip.filter({ area_tugas: employee.area_tugas }, '-created_date', 200);
      // Staff: hanya slip milik sendiri berdasarkan NIK login
      return base44.entities.Payslip.filter({ nik_karyawan: employee.nik_karyawan }, '-created_date', 50);
    }
  });

  // Employees for autofill (only when form open & canManage)
  const { data: activeEmployees = [] } = useQuery({
    queryKey: ['employees-active-payslip'],
    queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }, 'nama_lengkap', 500),
    enabled: showInputForm && canManage
  });

  const { data: areasForTemplate = [] } = useQuery({
    queryKey: ['areas-payslip-template'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' }, 'nama_area', 100),
    enabled: isMasterAdmin
  });

  const filtered = payslips.filter((p) =>
  p.nama_karyawan?.toLowerCase().includes(search.toLowerCase()) ||
  p.nik_karyawan?.includes(search) ||
  p.periode?.includes(search)
  );

  const toggleSelectId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Hapus ${selectedIds.size} slip gaji yang dipilih?`)) return;
    setBulkDeleting(true);
    for (const id of selectedIds) {
      await base44.entities.Payslip.delete(id);
    }
    queryClient.invalidateQueries({ queryKey: ['payslips'] });
    setSelectedIds(new Set());
    setBulkDeleting(false);
    toast.success(`${selectedIds.size} slip gaji berhasil dihapus`);
  };

  const filteredEmpSearch = useMemo(() => {
    if (!empSearch) return [];
    return activeEmployees.filter((e) =>
    e.nama_lengkap?.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.nik_karyawan?.includes(empSearch)
    ).slice(0, 8);
  }, [empSearch, activeEmployees]);

  const updateFormField = (key, value) => {
    setInputForm((prev) => {
      const updated = { ...prev, [key]: value };
      return { ...updated, ...calcTotals(updated) };
    });
  };

  const handleUploadExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            nik_karyawan: { type: "string" }, nama_karyawan: { type: "string" }, jabatan: { type: "string" },
            entity_pt: { type: "string" }, area_tugas: { type: "string" }, branch: { type: "string" },
            bank: { type: "string" }, no_rekening: { type: "string" }, periode: { type: "string" },
            basic_salary: { type: "number" }, adjustment_salary: { type: "number" }, allowance_kehadiran: { type: "number" },
            adjustment_new_employee: { type: "number" }, allowance_jabatan: { type: "number" }, allowance_transport: { type: "number" },
            allowance_acting: { type: "number" }, allowance_pulsa: { type: "number" }, jht_company: { type: "number" },
            jkk_company: { type: "number" }, jkm_company: { type: "number" }, bpjs_kes_company: { type: "number" },
            tunjangan_pensiun: { type: "number" }, long_shift: { type: "number" }, premi_in: { type: "number" },
            ins_produktifitas: { type: "number" }, ded_ketidakhadiran: { type: "number" }, ded_pembayaran_lain: { type: "number" },
            ded_jht_37: { type: "number" }, ded_jht_employee: { type: "number" }, ded_jkk: { type: "number" },
            ded_jkm: { type: "number" }, ded_bpjs_kes: { type: "number" }, ded_iuran_pensiun: { type: "number" },
            ded_iuran_pensiun_karyawan: { type: "number" }, ded_premi_out: { type: "number" }, ded_tax: { type: "number" },
            gaji_diterima: { type: "number" }
          }
        }
      }
    });
    if (result.status === 'success' && Array.isArray(result.output)) {
      // Recalculate totals for every row
      const normalized = result.output.map((row) => ({ ...EMPTY_FORM, ...row, ...calcTotals({ ...EMPTY_FORM, ...row }) }));
      setPreviewData(normalized);
      setShowPreview(true);
    } else {
      toast.error('Gagal mengekstrak data dari file Excel');
    }
    setUploading(false);
    fileRef.current.value = '';
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;
    setImporting(true);
    await base44.entities.Payslip.bulkCreate(previewData);
    queryClient.invalidateQueries({ queryKey: ['payslips'] });
    toast.success(`${previewData.length} slip gaji berhasil diimport`);
    setPreviewData(null);
    setShowPreview(false);
    setImporting(false);
  };

  const handleEditFromImport = (row) => {
    setEditPayslip({ id: '_import_' + row.nik_karyawan + '_' + row.periode, ...row });
    setInputForm({ ...EMPTY_FORM, ...row, ...calcTotals({ ...EMPTY_FORM, ...row }) });
    setShowPreview(false);
    setShowInputForm(true);
  };

  const handleSaveEditedImport = async () => {
    if (!inputForm.nik_karyawan || !inputForm.periode) { toast.error('NIK dan Periode wajib diisi'); return; }
    // Cek apakah sudah ada di DB
    const existing = await base44.entities.Payslip.filter({ nik_karyawan: inputForm.nik_karyawan });
    const match = existing.find(p => p.periode === inputForm.periode);
    if (match) {
      await base44.entities.Payslip.update(match.id, inputForm);
      toast.success('Slip gaji diperbarui');
    } else {
      await base44.entities.Payslip.create(inputForm);
      toast.success('Slip gaji disimpan');
    }
    queryClient.invalidateQueries({ queryKey: ['payslips'] });
    setShowInputForm(false);
    setEditPayslip(null);
    setInputForm({ ...EMPTY_FORM });
  };

  if (isLoading) return <Skeleton className="h-96 rounded-2xl" />;

  // ── Staff view: mobile-friendly card list ──
  if (!canManage) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-800">Slip Gaji Saya</h2>
          <span className="text-xs text-gray-400">{employee.nama_lengkap}</span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari periode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        {filtered.length === 0 ?
        <div className="text-center py-16 text-gray-400 text-sm">Belum ada slip gaji</div> :

        <div className="space-y-3">
            {filtered.map((p) =>
          <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-800 text-sm">{p.periode}</span>
                  <span className="text-xs bg-maroon-50 text-[var(--maroon)] font-semibold px-2 py-0.5 rounded-full border border-[var(--maroon-200)]">
                    Rp {fmt(p.gaji_diterima || p.gaji_bersih)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
                  <span>{p.jabatan || '-'}</span>
                  <span>{p.area_tugas || '-'}</span>
                  <span>{p.bank} {p.no_rekening}</span>
                  <span>{p.entity_pt?.replace('PT. ', '') || '-'}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setSelected(p)}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Lihat Detail
                  </Button>
                  <Button size="sm" className="flex-1 text-xs h-8 bg-[var(--maroon)] hover:bg-red-800 text-white" onClick={() => generatePayslipPDF(p)}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
                  </Button>
                </div>
              </div>
          )}
          </div>
        }
        <SlipDetailDialog selected={selected} onClose={() => setSelected(null)} fmt={fmt} />
      </div>);

  }

  // ── Management / Admin view ──
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Cari slip gaji..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {isMasterAdmin && selectedIds.size > 0 && (
            <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting} className="h-9">
              <Trash2 className="w-4 h-4 mr-1" />
              {bulkDeleting ? 'Menghapus...' : `Hapus ${selectedIds.size} Terpilih`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => downloadExcelTemplate(areasForTemplate)}>
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Download Template Excel
          </Button>
          <Button size="sm" onClick={() => {setEditPayslip(null);setInputForm({ ...EMPTY_FORM });setShowInputForm(true);}} className="bg-slate-900 hover:bg-[var(--maroon)] h-9 text-slate-400">
            <Plus className="w-4 h-4 mr-1 bg-red-900" /> Input Manual
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="hover:bg-red-900 text-white h-9 bg-slate-950">
            <Upload className="w-4 h-4 mr-1" /> {uploading ? 'Memproses...' : 'Import Excel'}
          </Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleUploadExcel} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                {isMasterAdmin && (
                  <TableHead className="w-8">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-700">
                      {selectedIds.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="w-4 h-4 text-[var(--maroon)]" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </TableHead>
                )}
                <TableHead className="text-xs">NIK</TableHead>
                <TableHead className="text-xs">Nama</TableHead>
                <TableHead className="text-xs">Periode</TableHead>
                <TableHead className="text-xs">Area</TableHead>
                <TableHead className="text-xs">Total Allow.</TableHead>
                <TableHead className="text-xs">Total Ded.</TableHead>
                <TableHead className="text-xs">Gaji Diterima</TableHead>
                <TableHead className="text-xs text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ?
              <TableRow><TableCell colSpan={isMasterAdmin ? 9 : 8} className="text-center py-10 text-gray-400">Belum ada slip gaji</TableCell></TableRow> :
              filtered.map((p) =>
              <TableRow key={p.id} className={`hover:bg-gray-50/50 ${selectedIds.has(p.id) ? 'bg-red-50/50' : ''}`}>
                  {isMasterAdmin && (
                    <TableCell>
                      <button onClick={() => toggleSelectId(p.id)} className="text-gray-400 hover:text-[var(--maroon)]">
                        {selectedIds.has(p.id) ? <CheckSquare className="w-4 h-4 text-[var(--maroon)]" /> : <Square className="w-4 h-4" />}
                      </button>
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-xs">{p.nik_karyawan}</TableCell>
                  <TableCell className="font-medium text-sm">{p.nama_karyawan}</TableCell>
                  <TableCell className="text-sm">{p.periode}</TableCell>
                  <TableCell className="text-xs text-gray-500">{p.area_tugas}</TableCell>
                  <TableCell className="text-xs text-green-700 font-medium">Rp {fmt(p.total_allowance)}</TableCell>
                  <TableCell className="text-xs text-red-600 font-medium">Rp {fmt(p.total_deduction)}</TableCell>
                  <TableCell className="text-sm font-bold text-[var(--maroon)]">Rp {fmt(p.gaji_diterima || p.gaji_bersih)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(p)} title="Lihat Detail">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => generatePayslipPDF(p)} title="Download PDF">
                        <FileText className="w-3.5 h-3.5 text-[var(--maroon)]" />
                      </Button>
                      {isMasterAdmin && <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {setEditPayslip(p);setInputForm({ ...p });setShowInputForm(true);}}>
                          <Pencil className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {if (confirm('Hapus slip gaji ini?')) deleteMutation.mutate(p.id);}}>
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </Button>
                      </>}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Import Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Import — {previewData?.length || 0} Data</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 mb-2">Data telah dihitung ulang otomatis. Klik <strong>Edit</strong> untuk menyesuaikan, atau <strong>Konfirmasi</strong> untuk menyimpan semua.</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs">#</TableHead>
                  <TableHead className="text-xs">NIK</TableHead>
                  <TableHead className="text-xs">Nama</TableHead>
                  <TableHead className="text-xs">Periode</TableHead>
                  <TableHead className="text-xs">Area</TableHead>
                  <TableHead className="text-xs">Basic Salary</TableHead>
                  <TableHead className="text-xs text-green-700">Total Allow.</TableHead>
                  <TableHead className="text-xs text-red-600">Total Ded.</TableHead>
                  <TableHead className="text-xs text-[var(--maroon)]">Gaji Diterima</TableHead>
                  <TableHead className="text-xs">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData?.map((row, i) =>
                <TableRow key={i} className={i % 2 === 0 ? 'bg-gray-50/50' : ''}>
                    <TableCell className="text-xs text-gray-400">{i + 1}</TableCell>
                    <TableCell className="text-xs font-mono">{row.nik_karyawan}</TableCell>
                    <TableCell className="text-sm">{row.nama_karyawan}</TableCell>
                    <TableCell className="text-sm">{row.periode}</TableCell>
                    <TableCell className="text-xs text-gray-500">{row.area_tugas}</TableCell>
                    <TableCell className="text-sm">Rp {fmt(row.basic_salary)}</TableCell>
                    <TableCell className="text-sm text-green-700">Rp {fmt(row.total_allowance)}</TableCell>
                    <TableCell className="text-sm text-red-600">Rp {fmt(row.total_deduction)}</TableCell>
                    <TableCell className="text-sm font-bold text-[var(--maroon)]">Rp {fmt(row.gaji_diterima)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEditFromImport(row)} title="Edit sebelum simpan">
                        <Pencil className="w-3.5 h-3.5 text-blue-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => {setShowPreview(false);setPreviewData(null);}}>
              <X className="w-4 h-4 mr-1" /> Batalkan
            </Button>
            <Button onClick={handleConfirmImport} disabled={importing} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1" /> {importing ? 'Menyimpan...' : `Simpan ${previewData?.length || 0} Data`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Input Manual / Edit Dialog */}
      <Dialog open={showInputForm} onOpenChange={(v) => {setShowInputForm(v);if (!v) {setEditPayslip(null);setInputForm({ ...EMPTY_FORM });setEmpSearch('');}}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPayslip ? 'Edit Slip Gaji' : 'Input Slip Gaji Manual'}</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm">

            {/* Employee Search Auto-fill */}
            {!editPayslip &&
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <label className="text-xs font-semibold text-blue-700 block mb-1">🔍 Cari Karyawan Aktif (Auto-fill)</label>
                <Input value={empSearch} onChange={(e) => setEmpSearch(e.target.value)} placeholder="Ketik nama atau NIK..." className="h-8 text-sm" />
                {filteredEmpSearch.length > 0 &&
              <div className="mt-1 border rounded-lg bg-white divide-y max-h-36 overflow-y-auto">
                    {filteredEmpSearch.map((e) =>
                <button key={e.id} className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex justify-between" onClick={() => {
                  setInputForm((prev) => {
                    const updated = { ...prev, nik_karyawan: e.nik_karyawan, nama_karyawan: e.nama_lengkap, jabatan: e.jabatan || '', area_tugas: e.area_tugas || '', entity_pt: e.entity_pt || '', branch: e.branch || '', bank: e.bank || '', no_rekening: e.no_rekening || '' };
                    return { ...updated, ...calcTotals(updated) };
                  });
                  setEmpSearch('');
                }}>
                        <span className="font-medium">{e.nama_lengkap}</span>
                        <span className="text-gray-400">{e.nik_karyawan} · {e.jabatan}</span>
                      </button>
                )}
                  </div>
              }
              </div>
            }

            {/* Info Karyawan */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase mb-2 border-b pb-1">Info Karyawan</p>
              <div className="grid grid-cols-2 gap-3">
                {[['nik_karyawan', 'NIK Karyawan *'], ['nama_karyawan', 'Nama Karyawan'], ['jabatan', 'Jabatan'], ['periode', 'Periode * (mis: Mei 2026)'], ['area_tugas', 'Area Tugas'], ['branch', 'Branch'], ['bank', 'Bank'], ['no_rekening', 'No. Rekening']].map(([k, label]) =>
                <div key={k}>
                    <label className="text-xs font-medium text-gray-600">{label}</label>
                    <Input value={inputForm[k] || ''} onChange={(e) => setInputForm((p) => ({ ...p, [k]: e.target.value }))} className="h-8 text-sm mt-0.5" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600">Entity PT</label>
                  <Select value={inputForm.entity_pt || ''} onValueChange={(v) => setInputForm((p) => ({ ...p, entity_pt: v }))}>
                    <SelectTrigger className="h-8 text-sm mt-0.5"><SelectValue placeholder="Pilih PT..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PT. PUTRA INDONESIA SOLUSI">PT. PUTRA INDONESIA SOLUSI</SelectItem>
                      <SelectItem value="PT. PRESTASI INDONESIA SOLUSI">PT. PRESTASI INDONESIA SOLUSI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ALLOWANCE + DEDUCTION Excel-style */}
            <PayslipExcelInput
              value={inputForm}
              onChange={(updated) => setInputForm(updated)}
            />

            {/* PDF Preview button */}
            {inputForm.nik_karyawan && inputForm.periode &&
            <Button variant="outline" size="sm" className="w-full border-[var(--maroon)] text-[var(--maroon)]" onClick={() => generatePayslipPDF(inputForm)}>
                <FileText className="w-3.5 h-3.5 mr-1" /> Preview PDF Sebelum Simpan
              </Button>
            }
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {setShowInputForm(false);setEditPayslip(null);setInputForm({ ...EMPTY_FORM });setEmpSearch('');}}>Batal</Button>
            <Button onClick={() => {
              if (!inputForm.nik_karyawan || !inputForm.periode) {toast.error('NIK dan Periode wajib diisi');return;}
              if (editPayslip && String(editPayslip.id).startsWith('_import_')) {
                handleSaveEditedImport();
              } else if (editPayslip) {
                updatePayslipMutation.mutate({ id: editPayslip.id, data: inputForm });
              } else {
                createMutation.mutate(inputForm);
              }
            }} disabled={createMutation.isPending || updatePayslipMutation.isPending} className="hover:bg-red-800 text-white bg-slate-950">
              {createMutation.isPending || updatePayslipMutation.isPending ? 'Menyimpan...' : 'Simpan Slip Gaji'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SlipDetailDialog selected={selected} onClose={() => setSelected(null)} fmt={fmt} />
    </div>);

}

// ── Slip Detail Dialog (shared for staff & management) ──
function SlipDetailDialog({ selected, onClose, fmt }) {
  if (!selected) return null;
  return (
    <Dialog open={!!selected} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Detail Slip Gaji</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          {/* Header */}
          <div className="bg-[var(--maroon)] text-white rounded-xl p-4">
            <p className="font-bold text-sm">{selected.entity_pt || 'PIS INTEGRATED'}</p>
            <p className="text-xs opacity-75 mt-0.5">Jl. Raya Bukit Nusa Indah No.061, Ciputat, Tangerang Selatan</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs opacity-80">Slip Gaji</span>
              <span className="font-bold text-base">{selected.periode}</span>
            </div>
          </div>
          {/* Karyawan Info */}
          <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3">
            {[['Nama', selected.nama_karyawan], ['NIK', selected.nik_karyawan], ['Jabatan', selected.jabatan], ['Area', selected.area_tugas], ['Bank', selected.bank], ['Rekening', selected.no_rekening]].filter(([, v]) => v).map(([k, v]) =>
            <div key={k}><p className="text-gray-400 text-xs">{k}</p><p className="font-medium text-xs">{v}</p></div>
            )}
          </div>
          {/* Allowance */}
          <div>
            <p className="text-xs font-bold text-[var(--maroon)] uppercase mb-1">Allowance</p>
            <div className="space-y-0.5">
              {ALLOWANCE_FIELDS.filter(([k]) => selected[k] > 0).map(([k, label]) =>
              <div key={k} className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium">Rp {fmt(selected[k])}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t font-semibold text-[var(--maroon)] text-sm">
                <span>Total Allowance</span>
                <span>Rp {fmt(selected.total_allowance)}</span>
              </div>
            </div>
          </div>
          {/* Deduction */}
          <div>
            <p className="text-xs font-bold text-red-600 uppercase mb-1">Deduction</p>
            <div className="space-y-0.5">
              {DEDUCTION_FIELDS.filter(([k]) => selected[k] > 0).map(([k, label]) =>
              <div key={k} className="flex justify-between py-0.5 text-xs">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-medium text-red-600">Rp {fmt(selected[k])}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-t font-semibold text-red-700 text-sm">
                <span>Total Deduction</span>
                <span>Rp {fmt(selected.total_deduction)}</span>
              </div>
            </div>
          </div>
          {/* Gaji diterima */}
          <div className="bg-[var(--maroon)] rounded-xl p-3 text-white">
            <div className="flex justify-between items-center font-bold">
              <span>GAJI DITERIMA</span>
              <span className="text-lg">Rp {fmt(selected.gaji_diterima || selected.gaji_bersih)}</span>
            </div>
            {selected.terbilang && <p className="text-xs opacity-75 mt-1 italic">{selected.terbilang}</p>}
          </div>
          {/* Download */}
          <Button className="w-full bg-[var(--maroon)] hover:bg-red-800 text-white" onClick={() => generatePayslipPDF(selected)}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>);

}