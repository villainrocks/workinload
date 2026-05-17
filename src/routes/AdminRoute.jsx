/* This code fixed By Tg:@ImxCodex */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui/Spinner';

const AdminRoute = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <PageLoader />;

  if (!isAuthenticated || user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
