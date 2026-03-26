import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Languages, Bell, Shield, HelpCircle, Info, Lock, Loader2 } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';
import { toast } from 'react-hot-toast';

export const Settings = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('settings_pass_mismatch'));
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error(t('settings_pass_min_len'));
      return;
    }

    setLoading(true);
    try {
      const current_user_id = localStorage.getItem('pharmacy_id');
      if (!current_user_id) throw new Error('No pharmacy ID found');

      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const { error } = await supabase
        .from('credentials')
        .update({ 
          password: passwordData.newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('pharmacy_id', Number(current_user_id));

      if (error) throw error;

      toast.success(t('settings_pass_success'));
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-slate-900">{t('settings')}</h1>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-lg text-slate-900">{t('settings_preferences')}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Languages size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('language')}</p>
                  <p className="text-sm text-slate-500">{t('settings_switch_lang')}</p>
                </div>
              </div>
              <button
                onClick={toggleLanguage}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-all"
              >
                {i18n.language === 'ar' ? 'English' : 'العربية'}
              </button>
            </div>

            <div className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Bell size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('settings_notifications')}</p>
                  <p className="text-sm text-slate-500">{t('settings_manage_alerts')}</p>
                </div>
              </div>
              <div className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-lg text-slate-900">{t('settings_security')}</h2>
          </div>
          <div className="p-6">
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1 flex items-center gap-2">
                  <Lock size={14} />
                  {t('settings_new_password')}
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1 flex items-center gap-2">
                  <Lock size={14} />
                  {t('settings_confirm_password')}
                </label>
                <input
                  type="password"
                  required
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : t('settings_update_password')}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-lg text-slate-900">{t('settings_support_legal')}</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <button 
              onClick={() => navigate('/terms')}
              className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-start"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Shield size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('terms_and_conditions')}</p>
                  <p className="text-sm text-slate-500">{t('settings_terms_desc')}</p>
                </div>
              </div>
            </button>
            <button 
              className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-start"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <HelpCircle size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('settings_help_center')}</p>
                  <p className="text-sm text-slate-500">{t('settings_faqs')}</p>
                </div>
              </div>
            </button>
            <button 
              className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-start"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
                  <Info size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('settings_about')}</p>
                  <p className="text-sm text-slate-500">{t('settings_version')} 1.0.0</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
