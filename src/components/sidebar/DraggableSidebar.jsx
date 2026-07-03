import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import {
  CalendarClock, Shield, ClipboardCheck, BookOpen, Package,
  Droplets, Car, Sparkles, UserCircle, Clock, CheckCircle2,
  Boxes, Kanban, Wrench, CreditCard, FileText, NotebookPen,
  ArrowLeftRight, MessageSquare, Activity, LayoutDashboard, CalendarDays, ListChecks
} from 'lucide-react';

const STORAGE_KEY = 'pis_menu_order_v2';

const MANAGEMENT_ROLES = ['Chief Security', 'Supervisor Facility', 'Admin Pos', 'Admin Security', 'Admin Facility', 'SPV Security', 'Admin Pos Security', 'Supervisor Security'];
const LEADER_ROLES = ['Leader Security', 'Leader Facility'];

// Mapping nama menu → page & icon untuk karyawan non-privileged
const MENU_PAGE_MAP = {
  'Absensi': { page: 'Attendance', icon: CalendarClock },
  'E-Absensi': { page: 'Attendance', icon: CalendarClock },
  'Jadwal Shift': { page: 'ShiftSchedule', icon: Clock },
  'E-Patroli': { page: 'EPatrol', icon: Shield },
  'E-Facility': { page: 'EFacility', icon: ClipboardCheck },
  'Hydrant & APAR': { page: 'ChecklistHydrant', icon: Droplets },
  'Box Emergency': { page: 'ChecklistEmergency', icon: CheckCircle2 },
  'KR 2/4': { page: 'ChecklistKR', icon: Car },
  'Checklist Toilet': { page: 'ChecklistToilet', icon: Sparkles },
  'Buku Tamu': { page: 'GuestBook', icon: BookOpen },
  'Paket Tenant': { page: 'TenantPackage', icon: Package },
  'Inventaris': { page: 'Inventory', icon: Boxes },
  'Task Board': { page: 'TaskBoard', icon: Kanban },
  'Ticketing Fasilitas': { page: 'FacilityTicketing', icon: Wrench },
  'Slip Gaji': { page: 'Payslip', icon: CreditCard },
  'Laporan PDF': { page: 'LaporanBulanan', icon: FileText },
  'Laporan Harian': { page: 'LaporanHarian', icon: NotebookPen },
  'Daily Checklist': { page: 'DailyChecklist', icon: ClipboardCheck },
  'Validasi Timesheet': { page: 'TimesheetValidation', icon: ClipboardCheck },
  'Serah Terima Shift': { page: 'ShiftHandoverPage', icon: ArrowLeftRight },
  'Laporan Penyewa': { page: 'TenantReportPage', icon: MessageSquare },
  'Analitik Patroli': { page: 'EPatrolAnalytics', icon: Activity },
  'Cuti & Izin': { page: 'Cuti', icon: CalendarDays },
  'Data Karyawan Area': { page: 'AreaEmployees', icon: UserCircle },
  'Penugasan': { page: 'AssignmentPage', icon: ListChecks },
};

