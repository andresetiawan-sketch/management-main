import GenericChecklist from '@/components/checklist/GenericChecklist';

export default function ChecklistKR() {
  return (
    <GenericChecklist
      entityName="ChecklistKR"
      title="KR 2/4"
      columns={[
        { key: 'tipe_kendaraan', label: 'Tipe' },
        { key: 'no_polisi', label: 'No. Polisi' },
        { key: 'kondisi_mesin', label: 'Mesin', badge: true },
        { key: 'km_terakhir', label: 'KM' },
      ]}
      fields={[
        { key: 'tipe_kendaraan', label: 'Tipe Kendaraan', type: 'select', options: ['KR 2', 'KR 4'] },
        { key: 'no_polisi', label: 'No. Polisi' },
        { key: 'kondisi_ban', label: 'Kondisi Ban', type: 'select', options: ['Baik', 'Perlu Ganti'] },
        { key: 'kondisi_mesin', label: 'Kondisi Mesin', type: 'select', options: ['Baik', 'Perlu Service'] },
        { key: 'kondisi_lampu', label: 'Kondisi Lampu', type: 'select', options: ['Baik', 'Rusak'] },
        { key: 'kondisi_rem', label: 'Kondisi Rem', type: 'select', options: ['Baik', 'Perlu Service'] },
        { key: 'bbm', label: 'BBM' },
        { key: 'km_terakhir', label: 'KM Terakhir' },
        { key: 'foto', label: 'Foto', type: 'file' },
        { key: 'catatan', label: 'Catatan', type: 'textarea' },
      ]}
    />
  );
}