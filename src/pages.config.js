/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AppSettings from './pages/AppSettings';
import Applicants from './pages/Applicants';
import ApplyJob from './pages/ApplyJob';
import ApplyJobStatus from './pages/ApplyJobStatus';
import AreaProjects from './pages/AreaProjects';
import Attendance from './pages/Attendance';
import ChecklistEmergency from './pages/ChecklistEmergency';
import ChecklistHydrant from './pages/ChecklistHydrant';
import ChecklistKR from './pages/ChecklistKR';
import ChecklistToilet from './pages/ChecklistToilet';
import Cuti from './pages/Cuti';
import Dashboard from './pages/Dashboard';
import EFacility from './pages/EFacility';
import EPatrol from './pages/EPatrol';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeLogin from './pages/EmployeeLogin';
import Employees from './pages/Employees';
import FacilityTicketing from './pages/FacilityTicketing';
import GuestBook from './pages/GuestBook';
import InputAbsensi from './pages/InputAbsensi';
import Inventory from './pages/Inventory';
import LaporanBulanan from './pages/LaporanBulanan';
import MyProfile from './pages/MyProfile';
import Payslip from './pages/Payslip';
import PerformaDashboard from './pages/PerformaDashboard';
import ShiftSchedule from './pages/ShiftSchedule';
import TaskBoard from './pages/TaskBoard';
import TenantPackage from './pages/TenantPackage';
import TimesheetValidation from './pages/TimesheetValidation';
import PKWTPage from './pages/PKWTPage';
import AreaContractPage from './pages/AreaContractPage';
import DailyChecklist from './pages/DailyChecklist';
import LaporanHarian from './pages/LaporanHarian';
import PanicAlertMonitor from './pages/PanicAlertMonitor';
import ShiftHandoverPage from './pages/ShiftHandoverPage';
import TenantReportPage from './pages/TenantReportPage';
import EPatrolAnalytics from './pages/EPatrolAnalytics';
import SOPChecklistPage from './pages/SOPChecklistPage';
import AssetMutationPage from './pages/AssetMutationPage';
import ManagerialDashboard from './pages/ManagerialDashboard';
import PerformanceReviewPage from './pages/PerformanceReviewPage';
import MigrasiServer from './pages/MigrasiServer';
import AreaEmployees from './pages/AreaEmployees';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AppSettings": AppSettings,
    "Applicants": Applicants,
    "ApplyJob": ApplyJob,
    "ApplyJobStatus": ApplyJobStatus,
    "AreaProjects": AreaProjects,
    "Attendance": Attendance,
    "ChecklistEmergency": ChecklistEmergency,
    "ChecklistHydrant": ChecklistHydrant,
    "ChecklistKR": ChecklistKR,
    "ChecklistToilet": ChecklistToilet,
    "Cuti": Cuti,
    "Dashboard": Dashboard,
    "EFacility": EFacility,
    "EPatrol": EPatrol,
    "EmployeeDashboard": EmployeeDashboard,
    "EmployeeLogin": EmployeeLogin,
    "Employees": Employees,
    "FacilityTicketing": FacilityTicketing,
    "GuestBook": GuestBook,
    "InputAbsensi": InputAbsensi,
    "Inventory": Inventory,
    "LaporanBulanan": LaporanBulanan,
    "MyProfile": MyProfile,
    "Payslip": Payslip,
    "PerformaDashboard": PerformaDashboard,
    "ShiftSchedule": ShiftSchedule,
    "TaskBoard": TaskBoard,
    "TenantPackage": TenantPackage,
    "TimesheetValidation": TimesheetValidation,
    "PKWTPage": PKWTPage,
    "AreaContractPage": AreaContractPage,
    "DailyChecklist": DailyChecklist,
    "LaporanHarian": LaporanHarian,
    "PanicAlertMonitor": PanicAlertMonitor,
    "ShiftHandoverPage": ShiftHandoverPage,
    "TenantReportPage": TenantReportPage,
    "EPatrolAnalytics": EPatrolAnalytics,
    "SOPChecklistPage": SOPChecklistPage,
    "AssetMutationPage": AssetMutationPage,
    "ManagerialDashboard": ManagerialDashboard,
    "PerformanceReviewPage": PerformanceReviewPage,
    "MigrasiServer": MigrasiServer,
    "AreaEmployees": AreaEmployees,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};