import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';

export const ALL_WIDGETS = [
{ id: 'stat_pelamar', label: 'Stat: Total Pelamar', defaultEnabled: true },
{ id: 'stat_karyawan', label: 'Stat: Karyawan Aktif', defaultEnabled: true },
{ id: 'stat_area', label: 'Stat: Area Aktif', defaultEnabled: true },
{ id: 'stat_hadir', label: 'Stat: Hadir Hari Ini', defaultEnabled: true },
{ id: 'ops_realtime', label: 'Operasional Realtime', defaultEnabled: true },
{ id: 'chart_pelamar', label: 'Grafik Pelamar', defaultEnabled: true },
{ id: 'tabel_pelamar', label: 'Tabel Pelamar', defaultEnabled: true }];


export function useDashboardConfig(employeeNik) {
  return useQuery({
    queryKey: ['dashboard-config', employeeNik],
    queryFn: async () => {
      const list = await base44.entities.DashboardConfig.filter({ employee_nik: employeeNik });
      return list[0] || null;
    },
    enabled: !!employeeNik
  });
}

export default function DashboardWidgetConfig({ employeeNik, areatugas }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: config } = useDashboardConfig(employeeNik);

  const savedWidgets = config?.widgets || ALL_WIDGETS.map((w) => ({ id: w.id, enabled: w.defaultEnabled }));
  const [localWidgets, setLocalWidgets] = useState(null);
  const widgets = localWidgets || savedWidgets;

  const openDialog = () => {
    setLocalWidgets(savedWidgets.map((sw) => ({ ...sw })));
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async (widgetsList) => {
      if (config?.id) {
        return base44.entities.DashboardConfig.update(config.id, { widgets: widgetsList });
      }
      return base44.entities.DashboardConfig.create({
        employee_nik: employeeNik,
        area_tugas: areatugas,
        widgets: widgetsList
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-config', employeeNik] });
      toast.success('Konfigurasi dashboard tersimpan');
      setOpen(false);
    }
  });

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(localWidgets);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setLocalWidgets(items);
  };

  const toggleWidget = (id) => {
    setLocalWidgets((prev) => prev.map((w) => w.id === id ? { ...w, enabled: !w.enabled } : w));
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 border-gray-300"
        onClick={openDialog}>
        
        <Settings2 className="w-3.5 h-3.5" />
        Atur Widget
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Settings2 className="w-4 h-4 text-[var(--maroon)]" />
              Konfigurasi Widget Dashboard
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500">Drag untuk mengatur urutan, centang/uncentang untuk tampilkan/sembunyikan.</p>

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="widgets">
              {(provided) =>
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5 max-h-80 overflow-y-auto">
                  {(localWidgets || []).map((w, index) => {
                  const meta = ALL_WIDGETS.find((a) => a.id === w.id);
                  return (
                    <Draggable key={w.id} draggableId={w.id} index={index}>
                        {(dp, snap) =>
                      <div
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all ${
                        snap.isDragging ? 'bg-indigo-50 border-indigo-300 shadow-md' : 'bg-white border-gray-200'}`
                        }>
                        
                            <div {...dp.dragHandleProps} className="text-gray-400 cursor-grab">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <input
                          type="checkbox"
                          checked={w.enabled}
                          onChange={() => toggleWidget(w.id)}
                          className="rounded" />
                        
                            <span className="text-sm flex-1">{meta?.label || w.id}</span>
                          </div>
                      }
                      </Draggable>);

                })}
                  {provided.placeholder}
                </div>
              }
            </Droppable>
          </DragDropContext>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Batal</Button>
            <Button
              size="sm" className="bg-[#0f0101] text-white px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow h-8 hover:bg-red-800"

              onClick={() => saveMutation.mutate(localWidgets)}
              disabled={saveMutation.isPending}>
              
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>);

}