# Fitur Shift Swap & Google Calendar Integration

## 1. Fitur Tukar Shift (Shift Swap)

### Cara Menggunakan:

#### Sebagai Karyawan:
1. **Ajukan Tukar Shift**
   - Klik tombol "Ajukan Tukar Shift"
   - Pilih rekan kerja yang ingin diajak tukar shift
   - Pilih shift Anda yang akan ditukar
   - Pilih shift rekan (opsional - jika ingin tukar spesifik)
   - Tulis alasan pengajuan
   - Kirim pengajuan

2. **Status Pengajuan**
   - **Pending**: Menunggu approval atasan
   - **Disetujui Atasan**: Shift swap approved, jadwal otomatis diupdate
   - **Ditolak**: Pengajuan ditolak oleh atasan
   - **Selesai**: Proses selesai

3. **Batalkan Pengajuan**
   - Buka detail pengajuan
   - Klik "Batalkan Pengajuan" (hanya bisa jika status Pending)

#### Sebagai Atasan (Leader/Chief/Supervisor):
1. **Lihat Pengajuan Pending**
   - Buka menu "Tukar Shift"
   - Lihat pengajuan yang menunggu approval

2. **Approve/Tolak**
   - Klik pengajuan untuk melihat detail
   - Tambahkan catatan (opsional)
   - Klik "Setujui" atau "Tolak"
   - Jadwal otomatis diupdate jika disetujui

### Alur Kerja:
```
Karyawan Ajukan → Atasan Review → Approve/Tolak → Update Jadwal Otomatis
```

---

## 2. Google Calendar Integration (Coming Soon)

### Setup Required:
Sebelum menggunakan, admin perlu setup Google Calendar connector:

1. **Admin Setup**
   - Setup "Employee Calendar" Google Calendar connector
   - Connector ID akan digunakan di frontend

2. **Karyawan Connect**
   - Buka halaman "Edit Profil Saya" atau "Jadwal Shift"
   - Klik "Hubungkan Google Calendar"
   - Login dengan akun Google pribadi
   - Grant permission untuk akses calendar

3. **Auto Sync**
   - Setiap shift baru otomatis ditambahkan ke Google Calendar
   - Shift yang diubah/dihapus juga terupdate
   - Manual sync tersedia dengan tombol "Sync Shift Sekarang"

### Benefits:
- Notifikasi shift di Google Calendar pribadi
- Reminder otomatis sebelum shift
- Integrasi dengan calendar events lainnya
- Akses dari mobile (Google Calendar app)

---

## Backend Functions

### 1. `approveShiftSwap`
Handle approval/rejection shift swap requests
- Input: `shiftSwapId`, `approved` (boolean), `catatan`
- Process: Update status, swap karyawan_ids in ShiftSchedule
- Notify: Both employees via notifyShiftChange

### 2. `cancelShiftSwap`
Cancel pending shift swap requests
- Input: `shiftSwapId`
- Restriction: Only pemohon can cancel
- Process: Delete shift swap record

### 3. `syncShiftToCalendar`
Sync shift schedule to Google Calendar
- Input: `nik_karyawan`, `scheduleId`, `eventId` (optional)
- Process: Create/update Google Calendar event
- Requires: Employee's Google Calendar connection

---

## Entity: ShiftSwap

Fields:
- `nik_pemohon` - Employee requesting swap
- `nik_penerima` - Employee receiving swap
- `shift_tanggal` - Date of shift to swap
- `shift_id_pemohon` - Original shift ID
- `shift_id_penerima` - Target shift ID (optional)
- `alasan` - Reason for swap
- `status` - Pending | Disetujui Atasan | Ditolak | Selesai
- `nik_atasan` - Approving supervisor
- `tanggal_approval` - Approval date
- `catatan_atasan` - Supervisor notes

---

## Next Steps

### To Enable Google Calendar:
1. Admin perlu setup Google Calendar connector via Base44 dashboard
2. Update `CONNECTOR_ID` in `components/calendar/GoogleCalendarConnect.js`
3. Add GoogleCalendarConnect component to MyProfile or ShiftSchedule page
4. Test OAuth flow with employee accounts

### Optional Enhancements:
- Email notifications for swap requests
- WhatsApp notifications via connector
- Bulk shift swap (multiple dates)
- Swap history analytics
- Auto-reject if shift is too soon
- Shift swap policy rules (max swaps per month, etc.)