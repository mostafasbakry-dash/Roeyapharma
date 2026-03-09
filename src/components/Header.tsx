import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Building2, Loader2 } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';

export const Header = () => {
  const { t } = useTranslation();
  const [pharmacy, setPharmacy] = useState<{ name: string; address: string; avatar_url?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPharmacyData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const ADMIN_UID = '4efb8f31-0cb3-4333-8a25-42aa69a02149';
    const isAdmin = user && user.id === ADMIN_UID;
    const adminEmail = localStorage.getItem('admin_email');
    const current_pharmacy_id = localStorage.getItem('pharmacy_id');

    if (isAdmin) {
      setPharmacy({
        name: 'System Administrator',
        address: adminEmail || 'Admin Panel',
        avatar_url: undefined
      });
      setLoading(false);
      return;
    }

    if (!current_pharmacy_id || current_pharmacy_id === 'admin') {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pharmacies')
        .select('pharmacy_name, address, avatar_url, profile_pic')
        .eq('pharmacy_id', current_pharmacy_id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPharmacy({
          name: data.pharmacy_name,
          address: data.address,
          avatar_url: data.avatar_url || data.profile_pic
        });
      }
    } catch (err) {
      console.error('Error fetching pharmacy data for header:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPharmacyData();

    // Listen for profile updates to refresh header data
    const handleProfileUpdate = () => {
      console.log('Profile update detected, refreshing header...');
      fetchPharmacyData();
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, [fetchPharmacyData]);

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm md:sticky md:top-0 z-30 w-full">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
        {loading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm font-medium">Loading pharmacy info...</span>
          </div>
        ) : pharmacy ? (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex w-10 h-10 bg-primary/10 rounded-xl items-center justify-center text-primary overflow-hidden">
              {pharmacy.avatar_url ? (
                <img src={pharmacy.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <Building2 size={20} />
              )}
            </div>
            <div className="flex flex-col">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                {pharmacy.name}
              </h2>
              <div className="flex items-center gap-1 text-slate-500 text-xs md:text-sm">
                <MapPin size={14} className="shrink-0" />
                <span className="truncate max-w-[250px] md:max-w-md">{pharmacy.address}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm italic">
            Pharmacy information not found
          </div>
        )}
        
        <div className="hidden md:block">
          {/* Placeholder for potential right-side header content like notifications or user menu */}
        </div>
      </div>
    </header>
  );
};
