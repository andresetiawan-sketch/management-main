import GenericChecklist from '@/components/checklist/GenericChecklist';

export default function ChecklistToilet() {
  return (
    <GenericChecklist
      entityName="ChecklistToilet"
      title="Checklist Toilet"
      columns={[
        { key: 'lokasi_toilet', label: 'Lokasi' },
        { key: 'kebersihan', label: 'Kebersihan', badge: true },
        { key: 'perlengkapan', label: 'Perlengkapan', badge: true },
        { key: 'waktu', label: 'Waktu' },
      ]}
      fields={[
        { key: 'waktu', label: 'Waktu', type: 'time' },
        { key: 'lokasi_toilet', label: 'Lokasi Toilet' },
        { key: 'kebersihan', label: 'Kebersihan', type: 'select', options: ['Bersih', 'Cukup', 'Kotor'] },
        { key: 'perlengkapan', label: 'Perlengkapan', type: 'select', options: ['Lengkap', 'Kurang', 'Habis'] },
        { key: 'foto', label: 'Foto', type: 'file' },
        { key: 'catatan', label: 'Catatan', type: 'textarea' },
      ]}
    />
  );
}