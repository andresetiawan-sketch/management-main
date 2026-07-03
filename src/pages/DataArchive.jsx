import React, { useState } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Archive, RotateCcw, Trash2, Download, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function DataArchive() {
  const [selectedEntity, setSelectedEntity] = useState('');
  const [searchId, setSearchId] = useState('');
  const [selectedRecords, setSelectedRecords] = useState([]);
  const queryClient = useQueryClient();

  // Fetch archives
  const { data: archives, isLoading, error } = useQuery({
    queryKey: ['archives'],
    queryFn: () => base44.entities.Archive.list('', 500),
    initialData: []
  });

  // Manual archive mutation
  const archiveMutation = useMutation({
    mutationFn: () => base44.functions.invoke('archiveOldData', {}),
    onSuccess: (response) => {
      toast.success(`${response.data.totalArchived} records di-archive`);
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
    onError: (error) => {
      toast.error('Gagal archive: ' + error.message);
    }
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (archiveIds) => 
      base44.functions.invoke('restoreArchivedData', { archiveIds }),
    onSuccess: (response) => {
      toast.success(`${response.data.restoredCount} records di-restore`);
      queryClient.invalidateQueries({ queryKey: ['archives'] });
      setSelectedRecords([]);
    },
    onError: (error) => {
      toast.error('Gagal restore: ' + error.message);
    }
  });

  // Delete archive
  const deleteMutation = useMutation({
    mutationFn: (archiveId) => base44.entities.Archive.delete(archiveId),
    onSuccess: () => {
      toast.success('Archive record dihapus');
      queryClient.invalidateQueries({ queryKey: ['archives'] });
    },
    onError: (error) => {
      toast.error('Gagal hapus: ' + error.message);
    }
  });

  // Filter archives
  const filteredArchives = archives.filter(archive => {
    if (selectedEntity && archive.entity_name !== selectedEntity) return false;
    if (searchId && !archive.original_id.includes(searchId)) return false;
    return true;
  });

  // Get unique entities
  const entities = [...new Set(archives.map(a => a.entity_name))].sort();

  // Stats
  const stats = {
    total: archives.length,
    byEntity: entities.reduce((acc, entity) => {
      acc[entity] = archives.filter(a => a.entity_name === entity).length;
      return acc;
    }, {})
  };

  const handleSelectRecord = (archiveId) => {
    setSelectedRecords(prev =>
      prev.includes(archiveId)
        ? prev.filter(id => id !== archiveId)
        : [...prev, archiveId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === filteredArchives.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredArchives.map(a => a.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="w-8 h-8 text-blue-600" />
            Data Archive Management
          </h1>
          <p className="text-gray-600 mt-1">Kelola data yang di-archive untuk menjaga performa aplikasi</p>
        </div>
        <Button 
          onClick={() => archiveMutation.mutate()}
          disabled={archiveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {archiveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Archive Now
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Archived</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">records di-archive</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Entities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{entities.length}</div>
            <p className="text-xs text-gray-500 mt-1">jenis entity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{selectedRecords.length}</div>
            <p className="text-xs text-gray-500 mt-1">untuk restore</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Select value={selectedEntity} onValueChange={setSelectedEntity}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>Semua Entity</SelectItem>
              {entities.map(entity => (
                <SelectItem key={entity} value={entity}>
                  {entity} ({stats.byEntity[entity]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Cari Original ID..."
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className="flex-1"
          />

          {selectedRecords.length > 0 && (
            <Button
              onClick={() => restoreMutation.mutate(selectedRecords)}
              disabled={restoreMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {restoreMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Restore ({selectedRecords.length})
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>Archived Records ({filteredArchives.length})</span>
            {filteredArchives.length > 0 && (
              <input
                type="checkbox"
                checked={selectedRecords.length === filteredArchives.length && filteredArchives.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 cursor-pointer"
              />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-600 py-8">
              <AlertCircle className="w-5 h-5" />
              <span>Error loading archives</span>
            </div>
          ) : filteredArchives.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Tidak ada archive record</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedRecords.length === filteredArchives.length && filteredArchives.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Original ID</TableHead>
                    <TableHead>Archive Date</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArchives.map((archive) => (
                    <TableRow key={archive.id} className={selectedRecords.includes(archive.id) ? 'bg-blue-50' : ''}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(archive.id)}
                          onChange={() => handleSelectRecord(archive.id)}
                          className="w-4 h-4 cursor-pointer"
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{archive.entity_name}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-gray-600">
                        {archive.original_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {format(new Date(archive.archive_date), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {format(new Date(archive.original_created_date), 'dd MMM yyyy', { locale: id })}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedRecords([archive.id]);
                            setTimeout(() => restoreMutation.mutate([archive.id]), 0);
                          }}
                          disabled={restoreMutation.isPending}
                          title="Restore"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Hapus archive ini? Data tidak bisa dipulihkan.')) {
                              deleteMutation.mutate(archive.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">Sistem Archiving Otomatis</p>
              <p className="mt-1">Data lebih dari 90 hari akan otomatis di-archive setiap 3 bulan. Anda bisa restore kapan saja atau hapus permanent untuk pembersihan lebih lanjut.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}