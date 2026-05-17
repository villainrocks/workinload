/* This code fixed By Tg:@ImxCodex */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from './ui/Spinner';

const PermissionGate = ({ permission, redirectTo = '/dashboard', children }) => {
  const { hasPermission, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!hasPermission(permission)) return <Navigate to={redirectTo} replace />;

  return children;
};

export default PermissionGate;
