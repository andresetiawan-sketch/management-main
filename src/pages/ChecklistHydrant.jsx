import GenericChecklist from '@/components/checklist/GenericChecklist';

export default function ChecklistHydrant() {
  return (
    <GenericChecklist
      entityName="ChecklistHydrant"
      title="Hydrant & APAR"
      columns={[
        { key: 'tipe', label: 'Tipe' },
        { key: 'lokasi_hydrant', label: 'Lokasi' },
        { key: 'kondisi', label: 'Kondisi', badge: true },
        { key: 'tekanan_bar', label: 'Tekanan' },
      ]}
      fields={[
        { key: 'tipe', label: 'Tipe', type: 'select', options: ['Hydrant', 'APAR'] },
        { key: 'lokasi_hydrant', label: 'Lokasi Hydrant/APAR' },
        { key: 'kondisi', label: 'Kondisi', type: 'select', options: ['Baik', 'Rusak', 'Perlu Maintenance'] },
        { key: 'tekanan_bar', label: 'Tekanan (bar)' },
        { key: 'tanggal_expired', label: 'Tanggal Expired', type: 'date' },
        { key: 'foto', label: 'Foto', type: 'file' },
        { key: 'catatan', label: 'Catatan', type: 'textarea' },
      ]}
      locationField="lokasi_hydrant"
    />
  );
}