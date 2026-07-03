import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import AttendanceDashboard from './pages/AttendanceDashboard';
import PerformanceReviewPage from './pages/PerformanceReviewPage';
import AdminStrategicDashboard from './pages/AdminStrategicDashboard';
import AssignmentPage from './pages/AssignmentPage';
import EPatrolTemplateAdmin from './pages/EPatrolTemplateAdmin';
import EPatrolCustomPage from './pages/EPatrolCustomPage';
import ShiftSwapPage from './pages/ShiftSwap';
import DataArchive from './pages/DataArchive';
import PromptGuide from './pages/PromptGuide';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {

  // Render the main app directly — auth is handled per-page via localStorage (pis_employee)
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/AttendanceDashboard" element={<LayoutWrapper currentPageName="AttendanceDashboard"><AttendanceDashboard /></LayoutWrapper>} />
      <Route path="/PerformanceReviewPage" element={<LayoutWrapper currentPageName="PerformanceReviewPage"><PerformanceReviewPage /></LayoutWrapper>} />
      <Route path="/AdminStrategicDashboard" element={<LayoutWrapper currentPageName="AdminStrategicDashboard"><AdminStrategicDashboard /></LayoutWrapper>} />
      <Route path="/AssignmentPage" element={<LayoutWrapper currentPageName="AssignmentPage"><AssignmentPage /></LayoutWrapper>} />
      <Route path="/EPatrolTemplateAdmin" element={<LayoutWrapper currentPageName="EPatrolTemplateAdmin"><EPatrolTemplateAdmin /></LayoutWrapper>} />
      <Route path="/EPatrolCustomPage" element={<LayoutWrapper currentPageName="EPatrolCustomPage"><EPatrolCustomPage /></LayoutWrapper>} />
      <Route path="/ShiftSwap" element={<LayoutWrapper currentPageName="ShiftSwap"><ShiftSwapPage /></LayoutWrapper>} />
      <Route path="/DataArchive" element={<LayoutWrapper currentPageName="DataArchive"><DataArchive /></LayoutWrapper>} />
      <Route path="/PromptGuide" element={<LayoutWrapper currentPageName="PromptGuide"><PromptGuide /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App