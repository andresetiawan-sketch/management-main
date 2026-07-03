import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CompanyNameAnimator from '@/components/ui/CompanyNameAnimator';
import DraggableSidebar from '@/components/sidebar/DraggableSidebar';
import { useEmployee } from '@/hooks/useEmployee';
import {
  LayoutDashboard, Users, MapPin, CalendarClock, FileText,
  Shield, ClipboardCheck, BookOpen, Package, Droplets,
  Car, Sparkles, Menu, X, ChevronDown, ChevronRight,
  Settings, LogOut, UserCircle, Building2, CreditCard, CalendarDays, Boxes, UserSquare2, Kanban, Wrench, FileCheck, DollarSign, NotebookPen, AlertTriangle, ArrowLeftRight, MessageSquare, BarChart2, ClipboardList, TrendingUp, Star, Server, ListChecks, Archive, Code2 } from
'lucide-react';
import { base44 } from '@/api/cloudflareClient';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationBell from '@/components/notifications/NotificationBell';

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69ae71d19fe396b3470078b2/74c75dcf9_Logobulat.png";

// Role groups
const MASTER_ADMIN_ROLES = ['Master Admin'];
const MANAGEMENT_ROLES = ['Chief Security', 'Supervisor Facility', 'Admin Pos', 'Admin Security', 'Admin Facility', 'SPV Security', 'Admin Pos Security', 'Supervisor Security'];
const LEADER_ROLES = ['Leader Security', 'Leader Facility'];

