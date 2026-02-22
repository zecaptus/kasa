import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../store/hooks';
import { KasaLogo } from './KasaLogo';
import { NavBar } from './NavBar';

export function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <KasaLogo loading className="h-16 w-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  return (
    <>
      <NavBar />
      <Outlet />
    </>
  );
}
