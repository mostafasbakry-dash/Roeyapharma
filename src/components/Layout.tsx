import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Store, 
  PackagePlus, 
  ClipboardList, 
  FileBarChart,
  User, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Languages,
  Shield,
  Users,
  Package,
  Star
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Header } from './Header';
import { getSupabase } from '@/src/lib/supabase';

interface SidebarItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active?: boolean;
  [key: string]: any;
}

const SidebarItem = ({ to, icon: Icon, label, active }: SidebarItemProps) => (
  <Link
    to={to}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
      active 
        ? "bg-primary text-white shadow-md" 
        : "text-slate-600 hover:bg-slate-100"
    )}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('is_admin') === 'true');
  const [logoError, setLogoError] = useState(false);
  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    const verifyRole = async () => {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: { user } } = await supabase.auth.getUser();
      const ADMIN_UID = '4efb8f31-0cb3-4333-8a25-42aa69a02149';
      
      if (user && user.id === ADMIN_UID) {
        setIsAdmin(true);
        localStorage.setItem('is_admin', 'true');
      } else {
        setIsAdmin(false);
        localStorage.removeItem('is_admin');
      }
    };

    verifyRole();
  }, [location.pathname]);

  const pharmacyMenuItems = [
    { to: '/', icon: LayoutDashboard, label: t('dashboard') },
    { to: '/marketplace', icon: Store, label: t('marketplace') },
    { to: '/my-offers', icon: PackagePlus, label: t('my_offers') },
    { to: '/my-requests', icon: ClipboardList, label: t('my_requests') },
    { to: '/reports', icon: FileBarChart, label: t('reports') },
    { to: '/profile', icon: User, label: t('profile') },
    { to: '/settings', icon: Settings, label: t('settings') },
  ];

  const adminMenuItems = [
    { to: '/admin-control-panel-988', icon: Shield, label: 'Admin Dashboard' },
    { to: '/admin-control-panel-988?tab=pending', icon: Package, label: 'Pending Items' },
    { to: '/admin-control-panel-988?tab=pharmacies', icon: Users, label: 'Pharmacies' },
    { to: '/admin-control-panel-988?tab=marketplace', icon: Store, label: 'Marketplace' },
    { to: '/admin-control-panel-988?tab=ratings', icon: Star, label: 'Ratings' },
  ];

  const menuItems = isAdmin ? adminMenuItems : pharmacyMenuItems;

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [isRtl, i18n.language]);

  const handleLogout = () => {
    localStorage.removeItem('pharmacy_id');
    localStorage.removeItem('user_credentials');
    localStorage.removeItem('is_admin');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('pharmacy_profile');
    navigate('/login');
  };

  return (
    <div className={cn("min-h-screen flex bg-slate-50", isRtl ? "rtl" : "ltr")}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-e border-slate-200 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
            {!logoError ? (
              <img 
                src="https://ncpqhkoljjikqrgtelbv.supabase.co/storage/v1/object/public/logo/logo.png" 
                alt="Roeya Logo" 
                className="w-full h-full object-contain" 
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="text-primary font-bold text-xl">R</div>
            )}
          </div>
          <div>
            <h1 className="font-bold text-xl text-primary leading-tight">{t('app_name')}</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{t('tagline')}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {menuItems.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              active={location.pathname === item.to}
            />
          ))}
        </nav>

        <div className="pt-4 border-t border-slate-100 space-y-1">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Languages size={20} />
            <span className="font-medium">{i18n.language === 'ar' ? 'English' : 'العربية'}</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-1 flex flex-col min-h-screen pb-16 md:pb-0">
        <header className="md:hidden bg-white border-b border-slate-200 p-3 flex items-center justify-between sticky top-0 z-50 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
              {!logoError ? (
                <img 
                  src="https://ncpqhkoljjikqrgtelbv.supabase.co/storage/v1/object/public/logo/logo.png" 
                  alt="Roeya Logo" 
                  className="w-full h-full object-contain" 
                  referrerPolicy="no-referrer"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="text-primary font-bold text-lg">R</div>
              )}
            </div>
            <h1 className="font-bold text-lg text-primary tracking-tight">{t('app_name')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              title={i18n.language === 'ar' ? 'English' : 'العربية'}
            >
              <Languages size={20} />
            </button>
            <Link to="/profile" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <User size={20} />
            </Link>
            <Link to="/settings" className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Settings size={20} />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="hidden md:block">
          <Header />
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex items-center justify-around h-16 z-50 px-2">
          {menuItems.slice(0, 5).map((item) => {
            const isActive = item.to.includes('?') 
              ? (location.pathname + location.search) === item.to
              : location.pathname === item.to;
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-slate-400"
                )}
              >
                <item.icon size={20} className={cn(isActive && "scale-110 transition-transform")} />
                <span className="text-[10px] font-medium truncate w-full text-center px-1">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
