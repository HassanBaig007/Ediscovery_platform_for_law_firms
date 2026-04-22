import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import ReviewPage from './pages/Review';
import SearchPage from './pages/Search';
import ProfilePage from './pages/ProfilePage';
import UserManagementPage from './pages/UserManagementPage';
import ProductionSetsPage from './pages/ProductionSetsPage';
import CustodiansPage from './pages/CustodiansPage';
import TagsPage from './pages/TagsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import DashboardPage from './pages/DashboardPage';
import CaseSettingsPage from './pages/CaseSettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotificationsPage from './pages/NotificationsPage';
import UploadPage from './pages/UploadPage';
import NotFoundPage from './pages/NotFoundPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import TeamPerformancePage from './pages/TeamPerformancePage';
import MyReviewQueuePage from './pages/MyReviewQueuePage';
import ReviewStatisticsPage from './pages/ReviewStatisticsPage';
import PrivilegeLogPage from './pages/PrivilegeLogPage';
import ProcessingStatusPage from './pages/ProcessingStatusPage';
import ChainOfCustodyPage from './pages/ChainOfCustodyPage';
import QualityControlPage from './pages/QualityControlPage';
import ClientPortalPage from './pages/ClientPortalPage';
import BillingPage from './pages/BillingPage';
import IntegrationsPage from './pages/IntegrationsPage';
import LicenseManagementPage from './pages/LicenseManagementPage';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/Layout/MainLayout';

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { useAuthStore } from './store/authStore';

const queryClient = new QueryClient();

function App() {
  const { isAuthenticated, fetchUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUser();
    }
  }, [isAuthenticated, fetchUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
          
          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              {/* Dashboard & Cases */}
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/cases" element={<Cases />} />
              <Route path="/cases/:id" element={<CaseDetail />} />
              
              {/* Case-specific Routes */}
              <Route path="/cases/:id/search" element={<SearchPage />} />
              <Route path="/cases/:id/review" element={<ReviewPage />} />
              <Route path="/cases/:id/upload" element={<UploadPage />} />
              <Route path="/cases/:id/custodians" element={<CustodiansPage />} />
              <Route path="/cases/:id/tags" element={<TagsPage />} />
              <Route path="/cases/:id/productions" element={<ProductionSetsPage />} />
              <Route path="/cases/:id/settings" element={<CaseSettingsPage />} />
              <Route path="/cases/:id/processing-status" element={<ProcessingStatusPage />} />
              <Route path="/cases/:id/chain-of-custody" element={<ChainOfCustodyPage />} />
              <Route path="/cases/:id/quality-control" element={<QualityControlPage />} />
              
              {/* User Routes */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/review-queue" element={<MyReviewQueuePage />} />
              <Route path="/review-statistics" element={<ReviewStatisticsPage />} />
              <Route path="/privilege-log" element={<PrivilegeLogPage />} />
              <Route path="/client-portal" element={<ClientPortalPage />} />
              <Route path="/billing" element={<BillingPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
              <Route path="/admin/settings" element={<SystemSettingsPage />} />
              <Route path="/admin/integrations" element={<IntegrationsPage />} />
              <Route path="/admin/licenses" element={<LicenseManagementPage />} />
              
              {/* Analytics */}
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/team-performance" element={<TeamPerformancePage />} />
              
              {/* Root Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
          
          {/* 404 Not Found */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
