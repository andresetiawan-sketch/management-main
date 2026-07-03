# Sistem Data Archiving Otomatis

## 📋 Overview

Sistem archiving otomatis untuk menjaga performa aplikasi dengan menyimpan data lama ke database terpisah dan menghapusnya dari tabel aktif setiap 3 bulan sekali.

## 🔄 Cara Kerja

### Proses Otomatis (Setiap 3 Bulan)
```
Scheduled Task (Setiap tanggal 1 jam 02:00 AM)
  ↓
Cek semua data > 90 hari
  ↓
Backup ke tabel Archive
  ↓
Hapus dari tabel asli
  ↓
Update metadata
```

### Entities yang Di-Archive:
- ✅ Attendance (E-Absensi)
- ✅ EPatrol (E-Patroli)
- ✅ EPatrolCustom (E-Patroli Custom)
- ✅ EFacility
- ✅ ChecklistHydrant
- ✅ ChecklistEmergency
- ✅ ChecklistKR
- ✅ ChecklistToilet
- ✅ GuestBook
- ✅ TenantPackage
- ✅ DailyChecklist
- ✅ LaporanHarian
- ✅ ShiftHandover

## 📊 UI Management

### Menu Location: 
**Master Admin → Archive Data** (atau `/DataArchive`)

### Fitur:
1. **Stats Dashboard**
   - Total records di-archive
   - Jumlah entity types
   - Records yang selected untuk restore

2. **Filter & Search**
   - Filter by Entity
   - Search by Original ID
   - Bulk restore selected records

3. **Archive Records Table**
   - View semua archived data
   - Original ID, Archive Date, Created Date
   - Action: Restore individual atau Delete

4. **Actions**
   - ✅ **Restore**: Kembalikan ke tabel asli
   - 🗑️ **Delete**: Hapus permanent dari archive
   - 🔄 **Archive Now**: Manual trigger archiving

## 🔧 Backend Functions

### 1. `archiveOldData` (Scheduled)
**Run automatically every 3 months OR manual trigger**

Process:
```
1. Get all records from each entity
2. Filter records > 90 days old
3. Bulk create in Archive table
4. Delete original records
5. Return summary
```

Response:
```json
{
  "success": true,
  "totalArchived": 1250,
  "archiveDate": "2026-05-07",
  "cutoffDate": "2026-02-07",
  "results": [
    {
      "entity": "Attendance",
      "archivedCount": 500,
      "status": "success"
    }
  ]
}
```

### 2. `restoreArchivedData` (Manual)
**Restore selected archived records**

Input:
```json
{
  "archiveIds": ["id1", "id2", "id3"]
}
```

Process:
```
1. Get archive records by IDs
2. Recreate in original entity
3. Update archive metadata with new ID
4. Return restoration summary
```

Response:
```json
{
  "success": true,
  "restoredCount": 3,
  "results": [
    {
      "archiveId": "id1",
      "entityName": "Attendance",
      "newId": "new_id_1",
      "status": "success"
    }
  ]
}
```

## 🗄️ Archive Entity Schema

```javascript
{
  entity_name: "string",        // Original entity (e.g., "Attendance")
  original_id: "string",        // ID di entity asli
  data: "object",              // Full record data (JSON)
  archive_date: "date",        // Tanggal di-archive
  original_created_date: "date", // Tanggal original creation
  notes: "string"              // Notes (restored, etc)
}
```

## 📅 Scheduling

**Automation: Auto Archive Old Data - Every 3 Months**
- Cron: `0 2 1 */3 *` (1st of every 3 months at 2am UTC)
- Timezone: UTC → Auto adjust ke Jakarta (GMT+7)
- Status: Active

### Jadwal Archiving:
- Feb 1, 2026
- May 1, 2026  ← Next
- Aug 1, 2026
- Nov 1, 2026

## 💡 Manfaat

### Performance
- ✅ Reduce table size (faster queries)
- ✅ Smaller backups
- ✅ Lower storage costs
- ✅ Better app responsiveness

### Data Management
- ✅ Keep 3 months of active data
- ✅ Full audit trail (searchable)
- ✅ Flexible restore capability
- ✅ Permanent delete option

### Compliance
- ✅ Data retention policy
- ✅ Audit logs preserved
- ✅ Quick data recovery
- ✅ GDPR-friendly approach

## 🔒 Security

- ✅ Master Admin only (role-based)
- ✅ Automatic service role operations
- ✅ Complete data preservation
- ✅ Restore with full metadata

## 📋 Manual Archiving

```javascript
// Trigger archiving manually via UI
const response = await base44.functions.invoke('archiveOldData', {});
```

## 🔄 Restore Workflow

1. **Admin opens Archive Data page**
2. **Filter/search for records**
3. **Select records to restore**
4. **Click "Restore"**
5. **Records recreated in original entity**
6. **Archive metadata updated**

## ⚠️ Important Notes

- **Archiving is permanent**: Deletes original records
- **Restore creates new records**: Original IDs may differ
- **No cascading**: Archive only specified entities
- **Timezone**: Schedule runs in UTC (2am = 9am Jakarta time)
- **Batch Processing**: Large archives process in chunks

## 📝 Monitoring

Check automation status:
- Dashboard → Archive Data page
- View stats and recent operations
- Monitor scheduled task execution

## 🆘 Troubleshooting

**Issue: Archive seems stuck**
- Check if archiving is in progress
- Manual trigger available anytime
- No rate limiting

**Issue: Can't find archived record**
- Use search by Original ID
- Filter by entity type
- Check archive date range

**Issue: Restore failed**
- Check if data conflicts exist
- Review error message
- Try single record restore

## 🚀 Future Enhancements

- Selective entity archiving
- Custom retention policies
- Scheduled export to external storage
- Archive search with filters
- Bulk operations dashboard