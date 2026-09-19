import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { LanguageProvider } from './context/LanguageContext';
import DisclaimerBanner from './components/DisclaimerBanner';

// Pages
import LoginPage from './pages/LoginPage';
import AshaDashboard from './pages/AshaDashboard';
import HouseholdsPage from './pages/HouseholdsPage';
import HouseholdDetailsPage from './pages/HouseholdDetailsPage';
import HouseholdHistoryPage from './pages/HouseholdHistoryPage';
import NewEncounter from './pages/NewEncounter';
import EncounterReview from './pages/EncounterReview';
import ProgrammeOutputs from './pages/ProgrammeOutputs';
import FollowupsPage from './pages/FollowupsPage';
import EncounterHistory from './pages/EncounterHistory';
import EncounterDetails from './pages/EncounterDetails';
import OfflineSyncPage from './pages/OfflineSyncPage';
import ImpactAnalytics from './pages/ImpactAnalytics';
import AdminHistoryPage from './pages/AdminHistoryPage';
import AdminOperationsPage from './pages/AdminOperationsPage';
import SafetyGovernancePage from './pages/SafetyGovernancePage';
import PrivacySafetyPage from './pages/PrivacySafetyPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import DataRetrievalPage from './pages/DataRetrievalPage';


function ProtectedRoute({ children, requiredRole }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    if (user?.role === 'admin') {
      return <Navigate to="/admin/history" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If user is admin and navigates to default ASHA paths, redirect to admin home
  if (user?.role === 'admin' && (location.pathname === '/' || location.pathname === '/dashboard')) {
    return <Navigate to="/admin/history" replace />;
  }

  return children;
}

import Sidebar from './components/layout/Sidebar';
import TopNav from './components/layout/TopNav';

function Layout({ children }) {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <DisclaimerBanner />
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 selection:bg-teal-100 selection:text-teal-900">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
        isMobileOpen={isMobileMenuOpen} 
        setIsMobileOpen={setIsMobileMenuOpen} 
      />
      
      <div className="flex-1 flex flex-col min-w-0">
        <DisclaimerBanner />
        <TopNav onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-slate-200/80 bg-white py-4 px-6 text-center text-xs text-slate-500 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="font-semibold text-slate-700">
              ASHA OneCapture — "One Visit. One Entry. Multiple Records."
            </p>
            <p className="text-[11px] text-slate-400">
              KALACHAKRA 2K26 Healthcare & Biotech Track • PS-H02 ONE WORKER, FIVE SYSTEMS
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacySafetyPage />} />

        {/* Frontline ASHA Routes */}
        <Route path="/" element={<ProtectedRoute><Navigate to={user?.role === 'admin' ? '/admin/history' : '/dashboard'} replace /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute requiredRole="asha"><AshaDashboard /></ProtectedRoute>} />
        <Route path="/households" element={<ProtectedRoute requiredRole="asha"><HouseholdsPage /></ProtectedRoute>} />
        <Route path="/households/:id" element={<ProtectedRoute requiredRole="asha"><HouseholdDetailsPage /></ProtectedRoute>} />
        <Route path="/households/:id/history" element={<ProtectedRoute><HouseholdHistoryPage /></ProtectedRoute>} />
        <Route path="/households/:id/visit" element={<ProtectedRoute requiredRole="asha"><NewEncounter /></ProtectedRoute>} />
        <Route path="/encounters/new" element={<ProtectedRoute requiredRole="asha"><NewEncounter /></ProtectedRoute>} />
        <Route path="/encounters/review" element={<ProtectedRoute requiredRole="asha"><EncounterReview /></ProtectedRoute>} />
        <Route path="/encounters/:id/review" element={<ProtectedRoute requiredRole="asha"><EncounterReview /></ProtectedRoute>} />
        <Route path="/encounters/:id/reports" element={<ProtectedRoute><ProgrammeOutputs /></ProtectedRoute>} />
        <Route path="/encounters/:id/records" element={<ProtectedRoute><ProgrammeOutputs /></ProtectedRoute>} />
        <Route path="/followups" element={<ProtectedRoute requiredRole="asha"><FollowupsPage /></ProtectedRoute>} />
        <Route path="/history" element={<ProtectedRoute requiredRole="asha"><EncounterHistory /></ProtectedRoute>} />
        <Route path="/encounters/:id" element={<ProtectedRoute><EncounterDetails /></ProtectedRoute>} />
        <Route path="/offline-sync" element={<ProtectedRoute requiredRole="asha"><OfflineSyncPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute requiredRole="asha"><ImpactAnalytics /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/retrieval" element={<ProtectedRoute><DataRetrievalPage /></ProtectedRoute>} />

        {/* Admin Routes */}

        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Navigate to="/admin/history" replace /></ProtectedRoute>} />
        <Route path="/admin/history" element={<ProtectedRoute requiredRole="admin"><AdminHistoryPage /></ProtectedRoute>} />
        <Route path="/admin/operations" element={<ProtectedRoute requiredRole="admin"><AdminOperationsPage /></ProtectedRoute>} />
        <Route path="/admin/safety-governance" element={<ProtectedRoute requiredRole="admin"><SafetyGovernancePage /></ProtectedRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<ProtectedRoute><Navigate to={user?.role === 'admin' ? '/admin/history' : '/dashboard'} replace /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <LanguageProvider>
            <AppRoutes />
          </LanguageProvider>
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
