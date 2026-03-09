import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, Building, CreditCard, Send, Loader2 } from 'lucide-react';
import { EGYPT_CITIES } from '@/src/types';
import { toast } from 'react-hot-toast';

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
    city: '',
    address: '',
    license_no: '',
    telegram: '',
  });

  const handleRegisterCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Register Credentials form submitted', credentials);
    setLoading(true);
    try {
      // Generate a unique numeric pharmacy_id based on timestamp
      const pharmacy_id = Math.floor(Date.now() / 1000);
      
      const normalizedEmail = credentials.email.trim().toLowerCase();
      
      const response = await fetch('https://n8n.srv1168218.hstgr.cloud/webhook/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payload: { 
            ...credentials,
            email: normalizedEmail,
            pharmacy_id 
          } 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409 || errorData.message?.toLowerCase().includes('already registered') || errorData.error?.toLowerCase().includes('duplicate')) {
          toast.error('This email is already registered');
          return;
        }
        throw new Error(`Registration failed: ${response.status}`);
      }
      
      localStorage.setItem('temp_pharmacy_id', pharmacy_id.toString());
      setStep(2);
      toast.success('Account created! Now complete your profile.');
    } catch (err: any) {
      console.error('EXACT Registration Error:', err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Save Profile form submitted', profile);
    setLoading(true);
    try {
      const pharmacy_id_str = localStorage.getItem('temp_pharmacy_id');
      const pharmacy_id = pharmacy_id_str ? parseInt(pharmacy_id_str) : 0;
      
      // Send data to n8n webhook to save profile and link with credentials
      // n8n will use the email to find the existing record in the 'credentials' table 
      // and update its 'pharmacy_id' to match the one generated during registration.
      const response = await fetch('https://n8n.srv1168218.hstgr.cloud/webhook/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          payload: { 
            ...profile, 
            pharmacy_id,
            phone: profile.phone.replace(/\D/g, '') ? parseInt(profile.phone.replace(/\D/g, '')) : 0,
            license_no: profile.license_no.replace(/\D/g, '') ? parseInt(profile.license_no.replace(/\D/g, '')) : 0,
            telegram: profile.telegram,
            email: credentials.email.trim().toLowerCase() // Ensure email is trimmed and lowercase for linkage
          } 
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Profile save failed: ${response.status} ${errorText}`);
      }
      
      localStorage.setItem('pharmacy_id', pharmacy_id.toString());
      localStorage.setItem('pharmacy_profile', JSON.stringify(profile));
      localStorage.removeItem('is_admin'); // Explicitly ensure not admin
      localStorage.removeItem('admin_email');
      
      toast.success('Profile completed successfully!');
      navigate('/');
    } catch (err: any) {
      console.error('EXACT Profile Save Error:', err);
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
            {step === 1 ? 'Create your account credentials' : 'Tell us about your pharmacy'}
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
                  {i18n.language === 'ar' ? (
                    <>
                      أوافق على <Link to="/terms" className="text-primary font-bold hover:underline">الشروط والأحكام</Link>
                    </>
                  ) : (
                    <>
                      I agree to the <Link to="/terms" className="text-primary font-bold hover:underline">Terms and Conditions</Link>
                    </>
                  )}
                </label>
              </div>

              <button
                disabled={loading || !agreedToTerms}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : t('register')}
              </button>
              <p className="text-center text-sm text-slate-500">
                Already have an account? <Link to="/login" className="text-primary font-bold">Login</Link>
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
                  <label className="text-xs font-bold text-slate-500 uppercase px-1">{t('city')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                      required
                      value={profile.city || ''}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none appearance-none"
                    >
                      <option value="">{t('city_placeholder')}</option>
                      {EGYPT_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
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
