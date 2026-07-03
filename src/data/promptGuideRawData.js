export const RAW_DATA_PROMPTS = {
  kategori: "📦 Data Lengkap & Rumus Mentah (Rebuild Localhost)",
  warna: "bg-indigo-50 border-indigo-300",
  warnaHeader: "bg-indigo-700",
  items: [
    {
      nama: "Arsitektur Sistem & Setup Awal",
      deskripsi: "Stack, struktur folder, sistem auth custom localStorage, pola fetch data, dan cara setup project dari nol.",
      prompt: `=== ARSITEKTUR SISTEM MANAJEMEN SECURITY & FACILITY ===

Stack: React 18 + Vite + Tailwind CSS + shadcn/ui + TanStack Query v5 + React Router v6
Backend: Base44 BaaS (entities, backend functions, integrations)

=== STRUKTUR FOLDER ===
src/
  pages/          → halaman utama (1 file per halaman)
  components/     → komponen reusable (folder per kategori)
  entities/       → JSON schema entity Base44
  functions/      → backend functions (Deno/Edge)
  hooks/          → custom React hooks
  lib/            → utilities (auth, query-client, utils)
  api/            → base44Client.js (SDK pre-initialized)
  data/           → data statis

=== SISTEM AUTH CUSTOM (bukan Base44 platform auth) ===
// Karyawan login via backend function, data sesi di localStorage:
const STORAGE_KEY = 'pis_employee';

// Simpan sesi setelah login:
localStorage.setItem(STORAGE_KEY, JSON.stringify({
  id, nik_karyawan, nama_lengkap, jabatan, role,
  area_tugas, regu, foto, branch, entity_pt, status_aktif,
}));

// Ambil sesi di setiap halaman:
const employee = JSON.parse(localStorage.getItem('pis_employee'));
if (!employee) { window.location.href = '/EmployeeLogin'; return; }

// Logout:
localStorage.removeItem('pis_employee');
window.location.href = '/EmployeeLogin';

=== ROLE HIERARCHY ===
Master Admin            → akses semua area + semua menu
Chief Security / Supervisor Facility / Admin Pos / Admin Security /
Admin Facility / SPV Security / Admin Pos Security / Supervisor Security
                        → manajemen (area sendiri)
Leader Security / Leader Facility
                        → leader (menu terbatas)
Staff / PIC Client      → karyawan biasa (data diri sendiri)

=== CEK ROLE DI KOMPONEN ===
const isMasterAdmin = employee?.role === 'Master Admin';
const MANAGEMENT_ROLES = ['Chief Security','Supervisor Facility','Admin Pos',
  'Admin Security','Admin Facility','SPV Security','Admin Pos Security','Supervisor Security'];
const LEADER_ROLES = ['Leader Security','Leader Facility'];
const isManagement = MANAGEMENT_ROLES.includes(employee?.role);
const isLeader = LEADER_ROLES.includes(employee?.role);
const isPrivileged = isMasterAdmin || isManagement || isLeader;

=== FETCH DATA BASE44 ===
import { base44 } from '@/api/cloudflareClient';

// List semua
const employees = await base44.entities.Employee.list();

// Filter dengan kondisi
const attendance = await base44.entities.Attendance.filter({
  tanggal: '2024-01-15', area_tugas: 'Menara Sentraya'
});

// Filter + sort + limit
const latest = await base44.entities.Attendance.filter(
  { nik_karyawan: '001' }, '-tanggal', 30
);

// Create
await base44.entities.Attendance.create({
  nik_karyawan: '001', tanggal: '2024-01-15', status: 'Hadir'
});

// Update
await base44.entities.Employee.update(employeeId, { status_aktif: 'Non-Aktif' });

// Delete
await base44.entities.Attendance.delete(attendanceId);

// Invoke backend function
const result = await base44.functions.invoke('employeeLogin', { nik: '001', password: '123456' });
// result.data = { success: true, employee: {...} }

=== POLA USEQUERY (TanStack Query v5) ===
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const { data: employees = [], isLoading } = useQuery({
  queryKey: ['employees', area_tugas],
  queryFn: () => base44.entities.Employee.filter({ area_tugas, status_aktif: 'Aktif' }),
  staleTime: 30_000,
});

const queryClient = useQueryClient();
const { mutate: updateEmployee } = useMutation({
  mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
});

=== UPLOAD FILE ===
const handleFileChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  // simpan file_url ke entity
};

=== FORMAT UTILITAS ===
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
const now = new Date().toTimeString().slice(0, 5);     // HH:MM
const fmt = (d) => new Date(d).toLocaleDateString('id-ID',
  { day:'2-digit', month:'short', year:'numeric' });
const fmtRupiah = (n) => new Intl.NumberFormat('id-ID',
  { style:'currency', currency:'IDR', minimumFractionDigits:0 }).format(n);`
    },
    {
      nama: "Schema Entity — Employee & HR",
      deskripsi: "Schema lengkap: Employee, NikCounter, LeaveQuota, Payslip, PKWTContract, Applicant.",
      prompt: `=== ENTITY SCHEMAS: HR & KEPEGAWAIAN ===

--- Employee (required: nik_karyawan, nama_lengkap) ---
{
  nik_karyawan: string,   // format: PU/PR + MM + YY + 3digit
  nama_lengkap: string,
  jabatan: string,
  role: enum ['Master Admin','Chief Security','Supervisor Facility','Admin Pos',
              'Admin Security','Admin Facility','SPV Security','Admin Pos Security',
              'Supervisor Security','Leader Security','Leader Facility','Staff','PIC Client'],
  area_tugas: string,
  regu: enum ['Regu A','Regu B','Regu C','Regu D','Non Regu'],
  branch: string,
  entity_pt: enum ['PT. PUTRA INDONESIA SOLUSI','PT. PRESTASI INDONESIA SOLUSI'],
  status_aktif: enum ['Aktif','Non-Aktif'],
  password: string,       // default '123456'
  email, no_telepon, foto: string (URL), alamat,
  tanggal_lahir: date, tempat_lahir, tanggal_bergabung: date, tanggal_mutasi: date,
  jenis_kelamin: enum ['Laki-laki','Perempuan'],
  pendidikan_terakhir, tinggi_badan: number, berat_badan: number,
  ukuran_baju, ukuran_sepatu, bank, no_rekening,
  nik_ektp: string (16 digit), no_kk, no_npwp, sim_type,
  applicant_id: string, catatan,
  // Auto built-in: id, created_date, updated_date, created_by_id
}

--- NikCounter (required: prefix) ---
{ prefix: string ('PU'|'PR'), last_number: number }

Generate NIK otomatis:
const counters = await base44.entities.NikCounter.filter({ prefix });
const nextNum = (counters[0]?.last_number || 0) + 1;
const bulan = String(new Date().getMonth() + 1).padStart(2, '0');
const tahun = String(new Date().getFullYear()).slice(-2);
const nik = prefix + bulan + tahun + String(nextNum).padStart(3, '0');
await base44.entities.NikCounter.update(counters[0].id, { last_number: nextNum });

--- LeaveQuota (required: nik_karyawan) ---
{ nik_karyawan, tahun: number, kuota_tahunan: number (default 12),
  terpakai: number, sisa: number (kuota - terpakai) }

--- Payslip (required: nik_karyawan, bulan, tahun) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas, bulan (1-12), tahun (YYYY),
  gaji_pokok: number, tunjangan_transport: number, tunjangan_makan: number,
  tunjangan_jabatan: number, lembur_jam: number, tarif_lembur: number, total_lembur: number,
  potongan_bpjs_kes: number,  // otomatis 1% gaji pokok
  potongan_bpjs_tk: number,   // otomatis 2% gaji pokok
  potongan_pph21: number, potongan_lain: number,
  total_pendapatan: number, total_potongan: number, total_gaji: number,
  tanggal_bayar: date, status: enum ['Draft','Terbit'], catatan }

--- PKWTContract (required: nik_karyawan, nama_karyawan) ---
{ nomor_pkwt, nik_karyawan, nama_karyawan, nik_ektp,
  tempat_lahir, tanggal_lahir, alamat_karyawan, jabatan, area_tugas,
  entity_pt: enum ['PT. PUTRA INDONESIA SOLUSI','PT. PRESTASI INDONESIA SOLUSI'],
  alamat_perusahaan, nama_direktur, jabatan_direktur,
  kota_tanda_tangan, hari_tanda_tangan, tanggal_tanda_tangan,
  tanggal_mulai: date, tanggal_selesai: date, durasi_bulan: number, durasi_terbilang,
  gaji_pokok: string, gaji_pokok_terbilang, tanggal_gajian, bank_karyawan, no_rekening,
  pasal_9_ayat: [{nomor: number, isi: string}],
  status: enum ['Draft','Menunggu Approval','Aktif','Selesai','Dibatalkan'],
  approval_status: enum ['Menunggu Approval','Disetujui','Ditolak'],
  approved_by, approved_at, catatan_approval, dokumen_pkwt: string (URL), catatan }

--- Applicant (required: nama_lengkap, nik_ektp, no_telepon) ---
{ area_client, nama_lengkap, nik_ektp (16 digit), no_telepon,
  jenis_kelamin: enum ['Laki-laki','Perempuan'],
  foto_ektp, foto_skck, no_kk, foto_kk, no_npwp, foto_npwp,
  sim_type: enum ['SIM A','SIM B1','SIM B2','SIM C','Tidak Ada'],
  foto_sim, foto_cv, foto_surat_sehat, foto_kta,
  tempat_lahir, tanggal_lahir: date, alamat_ektp, alamat, rt, rw,
  kelurahan, kecamatan, kabupaten_kota, provinsi, usia: number,
  foto_setengah_badan, email, posisi_diinginkan, branch,
  tinggi_badan: number, berat_badan: number, ukuran_baju, ukuran_sepatu,
  pendidikan_sd, pendidikan_smp, pendidikan_sma, ijazah_terakhir,
  pendidikan_d3, pendidikan_s1, pendidikan_s2,
  nama_ibu_kandung, no_telp_ibu, alamat_ibu,
  status: enum ['Pending','Approved','Rejected'],
  nik_karyawan (diisi saat Approved),
  entity_pt: enum ['PT. PUTRA INDONESIA SOLUSI','PT. PRESTASI INDONESIA SOLUSI'],
  link_code: string }`
    },
    {
      nama: "Schema Entity — Operasional Harian",
      deskripsi: "Schema: Attendance, ShiftSchedule, EPatrol, DailyChecklist, Assignment, LaporanHarian, ShiftHandover.",
      prompt: `=== ENTITY SCHEMAS: OPERASIONAL HARIAN ===

--- Attendance (required: nik_karyawan, tanggal, status) ---
{ nik_karyawan, nama_karyawan, area_tugas, jabatan, regu,
  tanggal: date (YYYY-MM-DD), jam_hadir: string (HH:MM), jam_pulang: string,
  status: enum ['Hadir','Backup','Sakit','Izin','Cuti','Alfa'],
  foto_hadir: string (URL), foto_pulang: string (URL),
  shift_id, tipe_shift, jam_shift_mulai, jam_shift_selesai, catatan }

--- ShiftSchedule (required: area_tugas, tanggal) ---
{ area_tugas, regu: enum ['Regu A','Regu B','Regu C','Regu D','Non Regu'],
  tanggal: date, jam_mulai: string (HH:MM), jam_selesai: string,
  tipe_shift: enum ['6-2','6-1','4-2','Custom'],
  karyawan_ids: string[] (array NIK karyawan dalam shift), catatan }

Pola Rotasi 6-2:
const SIKLUS = ['P','P','S','S','M','M','L','L'];
const JAM = { P: {mulai:'07:00',selesai:'15:00'}, S: {mulai:'15:00',selesai:'23:00'}, M: {mulai:'23:00',selesai:'07:00'} };
// L = Libur (tidak ada record shift)

--- ShiftSwap (required: nik_pemohon, nik_penerima, area_tugas, shift_tanggal, alasan) ---
{ nik_pemohon, nama_pemohon, nik_penerima, nama_penerima, area_tugas,
  shift_tanggal: date, shift_id_pemohon, shift_id_penerima, alasan,
  status: enum ['Pending','Disetujui Atasan','Ditolak','Selesai'],
  nik_atasan, nama_atasan, tanggal_approval: date, catatan_atasan, tanggal_pengajuan: date }

--- ShiftHandover ---
{ tanggal: date, shift_dari: enum ['Pagi','Siang','Malam'], shift_ke: enum,
  area_tugas, nik_penyerah, nama_penyerah, jabatan_penyerah,
  nik_penerima, nama_penerima, jabatan_penerima,
  kondisi_umum: enum ['Kondusif','Ada Masalah','Darurat'],
  catatan_penyerah, catatan_penerima,
  inventaris_diserahkan: [{nama_item, kondisi, jumlah, catatan}],
  ttd_penyerah: string (base64 PNG), ttd_penerima: string (base64 PNG),
  waktu_serah_terima, status: enum ['Draft','Menunggu TTD Penerima','Selesai'] }

--- EPatrol (required: nik_karyawan, tanggal, area_tugas) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal: date, waktu: string (HH:MM:SS),
  checkpoint, kondisi: enum ['Aman','Perlu Perhatian','Bahaya'],
  foto: string (URL), catatan }

--- EPatrolCustom (required: template_id, nik_karyawan, tanggal, area_tugas) ---
{ template_id, template_nama, nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal: date, waktu, checkpoint, kondisi,
  foto_entries: [{label, foto_url, keterangan}], catatan }

--- EPatrolTemplate (required: nama_template, jumlah_foto) ---
{ nama_template, jumlah_foto: number,
  foto_configs: [{label: string, riwayat_keterangan: string[]}],
  area_tugas (kosong = semua area), status: enum ['Aktif','Non-Aktif'] }

--- DailyChecklist (required: nik_karyawan, tanggal, shift, area_tugas) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal: date, shift: enum ['Pagi','Siang','Malam'], penerima_serah_terima,
  serah_terima: { seragam_lengkap, id_card, ht_berfungsi, senter_berfungsi,
    buku_mutasi_tersedia, absensi_terisi, serah_terima_dilakukan,
    keterangan — semua enum ['Ya','Tidak','-'] },
  patroli_area: { kunci_pintu_aman, jendela_aman, lampu_area_berfungsi,
    apar_kondisi_baik, potensi_bahaya_ditemukan, cctv_berfungsi, area_steril, keterangan },
  akses_keluar_masuk: { tamu_diperiksa, buku_tamu_terisi, karyawan_diverifikasi,
    kendaraan_diperiksa, barang_masuk_dicatat, barang_keluar_dicatat, keterangan },
  ketertiban_parkir: { lalulintas_diatur, parkir_tertib, area_sterilisasi_aman,
    tidak_ada_parkir_liar, akses_darurat_bebas, keterangan },
  laporan_akhir: { buku_mutasi_terisi, kejadian_dilaporkan,
    serah_terima_berikutnya, ringkasan_kejadian, keterangan },
  nilai_supervisor: number (1-100), catatan_supervisor,
  status_evaluasi: enum ['Menunggu Evaluasi','Sudah Dievaluasi'],
  tanda_tangan_supervisor: string }

--- LaporanHarian (required: nik_karyawan, tanggal, judul_laporan) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal: date, shift: enum ['Pagi','Siang','Malam'],
  judul_laporan, isi_laporan: string (HTML dari react-quill),
  foto_bukti: string[] (array URL foto),
  kategori: enum ['Normal','Kejadian Penting','Darurat'],
  sudah_dibaca: boolean, dibaca_oleh, tanggal_baca }

--- Assignment (required: judul, nik_petugas, deadline) ---
{ judul, deskripsi, nik_petugas, nama_petugas, area_tugas,
  nik_pemberi, nama_pemberi, jabatan_pemberi, deadline: date,
  prioritas: enum ['Rendah','Sedang','Tinggi','Mendesak'],
  status: enum ['Belum Dimulai','Sedang Dikerjakan','Selesai','Dibatalkan'],
  catatan_penyelesaian, waktu_selesai, foto_bukti: string (URL) }

--- TaskBoard (required: judul, area_tugas) ---
{ judul, deskripsi, area_tugas, nik_assignee, nama_assignee,
  status: enum ['Backlog','To Do','In Progress','Done','Blocked'],
  prioritas: enum ['Low','Medium','High','Critical'],
  label: string[], deadline: date, nik_creator, nama_creator }

--- LeaveRequest (required: nik_karyawan, jenis_cuti, tanggal_mulai, tanggal_selesai) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas,
  jenis_cuti: enum ['Cuti Tahunan','Cuti Sakit','Cuti Melahirkan','Cuti Darurat','Cuti Lainnya'],
  tanggal_mulai: date, tanggal_selesai: date, jumlah_hari: number,
  alasan, dokumen_pendukung: string (URL),
  status: enum ['Pending Leader','Pending Supervisor','Disetujui','Ditolak'],
  catatan_leader, nik_approver_leader, nama_approver_leader, tanggal_approval_leader,
  catatan_supervisor, nik_approver_supervisor, nama_approver_supervisor, tanggal_approval_supervisor }

--- PerformanceReview (required: nik_karyawan) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas,
  periode_bulan: number (1-12), periode_tahun: number,
  nilai_kedisiplinan, nilai_kerapian, nilai_kerjasama, nilai_inisiatif, nilai_kepatuhan: number (1-100 each),
  nilai_total: number, predikat: enum ['Sangat Baik','Baik','Cukup','Kurang'],
  catatan_supervisor, nik_supervisor, nama_supervisor, tanggal_review: date }
Predikat: ≥85=Sangat Baik, ≥70=Baik, ≥55=Cukup, <55=Kurang`
    },
    {
      nama: "Schema Entity — Checklist, Inventaris & Admin",
      deskripsi: "Schema: Hydrant, Emergency, KR, Toilet, GuestBook, TenantPackage, FacilityTicket, Inventory, AreaProject, Archive.",
      prompt: `=== ENTITY SCHEMAS: CHECKLIST & INVENTARIS ===

--- ChecklistHydrant (required: nik_karyawan, tanggal, area_tugas) ---
{ nik_karyawan, nama_karyawan, area_tugas, tanggal: date,
  lokasi_hydrant, kondisi: enum ['Baik','Rusak','Perlu Maintenance'],
  tekanan_bar, tanggal_expired: date, foto: string (URL), catatan,
  tipe: enum ['Hydrant','APAR'] }

--- ChecklistEmergency (required: nik_karyawan, tanggal, area_tugas) ---
{ nik_karyawan, nama_karyawan, area_tugas, tanggal: date,
  lokasi_box, kondisi: enum ['Baik','Rusak','Perlu Maintenance'],
  isi_lengkap: boolean, foto: string (URL), catatan }

--- ChecklistKR (required: nik_karyawan, tanggal, area_tugas) ---
{ nik_karyawan, nama_karyawan, area_tugas, tanggal: date,
  tipe_kendaraan: enum ['KR 2','KR 4'], no_polisi,
  kondisi_ban: enum ['Baik','Perlu Ganti'], kondisi_mesin: enum ['Baik','Perlu Service'],
  kondisi_lampu: enum ['Baik','Rusak'], kondisi_rem: enum ['Baik','Perlu Service'],
  bbm, km_terakhir, foto: string (URL), catatan }

--- ChecklistToilet (required: nik_karyawan, tanggal, area_tugas) ---
{ nik_karyawan, nama_karyawan, area_tugas, tanggal: date, waktu: string (HH:MM),
  lokasi_toilet, kebersihan: enum ['Bersih','Cukup','Kotor'],
  perlengkapan: enum ['Lengkap','Kurang','Habis'], foto: string (URL), catatan }

--- EFacility (required: nik_karyawan, tanggal, area_tugas, nama_fasilitas) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas, tanggal: date, waktu: string (HH:MM),
  nama_fasilitas, lokasi_fasilitas, lantai_gedung,
  kondisi: enum ['Baik','Perlu Perbaikan','Rusak Berat'],
  foto_kondisi: string (URL), catatan, perlu_tindakan: boolean,
  status_tindak_lanjut: enum ['Belum Ditangani','Dalam Proses','Selesai'],
  nik_petugas_tindak_lanjut, tanggal_selesai_tindak_lanjut }

--- FacilityTicket (required: judul) ---
{ judul, deskripsi, area_tugas, lokasi_spesifik,
  kategori: enum ['Listrik','Plumbing','HVAC','Keamanan','Kebersihan','Lainnya'],
  prioritas: enum ['Low','Medium','High','Critical'],
  status: enum ['Open','In Progress','Resolved','Closed'],
  foto_laporan: string[] (array URL, maks 3),
  nik_pelapor, nama_pelapor, tanggal_lapor: date,
  nik_teknisi, nama_teknisi, catatan_teknisi, foto_selesai: string (URL),
  tanggal_mulai_kerja: date, tanggal_selesai: date,
  rating_kepuasan: number (1-5), komentar_rating }

--- GuestBook (required: nama_tamu, keperluan, tanggal) ---
{ area_tugas, tanggal: date, waktu_masuk: string (HH:MM), waktu_keluar,
  nama_tamu, instansi_perusahaan, keperluan, nama_yang_ditemui, unit_yang_dikunjungi,
  no_ktp, no_kendaraan, foto_tamu: string (URL), badge_nomor,
  status: enum ['Di Dalam','Sudah Keluar'],
  nik_petugas, nama_petugas_check_in, nama_petugas_check_out }

--- TenantPackage (required: nama_penerima, unit_tenant, tanggal_terima) ---
{ area_tugas, tanggal_terima: date, waktu_terima: string (HH:MM),
  nama_pengirim, nama_penerima, unit_tenant, no_telp_penerima,
  jenis_paket: enum ['Dokumen','Paket Kecil','Paket Besar','Makanan','Elektronik','Lainnya'],
  ekspedisi, no_resi, foto_paket: string (URL),
  status: enum ['Menunggu Diambil','Sudah Diambil','Dikembalikan'],
  tanggal_ambil: date, waktu_ambil, nama_pengambil, no_ktp_pengambil,
  nik_petugas_terima, nama_petugas_terima, catatan }

--- PanicAlert (required: nik_karyawan, tanggal, area_tugas) ---
{ nik_karyawan, nama_karyawan, jabatan, area_tugas,
  tanggal: date, waktu: string (HH:MM:SS), lokasi, keterangan,
  status: enum ['Aktif','Ditangani','Selesai'],
  latitude: number, longitude: number, foto_bukti: string (URL),
  nik_responder, nama_responder, catatan_penanganan, waktu_respons, waktu_selesai }

--- Inventory (required: nama_barang) ---
{ kode_barang: string (auto: INV-001), nama_barang, kategori, merk, model, area_tugas,
  jumlah_total: number, jumlah_tersedia: number, jumlah_dipinjam: number, satuan,
  kondisi: enum ['Baik','Cukup','Rusak'], foto: string (URL), lokasi_penyimpanan,
  tanggal_beli: date, nilai_barang: number, nomor_serial, stok_minimum: number, keterangan }

--- LoanRecord (required: inventory_id, nik_peminjam, tanggal_pinjam, jumlah_dipinjam) ---
{ inventory_id, kode_barang, nama_barang, area_tugas,
  nik_peminjam, nama_peminjam, jabatan_peminjam,
  tanggal_pinjam: date, tanggal_kembali_rencana: date, tanggal_kembali_aktual: date,
  jumlah_dipinjam: number, kondisi_saat_pinjam, kondisi_saat_kembali,
  status: enum ['Dipinjam','Kembali','Terlambat','Hilang'],
  catatan, foto_bukti_kembali: string (URL) }

--- StockMutation (required: inventory_id, tipe, jumlah, tanggal) ---
{ inventory_id, tipe: enum ['Masuk','Keluar','Transfer','Penyesuaian','Penghapusan'],
  jumlah: number, tanggal: date, dari_area, ke_area, keterangan, alasan,
  nik_petugas, nama_petugas,
  status_transfer: enum ['Pending','Dikirim','Diterima','Ditolak'],
  bukti_dokumen: string (URL) }

--- AreaProject (required: nama_area) ---
{ nama_area, alamat, pic_client, status: enum ['Aktif','Non-Aktif'],
  modules: string[] (modul aktif),
  jabatan_tersedia: string[], menu_per_jabatan: object,
  e_patrol_checkpoints: [{id, nama, qr_code}],
  input_absensi_link, link_absensi, link_pelamar }

--- AreaContract (required: area_tugas, nama_kontrak) ---
{ area_tugas, nama_kontrak, nilai_kontrak: number, bank_in, bank_out,
  nomor_invoice, tanggal_invoice: date,
  tanggal_mulai_kontrak: date, tanggal_selesai_kontrak: date,
  dokumen_kontrak: string (URL PDF),
  status: enum ['Aktif','Habis','Perpanjang'], catatan }

--- Archive (required: entity_name, original_id, data, archive_date) ---
{ entity_name: string, original_id: string, data: object (JSON asli),
  archive_date: date, original_created_date: date, notes }`
    },
    {
      nama: "Backend Functions — Source Code Lengkap",
      deskripsi: "Kode sumber semua backend function: employeeLogin, resetPassword, approveShiftSwap, archiveOldData, getEmployeeByNik.",
      prompt: `=== BACKEND FUNCTIONS (Deno Edge — folder: functions/) ===

Pola dasar semua function (MIGRASI):
// Nota: fungsi legacy Base44 menggunakan 'createClientFromRequest' dari legacy Base44 SDK.
// Setelah migrasi, gunakan handler Cloudflare Worker ('/api/functions') atau
// panggil dari frontend melalui src/api/cloudflareClient.js shim.
// Contoh proxy di worker: POST /api/functions { name, payload }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // ... logika ...
    return Response.json({ success: true, data: ... });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

======================================================
=== functions/employeeLogin.js ===
// Migrated: Use Cloudflare Worker '/api/functions' or src/api/cloudflareClient shim
// (originally: imported via the legacy Base44 SDK in Deno functions)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { nik, password } = await req.json();
    if (!nik || !password)
      return Response.json({ error: 'NIK dan password wajib diisi' }, { status: 400 });

    const employees = await base44.asServiceRole.entities.Employee.filter({ nik_karyawan: nik });
    if (!employees?.length)
      return Response.json({ error: 'NIK tidak ditemukan' }, { status: 404 });

    const emp = employees[0];
    if (emp.password !== password)
      return Response.json({ error: 'Password salah' }, { status: 401 });

    return Response.json({ success: true, employee: {
      id: emp.id, nik_karyawan: emp.nik_karyawan, nama_lengkap: emp.nama_lengkap,
      jabatan: emp.jabatan, role: emp.role, area_tugas: emp.area_tugas,
      regu: emp.regu, branch: emp.branch, entity_pt: emp.entity_pt,
      foto: emp.foto, status_aktif: emp.status_aktif, email: emp.email,
      no_telepon: emp.no_telepon, alamat: emp.alamat, tanggal_lahir: emp.tanggal_lahir,
      bank: emp.bank, no_rekening: emp.no_rekening,
      ukuran_baju: emp.ukuran_baju, ukuran_sepatu: emp.ukuran_sepatu,
    }});
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Invoke dari frontend:
const result = await base44.functions.invoke('employeeLogin', { nik, password });
if (result.data.success) {
  localStorage.setItem('pis_employee', JSON.stringify(result.data.employee));
  window.location.href = isStaff ? '/EmployeeDashboard' : '/Dashboard';
}

======================================================
=== functions/employeeResetPassword.js ===
// Migrated: Use Cloudflare Worker '/api/functions' or src/api/cloudflareClient shim
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { nik, new_password } = await req.json();
    if (!nik || !new_password)
      return Response.json({ error: 'NIK dan password baru wajib diisi' }, { status: 400 });
    const employees = await base44.asServiceRole.entities.Employee.filter({ nik_karyawan: nik });
    if (!employees?.length)
      return Response.json({ error: 'NIK tidak ditemukan' }, { status: 404 });
    await base44.asServiceRole.entities.Employee.update(employees[0].id, { password: new_password });
    return Response.json({ success: true, message: 'Password berhasil diubah' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

======================================================
=== functions/getEmployeeByNik.js ===
// Migrated: Use Cloudflare Worker '/api/functions' or src/api/cloudflareClient shim
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { nik } = await req.json();
    const employees = await base44.asServiceRole.entities.Employee.filter({ nik_karyawan: nik });
    if (!employees?.length)
      return Response.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });
    return Response.json({ success: true, employee: employees[0] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

======================================================
=== functions/approveShiftSwap.js ===
// Migrated: Use Cloudflare Worker '/api/functions' or src/api/cloudflareClient shim
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { swap_id, shift_id_pemohon, shift_id_penerima, nik_pemohon, nik_penerima } = await req.json();
    // Tukar karyawan_ids di ShiftSchedule jika ada
    if (shift_id_pemohon && shift_id_penerima) {
      const [shiftA] = await base44.asServiceRole.entities.ShiftSchedule.filter({ id: shift_id_pemohon });
      const [shiftB] = await base44.asServiceRole.entities.ShiftSchedule.filter({ id: shift_id_penerima });
      if (shiftA && shiftB) {
        const idsA = (shiftA.karyawan_ids || []).filter(n => n !== nik_pemohon).concat(nik_penerima);
        const idsB = (shiftB.karyawan_ids || []).filter(n => n !== nik_penerima).concat(nik_pemohon);
        await base44.asServiceRole.entities.ShiftSchedule.update(shiftA.id, { karyawan_ids: idsA });
        await base44.asServiceRole.entities.ShiftSchedule.update(shiftB.id, { karyawan_ids: idsB });
      }
    }
    await base44.asServiceRole.entities.ShiftSwap.update(swap_id, { status: 'Selesai' });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

======================================================
=== functions/archiveOldData.js ===
// Migrated: Use Cloudflare Worker '/api/functions' or src/api/cloudflareClient shim
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { entity_name, months_threshold = 6 } = await req.json();
    const ARCHIVABLE = ['Attendance','EPatrol','EPatrolCustom','DailyChecklist',
      'LaporanHarian','ChecklistHydrant','ChecklistEmergency','ChecklistKR','ChecklistToilet'];
    if (!ARCHIVABLE.includes(entity_name))
      return Response.json({ error: 'Entity tidak bisa diarsip' }, { status: 400 });
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months_threshold);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const records = await base44.asServiceRole.entities[entity_name].list();
    const old = records.filter(r => r.data?.tanggal && r.data.tanggal < cutoffStr);
    let count = 0;
    for (const rec of old) {
      await base44.asServiceRole.entities.Archive.create({
        entity_name, original_id: rec.id, data: rec.data,
        archive_date: new Date().toISOString().split('T')[0],
        original_created_date: rec.data?.tanggal || null,
      });
      await base44.asServiceRole.entities[entity_name].delete(rec.id);
      count++;
    }
    return Response.json({ success: true, archived_count: count, entity_name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});`
    },
    {
      nama: "Hook useEmployee & App.jsx Routing Lengkap",
      deskripsi: "Kode lengkap hooks/useEmployee.js, pola auth guard, App.jsx routing, dan cara tambah halaman baru.",
      prompt: `=== hooks/useEmployee.js (source code lengkap) ===

import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/cloudflareClient';

const STORAGE_KEY = 'pis_employee';

export function useEmployee({ redirectIfNotFound = true, publicPage = false } = {}) {
  const [employee, setEmployee] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(!publicPage && !!localStorage.getItem(STORAGE_KEY));

  useEffect(() => {
    if (publicPage) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      if (redirectIfNotFound) window.location.href = '/EmployeeLogin';
      return;
    }
    const cached = JSON.parse(stored);
    setEmployee(cached);
    // Background refresh dari DB untuk sinkronisasi lintas device
    base44.entities.Employee.filter({ nik_karyawan: cached.nik_karyawan })
      .then(results => {
        if (results?.length) {
          const fresh = results[0];
          const updated = { ...cached, ...fresh, id: fresh.id };
          setEmployee(updated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [publicPage, redirectIfNotFound]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.href = '/EmployeeLogin';
  }, []);

  const updateEmployee = useCallback((updates) => {
    setEmployee(prev => {
      const next = { ...prev, ...updates };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { employee, loading, logout, updateEmployee };
}

=== POLA AUTH GUARD DI HALAMAN ===

// Pattern 1: Inline guard (untuk halaman sederhana)
export default function MyPage() {
  const employee = JSON.parse(localStorage.getItem('pis_employee'));
  if (!employee) {
    window.location.href = '/EmployeeLogin';
    return null;
  }
  // Guard role admin:
  const isMasterAdmin = employee.role === 'Master Admin';
  if (!isMasterAdmin) return <div className="p-8 text-center">Akses Ditolak</div>;
  // ... render halaman
}

// Pattern 2: Gunakan hook (untuk halaman dengan live sync)
export default function MyPage() {
  const { employee, loading } = useEmployee({ redirectIfNotFound: true });
  if (loading || !employee) return <div>Loading...</div>;
  // ... render halaman
}

=== App.jsx — CARA TAMBAH HALAMAN BARU ===

// PENTING: Setiap halaman baru WAJIB ditambah Route eksplisit di App.jsx.
// pages.config.js TIDAK auto-generate untuk app ini.

// 1. Buat file baru: pages/NamaHalaman.jsx
// 2. Import di App.jsx:
import NamaHalaman from './pages/NamaHalaman';

// 3. Tambah Route di App.jsx (di dalam <Routes>):
<Route path="/NamaHalaman"
  element={<LayoutWrapper currentPageName="NamaHalaman"><NamaHalaman /></LayoutWrapper>} />

// 4. Tambah menu di Layout.jsx (array menuItems):
{ name: 'Nama Menu', icon: IconName, page: 'NamaHalaman', roles: ['Master Admin'] }

=== DAFTAR SEMUA ROUTE YANG ADA ===
/ → Dashboard (halaman utama admin)
/EmployeeLogin → Login karyawan (public)
/ApplyJob → Form lamaran kerja (public)
/ApplyJobStatus → Cek status lamaran (public)
/InputAbsensi → Input absensi via link QR (public)
/EmployeeDashboard → Dashboard karyawan staff
/MyProfile → Edit profil karyawan
/Attendance → E-Absensi
/ShiftSchedule → Jadwal shift
/ShiftSwap → Tukar shift
/EPatrol → E-Patroli
/EPatrolCustomPage → E-Patroli custom template (+ ?templateId=xxx)
/EPatrolTemplateAdmin → Admin template E-Patroli
/EFacility → E-Facility
/DailyChecklist → Daily checklist
/LaporanHarian → Laporan harian
/ShiftHandoverPage → Serah terima shift
/AssignmentPage → Penugasan
/TaskBoard → Kanban board
/FacilityTicketing → Ticketing fasilitas
/Cuti → Cuti & izin
/Employees → Data karyawan
/AreaEmployees → Karyawan per area
/Applicants → Data pelamar
/PKWTPage → PKWT karyawan
/Payslip → Slip gaji
/PerformanceReviewPage → Penilaian kinerja
/Inventory → Inventaris
/AssetMutationPage → Mutasi aset
/LaporanBulanan → Laporan PDF bulanan
/PerformaDashboard → Dashboard analitik
/AttendanceDashboard → Dashboard absensi
/AdminStrategicDashboard → Dashboard strategis
/AreaProjects → Area / proyek
/AreaContractPage → Kontrak & invoice
/ChecklistHydrant → Hydrant & APAR
/ChecklistEmergency → Box emergency
/ChecklistKR → Kendaraan operasional
/ChecklistToilet → Checklist toilet
/GuestBook → Buku tamu
/TenantPackage → Paket tenant
/TenantReportPage → Laporan penyewa
/SOPChecklistPage → Checklist SOP
/PanicAlertMonitor → Monitor darurat
/TimesheetValidation → Validasi timesheet
/EPatrolAnalytics → Analitik patroli
/DataArchive → Archive data
/MigrasiServer → Migrasi server
/AppSettings → Pengaturan aplikasi
/PromptGuide → Panduan prompt VS Code

=== NAVIGASI ===
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

<Link to="/Dashboard">Dashboard</Link>
<Link to={createPageUrl('Attendance')}>Absensi</Link>

// Programmatic:
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
navigate('/Dashboard');
navigate(-1); // back

=== PACKAGE YANG TERSEDIA (package.json) ===
React 18 + Vite + Tailwind CSS + shadcn/ui
@tanstack/react-query ^5.x     → data fetching
react-router-dom ^6.x          → routing
@hello-pangea/dnd ^17.x        → drag & drop kanban
framer-motion ^11.x            → animasi
recharts ^2.x                  → grafik/chart
react-quill ^2.x               → rich text editor
react-leaflet ^4.x             → peta
xlsx ^0.18.x                   → export Excel
jspdf ^4.x                     → export PDF
qrcode ^1.5.x                  → generate QR code
html2canvas ^1.4.x             → screenshot to image
moment ^2.x + date-fns ^3.x   → date utilities
lucide-react ^0.475.x          → ikon (HANYA icon yang ada di library ini!)
canvas-confetti ^1.9.x         → efek confetti`
    },
  ],
};