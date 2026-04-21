import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import VehicleFormPage from './pages/VehicleForm';
import VendorFormPageComp from './pages/VendorFormPage';
import ItemFormPageComp from './pages/ItemFormPage';
import BillFormPageComp from './pages/BillFormPage';
import MaintenanceRecordFormPageComp from './pages/MaintenanceRecordFormPage';
import MaintenanceIntervalFormPageComp from './pages/MaintenanceIntervalFormPage';
import SystemUpdatesPage from './pages/SystemUpdates';
import FleetExportPage from './pages/FleetExport';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { PermissionsProvider } from '@/hooks/usePagePermissions.jsx';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
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
      <Route path="/VehicleForm" element={<LayoutWrapper currentPageName="VehicleForm"><VehicleFormPage /></LayoutWrapper>} />
      <Route path="/VendorFormPage" element={<LayoutWrapper currentPageName="VendorFormPage"><VendorFormPageComp /></LayoutWrapper>} />
      <Route path="/ItemFormPage" element={<LayoutWrapper currentPageName="ItemFormPage"><ItemFormPageComp /></LayoutWrapper>} />
      <Route path="/BillFormPage" element={<LayoutWrapper currentPageName="BillFormPage"><BillFormPageComp /></LayoutWrapper>} />
      <Route path="/MaintenanceRecordFormPage" element={<LayoutWrapper currentPageName="MaintenanceRecordFormPage"><MaintenanceRecordFormPageComp /></LayoutWrapper>} />
      <Route path="/MaintenanceIntervalFormPage" element={<LayoutWrapper currentPageName="MaintenanceIntervalFormPage"><MaintenanceIntervalFormPageComp /></LayoutWrapper>} />
      <Route path="/SystemUpdates" element={<LayoutWrapper currentPageName="SystemUpdates"><SystemUpdatesPage /></LayoutWrapper>} />
      <Route path="/FleetExport" element={<LayoutWrapper currentPageName="FleetExport"><FleetExportPage /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <PermissionsProvider>
          <NavigationTracker />
          <AuthenticatedApp />
          </PermissionsProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App