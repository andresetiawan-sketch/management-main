// Migrated: proxy to local Worker `/api/functions` endpoint

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const resp = await fetch('http://127.0.0.1:8787/api/functions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'archiveOldData', payload: body })
    });
    const data = await resp.json().catch(() => ({}));
    return new Response(JSON.stringify(data), { status: resp.status, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});

/**
 * archiveOldData - Archive old records (older than 3 months) to Archive entity
 * and delete them from main tables to keep app performant
 * 
 * Entities to archive: Attendance, EPatrol, Checklist*, GuestBook, TenantPackage, etc.
 * Retention: 3 months of active data
 */

const ENTITIES_TO_ARCHIVE = [
  'Attendance',
  'EPatrol',
  'EPatrolCustom',
  'EFacility',
  'ChecklistHydrant',
  'ChecklistEmergency',
  'ChecklistKR',
  'ChecklistToilet',
  'GuestBook',
  'TenantPackage',
  'DailyChecklist',
  'LaporanHarian',
  'ShiftHandover'
];

const ARCHIVE_DAYS = 90; // Archive records older than 90 days

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only Master Admin can run this
    if (user?.role !== 'Master Admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const archiveDate = new Date();
    const cutoffDate = new Date(archiveDate.getTime() - ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
    
    let totalArchived = 0;
    const results = [];

    for (const entityName of ENTITIES_TO_ARCHIVE) {
      try {
        // Get all records from entity
        const records = await base44.asServiceRole.entities[entityName].list('', 10000);
        
        if (!records || records.length === 0) {
          continue;
        }

        // Filter records older than cutoff date
        const oldRecords = records.filter(record => {
          const recordDate = new Date(record.created_date || record.tanggal);
          return recordDate < cutoffDate;
        });

        if (oldRecords.length === 0) {
          continue;
        }

        // Archive old records
        const archiveEntries = oldRecords.map(record => ({
          entity_name: entityName,
          original_id: record.id,
          data: record,
          archive_date: archiveDate.toISOString().split('T')[0],
          original_created_date: record.created_date || record.tanggal,
          notes: `Auto-archived: ${entityName} record older than ${ARCHIVE_DAYS} days`
        }));

        // Bulk create archive records
        await base44.asServiceRole.entities.Archive.bulkCreate(archiveEntries);

        // Delete old records from main entity
        for (const record of oldRecords) {
          await base44.asServiceRole.entities[entityName].delete(record.id);
        }

        results.push({
          entity: entityName,
          archivedCount: oldRecords.length,
          status: 'success'
        });

        totalArchived += oldRecords.length;
      } catch (error) {
        results.push({
          entity: entityName,
          error: error.message,
          status: 'failed'
        });
      }
    }

    return Response.json({
      success: true,
      totalArchived,
      archiveDate,
      cutoffDate,
      results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});