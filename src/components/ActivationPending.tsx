import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, MessageCircle, LogOut, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '@/src/lib/supabase';

export const ActivationPending = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRtl = i18n.language === 'ar';

  const handleLogout = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="bg-primary p-12 text-white text-center relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-40 h-40 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/30 shadow-xl animate-pulse">
            <Clock size={48} className="text-white" />
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('activation_title')}
          </h2>
          <div className="h-1 w-20 bg-white/40 mx-auto rounded-full"></div>
        </div>

        <div className="p-10 md:p-14 space-y-8">
          <div className={isRtl ? 'text-right' : 'text-left'}>
            <p className="text-xl md:text-2xl text-slate-700 leading-relaxed font-medium mb-8">
              {t('activation_message')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="https://t.me/RoeyaAdmin" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 py-4 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200"
            >
              <MessageCircle size={22} />
              <span>{t('activation_contact_admin')}</span>
            </a>
            
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold transition-all"
            >
              <LogOut size={22} />
              <span>{t('logout')}</span>
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-sm">
            <ShieldAlert size={16} />
            <span>{t('activation_security_system')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
