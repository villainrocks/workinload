/* This code fixed By Tg:@ImxCodex */
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/Spinner';

const PermissionGate = ({ permission, redirectTo, children }) => {
  const { hasPermission, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!hasPermission(permission)) {
    // If a redirectTo is provided and we're not already there, navigate.
    // Otherwise show an Access Denied message to avoid an infinite redirect loop.
    if (redirectTo && redirectTo !== location.pathname) {
      return <Navigate to={redirectTo} replace />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <ShieldOff size={28} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
        <p className="text-slate-400 text-sm max-w-md">
          You don't have permission to access this page. Please contact your administrator
          if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return children;
};

export default PermissionGate;
