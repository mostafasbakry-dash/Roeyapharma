import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Loader2, Building } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { getSupabase } from '@/src/lib/supabase';

export const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });

  const clearSession = async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.clear();
    sessionStorage.clear();
    console.log('Session cleared before login attempt');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // 1. Global Auth Reset
    await clearSession();
    
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Connection error');
      setLoading(false);
      return;
    }

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const ADMIN_EMAIL = 'mostafa_ph2009@yahoo.com';

    try {
      // --- ADMIN PATH ---
      if (normalizedEmail === ADMIN_EMAIL) {
        console.log('Admin path detected');
        let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: credentials.password
        });

        // Forced Login Fallback for Admin
        if (authError) {
          console.log('Attempting forced login with updated password...');
          const forcedResult = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: '2011988REEmy@'
          });
          if (!forcedResult.error) {
            authData = forcedResult.data;
            authError = null;
          }
        }

        if (authError) {
          toast.error(authError.message);
          setLoading(false);
          return;
        }

        const user = authData.user;
        if (!user) throw new Error('No user returned');

        // Strict UID Guarding for Super Admin
        const ADMIN_UID = '4efb8f31-0cb3-4333-8a25-42aa69a02149';
        if (user.id === ADMIN_UID) {
          localStorage.setItem('is_admin', 'true');
          localStorage.setItem('admin_email', normalizedEmail);
          localStorage.setItem('pharmacy_id', 'admin');
          toast.success('Welcome Super Admin!');
          navigate('/admin-control-panel-988');
          return;
        } else {
          toast.error('Unauthorized admin access');
          setLoading(false);
          return;
        }
      }

      // --- PHARMACY PATH ---
      console.log('Pharmacy path detected');
      
      // 1. Check custom credentials table directly
      const { data: credentialData, error: credentialError } = await supabase
        .from('credentials')
        .select('pharmacy_id, email, password')
        .ilike('email', normalizedEmail)
        .maybeSingle();

      if (credentialError && credentialError.code !== 'PGRST116') {
        console.error('Credential fetch error:', credentialError);
      }

      if (!credentialData) {
        toast.error(t('login_email_not_found'));
        setLoading(false);
        return;
      }

      // 2. Manual Password Verification
      if (credentialData.password !== credentials.password) {
        toast.error('Invalid password');
        setLoading(false);
        return;
      }

      // 3. Fetch Pharmacy Profile
      const { data: profileData, error: profileError } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('pharmacy_id', credentialData.pharmacy_id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }

      if (!profileData) {
        console.warn('Profile not found, using credential data');
        localStorage.setItem('pharmacy_id', credentialData.pharmacy_id.toString());
        localStorage.setItem('pharmacy_profile', JSON.stringify({
          id: credentialData.pharmacy_id.toString(),
          name: 'Pharmacy User',
          city: 'Cairo',
          address: ''
        }));
      } else {
        // Update last_login
        await supabase
          .from('pharmacies')
          .update({ last_login: new Date().toISOString() })
          .eq('pharmacy_id', profileData.pharmacy_id);

        localStorage.setItem('pharmacy_id', profileData.pharmacy_id.toString());
        localStorage.setItem('pharmacy_profile', JSON.stringify({
          id: profileData.pharmacy_id.toString(),
          name: profileData.pharmacy_name,
          city: profileData.city,
          address: profileData.address,
          phone: profileData.phone,
          telegram: profileData.telegram
        }));
      }

      localStorage.removeItem('is_admin'); // Explicitly ensure no admin flag
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      toast.error('An error occurred during login');
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
          <h2 className="text-2xl font-bold">{t('login')}</h2>
          <p className="text-white/70 text-sm mt-2">Access your pharmacy dashboard</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  value={credentials.email}
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
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              disabled={loading}
              className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : t('login')}
            </button>
            <p className="text-center text-sm text-slate-500">
              Don't have an account? <Link to="/register" className="text-primary font-bold">Register</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