const menuItems = [
// Staff-only
{ name: 'Dashboard Saya', icon: UserSquare2, page: 'EmployeeDashboard', staffOnly: true },
{ name: 'Edit Profil Saya', icon: UserCircle, page: 'MyProfile', staffOnly: true },
// Main menu (urutan sesuai permintaan)
{ name: 'Dashboard Karyawan', icon: LayoutDashboard, page: 'Dashboard', roles: ['Master Admin'] },
{ name: 'Area / Proyek', icon: MapPin, page: 'AreaProjects', roles: ['Master Admin'] },
{ name: 'Kontrak & Invoice', icon: DollarSign, page: 'AreaContractPage', roles: ['Master Admin', ...MANAGEMENT_ROLES], color: 'orange' },
{ name: 'Data Pelamar', icon: Users, page: 'Applicants', roles: ['Master Admin', ...MANAGEMENT_ROLES] },
{ name: 'PKWT Karyawan', icon: FileCheck, page: 'PKWTPage', roles: ['Master Admin', ...MANAGEMENT_ROLES], color: 'orange' },
{ name: 'Data Karyawan', icon: UserCircle, page: 'Employees', roles: ['Master Admin', ...MANAGEMENT_ROLES] },
{ name: 'Karyawan Area', icon: Users, page: 'AreaEmployees', roles: ['Master Admin', ...MANAGEMENT_ROLES, ...LEADER_ROLES] },
{ name: 'Slip Gaji', icon: CreditCard, page: 'Payslip', roles: ['Master Admin', ...MANAGEMENT_ROLES], color: 'orange' },
{ name: 'Laporan PDF', icon: FileText, page: 'LaporanBulanan', roles: ['Master Admin', ...MANAGEMENT_ROLES, ...LEADER_ROLES], color: 'orange' },
{ name: 'Performa & Analytics', icon: LayoutDashboard, page: 'PerformaDashboard', roles: ['Master Admin', ...MANAGEMENT_ROLES, ...LEADER_ROLES] },
{ name: 'Inventaris', icon: Boxes, page: 'Inventory', roles: ['Master Admin', ...MANAGEMENT_ROLES] },
{ name: 'Monitor Darurat', icon: AlertTriangle, page: 'PanicAlertMonitor', roles: ['Master Admin', ...MANAGEMENT_ROLES], color: 'red' },
{
  name: 'Operasional', icon: Shield,
  roles: ['Master Admin', ...MANAGEMENT_ROLES, ...LEADER_ROLES],
  children: [
    { name: 'E-Absensi', icon: CalendarClock, page: 'Attendance' },
    { name: 'Jadwal Shift', icon: CalendarClock, page: 'ShiftSchedule' },
    { name: 'Validasi Timesheet', icon: ClipboardCheck, page: 'TimesheetValidation', roles: ['Master Admin', ...MANAGEMENT_ROLES] },
    { name: 'Dashboard Absensi', icon: BarChart2, page: 'AttendanceDashboard', roles: ['Master Admin', ...MANAGEMENT_ROLES] },
    { name: 'E-Patroli', icon: Shield, page: 'EPatrol' },
    { name: 'E-Facility', icon: ClipboardCheck, page: 'EFacility' },
    { name: 'Daily Checklist', icon: ClipboardCheck, page: 'DailyChecklist' },
    { name: 'Laporan Harian', icon: NotebookPen, page: 'LaporanHarian' },
    { name: 'Serah Terima Shift', icon: ArrowLeftRight, page: 'ShiftHandoverPage' },
    { name: 'Penugasan', icon: ListChecks, page: 'AssignmentPage' },
    { name: 'Task Board', icon: Kanban, page: 'TaskBoard' },
    { name: 'Ticketing Fasilitas', icon: Wrench, page: 'FacilityTicketing' },
    { name: 'Cuti & Izin', icon: CalendarDays, page: 'Cuti' },
    { name: 'Tukar Shift', icon: ArrowLeftRight, page: 'ShiftSwap' },
    { name: 'Analitik Patroli', icon: BarChart2, page: 'EPatrolAnalytics' },
    { name: 'Penilaian Kinerja', icon: Star, page: 'PerformanceReviewPage' },

    { name: 'Mutasi Aset', icon: ArrowLeftRight, page: 'AssetMutationPage' },
  ]
},
{
  name: 'Checklist', icon: ClipboardCheck,
  roles: ['Master Admin', ...MANAGEMENT_ROLES, ...LEADER_ROLES],
  children: [
    { name: 'Hydrant & APAR', icon: Droplets, page: 'ChecklistHydrant' },
    { name: 'Box Emergency', icon: ClipboardCheck, page: 'ChecklistEmergency' },
    { name: 'KR 2/4', icon: Car, page: 'ChecklistKR' },
    { name: 'Checklist Toilet', icon: Sparkles, page: 'ChecklistToilet' },
    { name: 'Checklist SOP', icon: ClipboardList, page: 'SOPChecklistPage' },
    { name: 'Buku Tamu', icon: BookOpen, page: 'GuestBook' },
    { name: 'Paket Tenant', icon: Package, page: 'TenantPackage' },
    { name: 'Laporan Penyewa', icon: MessageSquare, page: 'TenantReportPage' },
  ]
},
{ name: 'Dashboard Strategis', icon: TrendingUp, page: 'AdminStrategicDashboard', roles: ['Master Admin', ...MANAGEMENT_ROLES], color: 'orange' },
{ name: 'Archive Data', icon: Archive, page: 'DataArchive', roles: ['Master Admin'], color: 'blue' },
{ name: 'Migrasi Server', icon: Server, page: 'MigrasiServer', roles: ['Master Admin'] },
{ name: 'Pengaturan', icon: Settings, page: 'AppSettings', roles: ['Master Admin'] },
{ name: 'Panduan Prompt VS Code', icon: Code2, page: 'PromptGuide', roles: ['Master Admin'], color: 'blue' }];


