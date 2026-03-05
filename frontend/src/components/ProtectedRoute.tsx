import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '../store/hooks';
import { KasaLogo } from './KasaLogo';
import { NavBar } from './NavBar';
import { Sidebar } from './Sidebar';

export function ProtectedRoute() {
  const { isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kasa-light dark:bg-slate-950">
        <KasaLogo loading className="h-16 w-auto" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/connexion" replace />;
  }

  return (
    <div className="h-screen bg-kasa-light dark:bg-slate-950 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <NavBar />
        <div className="flex-1 dark:bg-kasa-light/5 bg-slate-950/5 mr-2 mb-2 rounded-2xl min-h-0 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
