/* This code fixed By Tg:@ImxCodex */
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageLoader } from '../components/ui/Spinner';

/**
 * ProtectedRoute
 *
 * Wraps any routes that require authentication.
 * Three states:
 *  1. loading  → show full-page spinner (auth context hydrating)
 *  2. authed   → render children via <Outlet />
 *  3. not authed → redirect to /login, preserving intended URL
 *                  in location.state so the login page can redirect
 *                  back after successful login.
 */
const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