export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState({});
  const [patrolTemplates, setPatrolTemplates] = useState([]);

  const publicPages = ['ApplyJob', 'EmployeeLogin', 'InputAbsensi', 'ApplyJobStatus'];
  const isPublicPage = publicPages.includes(currentPageName);

  // Gunakan hook yang selalu sinkron dengan DB
  const { employee, logout: handleLogout } = useEmployee({
    redirectIfNotFound: !isPublicPage,
    publicPage: isPublicPage
  });

  useEffect(() => {
    if (isPublicPage || !employee) return;
    // Fetch active patrol templates berdasarkan area employee terbaru dari DB
    base44.entities.EPatrolTemplate.filter({ status: 'Aktif' })
      .then(templates => {
        const empArea = employee?.area_tugas || '';
        setPatrolTemplates(templates.filter(t => !t.area_tugas || t.area_tugas === empArea));
      })
      .catch(() => {});
  }, [employee?.area_tugas, isPublicPage]);

  if (publicPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  const toggleSubmenu = (name) => {
    setExpandedMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isMasterAdmin = employee?.role === 'Master Admin' || employee?.jabatan === 'Master Admin';
  const empRole = employee?.role || employee?.jabatan || '';
  const isManagement = MANAGEMENT_ROLES.includes(empRole);
  const isLeader = LEADER_ROLES.includes(empRole);
  const isPrivileged = isMasterAdmin || isManagement || isLeader;

  const canSeeItem = (item) => {
    if (item.staffOnly) return !isPrivileged;
    if (item.roles) return item.roles.includes(empRole) || isMasterAdmin;
    // items with no roles restriction: visible to privileged only
    return isPrivileged;
  };

  const renderMenuItem = (item) => {
    if (!canSeeItem(item)) return null;
    if (item.children) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSubmenu(item.name)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-all">

            <div className="flex items-center gap-3">
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </div>
            {expandedMenus[item.name] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          <AnimatePresence>
            {expandedMenus[item.name] &&
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="ml-4 overflow-hidden">

                {item.children.filter(child => !child.roles || child.roles.includes(empRole) || isMasterAdmin).map((child) =>
              <Link
                key={child.page}
                to={createPageUrl(child.page)}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                currentPageName === child.page ?
                'bg-amber-700 text-white font-medium' :
                'text-gray-400 hover:bg-gray-800 hover:text-white'}`
                }>

                    <child.icon className="w-3.5 h-3.5" />
                    <span>{child.name}</span>
                  </Link>
              )}
              </motion.div>
            }
          </AnimatePresence>
        </div>);

    }

    const isActive = currentPageName === item.page;
    const isOrange = item.color === 'orange';
    return (
      <Link
        key={item.page}
        to={createPageUrl(item.page)}
        onClick={() => setSidebarOpen(false)}
        className={`px-3 py-2.5 text-sm font-medium rounded-xl flex items-center gap-3 transition-all ${isActive ? 'bg-amber-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'} ${isOrange ? 'border-l-2 border-amber-500' : ''} ${item.color === 'blue' ? 'border-l-2 border-blue-400' : ''}`}>






        <item.icon className="w-4 h-4" />
        <span>{item.name}</span>
      </Link>);

  };

  return (
    <div className="min-h-screen bg-gray-50/80 flex">
      {sidebarOpen &&
      <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      }

      <aside className={`fixed top-0 left-0 h-full w-64 bg-gray-900 z-50 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="bg-transparent p-5 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="PIS" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-base font-bold text-white">INTEGRATED</h1>
              <CompanyNameAnimator />
            </div>
          </div>
        </div>

        {employee &&
        <div className="bg-transparent px-4 py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="bg-red-800 rounded-full w-9 h-9 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{(employee?.nama_lengkap || 'A')[0]}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{employee?.nama_lengkap || 'Admin'}</p>
                <p className="text-slate-50 truncate">{employee?.nik_karyawan}</p>
                <p className="text-slate-50 truncate">{employee?.jabatan || employee?.role || ''}</p>
              </div>
            </div>
          </div>
        }

        <DraggableSidebar
          menuItems={menuItems}
          currentPageName={currentPageName}
          employee={employee}
          onClose={() => setSidebarOpen(false)}
          patrolTemplates={patrolTemplates}
        />

        <div className="bg-transparent p-3 border-t border-gray-700">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:bg-gray-800 hover:text-red-400 transition-all">
            <LogOut className="w-4 h-4" />
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      <div className="lg:ml-64 flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:px-6">
          <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--maroon)] hidden sm:block" />
            <h2 className="text-sm font-semibold text-gray-700">
              {currentPageName === 'EPatrolTemplateAdmin'
                ? 'Template E-Patroli'
                : currentPageName === 'EPatrolCustomPage'
                  ? (patrolTemplates.find(t => window.location.search.includes(t.id))?.nama_template || 'E-Patroli Custom')
                  : menuItems.flatMap((m) => m.children ? [m, ...m.children] : [m]).find((m) => m.page === currentPageName)?.name || currentPageName}
            </h2>
          </div>
          <NotificationBell employee={employee} />
        </header>
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>);

}