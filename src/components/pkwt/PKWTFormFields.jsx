import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DURASI_MAP = {
  3: 'tiga', 6: 'enam', 12: 'dua belas', 18: 'delapan belas',
  24: 'dua puluh empat', 36: 'tiga puluh enam'
};

export default function PKWTFormFields({ form, setForm }) {
  const updateField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-4">
      {/* Baris 1: Data Tanda Tangan */}
      <div className="border rounded-xl p-3 bg-blue-50 space-y-3">
        <p className="text-xs font-semibold text-blue-800">📅 Data Penandatanganan</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Hari Tanda Tangan</Label>
            <Select value={form.hari_tanda_tangan || ''} onValueChange={v => updateField('hari_tanda_tangan', v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Pilih hari..." /></SelectTrigger>
              <SelectContent>
                {HARI.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tanggal Tanda Tangan</Label>
            <Input
              placeholder="mis. 1 Januari 2026"
              value={form.tanggal_tanda_tangan || ''}
              onChange={e => updateField('tanggal_tanda_tangan', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Kota Penandatanganan</Label>
            <Input
              placeholder="mis. Jakarta"
              value={form.kota_tanda_tangan || ''}
              onChange={e => updateField('kota_tanda_tangan', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Data Perusahaan */}
      <div className="border rounded-xl p-3 bg-slate-50 space-y-3">
        <p className="text-xs font-semibold text-slate-700">🏢 Data Pihak Pertama (Perusahaan)</p>
        <div>
          <Label className="text-xs">Alamat Perusahaan</Label>
          <Input
            placeholder="Alamat lengkap perusahaan..."
            value={form.alamat_perusahaan || ''}
            onChange={e => updateField('alamat_perusahaan', e.target.value)}
            className="h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Nama Direktur / Pimpinan</Label>
            <Input
              placeholder="Nama pimpinan..."
              value={form.nama_direktur || ''}
              onChange={e => updateField('nama_direktur', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Jabatan Direktur</Label>
            <Input
              placeholder="Direktur"
              value={form.jabatan_direktur || ''}
              onChange={e => updateField('jabatan_direktur', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Data Karyawan Tambahan */}
      <div className="border rounded-xl p-3 bg-green-50 space-y-3">
        <p className="text-xs font-semibold text-green-800">👤 Data Pihak Kedua (Karyawan)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">NIK E-KTP</Label>
            <Input
              placeholder="16 digit NIK E-KTP"
              value={form.nik_ektp || ''}
              onChange={e => updateField('nik_ektp', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Tempat Lahir</Label>
            <Input
              placeholder="Kota lahir"
              value={form.tempat_lahir || ''}
              onChange={e => updateField('tempat_lahir', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Tanggal Lahir</Label>
            <Input
              type="date"
              value={form.tanggal_lahir || ''}
              onChange={e => updateField('tanggal_lahir', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Wilayah Penugasan</Label>
            <Input
              placeholder="mis. DKI Jakarta"
              value={form.wilayah_penugasan || ''}
              onChange={e => updateField('wilayah_penugasan', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Alamat Karyawan</Label>
            <Input
              placeholder="Alamat lengkap karyawan..."
              value={form.alamat_karyawan || ''}
              onChange={e => updateField('alamat_karyawan', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Durasi Terbilang */}
      <div>
        <Label className="text-xs">Durasi Terbilang (otomatis / manual)</Label>
        <Input
          placeholder="mis. dua belas"
          value={form.durasi_terbilang || DURASI_MAP[form.durasi_bulan] || ''}
          onChange={e => updateField('durasi_terbilang', e.target.value)}
          className="h-9 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">Diisi otomatis dari durasi bulan. Edit jika perlu.</p>
      </div>

      {/* Data Gaji */}
      <div className="border rounded-xl p-3 bg-yellow-50 space-y-3">
        <p className="text-xs font-semibold text-yellow-800">💰 Data Gaji & Rekening</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Gaji Pokok (Nominal)</Label>
            <Input
              placeholder="mis. 4.500.000"
              value={form.gaji_pokok || ''}
              onChange={e => updateField('gaji_pokok', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Gaji Pokok (Terbilang)</Label>
            <Input
              placeholder="mis. Empat Juta Lima Ratus Ribu"
              value={form.gaji_pokok_terbilang || ''}
              onChange={e => updateField('gaji_pokok_terbilang', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Tanggal Gajian</Label>
            <Input
              placeholder="25"
              value={form.tanggal_gajian || '25'}
              onChange={e => updateField('tanggal_gajian', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">Bank Karyawan</Label>
            <Input
              placeholder="mis. BRI"
              value={form.bank_karyawan || ''}
              onChange={e => updateField('bank_karyawan', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">No. Rekening</Label>
            <Input
              placeholder="Nomor rekening karyawan"
              value={form.no_rekening || ''}
              onChange={e => updateField('no_rekening', e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Kota Pengadilan */}
      <div>
        <Label className="text-xs">Kota Pengadilan HI (Pasal 8)</Label>
        <Input
          placeholder="mis. Jakarta Pusat"
          value={form.kota_pengadilan || ''}
          onChange={e => updateField('kota_pengadilan', e.target.value)}
          className="h-9 text-sm"
        />
      </div>
    </div>
  );
}