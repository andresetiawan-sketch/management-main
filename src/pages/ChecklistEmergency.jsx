import GenericChecklist from '@/components/checklist/GenericChecklist';

export default function ChecklistEmergency() {
  return (
    <GenericChecklist
      entityName="ChecklistEmergency"
      title="Box Emergency"
      columns={[
        { key: 'lokasi_box', label: 'Lokasi Box' },
        { key: 'kondisi', label: 'Kondisi', badge: true },
      ]}
      fields={[
        { key: 'lokasi_box', label: 'Lokasi Box' },
        { key: 'kondisi', label: 'Kondisi', type: 'select', options: ['Baik', 'Rusak', 'Perlu Maintenance'] },
        { key: 'foto', label: 'Foto', type: 'file' },
        { key: 'catatan', label: 'Catatan', type: 'textarea' },
      ]}
      locationField="lokasi_box"
    />
  );
}