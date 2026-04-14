import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, Building, CreditCard, Send, Loader2 } from 'lucide-react';
import { EGYPT_GOVERNORATES, EGYPT_LOCATIONS } from '@/src/lib/locations';
import { SearchableSelect } from '@/src/components/SearchableSelect';
import { toast } from 'react-hot-toast';
import { getSupabase } from '@/src/lib/supabase';

export const Registration = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Clear any existing sessions before starting registration
  React.useEffect(() => {
    localStorage.removeItem('is_admin');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('pharmacy_id');
    localStorage.removeItem('temp_pharmacy_id');
    localStorage.removeItem('pharmacy_profile');
  }, []);
  
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    governorate: '',
    city: '',
    address: '',
    license_no: '',
    telegram: '',
  });

  const availableCities = useMemo(() => {
    if (!profile.governorate) return [];
    return EGYPT_LOCATIONS[profile.governorate] || [];
  }, [profile.governorate]);

  const handleRegisterCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      // Generate a unique numeric pharmacy_id based on timestamp
      const pharmacy_id = Math.floor(Date.now() / 1000);
      const normalizedEmail = credentials.email.trim().toLowerCase();
      
      console.log('[APP-DEBUG][AUTH] Starting SignUp for:', normalizedEmail);
      
      // 1. Supabase Auth Sign Up
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: credentials.password,
      });

      if (authError) {
        console.error('[APP-DEBUG][AUTH] SignUp Error:', authError);
        if (authError.message.includes('already registered')) {
          toast.error(t('register_email_exists'));
        } else {
          toast.error(authError.message);
        }
        return;
      }

      // Ensure user was created or at least request sent
      if (!authData.user && !authData.session) {
        // In some cases (email confirmation), user might be null but error is null too
        console.log('[APP-DEBUG][AUTH] SignUp successful (Pending confirmation or session-less)');
      }
      
      localStorage.setItem('temp_pharmacy_id', pharmacy_id.toString());
      localStorage.setItem('temp_email', normalizedEmail);
      setStep(2);
      toast.success(t('register_success_step1'));
    } catch (err: any) {
      console.error('[APP-DEBUG][AUTH] Unexpected SignUp Error:', err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const pharmacy_id_str = localStorage.getItem('temp_pharmacy_id');
      const pharmacy_id = pharmacy_id_str ? parseInt(pharmacy_id_str) : 0;
      const normalizedEmail = localStorage.getItem('temp_email') || credentials.email.trim().toLowerCase();
      
      // DEBUGGING: Check session status
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[APP-DEBUG][AUTH] Session status before profile save:', session ? 'ACTIVE' : 'NONE (Anon Mode)');
      console.log('[APP-DEBUG][REGISTRATION] Using Pharmacy ID:', pharmacy_id);

      // 2. Insert into pharmacies table
      const { error: pharmacyError } = await supabase
        .from('pharmacies')
        .insert([{
          pharmacy_name: profile.name,
          email: normalizedEmail,
          pharmacy_id: Number(pharmacy_id),
          phone: profile.phone.replace(/\D/g, '') ? Number(profile.phone.replace(/\D/g, '')) : 0,
          address: profile.address,
          governorate: profile.governorate,
          city: profile.city,
          license_no: profile.license_no.replace(/\D/g, '') ? Number(profile.license_no.replace(/\D/g, '')) : 0,
          telegram: profile.telegram,
          status: false
        }]);

      if (pharmacyError) {
        console.error('[APP-DEBUG][SUPABASE] Pharmacy insert failed:', pharmacyError);
        throw pharmacyError;
      }

      // 3. Insert into credentials table
      const { error: credentialsError } = await supabase
        .from('credentials')
        .insert([{
          email: normalizedEmail,
          password: credentials.password,
          pharmacy_id: Number(pharmacy_id)
        }]);

      if (credentialsError) {
        console.error('[APP-DEBUG][SUPABASE] Credentials insert failed:', credentialsError);
        throw credentialsError;
      }
      
      localStorage.setItem('pharmacy_id', pharmacy_id.toString());
      localStorage.setItem('pharmacy_profile', JSON.stringify(profile));
      localStorage.removeItem('is_admin'); 
      localStorage.removeItem('admin_email');
      localStorage.removeItem('temp_pharmacy_id');
      localStorage.removeItem('temp_email');
      
      toast.success(t('register_success_complete'));
      navigate('/');
    } catch (err: any) {
      console.error('[APP-DEBUG][GLOBAL-ERROR] Registration flow failed:', err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-primary p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Building size={32} />
          </div>
          <h2 className="text-2xl font-bold">{t('register')}</h2>
          <p className="text-white/70 text-sm mt-2">
            {step === 1 ? t('register_step1_tagline') : t('register_step2_tagline')}
          </p>
        </div>

        <div className="p-8">
          {step === 1 ? (
            <form onSubmit={handleRegisterCredentials} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={credentials.email || ''}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    placeholder="pharmacy@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('password')}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={credentials.password || ''}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 px-1 py-2">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer"
                  />
                </div>
                <label htmlFor="terms" className="text-sm text-slate-600 cursor-pointer">
                  {t('register_agree_terms')} <Link to="/terms" className="text-primary font-bold hover:underline">{t('terms_and_conditions')}</Link>
                </label>
              </div>

              <button
                disabled={loading || !agreedToTerms}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : t('register')}
              </button>
              <p className="text-center text-sm text-slate-500">
                {t('register_already_have_account')} <Link to="/login" className="text-primary font-bold">{t('login')}</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('pharmacy_name')}</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      required
                      value={profile.phone || ''}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <SearchableSelect
                    label={t('governorate') || 'Governorate'}
                    options={EGYPT_GOVERNORATES}
                    value={profile.governorate || ''}
                    onChange={(val) => setProfile({ ...profile, governorate: val, city: '' })}
                    placeholder={t('select_governorate') || 'Select Governorate'}
                    icon={<MapPin size={18} />}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <SearchableSelect
                    label={t('city')}
                    options={availableCities}
                    value={profile.city || ''}
                    onChange={(val) => setProfile({ ...profile, city: val })}
                    placeholder={t('city_placeholder')}
                    disabled={!profile.governorate}
                    icon={<MapPin size={18} />}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('address')}</label>
                  <input
                    required
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('license_no')}</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        required
                        value={profile.license_no || ''}
                        onChange={(e) => setProfile({ ...profile, license_no: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('telegram')}</label>
                    <div className="relative">
                      <Send className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        value={profile.telegram || ''}
                        onChange={(e) => setProfile({ ...profile, telegram: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <button
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : t('save')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
