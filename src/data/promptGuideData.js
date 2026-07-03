import { RAW_DATA_PROMPTS } from './promptGuideRawData';

export const MENU_PROMPTS = [
  RAW_DATA_PROMPTS,
  {
    kategori: "Dashboard & Profil",
    warna: "bg-blue-50 border-blue-200",
    warnaHeader: "bg-blue-600",
    items: [
      {
        nama: "Dashboard Karyawan",
        deskripsi: "Dashboard utama untuk admin/manajemen memantau seluruh operasional.",
        prompt: `Buatkan halaman Dashboard Karyawan untuk sistem manajemen keamanan & facility.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + recharts + lucide-react.

=== STRUKTUR DATA ===
Auth: data karyawan login disimpan di localStorage key "pis_employee" sebagai JSON.
Ambil dengan: const employee = JSON.parse(localStorage.getItem('pis_employee'))
Field employee: { nik_karyawan, nama_lengkap, jabatan, area_tugas, regu, role }
Role: "Master Admin" = lihat semua area, lainnya = hanya area sendiri.

Entity yang digunakan:
- Employee: { nik_karyawan, nama_lengkap, jabatan, area_tugas, status_aktif }
- Attendance: { nik_karyawan, area_tugas, tanggal, status: "Hadir"|"Sakit"|"Izin"|"Cuti"|"Alfa" }
- ShiftSchedule: { area_tugas, regu, tanggal, jam_mulai, jam_selesai, karyawan_ids }
- PanicAlert: { area_tugas, status: "Aktif"|"Ditangani"|"Selesai", tanggal, nama_karyawan }
- LeaveRequest: { nik_karyawan, status: "Pending Leader"|"Pending Supervisor"|"Disetujui" }

=== FITUR YANG HARUS ADA ===
1. KPI Cards (baris atas):
   - Total Karyawan Aktif (filter status_aktif = "Aktif")
   - Hadir Hari Ini (Attendance hari ini status = "Hadir")
   - Sedang Cuti (LeaveRequest disetujui yang mencakup hari ini)
   - Tidak Hadir/Alfa (Attendance hari ini status = "Alfa")

2. Grafik absensi 7 hari terakhir (BarChart recharts):
   - X-axis: tanggal (format DD/MM)
   - Bar: Hadir (hijau), Sakit (kuning), Alfa (merah)

3. Jadwal shift hari ini:
   - Tabel: Regu | Jam Mulai | Jam Selesai | Jumlah Petugas
   - Filter per area

4. Alert Panic aktif (jika ada):
   - Banner merah berkedip di atas halaman
   - Tampilkan nama karyawan + area + waktu

5. Daftar karyawan belum absen hari ini (5 teratas)

=== LAYOUT ===
- Grid 2 kolom di desktop (lg:grid-cols-2), 1 kolom di mobile
- KPI cards: grid 4 kolom desktop, 2 kolom mobile
- Gunakan Card, Badge dari shadcn/ui
- Loading skeleton saat data dimuat (gunakan Skeleton dari shadcn/ui)
- Warna primer: maroon #7B1A2C

=== CARA FETCH DATA ===
import { base44 } from '@/api/cloudflareClient';
const today = new Date().toISOString().split('T')[0]; // format YYYY-MM-DD
const attendanceToday = await base44.entities.Attendance.filter({ tanggal: today, area_tugas: employee.area_tugas });`
      },
      {
        nama: "Dashboard Saya (Staff)",
        deskripsi: "Dashboard personal untuk karyawan biasa melihat info diri sendiri.",
        prompt: `Buatkan halaman EmployeeDashboard (Dashboard Saya) untuk karyawan non-manajemen.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== AUTH & DATA KARYAWAN ===
const employee = JSON.parse(localStorage.getItem('pis_employee'));
// Field: { nik_karyawan, nama_lengkap, jabatan, area_tugas, regu, foto }

=== ENTITY YANG DIGUNAKAN ===
- Attendance: { nik_karyawan, tanggal, jam_hadir, jam_pulang, status }
- ShiftSchedule: { karyawan_ids (array NIK), tanggal, jam_mulai, jam_selesai, regu, area_tugas }
- LeaveRequest: { nik_karyawan, jenis_cuti, tanggal_mulai, tanggal_selesai, jumlah_hari, status }
- LeaveQuota: { nik_karyawan, tahun, kuota_tahunan, terpakai, sisa }
- Assignment: { nik_petugas, judul, deadline, prioritas, status }
- Payslip: { nik_karyawan, bulan, tahun, total_gaji, status: "Draft"|"Terbit" }
- ShiftNotification: { nik_karyawan, pesan, tanggal, sudah_dibaca }

=== LAYOUT & KOMPONEN ===
1. Header card profil: Foto/avatar, nama, NIK, jabatan, area, regu, badge regu berwarna

2. Status Absensi Hari Ini:
   - Cek Attendance dengan filter { nik_karyawan, tanggal: today }
   - Jika belum absen: tombol "Absen Sekarang" → link ke halaman Attendance
   - Jika sudah: tampilkan jam masuk + jam pulang (jika ada)

3. Jadwal Shift Minggu Ini:
   - Tabel 7 hari ke depan, cek ShiftSchedule di mana karyawan_ids contains nik_karyawan
   - Tampilkan: tanggal | hari | jam mulai - selesai | regu
   - Warna hijau jika shift hari ini

4. Ringkasan Cuti: Sisa cuti tahunan + pengajuan pending

5. Tugas Aktif: Assignment status "Belum Dimulai" atau "Sedang Dikerjakan", badge prioritas berwarna

6. Slip Gaji Terakhir: bulan + tahun + total_gaji + link ke halaman Payslip

7. Notifikasi Terbaru: ShiftNotification belum dibaca, maksimal 5

=== CARA FETCH ===
const today = new Date().toISOString().split('T')[0];
const attendanceHariIni = await base44.entities.Attendance.filter({ nik_karyawan: employee.nik_karyawan, tanggal: today });`
      },
      {
        nama: "Edit Profil Saya",
        deskripsi: "Halaman untuk karyawan mengubah data profil dan password.",
        prompt: `Buatkan halaman MyProfile (Edit Profil Saya) untuk karyawan mengubah data diri.
Stack: React 18 + Tailwind CSS + shadcn/ui + react-hook-form + lucide-react.

=== AUTH ===
const employee = JSON.parse(localStorage.getItem('pis_employee'));
const nik = employee.nik_karyawan;

=== ENTITY Employee ===
Field BISA diedit: no_telepon, alamat, email, foto (URL setelah upload)
Field TIDAK BISA diedit (readonly): nik_karyawan, nama_lengkap, jabatan, area_tugas, regu, entity_pt

=== STRUKTUR HALAMAN ===
1. Section "Data Pribadi" (readonly): NIK, Nama, Jabatan, Area, Regu, Entity PT (styling abu-abu)

2. Section "Edit Kontak": Input no_telepon, email, alamat (textarea). Tombol "Simpan Perubahan"

3. Section "Foto Profil":
   - Preview foto / avatar inisial
   - Input file accept="image/*", preview sebelum upload
   - Upload: base44.integrations.Core.UploadFile({ file }) → simpan file_url ke field foto

4. Section "Ganti Password":
   - Input password baru (min 6 karakter) + konfirmasi
   - Validasi: keduanya harus sama
   - Update field password di Employee

=== CARA UPDATE ===
import { base44 } from '@/api/cloudflareClient';
const results = await base44.entities.Employee.filter({ nik_karyawan: nik });
const empId = results[0].id;
await base44.entities.Employee.update(empId, { no_telepon, alamat, email });
// Update localStorage juga setelah berhasil
const updated = { ...employee, no_telepon, alamat };
localStorage.setItem('pis_employee', JSON.stringify(updated));`
      },
    ]
  },
  {
    kategori: "HR & Kepegawaian",
    warna: "bg-green-50 border-green-200",
    warnaHeader: "bg-green-600",
    items: [
      {
        nama: "Data Pelamar",
        deskripsi: "Manajemen data pelamar kerja dari form online hingga approval.",
        prompt: `Buatkan halaman Applicants (Data Pelamar) lengkap untuk sistem rekrutmen.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + xlsx + lucide-react.

=== ENTITY Applicant ===
{ id, area_client, nama_lengkap, jenis_kelamin: "Laki-laki"|"Perempuan",
  nik_ektp (16 digit), foto_ektp (URL), foto_skck (URL), no_kk, foto_kk,
  no_npwp, foto_npwp, sim_type: "SIM A"|"SIM B1"|"SIM B2"|"SIM C"|"Tidak Ada",
  foto_sim, foto_cv, foto_surat_sehat, foto_kta,
  tempat_lahir, tanggal_lahir, alamat_ektp, alamat, rt, rw,
  kelurahan, kecamatan, kabupaten_kota, provinsi, usia,
  foto_setengah_badan, email, no_telepon, posisi_diinginkan, branch,
  tinggi_badan, berat_badan, ukuran_baju, ukuran_sepatu,
  pendidikan_sd, pendidikan_smp, pendidikan_sma, ijazah_terakhir,
  pendidikan_d3, pendidikan_s1, nama_ibu_kandung, no_telp_ibu,
  status: "Pending"|"Approved"|"Rejected",
  nik_karyawan (diisi saat Approved),
  entity_pt: "PT. PUTRA INDONESIA SOLUSI"|"PT. PRESTASI INDONESIA SOLUSI",
  link_code }

=== ENTITY NikCounter ===
{ id, prefix, last_number } — untuk generate NIK otomatis

=== FITUR HALAMAN ADMIN ===
1. Header statistik: Total | Pending | Approved | Rejected
2. Filter + Search: nama_lengkap atau nik_ektp, filter status/area/posisi
3. Tabel daftar pelamar: Nama | Area | Posisi | Tgl Daftar | Status | Aksi
   Badge: Pending=kuning, Approved=hijau, Rejected=merah

4. Dialog DETAIL pelamar (tab):
   Tab 1: Data Diri + foto selfie
   Tab 2: Dokumen (KTP, SKCK, KK, NPWP, SIM, CV, Surat Sehat)
   Tab 3: Alamat lengkap
   Tab 4: Pendidikan

5. Tombol APPROVE:
   - Dialog pilih entity_pt
   - Generate NIK: prefix "PU"/"PR" + MM + YY + 3 digit urut (contoh: PU060126001)
   - Update NikCounter, set status=Approved, buat record Employee dari data pelamar

6. Tombol REJECT: input alasan, set status=Rejected

7. Export Excel (import XLSX from 'xlsx')

=== IMPORT ===
import { base44 } from '@/api/cloudflareClient';
import * as XLSX from 'xlsx';`
      },
      {
        nama: "Data Karyawan",
        deskripsi: "CRUD data karyawan lengkap termasuk foto, dokumen, dan riwayat.",
        prompt: `Buatkan halaman Employees (Data Karyawan) lengkap.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + xlsx + lucide-react.

=== ENTITY Employee ===
{ id, nik_karyawan, nama_lengkap, jabatan, area_tugas, regu,
  status_aktif: "Aktif"|"Non-Aktif", email, no_telepon, alamat,
  tanggal_lahir, tanggal_masuk,
  entity_pt: "PT. PUTRA INDONESIA SOLUSI"|"PT. PRESTASI INDONESIA SOLUSI",
  bank, no_rekening, foto (URL), password,
  role: "Master Admin"|"Chief Security"|"Supervisor Facility"|"Admin Pos"|"Admin Security"|
        "Admin Facility"|"SPV Security"|"Leader Security"|"Leader Facility"|
        "Security"|"Facility"|"Driver",
  branch, ukuran_baju, ukuran_sepatu, tinggi_badan, berat_badan,
  nik_ektp, no_kk, no_npwp, sim_type, catatan }

=== FITUR ===
1. Summary cards: Total Aktif, Per PT, Per Area
2. Filter: search nama/NIK, area, jabatan, regu, status, entity_pt
3. Tabel: Foto | NIK | Nama | Jabatan | Area | Regu | PT | Status | Aksi (Edit | Detail | Non-aktifkan)
   - Avatar circle, fallback inisial. Badge status: Aktif=hijau, Non-Aktif=merah

4. Dialog Tambah/Edit (Tab form):
   Tab 1: NIK, Nama, Jabatan, Area, Regu, Role, Entity PT, Status
   Tab 2: Email, Telepon, Alamat, Tgl Lahir, Tgl Masuk
   Tab 3: Bank, No. Rekening
   Tab 4: Ukuran Baju/Sepatu, Tinggi/Berat Badan
   Tab 5: NIK KTP, No. KK, NPWP, SIM Type + upload foto

5. Generate NIK otomatis: PU/PR + bulan + tahun + 3 digit urut via NikCounter

6. Reset Password: tombol konfirmasi → update password = "123456"

7. Non-aktifkan (bukan delete): status_aktif = "Non-Aktif"

8. Export Excel (xlsx)

9. Jangan tampilkan kolom password. Pagination 20 data per halaman.`
      },
      {
        nama: "PKWT Karyawan",
        deskripsi: "Pembuatan dan manajemen kontrak kerja PKWT beserta approval.",
        prompt: `Buatkan halaman PKWTPage (PKWT Karyawan) untuk manajemen kontrak kerja.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + jspdf + lucide-react.

=== ENTITY PKWTContract ===
{ id, nomor_pkwt, nik_karyawan, nama_karyawan, nik_ektp,
  tempat_lahir, tanggal_lahir, alamat_karyawan, jabatan, area_tugas,
  entity_pt: "PT. PUTRA INDONESIA SOLUSI"|"PT. PRESTASI INDONESIA SOLUSI",
  alamat_perusahaan, nama_direktur, jabatan_direktur,
  kota_tanda_tangan, hari_tanda_tangan, tanggal_tanda_tangan,
  tanggal_mulai, tanggal_selesai, durasi_bulan, durasi_terbilang,
  wilayah_penugasan, durasi_shift, pemberitahuan_shift,
  gaji_pokok, gaji_pokok_terbilang, tanggal_gajian,
  bank_karyawan, no_rekening, batas_perpanjangan, notif_phk, kota_pengadilan,
  pasal_9_ayat: [{nomor, isi}],
  status: "Draft"|"Menunggu Approval"|"Aktif"|"Selesai"|"Dibatalkan",
  approval_status: "Menunggu Approval"|"Disetujui"|"Ditolak",
  approved_by, approved_at, catatan_approval,
  dokumen_pkwt (URL), draft_template (URL), catatan }

=== FITUR ===
1. Dashboard: PKWT Aktif | Akan Habis ≤30 hari (kuning) | Menunggu Approval | Draft
2. Alert banner kuning untuk PKWT akan habis
3. Tabel + badge status berwarna
4. Form Buat PKWT: dropdown pilih karyawan (auto-fill data), hitung durasi otomatis, generate nomor PKW/2024/001
5. Alur Approval: Draft → Menunggu Approval → Aktif/Dibatalkan
6. Generate PDF PKWT (jsPDF): kop surat, semua pasal, tanda tangan direktur + karyawan
7. Upload dokumen PKWT scan: base44.integrations.Core.UploadFile → simpan URL`
      },
      {
        nama: "Slip Gaji",
        deskripsi: "Generate dan distribusi slip gaji karyawan per bulan.",
        prompt: `Buatkan halaman Payslip (Slip Gaji) untuk admin dan karyawan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + jspdf + xlsx + lucide-react.

=== ENTITY Payslip ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas, bulan (1-12), tahun (YYYY),
  gaji_pokok, tunjangan_transport, tunjangan_makan, tunjangan_jabatan,
  lembur_jam, tarif_lembur, total_lembur,
  potongan_bpjs_kes, potongan_bpjs_tk, potongan_pph21, potongan_lain,
  total_pendapatan, total_potongan, total_gaji,
  tanggal_bayar, status: "Draft"|"Terbit", catatan }

=== FITUR ADMIN ===
1. Filter bulan/tahun/area + summary total gaji
2. Tabel: NIK | Nama | Jabatan | Gaji Pokok | Total Pendapatan | Total Potongan | Total Gaji | Status | Aksi
3. Form input slip: pilih karyawan, input semua komponen gaji dan potongan
   - Auto-kalkulasi: total_pendapatan = pokok + semua tunjangan + lembur
   - total_gaji = total_pendapatan - total_potongan
   - BPJS Kes otomatis 1%, BPJS TK otomatis 2% dari gaji pokok
4. Upload massal Excel (xlsx library)
5. Publish: Draft → Terbit
6. PDF Slip (jsPDF): kop PT, info karyawan, tabel pendapatan vs potongan, total bersih, TTD HRD

=== FITUR KARYAWAN ===
- Hanya lihat slip milik sendiri, status "Terbit"
- Filter tahun → 12 bulan
- Download PDF per slip

=== QUERY ===
Admin: base44.entities.Payslip.filter({ bulan, tahun, area_tugas })
Karyawan: base44.entities.Payslip.filter({ nik_karyawan: employee.nik_karyawan, tahun, status: "Terbit" })`
      },
      {
        nama: "Cuti & Izin",
        deskripsi: "Pengajuan dan approval cuti dengan tracking sisa kuota.",
        prompt: `Buatkan halaman Cuti (Cuti & Izin) dengan sistem approval 2 tingkat.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY LeaveRequest ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  jenis_cuti: "Cuti Tahunan"|"Cuti Sakit"|"Cuti Melahirkan"|"Cuti Darurat"|"Cuti Lainnya",
  tanggal_mulai, tanggal_selesai, jumlah_hari, alasan, dokumen_pendukung (URL),
  status: "Pending Leader"|"Pending Supervisor"|"Disetujui"|"Ditolak",
  catatan_leader, nik_approver_leader, nama_approver_leader, tanggal_approval_leader,
  catatan_supervisor, nik_approver_supervisor, nama_approver_supervisor, tanggal_approval_supervisor }

=== ENTITY LeaveQuota ===
{ id, nik_karyawan, tahun, kuota_tahunan, terpakai, sisa }

=== ROLE-BASED TAMPILAN ===
KARYAWAN BIASA:
1. Widget sisa cuti (dari LeaveQuota)
2. Form pengajuan: jenis, tanggal mulai/selesai (auto-hitung hari kerja), alasan, upload dokumen
   Validasi: sisa kuota cukup untuk Cuti Tahunan
3. Tabel riwayat + tombol Batalkan (jika Pending)

LEADER (Leader Security/Facility):
- Tab "Pengajuan Masuk": status "Pending Leader", area sendiri
- Approve → "Pending Supervisor" | Reject (input alasan)

SUPERVISOR/ADMIN:
- Tab "Perlu Approval": status "Pending Supervisor"
- Approve final → "Disetujui" (update LeaveQuota.terpakai) | Reject

=== HITUNG HARI KERJA ===
function hitungHariKerja(start, end) {
  let count = 0;
  const current = new Date(start);
  while (current <= new Date(end)) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

Badge: Pending Leader=kuning, Pending Supervisor=oranye, Disetujui=hijau, Ditolak=merah`
      },
      {
        nama: "Penilaian Kinerja",
        deskripsi: "Evaluasi performa karyawan oleh supervisor dengan scoring.",
        prompt: `Buatkan halaman PerformanceReviewPage (Penilaian Kinerja) untuk evaluasi karyawan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + recharts + lucide-react.

=== ENTITY PerformanceReview ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  periode_bulan (1-12), periode_tahun (YYYY),
  nilai_kedisiplinan (1-100), nilai_kerapian (1-100),
  nilai_kerjasama (1-100), nilai_inisiatif (1-100),
  nilai_kepatuhan (1-100), nilai_total (rata-rata otomatis),
  predikat: "Sangat Baik"|"Baik"|"Cukup"|"Kurang",
  catatan_supervisor, nik_supervisor, nama_supervisor, tanggal_review }

=== KRITERIA PREDIKAT ===
≥85 → "Sangat Baik" | ≥70 → "Baik" | ≥55 → "Cukup" | <55 → "Kurang"

=== FITUR ===
1. Tab "Beri Penilaian" (Supervisor):
   - Pilih karyawan, periode bulan/tahun
   - 5 slider (0-100) per kriteria: Kedisiplinan, Kerapian, Kerjasama, Inisiatif, Kepatuhan
   - Preview nilai total + predikat real-time saat slider bergerak
   - Textarea catatan, tombol Simpan

2. Tab "Daftar Penilaian":
   Filter area/periode/predikat. Tabel: Nama | Jabatan | Periode | Nilai | Predikat | Penilai
   Badge: Sangat Baik=hijau tua, Baik=hijau, Cukup=kuning, Kurang=merah

3. Tab "Analitik":
   A. RadarChart: 5 kriteria untuk 1 karyawan terpilih (recharts RadarChart)
   B. BarChart: perbandingan nilai total semua karyawan 1 area
   C. LineChart: tren nilai karyawan per bulan (6 bulan)

=== HITUNG ===
const nilaiTotal = Math.round((kedisiplinan + kerapian + kerjasama + inisiatif + kepatuhan) / 5);`
      },
    ]
  },
  {
    kategori: "Operasional Harian",
    warna: "bg-purple-50 border-purple-200",
    warnaHeader: "bg-purple-600",
    items: [
      {
        nama: "E-Absensi",
        deskripsi: "Sistem absensi digital dengan foto selfie dan validasi lokasi.",
        prompt: `Buatkan halaman Attendance (E-Absensi) untuk sistem kehadiran karyawan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY Attendance ===
{ id, nik_karyawan, nama_karyawan, area_tugas, jabatan, regu,
  tanggal (YYYY-MM-DD), jam_hadir, jam_pulang,
  status: "Hadir"|"Backup"|"Sakit"|"Izin"|"Cuti"|"Alfa",
  foto_hadir (URL), foto_pulang (URL),
  shift_id, tipe_shift, jam_shift_mulai, jam_shift_selesai, catatan }

=== TAMPILAN KARYAWAN ===
1. Kartu status hari ini: cek Attendance { nik_karyawan, tanggal: today }
   - Belum absen: tombol besar "ABSEN MASUK" (hijau)
   - Sudah masuk, belum pulang: jam masuk + tombol "ABSEN PULANG"
   - Sudah pulang: jam masuk + jam pulang + badge "Selesai"

2. Proses Absen (kamera device):
   - Buka kamera: navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
   - Tampilkan video preview, tombol "Ambil Foto" → capture ke canvas → convert ke File
   - Upload: base44.integrations.Core.UploadFile({ file: photoFile }) → dapat file_url
   - Create/update Attendance record

3. Riwayat 30 hari: Tabel Tanggal | Status | Jam Masuk | Jam Pulang + badge berwarna

=== TAMPILAN ADMIN ===
4. Filter: date range, area, regu, jabatan, status. Search nama karyawan
5. Tabel: Nama | Area | Regu | Tanggal | Jam Masuk | Jam Pulang | Status | Foto | Aksi(Edit)
   Foto thumbnail, klik untuk preview besar
6. Input absensi manual (form dialog)
7. Rekap bulanan: Nama | Hadir | Sakit | Izin | Cuti | Alfa | % Kehadiran
8. Cards statistik hari ini: Hadir | Sakit | Izin | Alfa | Belum Absen

=== BUAT RECORD ===
const now = new Date();
const tanggal = now.toISOString().split('T')[0];
const jam = now.toTimeString().slice(0,5);
await base44.entities.Attendance.create({ nik_karyawan, nama_karyawan, area_tugas,
  jabatan, tanggal, jam_hadir: jam, status: "Hadir", foto_hadir: uploadedUrl });`
      },
      {
        nama: "Jadwal Shift Visual (Excel-Style)",
        deskripsi: "Komponen visual jadwal shift bergaya Excel dengan edit manual, warna sesi, export Excel & PDF bertanda tangan.",
        prompt: `Buatkan komponen React ShiftScheduleVisual untuk menampilkan jadwal shift bergaya Excel lengkap dengan export PDF & Excel.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + xlsx + jspdf + lucide-react.

=== ENTITY YANG DIGUNAKAN ===
ShiftSchedule: { id, area_tugas, regu, tanggal (YYYY-MM-DD), jam_mulai (HH:MM), jam_selesai (HH:MM), karyawan_ids: string[] }
Employee: { id, nik_karyawan, nama_lengkap, jabatan, area_tugas, regu, status_aktif }
Attendance: { id, nik_karyawan, area_tugas, tanggal, jam_hadir, jam_pulang, status }

=== PROPS KOMPONEN ===
export default function ShiftScheduleVisual({ areas, isMasterAdmin, employeeArea })
- areas: array AreaProject (untuk dropdown pilih area)
- isMasterAdmin: boolean (Master Admin bisa pilih semua area)
- employeeArea: string (area default jika bukan Master Admin)

=== STATE UTAMA ===
const [open, setOpen] = useState(false); // dialog buka/tutup
const [exportArea, setExportArea] = useState(isMasterAdmin ? '' : employeeArea);
const [exportRegu, setExportRegu] = useState(''); // filter regu opsional
const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
const [endDate, setEndDate] = useState('');
const [keterangan, setKeterangan] = useState(DEFAULT_KETERANGAN); // array kode+label+warna
const [ttdPembuat, setTtdPembuat] = useState('');
const [ttdMengetahui, setTtdMengetahui] = useState('');
const [ttdMenyetujui, setTtdMenyetujui] = useState('');
const [editMode, setEditMode] = useState(false); // mode edit manual sel
const [overrides, setOverrides] = useState({}); // { [nik]: { [tanggal]: 'P'|'S'|'M' } }
const [hiddenRows, setHiddenRows] = useState([]); // NIK yang disembunyikan
const [activeCell, setActiveCell] = useState(null); // { nik, date } sel yang diklik

=== DEFAULT KETERANGAN WARNA ===
const DEFAULT_KETERANGAN = [
  { kode: 'P', label: 'Pagi',    warna: '#DCFCE7', warnaText: '#166534' },
  { kode: 'S', label: 'Siang',   warna: '#FEF9C3', warnaText: '#854D0E' },
  { kode: 'M', label: 'Malam',   warna: '#DBEAFE', warnaText: '#1E40AF' },
  { kode: 'L', label: 'Lembur',  warna: '#FEE2E2', warnaText: '#991B1B' },
  { kode: 'Off', label: 'Off/Libur', warna: '#F3F4F6', warnaText: '#6B7280' },
];

=== LOGIKA SESI DARI JAM SHIFT ===
function getSesiFromShift(shift) {
  if (!shift) return 'Off';
  const jam = shift.jam_mulai || '';
  const [h] = jam.split(':').map(Number);
  if (isNaN(h)) return 'P';
  if (h >= 23 || h < 7) return 'M'; // Malam
  if (h >= 15) return 'S';          // Siang
  return 'P';                        // Pagi
}

=== LOGIKA AMBIL NILAI SEL ===
Prioritas: overrides → shiftMap → lembur detection
const getCellSesi = (nik, date) => {
  // 1. Cek override manual
  if (overrides[nik]?.[date] !== undefined) return overrides[nik][date];
  // 2. Cek dari ShiftSchedule
  const shift = shiftMap[nik]?.[date];
  const sesi = getSesiFromShift(shift);
  // 3. Jika tanggal pertama & Off → cek hari sebelumnya (carry-over sesi malam)
  if (sesi === 'Off' && date === startDate) {
    const prevShift = shiftMap[nik]?.[prevDateObj];
    if (prevShift) return getSesiFromShift(prevShift);
  }
  // 4. Jika Off tapi absen hadir → tandai sebagai Lembur 'L'
  if (sesi === 'Off') {
    const attend = attendMap[nik]?.[date];
    if (attend && (attend.status === 'Hadir' || attend.status === 'Backup')) return 'L';
  }
  return sesi;
};

=== BUILD SHIFTMAP ===
// shiftMap: { [nik_karyawan]: { [tanggal]: shiftRecord } }
shifts.forEach(s => {
  const ids = Array.isArray(s.karyawan_ids) ? s.karyawan_ids : [];
  employees.forEach(emp => {
    const belongs = ids.length > 0 ? ids.includes(emp.nik_karyawan) : s.regu === emp.regu;
    if (belongs) {
      if (!shiftMap[emp.nik_karyawan]) shiftMap[emp.nik_karyawan] = {};
      if (!shiftMap[emp.nik_karyawan][s.tanggal]) shiftMap[emp.nik_karyawan][s.tanggal] = s;
    }
  });
});

=== QUERY DATA ===
// Employees area terpilih
useQuery({ queryKey: ['visual-employees', exportArea],
  queryFn: () => base44.entities.Employee.filter({ area_tugas: exportArea, status_aktif: 'Aktif' }, 'nama_lengkap', 500),
  enabled: !!exportArea && open })

// Shifts area + periode (paginate 500 per batch)
useQuery({ queryKey: ['visual-shifts', exportArea, startDate, endDate],
  queryFn: async () => {
    const results = [];
    let skip = 0;
    while (true) {
      const batch = await base44.entities.ShiftSchedule.filter({ area_tugas: exportArea }, 'tanggal', 500, skip);
      results.push(...batch);
      if (batch.length < 500) break;
      skip += 500;
    }
    return results.filter(s => s.tanggal >= prevDateObj && s.tanggal <= endDate);
  }, enabled: !!exportArea && open })

// Attendance untuk deteksi lembur
useQuery({ queryKey: ['visual-attendance', exportArea, startDate, endDate],
  queryFn: () => base44.entities.Attendance.filter({ area_tugas: exportArea }, 'tanggal', 1000),
  select: (data) => data.filter(a => a.tanggal >= startDate && a.tanggal <= endDate),
  enabled: !!exportArea && open })

=== SORT KARYAWAN ===
Urutan: Non Regu → Regu A → Regu B → Regu C → Regu D
Dalam regu: Leader/Chief/Supervisor dulu, lalu sort by nama_lengkap

const REGU_ORDER = ['Non Regu', 'Regu A', 'Regu B', 'Regu C', 'Regu D'];
const sorted = [...employees].sort((a, b) => {
  const ri = REGU_ORDER.indexOf(a.regu||'Non Regu') - REGU_ORDER.indexOf(b.regu||'Non Regu');
  if (ri !== 0) return ri;
  const la = ['Leader','Chief','Supervisor'].some(k => (a.jabatan||'').includes(k));
  const lb = ['Leader','Chief','Supervisor'].some(k => (b.jabatan||'').includes(k));
  if (la && !lb) return -1; if (!la && lb) return 1;
  return (a.nama_lengkap||'').localeCompare(b.nama_lengkap||'');
});

=== STRUKTUR UI DIALOG ===
Tombol trigger: <Button onClick={() => setOpen(true)}>Jadwal Visual</Button>
Dialog max-w-[98vw], max-h-[95vh], overflow-y-auto

Bagian 1 - Filter (grid 4 kolom):
  - Select area (jika Master Admin) atau display area readonly
  - Select regu (opsional, semua regu jika kosong)
  - Input tanggal mulai (date)
  - Input tanggal akhir (date)

Bagian 2 - Keterangan Warna (collapsible):
  - Tampilkan badge per kode: kode=label dengan warna latar+teks
  - Tombol "Edit Keterangan" → toggle form tambah/hapus keterangan
  - Form tambah: input Kode (max 3 char, uppercase), Label, color picker Warna Latar, color picker Warna Teks
  - Color presets: array warna pastel untuk pilih cepat
  - Tombol Tambah → push ke array keterangan
  - Tombol X di badge → hapus dari array

Bagian 3 - Tabel Visual Excel (hanya muncul jika area + karyawan loaded):
  Toolbar edit:
  - Tombol "Edit Manual" ↔ "Mode Edit AKTIF – Klik Sel" (toggle editMode)
  - Jika ada overrides/hiddenRows: tombol "Reset Edit"
  - Badge info "Klik sel tanggal untuk mengubah sesi" saat editMode aktif

  Header dokumen (background maroon):
  - Logo PT + Periode + Area/Regu info

  Tabel scroll horizontal (overflow-x-auto, max-h-96):
  Kolom: [Edit button (jika editMode)] | NO | NIK | NAMA | JABATAN | AREA | REGU | [tanggal 1..N] | KETERANGAN
  Per baris karyawan:
    - Jika editMode: tombol Trash2 → hideRow(nik)
    - Sel tanggal: background + teks sesuai keterangan warna sesi
    - Klik sel saat editMode → setActiveCell({ nik, date })
    - Jika isActive: tampilkan dropdown kecil dengan semua kode keterangan → klik = setCellValue
    - Dot oranye kecil di pojok kanan atas sel jika sel di-override
    - Kolom KETERANGAN: ringkasan "P=10, S=8, M=7, L=2" dsb

  Footer keterangan warna (flex wrap badge bawah tabel)

  Section TTD preview (3 kolom: Yang Membuat, Yang Mengetahui, Yang Menyetujui)
  - Garis TTD + nama dari input di bawah

Bagian 4 - Input Nama TTD (grid 3 kolom):
  - Input Yang Membuat (uppercase)
  - Input Yang Mengetahui (uppercase)
  - Input Yang Menyetujui (uppercase)

Bagian 5 - Upload PDF Ditandatangani:
  - Drop zone border-dashed
  - Tombol Upload PDF → input file accept="application/pdf"
  - Upload via base44.integrations.Core.UploadFile({ file })
  - Setelah upload: tampilkan link file + tombol hapus

Bagian 6 - Tombol Export (2 tombol full-width):
  - "Export Excel" (hijau) → exportExcel()
  - "Export PDF" (maroon) → exportPDF()

=== EXPORT EXCEL (xlsx) ===
import * as XLSX from 'xlsx';
const wb = XLSX.utils.book_new();
const ws_data = [];

// Baris judul + area
ws_data.push(['JADWAL SHIFT PERIODE ...']);
ws_data.push(['AREA TUGAS: ...']);
ws_data.push([]);

// Header bulan: NO | NIK | NAMA | JABATAN | AREA | REGU | [nama_bulan per tanggal] | KETERANGAN
// Header tanggal: '' | '' | '' | '' | '' | '' | [angka tanggal] | ''
// Data karyawan: nomor | nik | nama.toUpperCase() | jabatan | area | regu | [kode sesi per tanggal] | "P=10, S=8..."

// Styling kolom: wch=[4,14,24,18,18,10,...tanggal 4px each...,20]
// Styling sel sesi: warna background + font color + bold sesuai keterangan
// Baris header: background maroon + teks putih

// Footer: keterangan list + TTD 3 pihak dengan posisi di kolom proporsional
XLSX.writeFile(wb, \`JadwalShift_\${area}_\${startDate}_\${endDate}.xlsx\`);

=== EXPORT PDF (jsPDF) ===
import jsPDF from 'jspdf';
const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
const pw = doc.internal.pageSize.getWidth(); // ~297mm
const ph = doc.internal.pageSize.getHeight(); // ~210mm

// drawHeader(): background maroon full-width, lingkaran putih untuk logo, teks periode + area
// drawTableHeader(): header tabel maroon, kolom NO/NIK/NAMA/JABATAN/AREA/REGU + tanggal + KET

// Lebar kolom tetap: [7,18,32,22,22,14] + KET=28mm
// Lebar kolom tanggal: (totalWidth - fixedW - ketW) / jumlah_tanggal (min 3.5mm)
// Row height: 5.5mm, header height: 9mm

// Per karyawan:
// - doc.addPage() jika yPos > ph - 35
// - Latar belakang zebra: rgb(249,250,251) / putih
// - Sel tanggal: fill warna keterangan + teks kode sesi bold centered
// - Kolom KET: teks ringkasan kecil

// Garis tabel: horizontal + vertikal per sel (doc.line)
// Footer: legend keterangan + 3 kolom TTD (Yang Membuat/Mengetahui/Menyetujui) + garis + nama bold

doc.save(\`JadwalShift_\${area}_\${startDate}_\${endDate}.pdf\`);

=== FUNGSI HELPER ===
function generateDateRange(startDate, endDate) {
  // Parse manual (hindari timezone issue)
  const [sy,sm,sd] = startDate.split('-').map(Number);
  const [ey,em,ed] = endDate.split('-').map(Number);
  const cur = new Date(sy, sm-1, sd), end = new Date(ey, em-1, ed);
  const dates = [];
  while (cur <= end) {
    const y=cur.getFullYear(), m=String(cur.getMonth()+1).padStart(2,'0'), d=String(cur.getDate()).padStart(2,'0');
    dates.push(\`\${y}-\${m}-\${d}\`);
    cur.setDate(cur.getDate()+1);
  }
  return dates;
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

=== PENGGUNAAN DI HALAMAN ShiftSchedule ===
import ShiftScheduleVisual from '@/components/shift/ShiftScheduleVisual';

// Di JSX halaman, di toolbar/header:
<ShiftScheduleVisual
  areas={areas}
  isMasterAdmin={isMasterAdmin}
  employeeArea={employee.area_tugas}
/>
`
      },
      {
        nama: "Jadwal Shift",
        deskripsi: "Manajemen jadwal shift dengan generate otomatis dan visual Excel-style.",
        prompt: `Buatkan halaman ShiftSchedule (Jadwal Shift) untuk manajemen jadwal kerja karyawan keamanan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + xlsx + jspdf + lucide-react.

=== ENTITY ShiftSchedule ===
{ id, area_tugas, regu: "Regu A"|"Regu B"|"Regu C"|"Regu D"|"Non Regu",
  tanggal (YYYY-MM-DD), jam_mulai (HH:MM), jam_selesai (HH:MM),
  tipe_shift: "6-2"|"6-1"|"4-2"|"Custom",
  karyawan_ids: string[] (array NIK karyawan), catatan }

=== ENTITY ShiftNotification ===
{ id, nik_karyawan, pesan, tanggal_shift, area_tugas, sudah_dibaca, created_date }

=== POLA ROTASI SHIFT (Tipe 6-2) ===
Siklus 8 hari: ['P','P','S','S','M','M','L','L'] (Pagi/Siang/Malam/Libur)
Jam: Pagi=07:00-15:00, Siang=15:00-23:00, Malam=23:00-07:00

=== TAB 1 - "Jadwal Bulan Ini" (List) ===
- Filter: area, regu, bulan, tahun
- Tabel: Tanggal | Hari | Regu | Jam Mulai | Jam Selesai | Jumlah Petugas | Aksi
- Tombol: Tambah Manual | Generate Otomatis | Hapus Bulk

=== TAB 2 - "Visual Grid" (Excel-style) ===
- Header: pilih area + regu + bulan
- Grid: baris=nama karyawan, kolom=tanggal 1-31
- Cell = kode: P(Pagi)/S(Siang)/M(Malam)/L(Libur)/–(Tidak dijadwal)
- Warna cell: P=biru, S=kuning, M=ungu, L=hijau muda
- Edit manual: klik cell → dropdown pilih sesi
- Export Excel (.xlsx dengan format warna)
- Export PDF timesheet per karyawan

=== TAB 3 - "Generate Otomatis" ===
Form: pilih area, tipe pola, bulan, tahun, regu, tanggal mulai siklus per regu
Preview jadwal sebelum simpan → Tombol "Generate & Simpan"

=== ALGORITMA GENERATE 6-2 ===
const SIKLUS = ['P','P','S','S','M','M','L','L'];
const JAM = { P: {mulai:'07:00',selesai:'15:00'}, S: {mulai:'15:00',selesai:'23:00'}, M: {mulai:'23:00',selesai:'07:00'} };

function generateJadwal(area, regu, bulan, tahun, offset, karyawanIds) {
  const records = [];
  const daysInMonth = new Date(tahun, bulan, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const tanggal = \`\${tahun}-\${String(bulan).padStart(2,'0')}-\${String(day).padStart(2,'0')}\`;
    const siklus = SIKLUS[(offset + day - 1) % 8];
    if (siklus !== 'L') {
      records.push({ area_tugas: area, regu, tanggal,
        jam_mulai: JAM[siklus].mulai, jam_selesai: JAM[siklus].selesai,
        tipe_shift: '6-2', karyawan_ids: karyawanIds });
    }
  }
  return records;
}

=== NOTIFIKASI SHIFT ===
Setelah generate, buat ShiftNotification per karyawan_ids:
{ nik_karyawan, pesan: "Jadwal shift Anda telah diperbarui untuk [bulan]", tanggal_shift: tanggal, area_tugas }

=== EXPORT TIMESHEET PDF ===
Format per karyawan (jsPDF):
- Header: Logo PT, Nama Karyawan, Periode
- Tabel: No | Tanggal | Hari | Shift | Jam Masuk | Jam Pulang | Paraf
- Footer: TTD Supervisor

=== CONFLICT CHECKER ===
Sebelum simpan: cek karyawan yang sama tidak dijadwalkan 2 shift di hari yang sama.
Tampilkan warning (badge kuning), bukan error hard.

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { base44 } from '@/api/cloudflareClient';`
      },
      {
        nama: "E-Patroli",
        deskripsi: "Pencatatan patroli dengan scan QR code di setiap checkpoint.",
        prompt: `Buatkan halaman EPatrol (E-Patroli) untuk sistem pencatatan patroli keamanan dengan QR scan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + qrcode + lucide-react.

=== ENTITY EPatrol ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal (YYYY-MM-DD), waktu (HH:MM:SS),
  checkpoint, kondisi: "Aman"|"Perlu Perhatian"|"Bahaya", foto (URL), catatan }

=== ENTITY EPatrolTemplate ===
{ id, nama_template, jumlah_foto (1-5),
  foto_configs: [{ label: string, riwayat_keterangan: string[] }],
  area_tugas, status: "Aktif"|"Non-Aktif" }

=== FITUR KARYAWAN ===
1. Daftar checkpoint area: nama, waktu scan terakhir, status terakhir
   Badge: Aman=hijau, Perlu Perhatian=kuning, Bahaya=merah

2. Tombol "Scan QR Code": buka kamera, scan QR (gunakan jsQR library)
   import jsQR from 'jsqr';
   const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
   const code = jsQR(imageData.data, imageData.width, imageData.height);
   if (code) handleCheckpointFound(code.data);

3. Form setelah scan: nama checkpoint (readonly), select kondisi, upload foto (wajib), catatan

4. Offline Queue:
   - Jika !navigator.onLine: simpan ke localStorage key "patrol_queue"
   - Banner "X laporan pending" + tombol Sync saat online

=== FITUR ADMIN ===
5. Log patroli: filter area/tanggal/karyawan/checkpoint/kondisi. Tabel + preview foto
6. Dashboard checkpoint: waktu scan terakhir, alert >8 jam tidak discan
7. Kelola Checkpoint: CRUD + generate QR (import QRCode from 'qrcode')
   const qrDataUrl = await QRCode.toDataURL(checkpointId, { width: 256 });
8. Template Custom: CRUD EPatrolTemplate (konfigurasi jumlah foto per scan)

=== CHECKPOINT DARI AreaProject ===
const areaData = await base44.entities.AreaProject.filter({ nama_area: employee.area_tugas });
const checkpoints = areaData[0]?.e_patrol_checkpoints || [];`
      },
      {
        nama: "E-Facility",
        deskripsi: "Pencatatan pengecekan fasilitas gedung secara berkala.",
        prompt: `Buatkan halaman EFacility (E-Facility) untuk pencatatan kondisi fasilitas gedung.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY EFacility ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal (YYYY-MM-DD), waktu (HH:MM),
  nama_fasilitas, lokasi_fasilitas, lantai_gedung,
  kondisi: "Baik"|"Perlu Perbaikan"|"Rusak Berat",
  foto_kondisi (URL), catatan, perlu_tindakan: boolean,
  status_tindak_lanjut: "Belum Ditangani"|"Dalam Proses"|"Selesai",
  nik_petugas_tindak_lanjut, tanggal_selesai_tindak_lanjut }

=== KATEGORI FASILITAS (referensi) ===
Lift, AC, Genset, Lampu, Pintu, Kunci, CCTV, Pompa Air, Panel Listrik, Tangki Air,
Toilet, Taman, Parkir, Lobi, Mushola, Kantin

=== FITUR KARYAWAN ===
1. Form Input: pilih fasilitas, lokasi, lantai, kondisi (ikon warna ✅/⚠️/🚨), upload foto, catatan
   Checkbox perlu_tindakan (auto-check jika Rusak Berat)
2. Pengecekan hari ini: list yang sudah dicek + badge kondisi

=== FITUR ADMIN ===
3. Dashboard: Cards Total | Baik | Perlu Perbaikan | Rusak Berat
4. Alert masalah aktif: kondisi ≠ Baik, status "Belum Ditangani" → highlight merah
5. Riwayat: filter area/tanggal/fasilitas/kondisi/petugas
6. Update tindak lanjut: ubah status, input tanggal selesai
7. Tombol "Buat Tiket": redirect ke FacilityTicketing dengan data pre-filled

=== ALERT ===
List fasilitas dengan kondisi "Rusak Berat" atau "Perlu Perbaikan" dan status "Belum Ditangani"
Banner merah di atas halaman jika ada item critical`
      },
      {
        nama: "Daily Checklist",
        deskripsi: "Checklist harian serah terima shift dengan evaluasi supervisor.",
        prompt: `Buatkan halaman DailyChecklist untuk checklist serah terima shift keamanan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + jspdf + lucide-react.

=== ENTITY DailyChecklist ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal (YYYY-MM-DD), shift: "Pagi"|"Siang"|"Malam",
  penerima_serah_terima (nama),

  serah_terima: { seragam_lengkap, id_card, ht_berfungsi, senter_berfungsi,
    buku_mutasi_tersedia, absensi_terisi, serah_terima_dilakukan, keterangan },

  patroli_area: { kunci_pintu_aman, jendela_aman, lampu_area_berfungsi, apar_kondisi_baik,
    potensi_bahaya_ditemukan, cctv_berfungsi, area_steril, keterangan },

  akses_keluar_masuk: { tamu_diperiksa, buku_tamu_terisi, karyawan_diverifikasi,
    kendaraan_diperiksa, barang_masuk_dicatat, barang_keluar_dicatat, keterangan },

  ketertiban_parkir: { lalulintas_diatur, parkir_tertib, area_sterilisasi_aman,
    tidak_ada_parkir_liar, akses_darurat_bebas, keterangan },

  laporan_akhir: { buku_mutasi_terisi, kejadian_dilaporkan,
    serah_terima_berikutnya, ringkasan_kejadian, keterangan },

  nilai_supervisor (1-100), catatan_supervisor,
  status_evaluasi: "Menunggu Evaluasi"|"Sudah Dievaluasi", tanda_tangan_supervisor }

Setiap item nilai: "Ya" | "Tidak" | "-"

=== FITUR ===
1. Form input: header (tanggal/shift/penerima), 5 Card kategori per warna, 3 tombol toggle Ya/Tidak/- per item
   Progress bar % item diisi. Disable simpan jika < 80% diisi.

2. Daftar checklist (Admin): filter area/tanggal/shift/status_evaluasi
   Tabel: Tanggal | Shift | Nama | Nilai | Status | Aksi(Lihat Detail)

3. Form Evaluasi Supervisor: slider nilai, catatan, nama TTD, status = "Sudah Dievaluasi"

4. Cetak PDF (jsPDF): header kop PT, tabel per kategori, ringkasan kejadian, nilai supervisor`
      },
      {
        nama: "Laporan Harian",
        deskripsi: "Laporan kejadian harian yang dibuat oleh petugas per shift.",
        prompt: `Buatkan halaman LaporanHarian untuk petugas mencatat kejadian harian per shift.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + react-quill + lucide-react.

=== ENTITY LaporanHarian ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal (YYYY-MM-DD), shift: "Pagi"|"Siang"|"Malam",
  judul_laporan, isi_laporan (rich text HTML dari react-quill),
  foto_bukti: string[] (array URL foto, upload multiple),
  kategori: "Normal"|"Kejadian Penting"|"Darurat",
  sudah_dibaca: boolean, dibaca_oleh: string, tanggal_baca: string }

=== PENTING: react-quill ===
import 'react-quill/dist/quill.snow.css';
import ReactQuill from 'react-quill';
const [isiLaporan, setIsiLaporan] = useState('');
<ReactQuill theme="snow" value={isiLaporan} onChange={setIsiLaporan} />

=== FITUR KARYAWAN ===
1. Form buat laporan: judul, kategori, shift, react-quill editor, upload multiple foto
   Upload per foto: base44.integrations.Core.UploadFile → simpan array URL
2. Laporan hari ini: list laporan yang sudah dibuat

=== FITUR ADMIN ===
3. Filter: area, tanggal, shift, kategori, status baca
4. List/tabel laporan: badge kategori berwarna (Normal=abu, Kejadian=kuning, Darurat=merah)
   Badge "Belum Dibaca" jika sudah_dibaca=false → highlight orange
5. Detail laporan:
   - Render HTML: <div dangerouslySetInnerHTML={{ __html: laporan.isi_laporan }} />
   - Grid foto (thumbnail, klik preview besar)
   - Tombol "Tandai Sudah Dibaca" → update sudah_dibaca=true
6. Alert DARURAT: banner merah jika ada laporan Darurat belum dibaca`
      },
      {
        nama: "Serah Terima Shift",
        deskripsi: "Handover shift formal antara petugas dengan tandatangan digital.",
        prompt: `Buatkan halaman ShiftHandoverPage (Serah Terima Shift) dengan tanda tangan digital.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + jspdf + lucide-react.

=== ENTITY ShiftHandover ===
{ id, tanggal (YYYY-MM-DD), shift_dari: "Pagi"|"Siang"|"Malam", shift_ke,
  area_tugas, nik_penyerah, nama_penyerah, jabatan_penyerah,
  nik_penerima, nama_penerima, jabatan_penerima,
  kondisi_umum: "Kondusif"|"Ada Masalah"|"Darurat",
  catatan_penyerah, catatan_penerima,
  inventaris_diserahkan: [{ nama_item, kondisi, jumlah, catatan }],
  ttd_penyerah (base64 PNG), ttd_penerima (base64 PNG),
  waktu_serah_terima, status: "Draft"|"Menunggu TTD Penerima"|"Selesai" }

=== KOMPONEN TANDA TANGAN DIGITAL ===
Gunakan HTML5 Canvas:
function SignatureCanvas({ onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  // Mouse: onMouseDown/Move/Up + Touch: onTouchStart/Move/End
  // Konversi koordinat touch ke canvas coords
  const save = () => onSave(canvasRef.current.toDataURL('image/png'));
  const clear = () => { const ctx = canvasRef.current.getContext('2d'); ctx.clearRect(0,0,400,150); };
  return (
    <div>
      <canvas ref={canvasRef} width={400} height={150}
        className="border-2 border-dashed border-gray-400 rounded-lg bg-white w-full touch-none" />
      <div className="flex gap-2 mt-2">
        <Button onClick={clear} variant="outline">Hapus</Button>
        <Button onClick={save}>Simpan TTD</Button>
      </div>
    </div>
  );
}

=== ALUR ===
Step 1 (Penyerah): isi form + kondisi + catatan + tabel inventaris + TTD → status "Menunggu TTD Penerima"
Step 2 (Penerima): lihat detail penyerah + input catatan + TTD → status "Selesai"

=== DAFTAR ===
Tab "Perlu Saya Konfirmasi": status "Menunggu TTD Penerima" + nik_penerima = saya
Tab "Saya Buat": nik_penyerah = saya
Tab "Semua" (Admin): semua handover, filter area/tanggal

=== CETAK PDF ===
jsPDF: header "BERITA ACARA SERAH TERIMA SHIFT", tabel inventaris,
2 kolom TTD: doc.addImage(ttd_base64, 'PNG', x, y, width, height)`
      },
      {
        nama: "Penugasan",
        deskripsi: "Sistem pemberian dan tracking tugas dari atasan ke bawahan.",
        prompt: `Buatkan halaman AssignmentPage (Penugasan) untuk manajemen tugas harian.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY Assignment ===
{ id, judul, deskripsi, nik_petugas, nama_petugas, area_tugas,
  nik_pemberi, nama_pemberi, jabatan_pemberi,
  deadline (YYYY-MM-DD), prioritas: "Rendah"|"Sedang"|"Tinggi"|"Mendesak",
  status: "Belum Dimulai"|"Sedang Dikerjakan"|"Selesai"|"Dibatalkan",
  catatan_penyelesaian, waktu_selesai, foto_bukti (URL) }

Badge warna: Mendesak=merah, Tinggi=oranye, Sedang=kuning, Rendah=hijau

=== TAMPILAN KARYAWAN ===
1. Tab "Tugas Saya": filter { nik_petugas: employee.nik_karyawan }, Tabs: Aktif | Selesai | Semua
   Card: judul + badge prioritas, dari siapa, deadline (merah jika lewat), status badge
2. Dialog Update Status: select Sedang Dikerjakan/Selesai, catatan, upload foto_bukti (jika Selesai)

=== TAMPILAN ADMIN ===
3. Tab "Buat Tugas": form judul, deskripsi, dropdown pilih petugas (Employee area), deadline, prioritas
4. Tab "Monitoring":
   Filter status/prioritas/petugas/area/deadline. Tabel + sort deadline asc.
   Highlight baris merah: deadline terlewat + belum selesai
   Tombol Lihat Detail | Batalkan
5. Dashboard: Tugas Aktif | Mendesak Hari Ini | Lewat Deadline | Selesai Bulan Ini
6. Alert: deadline hari ini/besok + belum selesai → banner kuning

=== QUERY ===
Karyawan: base44.entities.Assignment.filter({ nik_petugas: employee.nik_karyawan })
Admin: base44.entities.Assignment.filter({ area_tugas: employee.area_tugas })`
      },
      {
        nama: "Task Board",
        deskripsi: "Kanban board visual untuk tracking pekerjaan tim.",
        prompt: `Buatkan halaman TaskBoard dengan tampilan Kanban drag-and-drop.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + @hello-pangea/dnd + lucide-react.

=== ENTITY TaskBoard ===
{ id, judul, deskripsi, area_tugas, nik_assignee, nama_assignee,
  status: "Backlog"|"To Do"|"In Progress"|"Done"|"Blocked",
  prioritas: "Low"|"Medium"|"High"|"Critical",
  label: string[], deadline (YYYY-MM-DD), nik_creator, nama_creator, created_date }

=== 5 KOLOM KANBAN ===
const COLUMNS = [
  { id: "Backlog", color: "bg-gray-100", header: "bg-gray-400" },
  { id: "To Do", color: "bg-blue-50", header: "bg-blue-500" },
  { id: "In Progress", color: "bg-yellow-50", header: "bg-yellow-500" },
  { id: "Done", color: "bg-green-50", header: "bg-green-500" },
  { id: "Blocked", color: "bg-red-50", header: "bg-red-500" },
];

=== DRAG & DROP (@hello-pangea/dnd) ===
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const onDragEnd = async (result) => {
  if (!result.destination) return;
  const newStatus = result.destination.droppableId;
  // Optimistic update dulu
  setTasks(prev => prev.map(t => t.id === result.draggableId ? { ...t, status: newStatus } : t));
  // Lalu simpan ke DB
  await base44.entities.TaskBoard.update(result.draggableId, { status: newStatus });
};

=== TASK CARD ===
const priorityColors = { Low: "bg-green-100 text-green-700", Medium: "bg-yellow-100 text-yellow-700",
  High: "bg-orange-100 text-orange-700", Critical: "bg-red-100 text-red-700" };
const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "Done";

=== FITUR ===
1. DragDropContext dengan 5 Droppable kolom + Draggable cards
2. Counter jumlah kartu per kolom header
3. Dialog detail kartu: edit semua field, hapus
4. Tombol "+ Tambah Kartu" per kolom: form cepat
5. Filter: search judul, assignee, prioritas, label
6. Mobile: Tabs per kolom (bukan horizontal scroll)
7. Badge prioritas berwarna per kartu`
      },
      {
        nama: "Ticketing Fasilitas",
        deskripsi: "Sistem tiket untuk pelaporan dan tracking kerusakan fasilitas.",
        prompt: `Buatkan halaman FacilityTicketing (Ticketing Fasilitas) untuk pelaporan kerusakan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + recharts + lucide-react.

=== ENTITY FacilityTicket ===
{ id, judul, deskripsi, area_tugas, lokasi_spesifik,
  kategori: "Listrik"|"Plumbing"|"HVAC"|"Keamanan"|"Kebersihan"|"Lainnya",
  prioritas: "Low"|"Medium"|"High"|"Critical",
  status: "Open"|"In Progress"|"Resolved"|"Closed",
  foto_laporan: string[] (array URL, maks 3),
  nik_pelapor, nama_pelapor, tanggal_lapor,
  nik_teknisi, nama_teknisi, catatan_teknisi, foto_selesai (URL),
  tanggal_mulai_kerja, tanggal_selesai, rating_kepuasan (1-5), komentar_rating }

=== ENTITY TicketComment ===
{ id, ticket_id, nik_komentar, nama_komentar, isi_komentar, tanggal, waktu }

=== FITUR ===
1. Dashboard: Cards Open | In Progress | Resolved | Closed. Alert Critical merah.
2. Tabel tiket: filter status/prioritas/kategori/area/tanggal. Search judul/ID.
3. Form Buat Tiket: judul, deskripsi, lokasi, kategori, prioritas, area, upload 3 foto
   Auto ID tiket: TKT-YYYYMMDD-XXX
4. Detail Tiket (dialog):
   - Semua info + foto
   - Diskusi (TicketComment): daftar komentar sort asc + form tambah komentar
   - Assign ke teknisi (dropdown Employee)
5. Update Status (Admin/Teknisi):
   - Open → In Progress → Resolved (input catatan + foto selesai + tanggal)
   - Resolved → Closed: rating kepuasan (1-5 bintang) dari pelapor
6. Statistik: rata-rata waktu selesai, BarChart tiket per kategori, LineChart per bulan

Badge: Open=merah, In Progress=kuning, Resolved=biru, Closed=abu
Badge prioritas: Critical=merah, High=oranye, Medium=kuning, Low=hijau`
      },
      {
        nama: "Tukar Shift",
        deskripsi: "Pengajuan dan approval pertukaran jadwal shift antar karyawan.",
        prompt: `Buatkan halaman ShiftSwap (Tukar Shift) untuk pengajuan pertukaran jadwal kerja.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY ShiftSwap ===
{ id, nik_pemohon, nama_pemohon, nik_penerima, nama_penerima, area_tugas,
  shift_tanggal (YYYY-MM-DD), shift_id_pemohon, shift_id_penerima,
  alasan, status: "Pending"|"Disetujui Atasan"|"Ditolak"|"Selesai",
  nik_atasan, nama_atasan, tanggal_approval, catatan_atasan, tanggal_pengajuan,
  konfirmasi_penerima: "Belum"|"Setuju"|"Tolak", catatan_penerima }

=== ALUR ===
1. Pemohon buat request → status "Pending"
2. Penerima konfirmasi Setuju/Tolak → konfirmasi_penerima
3. Atasan approve (jika penerima Setuju) → status "Disetujui Atasan"
4. Panggil backend function approveShiftSwap → status "Selesai"

=== TAB "Saya Ajukan" ===
Daftar { nik_pemohon: employee.nik_karyawan }. Badge status. Tombol Batalkan jika Pending.

=== TAB "Diajak Tukar" ===
Daftar { nik_penerima: employee.nik_karyawan, status: "Pending" }
Tampilkan siapa yang mengajak + tanggal + alasan. Tombol [✅ Setuju] [❌ Tolak] + catatan.

=== TAB "Perlu Approval" (Leader/Admin) ===
Daftar { area_tugas, konfirmasi_penerima: "Setuju", status: "Pending" }
Tombol Approve + catatan. Tombol Reject.
Saat Approve: invoke backend function approveShiftSwap.

=== FORM AJUKAN (dialog) ===
Pilih tanggal shift milik sendiri (dari ShiftSchedule). Pilih rekan (Employee area + regu).
Tampilkan shift rekan pada tanggal tersebut. Textarea alasan.

=== INVOKE FUNCTION ===
import { base44 } from '@/api/cloudflareClient';
const response = await base44.functions.invoke('approveShiftSwap', {
  swap_id: swap.id, shift_id_pemohon: swap.shift_id_pemohon,
  shift_id_penerima: swap.shift_id_penerima,
  nik_pemohon: swap.nik_pemohon, nik_penerima: swap.nik_penerima
});`
      },
    ]
  },
  {
    kategori: "Checklist & Monitoring",
    warna: "bg-yellow-50 border-yellow-200",
    warnaHeader: "bg-yellow-600",
    items: [
      {
        nama: "Hydrant & APAR",
        deskripsi: "Pengecekan kondisi hydrant dan APAR secara berkala.",
        prompt: `Buatkan halaman ChecklistHydrant (Hydrant & APAR) untuk pengecekan alat pemadam kebakaran.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + jspdf + lucide-react.

=== ENTITY ChecklistHydrant ===
{ id, nik_karyawan, nama_karyawan, area_tugas, tanggal (YYYY-MM-DD),
  lokasi, kondisi: "Baik"|"Rusak"|"Perlu Maintenance",
  tekanan_bar, tanggal_expired (YYYY-MM-DD), foto (URL), catatan,
  tipe: "Hydrant"|"APAR" }

=== FITUR ===
1. Dashboard: Total Hydrant | Total APAR | Kondisi Rusak (merah) | Akan Expired ≤30 Hari (kuning)

2. Alert expired: tanggal_expired ≤ today+30 hari AND tipe="APAR"
   Banner kuning + daftar lokasi APAR akan expired

3. Form input (dialog):
   Select tipe. Input lokasi (datalist autocomplete).
   Select kondisi (ikon warna ✅/⚠️/🚨).
   Jika APAR: input tekanan_bar + date picker tanggal_expired.
   Upload foto (kamera/file). Textarea catatan.

4. Tabel daftar: Tanggal | Tipe | Lokasi | Kondisi | Tekanan | Expired | Petugas | Foto | Aksi
   Filter: tipe, kondisi, area, bulan/tahun. Badge kondisi berwarna.

5. Export PDF (jsPDF): header kop PT, tabel pengecekan, summary kondisi, footer TTD

=== ALERT EXPIRED ===
const today = new Date().toISOString().split('T')[0];
const plus30 = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
const data = await base44.entities.ChecklistHydrant.filter({ area_tugas: employee.area_tugas });
const akanExpired = data.filter(d => d.tipe === "APAR" && d.tanggal_expired && d.tanggal_expired <= plus30);`
      },
      {
        nama: "Box Emergency",
        deskripsi: "Pengecekan kelengkapan kotak P3K dan emergency di area.",
        prompt: `Buatkan halaman ChecklistEmergency (Box Emergency) untuk pengecekan kotak P3K dan alat darurat.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY ChecklistEmergency ===
{ id, nik_karyawan, nama_karyawan, area_tugas, tanggal (YYYY-MM-DD),
  lokasi_box, kondisi: "Baik"|"Rusak"|"Perlu Maintenance",
  isi_lengkap: boolean, item_kurang: string[], foto (URL), catatan }

=== ITEM P3K STANDAR ===
["Plester luka", "Perban", "Kasa steril", "Antiseptik", "Gunting medis",
 "Pinset", "Termometer", "Sarung tangan", "Masker", "Obat merah",
 "Betadine", "Alkohol swab", "Kapas", "Tensometer"]

=== FITUR ===
1. Dashboard: Total Box | Kondisi Baik | Rusak | Isi Tidak Lengkap
   Alert merah jika ada box Rusak atau isi tidak lengkap hari ini

2. Form pengecekan (dialog):
   Input lokasi_box (autocomplete dari riwayat). Select kondisi.
   Toggle isi_lengkap: Ya/Tidak.
   Jika Tidak: checklist item kurang dari daftar standar + custom.
   Upload foto. Textarea catatan.

3. Tabel: Tanggal | Lokasi Box | Kondisi | Isi Lengkap | Petugas | Foto | Aksi
   Filter: area, tanggal, kondisi. Badge Lengkap=hijau, Tidak Lengkap=oranye.

4. View per lokasi box: riwayat pengecekan, terakhir dicek, tren kondisi

5. Rekap bulanan per area: Lokasi | Jumlah Pengecekan | Rata-rata Kondisi | Temuan`
      },
      {
        nama: "KR 2/4",
        deskripsi: "Pengecekan kondisi kendaraan operasional roda 2 dan roda 4.",
        prompt: `Buatkan halaman ChecklistKR (Kendaraan Operasional) untuk pengecekan kendaraan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY ChecklistKR ===
{ id, nik_karyawan, nama_karyawan, area_tugas, tanggal (YYYY-MM-DD),
  tipe_kendaraan: "KR 2"|"KR 4", no_polisi,
  kondisi_ban: "Baik"|"Perlu Ganti",
  kondisi_mesin: "Baik"|"Perlu Service",
  kondisi_lampu: "Baik"|"Rusak",
  kondisi_rem: "Baik"|"Perlu Service",
  kondisi_bodi: "Baik"|"Ada Lecet"|"Rusak",
  kondisi_kaca: "Baik"|"Retak"|"Perlu Ganti",
  bbm, km_terakhir, foto (URL), catatan, perlu_tindakan: boolean }

=== FITUR ===
1. Dashboard kendaraan: kartu per no_polisi unik
   Icon motor/mobil, pengecekan terakhir, badge "OK" (hijau) atau "Perlu Perhatian" (merah)

2. Form pengecekan (dialog):
   Select tipe KR 2/KR 4. Input/select no polisi.
   Toggle kondisi per komponen: Ban, Mesin, Lampu, Rem, Bodi, Kaca.
   Input BBM dan KM. Upload foto. Checkbox perlu_tindakan.
   Display kondisi overall: BAIK / PERLU PERHATIAN

3. Tabel riwayat: Tanggal | Tipe | No.Polisi | Ban | Mesin | Lampu | Rem | BBM | KM | Petugas | Aksi
   Filter: tipe, tanggal, no_polisi. Alert komponen bukan "Baik".

4. Histori per kendaraan: pilih no_polisi → grafik tren kondisi + LineChart KM (recharts)`
      },
      {
        nama: "Checklist Toilet",
        deskripsi: "Monitoring kebersihan dan kelengkapan toilet secara berkala.",
        prompt: `Buatkan halaman ChecklistToilet (Checklist Toilet) untuk monitoring kebersihan toilet.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY ChecklistToilet ===
{ id, nik_karyawan, nama_karyawan, area_tugas, tanggal (YYYY-MM-DD), waktu (HH:MM),
  lokasi_toilet, kebersihan: "Bersih"|"Cukup"|"Kotor",
  perlengkapan: "Lengkap"|"Kurang"|"Habis",
  kondisi_kloset: "Baik"|"Rusak"|"Mampet",
  kondisi_wastafel: "Baik"|"Rusak"|"Bocor",
  kondisi_lampu: "Baik"|"Mati",
  foto (URL), catatan }

=== FITUR ===
1. Overview hari ini (grid lokasi toilet):
   Kartu per lokasi: terakhir dicek + kondisi. Warna: hijau (Bersih+Lengkap), kuning, merah.
   Counter: sudah dicek X kali hari ini. Tombol "Cek Sekarang" per lokasi.

2. Form pengecekan (dialog): lokasi readonly, select semua kondisi, upload foto, catatan
   Waktu = now otomatis

3. Timeline hari ini: list sort by waktu, tampilkan waktu|lokasi|kebersihan|perlengkapan|petugas

4. Filter & History: filter area/tanggal/lokasi/kebersihan

5. Alert:
   - Lokasi dengan kebersihan "Kotor" atau perlengkapan "Habis" → banner kuning
   - Lokasi belum dicek setelah jam 12:00

6. Rekap frekuensi pengecekan per lokasi (ideal: 3x sehari)`
      },
      {
        nama: "Buku Tamu",
        deskripsi: "Pencatatan digital tamu yang masuk ke area/gedung.",
        prompt: `Buatkan halaman GuestBook (Buku Tamu Digital) untuk pencatatan pengunjung gedung.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY GuestBook ===
{ id, area_tugas, tanggal (YYYY-MM-DD), waktu_masuk (HH:MM), waktu_keluar (HH:MM),
  nama_tamu, instansi_perusahaan, keperluan, nama_yang_ditemui, unit_yang_dikunjungi,
  no_ktp (opsional), no_kendaraan (opsional), foto_tamu (URL, opsional),
  badge_nomor, status: "Di Dalam"|"Sudah Keluar",
  nik_petugas, nama_petugas_check_in, nama_petugas_check_out }

=== FITUR ===
1. Dashboard hari ini:
   - Counter besar "Tamu Di Dalam: X" (badge hijau berkedip jika > 0)
   - Counter total tamu hari ini | sudah keluar
   - Tombol besar "DAFTARKAN TAMU"

2. Form Check-In (dialog): nama_tamu, instansi, keperluan, nama_yang_ditemui, unit,
   no_ktp, no_kendaraan (opsional), foto tamu (kamera opsional), badge_nomor
   Waktu masuk = now. Status = "Di Dalam".

3. Tabel Tamu Aktif (Di Dalam): Nama | Instansi | Keperluan | Temu | Badge | Masuk | Foto | Aksi
   Tombol "CHECK OUT" per baris → waktu keluar = now, status = "Sudah Keluar"
   Highlight baris: durasi > 3 jam (mungkin lupa check out)

4. History semua tamu: filter tanggal/area/nama/instansi
   Tabel + kalkulasi durasi kunjungan

5. Export Excel laporan tamu (per hari/bulan)

6. Statistik: rata-rata tamu/hari, instansi terbanyak, peak hours`
      },
      {
        nama: "Paket Tenant",
        deskripsi: "Pencatatan penerimaan dan pengambilan paket oleh tenant.",
        prompt: `Buatkan halaman TenantPackage (Paket Tenant) untuk manajemen paket masuk gedung.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY TenantPackage ===
{ id, area_tugas, tanggal_terima (YYYY-MM-DD), waktu_terima (HH:MM),
  nama_pengirim, nama_penerima, unit_tenant, no_telp_penerima,
  jenis_paket: "Dokumen"|"Paket Kecil"|"Paket Besar"|"Makanan"|"Elektronik"|"Lainnya",
  ekspedisi (JNE/J&T/SiCepat/dll), no_resi,
  foto_paket (URL), status: "Menunggu Diambil"|"Sudah Diambil"|"Dikembalikan",
  tanggal_ambil, waktu_ambil, nama_pengambil, no_ktp_pengambil,
  nik_petugas_terima, nama_petugas_terima, nik_petugas_serah, nama_petugas_serah, catatan }

=== FITUR ===
1. Dashboard: Counter "Paket Menunggu: X" (merah jika > 0)
   Cards: Diterima Hari Ini | Diambil Hari Ini | Total Menunggu
   Alert: paket menunggu > 3 hari → banner oranye

2. Form terima paket (dialog): nama pengirim/penerima, unit, telp penerima, jenis, ekspedisi, no_resi,
   upload foto, catatan. Auto-generate nomor: PKG-YYYYMMDD-XXX. Waktu terima = now.

3. Daftar paket menunggu: card dengan info lengkap. Highlight merah jika > 3 hari.
   Tombol "SERAHKAN PAKET" → form input nama_pengambil + no_ktp → status "Sudah Diambil"

4. History semua paket: filter status/tanggal/unit/ekspedisi. Tabel lengkap.

5. Export laporan paket (Excel/PDF)`
      },
      {
        nama: "Monitor Darurat",
        deskripsi: "Monitoring real-time panic button dari seluruh area.",
        prompt: `Buatkan halaman PanicAlertMonitor (Monitor Darurat) untuk memantau panic alert real-time.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + framer-motion + react-leaflet + lucide-react.

=== ENTITY PanicAlert ===
{ id, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal (YYYY-MM-DD), waktu (HH:MM:SS), lokasi, keterangan,
  status: "Aktif"|"Ditangani"|"Selesai",
  latitude, longitude, foto_bukti (URL),
  nik_responder, nama_responder, catatan_penanganan, waktu_respons, waktu_selesai }

=== FITUR ===
1. Alert banner merah (animasi pulse framer-motion) jika ada status "Aktif":
   "🚨 DARURAT AKTIF: {count} ALERT MEMERLUKAN PENANGANAN"

2. Sound notification saat alert baru muncul:
   const ctx = new AudioContext();
   const osc = ctx.createOscillator();
   osc.frequency.value = 880;
   osc.connect(ctx.destination); osc.start(); setTimeout(() => osc.stop(), 500);

3. Cards: Alert Aktif (merah) | Ditangani (kuning) | Selesai Hari Ini (hijau)

4. Daftar alert aktif (background merah ringan):
   Nama | Jabatan | Area | Waktu | Lokasi | Keterangan
   Tombol "TANGANI" → dialog: catatan_penanganan, nik_responder = employee saya → status "Ditangani"
   Tombol "SELESAIKAN" (jika sudah Ditangani) → status "Selesai"
   Tombol "LIHAT LOKASI" (jika ada lat/lng) → modal peta react-leaflet

5. Map alert (react-leaflet): marker merah=Aktif, kuning=Ditangani, hijau=Selesai + popup info

6. History: filter status/area/tanggal. Tabel + kalkulasi waktu_respons.

=== REAL-TIME POLLING ===
const { data: alerts } = useQuery({
  queryKey: ['panic', employee.area_tugas],
  queryFn: () => base44.entities.PanicAlert.filter({ area_tugas: employee.area_tugas }),
  refetchInterval: 10000 // polling 10 detik
});
const prevCountRef = useRef(0);
useEffect(() => {
  const activeCount = alerts?.filter(a => a.status === "Aktif").length || 0;
  if (activeCount > prevCountRef.current) playAlertSound();
  prevCountRef.current = activeCount;
}, [alerts]);`
      },
    ]
  },
  {
    kategori: "Inventaris & Aset",
    warna: "bg-orange-50 border-orange-200",
    warnaHeader: "bg-orange-600",
    items: [
      {
        nama: "Inventaris",
        deskripsi: "Manajemen inventaris, peminjaman, dan mutasi aset.",
        prompt: `Buatkan halaman Inventory (Inventaris) untuk manajemen aset dan peralatan operasional.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + qrcode + xlsx + lucide-react.

=== ENTITY Inventory ===
{ id, kode_barang (auto: INV-001), nama_barang, kategori, merk, model, area_tugas,
  jumlah_total, jumlah_tersedia, jumlah_dipinjam, satuan,
  kondisi: "Baik"|"Cukup"|"Rusak", foto (URL), lokasi_penyimpanan,
  tanggal_beli, nilai_barang, nomor_serial, stok_minimum, keterangan }

=== ENTITY LoanRecord ===
{ id, inventory_id, kode_barang, nama_barang, area_tugas,
  nik_peminjam, nama_peminjam, jabatan_peminjam,
  tanggal_pinjam, tanggal_kembali_rencana, tanggal_kembali_aktual, jumlah_dipinjam,
  kondisi_saat_pinjam, kondisi_saat_kembali,
  status: "Dipinjam"|"Kembali"|"Terlambat"|"Hilang", catatan, foto_bukti_kembali }

=== ENTITY StockMutation ===
{ id, inventory_id, tipe: "Masuk"|"Keluar"|"Transfer"|"Penyesuaian",
  jumlah, tanggal, dari_area, ke_area, keterangan, nik_petugas, bukti_dokumen }

=== ENTITY AssetMaintenance ===
{ id, inventory_id, tanggal, jenis_maintenance, kondisi_sebelum, kondisi_sesudah,
  deskripsi, biaya, foto_before, foto_after, teknisi, status }

=== FITUR ===
Tab "Daftar Inventaris": grid/tabel + foto thumbnail. Filter kategori/kondisi/area/stok rendah.
  Tombol: Tambah | Edit | Detail | Pinjam | Mutasi. Alert stok minimum (banner kuning).

Tab "Peminjaman":
  Form pinjam: pilih barang, jumlah (validasi ≤ tersedia), tanggal kembali rencana.
  Saat create: kurangi jumlah_tersedia. List dipinjam + highlight merah jika terlambat.
  Form kembali: kondisi, foto bukti → update jumlah.

Tab "Mutasi Stok": form mutasi (tipe/jumlah/area/keterangan). Riwayat dengan filter.

Tab "Maintenance": form laporan + riwayat per barang.

Generate QR label:
import QRCode from 'qrcode';
const qrUrl = await QRCode.toDataURL(item.kode_barang, { width: 256 });

Export Excel (xlsx): daftar inventaris lengkap.`
      },
      {
        nama: "Mutasi Aset",
        deskripsi: "Perpindahan dan transfer aset antar area/lokasi.",
        prompt: `Buatkan halaman AssetMutationPage (Mutasi Aset) untuk pencatatan perpindahan aset antar area.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY StockMutation ===
{ id, inventory_id, kode_barang, nama_barang,
  tipe: "Masuk"|"Keluar"|"Transfer"|"Penyesuaian"|"Penghapusan",
  jumlah, tanggal, dari_area, ke_area, keterangan, alasan,
  nik_petugas, nama_petugas,
  status_transfer: "Pending"|"Dikirim"|"Diterima"|"Ditolak",
  bukti_dokumen (URL) }

=== FITUR ===
1. Summary: Total mutasi bulan ini | Transfer pending | Transfer masuk menunggu konfirmasi

2. Form mutasi baru: select tipe, pilih barang dari inventaris area,
   input jumlah, select area tujuan (Transfer), keterangan+alasan, upload bukti

3. Tab "Transfer Keluar": { tipe:"Transfer", dari_area: employee.area_tugas }
   Status tracker: Pending → Dikirim → Diterima

4. Tab "Transfer Masuk" (konfirmasi): { tipe:"Transfer", ke_area: employee.area_tugas, status_transfer:"Dikirim" }
   Tombol "Konfirmasi Terima": update Inventory area penerima (tambah jumlah_tersedia)
   Tombol "Tolak": status = "Ditolak"

5. Tab "Riwayat": semua mutasi area sendiri, filter tipe/tanggal/barang
   Warna per tipe: Masuk=hijau, Keluar=merah, Transfer=biru`
      },
    ]
  },
  {
    kategori: "Laporan & Analitik",
    warna: "bg-red-50 border-red-200",
    warnaHeader: "bg-red-600",
    items: [
      {
        nama: "Laporan PDF Bulanan",
        deskripsi: "Generate laporan operasional bulanan dalam format PDF.",
        prompt: `Buatkan halaman LaporanBulanan untuk generate laporan operasional PDF bulanan.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + jspdf + lucide-react.

=== ENTITY YANG DI-QUERY ===
Attendance, EPatrol/EPatrolCustom, ChecklistHydrant, ChecklistEmergency,
ChecklistKR, ChecklistToilet, FacilityTicket, DailyChecklist, LaporanHarian, Employee

=== STRUKTUR HALAMAN ===
1. Form pilih laporan:
   - Select area_tugas + bulan + tahun
   - Checkbox multiple: pilih jenis laporan
     ☑ Laporan Absensi ☑ Laporan Patroli ☑ Laporan Checklist ☑ Laporan Tiket ☑ Daily Checklist
   - Input nama pembuat, mengetahui, menyetujui
   - Tombol "Preview Data" → summary cards
   - Tombol "Generate PDF"

2. Preview ringkasan: Cards summary per jenis laporan + Loading skeleton saat fetch

=== TEMPLATE PDF (jsPDF) ===
// Header kop surat
doc.setFontSize(14); doc.setFont('helvetica', 'bold');
doc.text('PT. PUTRA INDONESIA SOLUSI', 105, 20, { align: 'center' });
doc.setFontSize(10); doc.setFont('helvetica', 'normal');
doc.text('Jl. Contoh Alamat No. 1, Jakarta', 105, 27, { align: 'center' });
doc.line(15, 32, 195, 32);
doc.setFontSize(12); doc.setFont('helvetica', 'bold');
doc.text('LAPORAN ABSENSI BULANAN', 105, 40, { align: 'center' });
doc.text(\`Area: \${area} | Periode: \${bulan}/\${tahun}\`, 105, 47, { align: 'center' });

// Tabel manual
let y = 60; const rowH = 8;
doc.setFillColor(71, 85, 105); doc.setTextColor(255);
// Header row: gambar rect + text per kolom
// Data rows: iterate, doc.addPage() jika y > 270

// Footer TTD
const signY = doc.internal.pageSize.height - 40;
doc.text('Dibuat oleh:', 20, signY);
doc.text('Mengetahui:', 90, signY);
doc.text('Menyetujui:', 155, signY);
doc.text(namaPembuat, 20, signY + 20);

// Download
doc.save(\`Laporan_\${area}_\${bulan}_\${tahun}.pdf\`);`
      },
      {
        nama: "Performa & Analytics",
        deskripsi: "Dashboard analitik performa operasional per area.",
        prompt: `Buatkan halaman PerformaDashboard (Performa & Analytics) untuk dashboard analitik operasional.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + recharts + lucide-react.

=== FILTER ===
Select area_tugas + bulan + tahun. Master Admin bisa pilih semua area.

=== 7 KOMPONEN CHART ===

1. KPI Cards (4 kartu): Kehadiran % | Total Patroli | Tiket Open | Karyawan Aktif

2. BarChart "Absensi 7 Hari":
<BarChart data={dailyData}>
  <Bar dataKey="hadir" fill="#22c55e" /><Bar dataKey="sakit" fill="#eab308" /><Bar dataKey="alfa" fill="#ef4444" />
  <XAxis dataKey="tanggal" /><YAxis /><Tooltip /><Legend />
</BarChart>

3. LineChart "Tren Kehadiran 6 Bulan":
<LineChart data={trendData}>
  <Line type="monotone" dataKey="persen" stroke="#3b82f6" strokeWidth={2} />
  <XAxis dataKey="bulan" /><YAxis domain={[0,100]} /><Tooltip formatter={(v) => v + '%'} />
</LineChart>

4. PieChart "Distribusi Status Absensi":
const COLORS = ['#22c55e','#eab308','#f97316','#ef4444','#6366f1'];
<PieChart><Pie data={pieData} dataKey="value" nameKey="name" label outerRadius={80}>
  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
</Pie><Tooltip /></PieChart>

5. BarChart horizontal "Tiket per Kategori":
<BarChart data={ticketData} layout="vertical">
  <Bar dataKey="jumlah" fill="#8b5cf6" />
  <XAxis type="number" /><YAxis dataKey="kategori" type="category" width={80} />
</BarChart>

6. Heatmap Absensi (tabel React):
Baris=karyawan, Kolom=tanggal 1-31, Cell warna per status:
const getColor = (status) => ({ Hadir:'bg-green-400', Sakit:'bg-yellow-400', Alfa:'bg-red-400', Izin:'bg-blue-300' }[status] || 'bg-gray-100');

7. RadialBarChart "KPI Score Area":
Skor = rata-rata (kehadiran + patroli_rate + checklist_rate)

=== LOADING SKELETON ===
import { Skeleton } from "@/components/ui/skeleton";
<Skeleton className="h-40 w-full rounded-xl" />

=== EXPORT CHART ===
import html2canvas from 'html2canvas';
const canvas = await html2canvas(document.getElementById('chart-container'));
const a = document.createElement('a'); a.href = canvas.toDataURL(); a.download = 'chart.png'; a.click();`
      },
      {
        nama: "Dashboard Strategis",
        deskripsi: "Dashboard level manajemen untuk monitoring seluruh area.",
        prompt: `Buatkan halaman AdminStrategicDashboard (Dashboard Strategis) untuk monitoring multi-area.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + recharts + lucide-react.
Halaman ini hanya untuk Master Admin dan manajemen senior. Tampilkan data SEMUA area.

=== FILTER ===
Select periode: Minggu Ini / Bulan Ini / Triwulan / Pilih Bulan

=== STRUKTUR ===

1. HERO KPI: Total Karyawan Seluruh Area | Rata-rata Kehadiran % | Total Tiket Open | Alert Aktif (merah pulse)

2. SCOREBOARD AREA:
   Skor per area (0-100): Kehadiran 40% + Patroli 30% + Checklist 30%
   Tabel: Ranking 🥇🥈🥉 | Area | Skor | Kehadiran | Patroli | Tiket | Trend ↑↓

3. RADAR CHART (maks 5 area):
   import { RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';
   data: [{ subject:"Kehadiran","Area A":92,"Area B":85 }, { subject:"Patroli",...}, ...]

4. TIMELINE KEJADIAN PENTING (gabung PanicAlert + FacilityTicket Critical, terbaru 10):
   icon | waktu | area | deskripsi | badge status

5. BarChart grouped "Bulan Ini vs Bulan Lalu" per area

6. AREA PERLU PERHATIAN: skor < 70, banner kuning per area + masalah utama

7. TOP PERFORMER: karyawan absensi sempurna, patroli terbanyak, nilai kinerja tertinggi

8. Export PDF Laporan Eksekutif (jsPDF): ringkasan 1 halaman + scoreboard + TTD manajemen`
      },
      {
        nama: "Analitik Patroli",
        deskripsi: "Analisis mendalam data patroli per checkpoint dan petugas.",
        prompt: `Buatkan halaman EPatrolAnalytics (Analitik Patroli) untuk analisis mendalam data E-Patroli.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + recharts + lucide-react.

=== DATA ===
EPatrol + EPatrolCustom (gabung), AreaProject (daftar checkpoint), Employee

=== FILTER ===
area_tugas, date range, shift (Pagi/Siang/Malam, kalkulasi dari waktu), checkpoint

=== KOMPONEN ===

1. KPI Cards: Total Scan Bulan Ini | Rata-rata per Hari | Kondisi Bahaya | Petugas Teraktif

2. BarChart "Patroli per Hari" + ReferenceLine rata-rata:
<BarChart data={dailyData}>
  <Bar dataKey="count" fill="#3b82f6" />
  <ReferenceLine y={avgCount} stroke="#ef4444" strokeDasharray="3 3" label="Rata-rata" />
</BarChart>

3. BarChart "Patroli per Shift":
data: [{ shift:"Pagi",count:45 },{ shift:"Siang",count:38 },{ shift:"Malam",count:52 }]
Shift dari waktu: Pagi=06:00-14:00, Siang=14:00-22:00, Malam=22:00-06:00

4. HEATMAP CHECKPOINT (tabel React):
Baris=checkpoint, Kolom=7/31 hari. Cell=jumlah scan. Gradient warna:
const getHeat = (n) => n===0?'bg-gray-100':n<=2?'bg-green-200':n<=4?'bg-green-400':'bg-green-600 text-white';

5. Tabel Checkpoint Jarang: sort asc total scan. Kolom: nama|total scan|terakhir scan|gap terlama
   Highlight merah jika belum scan > 24 jam.

6. Tabel Top Petugas: sort desc total scan. Nama|Jabatan|Total Scan|Area|Avg/Hari

7. PieChart "Distribusi Kondisi":
data: [{ name:"Aman",value:320 },{ name:"Perlu Perhatian",value:25 },{ name:"Bahaya",value:5 }]
Warna: Aman=hijau, Perlu Perhatian=kuning, Bahaya=merah

8. DETEKSI ANOMALI: checkpoint tidak scan > 8 jam atau kondisi Bahaya 7 hari terakhir
   Format: "⚠️ {nama}: belum discan {X} jam"

9. Export laporan analitik (Excel/PDF)`
      },
      {
        nama: "Validasi Timesheet",
        deskripsi: "Validasi timesheet absensi karyawan oleh supervisor.",
        prompt: `Buatkan halaman TimesheetValidation (Validasi Timesheet) untuk validasi absensi.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + xlsx + lucide-react.

=== ENTITY Attendance ===
{ id, nik_karyawan, nama_karyawan, area_tugas, jabatan, regu,
  tanggal, jam_hadir, jam_pulang, status, foto_hadir, foto_pulang,
  shift_id, jam_shift_mulai, jam_shift_selesai, catatan }

=== STATUS VALIDASI ===
Bandingkan jam_hadir vs jam_shift_mulai:
- Tepat Waktu: terlambat ≤ 15 menit
- Terlambat: > 15 menit
- Pulang Cepat: pulang lebih awal > 15 menit
- Tidak Lengkap: tidak ada jam_pulang

const hitungMenit = (jam1, jam2) => {
  const [h1,m1] = jam1.split(':').map(Number);
  const [h2,m2] = jam2.split(':').map(Number);
  return (h1*60+m1) - (h2*60+m2); // positif = terlambat
};

=== FITUR ===
1. Filter: area/regu, date range, status validasi. Search nama.
2. Summary: Total | Tepat Waktu | Terlambat | Pulang Cepat | Tidak Lengkap
3. Tabel: Nama | Tgl | Shift | Jam Masuk | Jam Keluar | Terlambat(menit) | Status | Foto | Aksi
   Warna baris: terlambat>30=bg-red-50, 15-30=bg-yellow-50
4. Form Koreksi (dialog): ubah jam_hadir/jam_pulang/status + input alasan
5. Rekap per karyawan (modal): klik nama → semua absensi periode, statistik, grafik mini
6. Export Excel:
import * as XLSX from 'xlsx';
const ws = XLSX.utils.json_to_sheet(data.map(d => ({ NIK: d.nik_karyawan, Nama: d.nama_karyawan,
  Tanggal: d.tanggal, JamMasuk: d.jam_hadir, JamKeluar: d.jam_pulang,
  Terlambat: d.terlambat_menit, Status: d.status_validasi })));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Timesheet');
XLSX.writeFile(wb, \`timesheet_\${area}_\${bulan}.xlsx\`);`
      },
      {
        nama: "Dashboard Absensi",
        deskripsi: "Dashboard khusus monitoring absensi per area dan karyawan.",
        prompt: `Buatkan halaman AttendanceDashboard (Dashboard Absensi) untuk monitoring kehadiran mendalam.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + recharts + lucide-react.

=== DATA ===
Attendance (bulan terpilih), Employee (karyawan aktif area), ShiftSchedule (target hari kerja)

=== FILTER ===
area_tugas, bulan, tahun, regu

=== KOMPONEN ===

1. HERO - Hari Ini:
   Progress bar besar: {hadir}/{total_karyawan} ({persen}%)
   Grid nama karyawan belum absen (highlight merah)

2. BarChart "Rekap Bulanan" per karyawan (grouped):
   X: nama karyawan. Bars: Hadir|Sakit|Izin|Cuti|Alfa per orang
   <BarChart data={karyawanData}>
     <Bar dataKey="hadir" fill="#22c55e" /><Bar dataKey="sakit" fill="#eab308" />
     <Bar dataKey="alfa" fill="#ef4444" />
   </BarChart>

3. LineChart "Tren Harian" bulan ini:
   X: tanggal 1-31. Y: jumlah hadir. + ReferenceLine rata-rata.

4. HEATMAP ABSENSI (tabel React):
   Baris=karyawan, Kolom=1-31. Warna cell:
   Hadir=hijau, Sakit=kuning, Izin=biru, Cuti=ungu, Alfa=merah, –=putih
   Klik cell → tooltip: nama, tanggal, status, jam masuk/pulang

5. RANKING: Top 5 kehadiran tertinggi. Bottom 5 perlu perhatian (alfa terbanyak).

6. Alert alfa berturut-turut: cek karyawan alfa ≥ 3 hari berturut-turut → banner peringatan

7. PieChart "Proporsi Status": Hadir|Sakit|Izin|Cuti|Alfa + persentase

8. Export Excel rekap bulanan`
      },
    ]
  },
  {
    kategori: "Administrasi & Pengaturan",
    warna: "bg-gray-50 border-gray-200",
    warnaHeader: "bg-gray-700",
    items: [
      {
        nama: "Area / Proyek",
        deskripsi: "Konfigurasi area kerja, modul aktif, dan jabatan tersedia.",
        prompt: `Buatkan halaman AreaProjects (Area / Proyek) untuk konfigurasi area kerja klien.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + qrcode + lucide-react.

=== ENTITY AreaProject ===
{ id, nama_area, alamat, pic_client, status: "Aktif"|"Non-Aktif",
  modules: string[] (modul aktif di area ini),
  jabatan_tersedia: string[] (jabatan yang ada di area),
  menu_per_jabatan: object { [jabatan]: string[] } (menu per jabatan),
  e_patrol_checkpoints: [{ id, nama, qr_code (string unik) }],
  input_absensi_link, link_absensi, link_pelamar }

=== FITUR ===
1. Grid kartu area: nama, alamat, PIC, status badge, jumlah karyawan.
   Tombol: Edit | Konfigurasi | Non-aktifkan

2. Form Tambah/Edit Area (Tab dialog):
   Tab 1 "Info Dasar": nama, alamat, PIC, status
   
   Tab 2 "Modul Aktif": toggle switch ON/OFF per modul:
   E-Absensi|E-Patroli|E-Facility|Daily Checklist|Laporan Harian|Serah Terima Shift
   Buku Tamu|Paket Tenant|Ticketing|Task Board|Penugasan|Cuti & Izin|Tukar Shift
   Checklist Hydrant|Box Emergency|KR 2/4|Checklist Toilet
   
   Tab 3 "Jabatan & Menu":
   Tag input untuk jabatan (tambah/hapus). Per jabatan: checklist menu yang diizinkan.
   
   Tab 4 "Checkpoint E-Patroli":
   Tabel checkpoint: nama | QR preview | Aksi (hapus)
   Tambah: input nama → generate QR otomatis.
   
   import QRCode from 'qrcode';
   const checkpointId = \`\${areaId}_cp_\${Date.now()}\`;
   const qrDataUrl = await QRCode.toDataURL(checkpointId, { width: 256, margin: 2 });
   // Simpan { id: checkpointId, nama, qr_code: checkpointId } ke e_patrol_checkpoints
   
   Download QR: <a href={qrDataUrl} download={\`qr_\${nama}.png\`}>Download</a>

3. Tampilkan link area: link_absensi + link_pelamar + tombol copy + QR code kecil`
      },
      {
        nama: "Kontrak & Invoice",
        deskripsi: "Manajemen kontrak area dengan client dan tracking invoice.",
        prompt: `Buatkan halaman AreaContractPage (Kontrak & Invoice) untuk manajemen kontrak per area.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY AreaContract ===
{ id, area_tugas, nama_kontrak, nilai_kontrak (Rupiah), bank_in, bank_out,
  nomor_invoice, tanggal_invoice, tanggal_mulai_kontrak, tanggal_selesai_kontrak,
  dokumen_kontrak (URL PDF), status: "Aktif"|"Habis"|"Perpanjang", catatan }

=== ENTITY BankTransaction ===
{ id, area_tugas, tipe: "Bank In (Pemasukan)"|"Bank Out (Pengeluaran)",
  bank, jumlah, tanggal, nomor_referensi, keterangan }

=== FITUR ===

1. Summary finansial:
   - Total nilai kontrak aktif (format Rupiah)
   - Total Bank In bulan ini (hijau) | Bank Out bulan ini (merah)
   - Kontrak akan habis ≤ 30 hari (kuning)

2. Alert: banner kuning daftar kontrak akan habis
   const plus30 = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
   const akanHabis = contracts.filter(c => c.status==='Aktif' && c.tanggal_selesai_kontrak<=plus30);

3. Tab "Kontrak": filter status/area/periode.
   Tabel: Area|Nama Kontrak|Nilai|Tgl Mulai|Tgl Selesai|Status|Aksi
   Badge: Aktif=hijau, Habis=merah, Perpanjang=biru.
   Form Tambah/Edit + Upload dokumen_kontrak (PDF).

4. Tab "Transaksi Bank": filter area/bulan/tipe.
   Tabel + total In|Out|Saldo. Form tambah transaksi.

5. Format Rupiah:
   const fmt = (n) => new Intl.NumberFormat('id-ID', { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(n);`
      },
      {
        nama: "Pengaturan App",
        deskripsi: "Konfigurasi global aplikasi termasuk notifikasi dan tampilan.",
        prompt: `Buatkan halaman AppSettings (Pengaturan Aplikasi) untuk konfigurasi sistem oleh Master Admin.
Stack: React 18 + Tailwind CSS + shadcn/ui + lucide-react.
Guard: hanya Master Admin yang bisa akses. Validasi di awal render.

=== SIMPAN KE ===
localStorage key "pis_app_settings" sebagai JSON object.
const settings = JSON.parse(localStorage.getItem('pis_app_settings') || '{}');
localStorage.setItem('pis_app_settings', JSON.stringify(newSettings));

=== TAB 1 "Umum" ===
- Input: nama aplikasi, alamat perusahaan, email kontak, kota utama
- Upload: logo aplikasi (preview + simpan URL via UploadFile)
- Select: timezone (default Asia/Jakarta)
- Toggle: mode maintenance

=== TAB 2 "Notifikasi" ===
Toggle switch per jenis (simpan sebagai object boolean):
notif_shift_baru | notif_tukar_shift | notif_panic | notif_laporan_harian
notif_tiket_critical | notif_pkwt_habis | notif_kontrak_habis | notif_absensi

=== TAB 3 "Keamanan" ===
- Input: panjang password minimum (default 6)
- Input: masa berlaku password hari (0=tidak expire)
- Input: max percobaan login gagal (default 5)
- Toggle: paksa ganti password setelah reset
- Input: session timeout menit (default 480)
- Tombol "Reset Semua Password" (konfirmasi input teks "RESET" sebelum eksekusi)

=== TAB 4 "Data & Backup" ===
- Input: retention Attendance (bulan, default 12)
- Input: retention EPatrol (bulan, default 6)
- Input: retention Checklist (bulan, default 3)
- Toggle: auto-archive data lama tiap bulan
- Tombol "Archive Sekarang":
  import { base44 } from '@/api/cloudflareClient';
  const result = await base44.functions.invoke('archiveOldData', { months: retentionMonths });
- Info: tanggal archive terakhir + jumlah record

Setiap tab punya tombol "Simpan" sendiri.`
      },
      {
        nama: "Archive Data",
        deskripsi: "Arsip data lama dan restore data yang sudah diarsipkan.",
        prompt: `Buatkan halaman DataArchive (Archive Data) untuk manajemen arsip data lama.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + lucide-react.

=== ENTITY Archive ===
{ id, entity_name (nama tabel: "Attendance","EPatrol","DailyChecklist",dll),
  original_id, data: object (JSON data original),
  archive_date (YYYY-MM-DD), original_created_date (YYYY-MM-DD), notes }

=== BACKEND FUNCTIONS (sudah tersedia) ===
import { base44 } from '@/api/cloudflareClient';
// Archive data lama
await base44.functions.invoke('archiveOldData', { entity_name: 'Attendance', months_threshold: 6 });
// Restore dari archive
await base44.functions.invoke('restoreArchivedData', { archive_id: archiveRecord.id });

=== FITUR ===
1. Dashboard: group Archive by entity_name → card per entity (nama | jumlah | tgl terbaru). Total keseluruhan.

2. Trigger Archive Manual:
   - Select entity + input threshold bulan
   - Preview estimasi jumlah yang akan diarsip
   - Loading indicator saat proses. Tampilkan hasil: "Berhasil arsipkan {count} records"

3. Daftar Arsip:
   - Filter: entity_name, tanggal archive range, tanggal asli range. Search.
   - Tabel: ID | Entity | ID Asli | Tgl Dibuat | Tgl Archive | Aksi
   - Paginasi 50 record per halaman

4. Detail Arsip (dialog):
   Tampilkan field penting berdasarkan entity_name (Attendance: nik+tanggal+status, dll)
   Raw JSON: <pre className="text-xs overflow-auto max-h-60">{JSON.stringify(archive.data, null, 2)}</pre>

5. Restore Data:
   - Tombol "Restore" per record → konfirmasi dialog
   - Invoke restoreArchivedData → toast sukses "Data berhasil di-restore ke {entity_name}"
   - Refresh list setelah restore

6. Statistik: LineChart arsip per bulan, BarChart per entity type`
      },
      {
        nama: "Migrasi Server",
        deskripsi: "Tools migrasi data antar database untuk administrator.",
        prompt: `Buatkan halaman MigrasiServer untuk tools admin migrasi dan maintenance data.
Stack: React 18 + Tailwind CSS + TanStack Query v5 + shadcn/ui + xlsx + lucide-react.
Guard: hanya Master Admin. if (employee?.role !== 'Master Admin') return <div>Akses Ditolak</div>;

=== TAB "Export Data" ===
- Checkbox list entity: Attendance|EPatrol|Employee|Inventory|ShiftSchedule|LeaveRequest|FacilityTicket|...
- Select filter: semua/area/bulan
- Tombol "Export JSON":
  const data = await base44.entities[entityName].list();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=\`\${entityName}_\${Date.now()}.json\`; a.click();
- Tombol "Export Excel" (xlsx)

=== TAB "Import Data" ===
- Select entity tujuan. Upload file JSON atau Excel.
- Preview 5 baris pertama. Validasi field required.
- Tombol "Mulai Import" → bulk create ke entity.
- Progress bar (fake progress atau count berhasil/gagal per batch).
- Hasil: "Berhasil {success}, Gagal {failed}"

=== TAB "Bulk Operations" ===
A. Bulk Update Status Karyawan: upload Excel (NIK + status_baru) → preview → eksekusi
B. Reset Password Massal: select area → preview daftar → konfirmasi ketik "RESET" → update semua password="123456"
C. Hapus Data Duplikat: pilih entity + field cek duplikat → scan → pilih yang dihapus → eksekusi delete

=== TAB "System Info" ===
- Jumlah record per entity (fetch .list() + count)
- Tabel: Entity | Jumlah Record | Estimasi (record × 1KB)
- Tombol refresh`
      },
    ]
  },
];