export default function DraggableSidebar({ menuItems, currentPageName, employee, onClose, patrolTemplates = [] }) {
  const [expandedMenus, setExpandedMenus] = useState({});
  const [orderedItems, setOrderedItems] = useState([]);

  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const empRole = employee?.role || employee?.jabatan || '';
  const isManagement = MANAGEMENT_ROLES.includes(empRole);
  const isLeader = LEADER_ROLES.includes(empRole);
  const isPrivileged = isMasterAdmin || isManagement || isLeader;

  // Ambil data area untuk karyawan non-privileged
  const { data: areaData } = useQuery({
    queryKey: ['area-sidebar', employee?.area_tugas],
    queryFn: () => base44.entities.AreaProject.filter({ nama_area: employee.area_tugas }),
    enabled: !!employee?.area_tugas && !isPrivileged,
    select: (data) => data[0],
    staleTime: 5 * 60 * 1000
  });

  const canSeeItem = (item) => {
    if (item.staffOnly) return !isPrivileged;
    if (item.roles) return item.roles.includes(empRole) || isMasterAdmin;
    return isPrivileged;
  };

  // Bangun menu items untuk karyawan berdasarkan konfigurasi area
  const buildStaffMenuItems = () => {
    if (!areaData) return null;
    const jabatan = empRole;
    const menuItems = areaData.menu_items;
    const menuRoles = areaData.menu_roles || {};

    if (!menuItems || menuItems.length === 0) return null;

    // Filter: aktif + jabatan boleh lihat
    const allowed = menuItems.filter((m) => {
      if (!m.aktif) return false;
      const roles = menuRoles[m.nama] || [];
      if (roles.length === 0) return true; // semua jabatan
      return roles.includes(jabatan);
    });

    return allowed.map((m) => {
      const mapped = MENU_PAGE_MAP[m.nama];
      if (!mapped) return null;
      return { name: m.nama, page: mapped.page, icon: mapped.icon, staffOnly: true };
    }).filter(Boolean);
  };

  // Untuk karyawan non-privileged, gunakan menu dari area jika ada
  const effectiveMenuItems = !isPrivileged && areaData
    ? (() => {
        const staffMenu = buildStaffMenuItems();
        if (staffMenu && staffMenu.length > 0) {
          // Tambahkan Dashboard Saya & Edit Profil selalu di atas
          const fixed = [
            { name: 'Dashboard Saya', page: 'EmployeeDashboard', icon: LayoutDashboard, staffOnly: true },
            { name: 'Edit Profil Saya', page: 'MyProfile', icon: UserCircle, staffOnly: true },
          ];
          const extra = staffMenu.filter((m) => m.page !== 'EmployeeDashboard' && m.page !== 'MyProfile');
          return [...fixed, ...extra];
        }
        return menuItems;
      })()
    : menuItems;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved);
        const reordered = [...effectiveMenuItems].sort((a, b) => {
          const ai = savedOrder.indexOf(a.name);
          const bi = savedOrder.indexOf(b.name);
          if (ai === -1 && bi === -1) return 0;
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        });
        setOrderedItems(reordered);
      } catch {
        setOrderedItems(effectiveMenuItems);
      }
    } else {
      setOrderedItems(effectiveMenuItems);
    }
  }, [effectiveMenuItems.length, areaData?.id]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(orderedItems);
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setOrderedItems(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map(i => i.name)));
  };

  const toggleSubmenu = (name) => {
    setExpandedMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const renderChild = (child) => {
    if (child.roles && !child.roles.includes(empRole) && !isMasterAdmin) return null;
    const isActive = currentPageName === child.page;
    return (
      <Link
        key={child.page}
        to={createPageUrl(child.page)}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
          isActive ? 'bg-amber-700 text-white font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <child.icon className="w-3.5 h-3.5" />
        <span>{child.name}</span>
      </Link>
    );
  };

  // Render patrol template links (custom patrol menus)
  const renderPatrolTemplateLinks = () => {
    if (!patrolTemplates || patrolTemplates.length === 0) return null;
    return patrolTemplates.map(t => {
      const url = `/EPatrolCustomPage?templateId=${t.id}`;
      const isActive = window.location.pathname === '/EPatrolCustomPage' && window.location.search.includes(t.id);
      return (
        <a
          key={t.id}
          href={url}
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
            isActive ? 'bg-amber-700 text-white font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>{t.nama_template}</span>
        </a>
      );
    });
  };

  // Untuk non-privileged dengan area menu, semua item sudah difilter — langsung tampilkan semua
  const visibleItems = !isPrivileged && areaData && buildStaffMenuItems()?.length > 0
    ? orderedItems
    : orderedItems.filter(canSeeItem);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="sidebar-menu">
        {(provided) => (
          <nav
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="p-3 flex-1 overflow-y-auto space-y-0.5"
          >
            {visibleItems.map((item, index) => (
              <Draggable key={item.name} draggableId={item.name} index={index}>
                {(dragProvided, snapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className={snapshot.isDragging ? 'opacity-80' : ''}
                  >
                    {item.children ? (
                      <div>
                        <div className="flex items-center group">
                          <div
                            {...dragProvided.dragHandleProps}
                            className="px-1 py-2 text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="w-3 h-3" />
                          </div>
                          <button
                            onClick={() => toggleSubmenu(item.name)}
                            className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </div>
                            {expandedMenus[item.name] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          </button>
                        </div>
                        {expandedMenus[item.name] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="ml-4 overflow-hidden"
                          >
                            {item.children.map(child => {
                              const rendered = renderChild(child);
                              // Inject patrol template links after E-Patroli item
                              if (child.page === 'EPatrol' && rendered) {
                                return (
                                  <div key={child.page}>
                                    {rendered}
                                    {renderPatrolTemplateLinks()}
                                    {isMasterAdmin && (
                                      <a
                                        href="/EPatrolTemplateAdmin"
                                        onClick={onClose}
                                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                                          currentPageName === 'EPatrolTemplateAdmin' ? 'bg-amber-700 text-white font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                        }`}
                                      >
                                        <ClipboardCheck className="w-3.5 h-3.5" />
                                        <span>Template E-Patroli</span>
                                      </a>
                                    )}
                                  </div>
                                );
                              }
                              return rendered;
                            })}
                          </motion.div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center group">
                          <div
                            {...dragProvided.dragHandleProps}
                            className="px-1 py-2 text-gray-600 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="w-3 h-3" />
                          </div>
                          <Link
                            to={createPageUrl(item.page)}
                            onClick={onClose}
                            className={`flex-1 px-3 py-2.5 text-sm font-medium rounded-xl flex items-center gap-3 transition-all ${
                              currentPageName === item.page ? 'bg-amber-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            } ${item.color === 'orange' ? 'border-l-2 border-amber-500' : ''}`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.name}</span>
                          </Link>
                        </div>
                        {/* Patrol template links below E-Patroli for non-privileged */}
                        {item.page === 'EPatrol' && renderPatrolTemplateLinks()}
                      </div>
                    )}
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </nav>
        )}
      </Droppable>
    </DragDropContext>
  );
}