/* This code fixed By Tg:@ImxCodex */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import DashboardLayout from './layouts/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';

import PermissionGate from './components/PermissionGate';

// Pages
import LoginPage      from './pages/LoginPage';
import AccountsPage   from './pages/AccountsPage';
import GeneratorPage  from './pages/GeneratorPage';
import NumberDropPage from './pages/NumberDropPage';
import ActivityLogPage from './pages/ActivityLogPage';
import UsersPage      from './pages/UsersPage';
import AboutPage      from './pages/AboutPage';
import NotFoundPage   from './pages/NotFoundPage';

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/404"   element={<NotFoundPage />} />

            {/* Protected — wrapped in dashboard layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<PermissionGate permission="can_generate"><GeneratorPage /></PermissionGate>} />
                <Route path="/drop"      element={<PermissionGate permission="can_broadcast"><NumberDropPage /></PermissionGate>} />
                <Route path="/accounts"  element={<PermissionGate permission="can_manage_accounts"><AccountsPage /></PermissionGate>} />
                <Route path="/about"     element={<AboutPage />} />

                {/* Permission-gated */}
                <Route path="/logs" element={<PermissionGate permission="can_view_logs"><ActivityLogPage /></PermissionGate>} />

                {/* Admin Only */}
                <Route element={<AdminRoute />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
