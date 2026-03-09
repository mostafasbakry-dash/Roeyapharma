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
    console.log('Toggle Language clicked');
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
    console.log('Logout clicked');
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
            <img src="/logo.png" alt="Roeya Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
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
      <div className="flex-1 flex flex-col">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-slate-100">
              <img src="/logo.png" alt="Roeya Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
            <h1 className="font-bold text-lg text-primary">{t('app_name')}</h1>
          </div>
          <button
            onClick={() => {
              console.log('Mobile Menu Toggle clicked');
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        <Header />

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 p-4">
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    console.log(`Mobile Menu Link clicked: ${item.to}`);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl transition-colors",
                    location.pathname === item.to 
                      ? "bg-primary text-white" 
                      : "text-slate-600 bg-slate-50"
                  )}
                >
                  <item.icon size={24} />
                  <span className="font-semibold text-lg">{item.label}</span>
                </Link>
              ))}
              <div className="pt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    toggleLanguage();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 p-4 bg-slate-100 text-slate-600 rounded-xl font-medium"
                >
                  <Languages size={20} />
                  {i18n.language === 'ar' ? 'English' : 'العربية'}
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-xl font-medium"
                >
                  <LogOut size={20} />
                  {t('logout')}
                </button>
              </div>
            </nav>
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
};
