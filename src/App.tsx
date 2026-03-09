import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Marketplace } from './components/Marketplace';
import { MyOffers } from './components/MyOffers';
import { MyRequests } from './components/MyRequests';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { Reports } from './components/Reports';
import { Terms } from './components/Terms';
import { Login } from './components/Login';
import { Registration } from './components/Registration';
import { AdminDashboard } from './components/AdminDashboard';
import { useTranslation } from 'react-i18next';
import { getSupabase } from '@/src/lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const pharmacyId = localStorage.getItem('pharmacy_id');
  if (!pharmacyId) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const ProtectedRouteAdmin = ({ children }: { children: React.ReactNode }) => {
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    const checkAdmin = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setIsAdmin(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      // Strict UID Check for the primary admin
      const ADMIN_UID = '4efb8f31-0cb3-4333-8a25-42aa69a02149';
      if (user.id === ADMIN_UID) {
        setIsAdmin(true);
        localStorage.setItem('is_admin', 'true');
        return;
      }

      // Secondary check against system_admins table
      const { data, error } = await supabase
        .from('system_admins')
        .select('uid')
        .eq('uid', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Admin check error:', error);
      }

      if (!data) {
        setIsAdmin(false);
        localStorage.removeItem('is_admin');
      } else {
        setIsAdmin(true);
        localStorage.setItem('is_admin', 'true');
      }
    };

    checkAdmin();
  }, []);

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (isAdmin === false) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const isRtl = i18n.language === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registration />} />
        <Route path="/terms" element={<Terms />} />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/marketplace" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
        <Route path="/my-offers" element={<ProtectedRoute><MyOffers /></ProtectedRoute>} />
        <Route path="/my-requests" element={<ProtectedRoute><MyRequests /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        
        <Route path="/admin-control-panel-988" element={<ProtectedRouteAdmin><AdminDashboard /></ProtectedRouteAdmin>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
