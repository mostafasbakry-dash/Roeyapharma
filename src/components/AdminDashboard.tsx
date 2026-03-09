import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Shield, 
  Users, 
  Package, 
  CheckCircle, 
  Trash2, 
  AlertTriangle, 
  BarChart3, 
  Search, 
  Plus, 
  Loader2, 
  X,
  Store,
  ClipboardList,
  TrendingUp,
  UserPlus,
  Ban,
  Star
} from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/src/lib/utils';

// --- Types ---
interface PendingItem {
  id: number;
  arabic_name: string;
  english_name: string;
  brand: string;
  price: number;
  barcode: string;
  final_category?: string;
  added_by: string;
  created_at: string;
}

interface Pharmacy {
  pharmacy_id: string;
  pharmacy_name: string;
  phone: string;
  city: string;
  address: string;
  account_status: string;
  last_login?: string;
  created_at: string;
}

interface Admin {
  id: string;
  uid: string;
  email: string;
  created_at: string;
}

interface MarketItem {
  id: number;
  arabic_name: string;
  english_name: string;
  pharmacies?: {
    pharmacy_name: string;
  };
  pharmacy_name?: string;
  created_at?: string;
}

interface Rating {
  id: number;
  from_pharmacy_id: number;
  to_pharmacy_id: number;
  stars: number;
  comment: string;
  created_at: string;
  from_pharmacy?: { pharmacy_name: string };
  to_pharmacy?: { pharmacy_name: string };
}

// --- AdminDashboard Component ---
export const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('pending');
  
  // Sync tab with URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['pending', 'pharmacies', 'admins', 'marketplace', 'ratings'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pharmacies: 0,
    activeItems: 0,
    successfulExchanges: 0
  });
  
  // Data States
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [activeOffers, setActiveOffers] = useState<MarketItem[]>([]);
  const [activeRequests, setActiveRequests] = useState<MarketItem[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [trends, setTrends] = useState<{ offered: any[], requested: any[] }>({ offered: [], requested: [] });

  // Form States
  const [newAdmin, setNewAdmin] = useState({ email: '', uid: '' });
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);

  // Confirmation States
  const [confirmAction, setConfirmAction] = useState<{
    type: 'delete_pending' | 'delete_pharmacy' | 'blacklist_pharmacy' | 'delete_admin' | 'delete_market' | 'delete_rating';
    id: string | number;
    data?: any;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      // 0. Global Admin Check
      const isAdminSession = localStorage.getItem('is_admin') === 'true';
      if (!isAdminSession) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Unauthorized access');
          navigate('/login');
          return;
        }
        
        const { data: adminCheck } = await supabase
          .from('system_admins')
          .select('uid')
          .eq('uid', user.id)
          .maybeSingle();
        
        if (!adminCheck) {
          toast.error('Unauthorized access');
          navigate('/login');
          return;
        }
      }

      // 1. Fetch Stats (Silent Fail)
      try {
        const { data: statsData } = await supabase.from('pharmacies_stats').select('total_count');
        const totalPharmacies = statsData?.[0]?.total_count || 0;
        
        const { count: offerCount } = await supabase.from('inventory_offers').select('*', { count: 'exact', head: true });
        const { count: requestCount } = await supabase.from('inventory_requests').select('*', { count: 'exact', head: true });
        const { count: archiveCount } = await supabase.from('sales_archive').select('*', { count: 'exact', head: true });

        setStats({
          pharmacies: totalPharmacies,
          activeItems: (offerCount || 0) + (requestCount || 0),
          successfulExchanges: archiveCount || 0
        });
      } catch (e: any) {
        if (e?.code !== 'PGRST116' && e?.status !== 406) {
          console.warn('Stats fetch failed:', e);
        }
      }

      // 2. Fetch Pending Items (Silent Fail)
      try {
        const { data: pendingData } = await supabase
          .from('pending_items')
          .select('*')
          .order('created_at', { ascending: false });
        setPendingItems(pendingData || []);
      } catch (e: any) {
        if (e?.code !== 'PGRST116' && e?.status !== 406) {
          console.warn('Pending items fetch failed:', e);
        }
      }

      // 3. Fetch Pharmacies (Silent Fail)
      try {
        const { data: pharmacyData } = await supabase
          .from('pharmacies')
          .select('pharmacy_id, pharmacy_name, phone, city, address, account_status, created_at')
          .order('created_at', { ascending: false });
        setPharmacies(pharmacyData || []);
      } catch (e: any) {
        if (e?.code !== 'PGRST116' && e?.status !== 406) {
          console.warn('Pharmacies fetch failed:', e);
        }
      }

      // 4. Fetch Admins (Silent Fail)
      try {
        const { data: adminData } = await supabase
          .from('system_admins')
          .select('*')
          .order('created_at', { ascending: false });
        setAdmins(adminData || []);
      } catch (e: any) {
        if (e?.code !== 'PGRST116' && e?.status !== 406) {
          console.warn('Admins fetch failed:', e);
        }
      }

      // 5. Fetch Marketplace Content (Silent Fail)
      try {
        const { data: offersData } = await supabase
          .from('inventory_offers')
          .select('*, pharmacies(pharmacy_name)')
          .order('created_at', { ascending: false })
          .limit(50);
        
        const { data: requestsData } = await supabase
          .from('inventory_requests')
          .select('*, pharmacies(pharmacy_name)')
          .order('created_at', { ascending: false })
          .limit(50);
          
        setActiveOffers(offersData || []);
        setActiveRequests(requestsData || []);
      } catch (e: any) {
        if (e?.code !== 'PGRST116' && e?.status !== 406) {
          console.warn('Marketplace fetch failed:', e);
        }
      }

      // 6. Fetch Ratings with Joins (Silent Fail)
      try {
        const { data: ratingsData } = await supabase
          .from('ratings')
          .select(`
            *,
            from_pharmacy:pharmacies!from_pharmacy_id(pharmacy_name),
            to_pharmacy:pharmacies!to_pharmacy_id(pharmacy_name)
          `)
          .order('created_at', { ascending: false })
          .limit(50);
        setRatings(ratingsData || []);
      } catch (e: any) {
        if (e?.code !== 'PGRST116' && e?.status !== 406) {
          console.warn('Ratings fetch failed:', e);
        }
      }

      // 7. Fetch Trends from Views (Silent Fail)
      try {
        const { data: offeredTrends } = await supabase.from('top_offered_drugs').select('*').limit(5);
        const { data: requestedTrends } = await supabase.from('top_requested_drugs').select('*').limit(5);
        
        setTrends({
          offered: offeredTrends?.map(t => ({ name: t.arabic_name, count: t.offer_count })) || [],
          requested: requestedTrends?.map(t => ({ name: t.arabic_name, count: t.request_count })) || []
        });
      } catch (e: any) {
        if (e?.code !== 'PGRST116' && e?.status !== 406) {
          console.warn('Trends fetch failed:', e);
        }
      }

    } catch (err: any) {
      if (err?.code !== 'PGRST116' && err?.status !== 406) {
        console.warn('Global Admin Fetch Error:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Actions ---

  const handleApproveItem = async (item: PendingItem) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      setLoading(true);
      
      // 1. Sanitize Price (strip non-numeric like 'EGP')
      const priceStr = String(item.price || '0');
      const sanitizedPrice = parseFloat(priceStr.replace(/[^0-9.]/g, ''));

      // 2. Sanitize Barcode (ensure no spaces)
      const sanitizedBarcode = item.barcode ? String(item.barcode).replace(/\s/g, '') : null;

      console.log('Approving item with sanitized data:', {
        arabic_name: item.arabic_name,
        english_name: item.english_name,
        brand: item.brand,
        price: sanitizedPrice,
        barcode: sanitizedBarcode
      });

      // 3. Insert into master
      const { error: insertError } = await supabase.from('master').insert([{
        arabic_name: item.arabic_name,
        english_name: item.english_name,
        brand: item.brand,
        price: sanitizedPrice,
        barcode: sanitizedBarcode
      }]);

      if (insertError) {
        console.error('Supabase Master Insert Error Details:', insertError);
        throw insertError;
      }

      // 4. Delete from pending_items
      const { error: deleteError } = await supabase.from('pending_items').delete().eq('id', item.id);
      if (deleteError) {
        console.error('Supabase Pending Delete Error Details:', deleteError);
        throw deleteError;
      }

      toast.success('Item approved and added to Master');
      fetchData();
    } catch (err: any) {
      console.error('Full Approval Error Object:', err);
      toast.error(`Failed to approve item: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePending = async (id: number) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('pending_items').delete().eq('id', id);
      if (error) throw error;
      toast.success('Item rejected');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete item');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleBlacklistPharmacy = async (id: string, currentStatus: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const newStatus = currentStatus === 'blacklisted' ? 'active' : 'blacklisted';
    try {
      const { error } = await supabase.from('pharmacies').update({ account_status: newStatus }).eq('pharmacy_id', id);
      if (error) throw error;
      toast.success(`Pharmacy ${newStatus === 'blacklisted' ? 'blacklisted' : 'activated'}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update pharmacy status');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleDeletePharmacy = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('pharmacies').delete().eq('pharmacy_id', id);
      if (error) throw error;
      toast.success('Pharmacy deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete pharmacy');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;

    setIsAddingAdmin(true);
    try {
      const { error } = await supabase.from('system_admins').insert([{
        email: newAdmin.email.toLowerCase().trim(),
        uid: newAdmin.uid.trim()
      }]);

      if (error) throw error;
      toast.success('Admin added successfully');
      setNewAdmin({ email: '', uid: '' });
      fetchData();
    } catch (err) {
      toast.error('Failed to add admin');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('system_admins').delete().eq('id', id);
      if (error) throw error;
      toast.success('Admin removed');
      fetchData();
    } catch (err) {
      toast.error('Failed to remove admin');
    } finally {
      setConfirmAction(null);
    }
  };

  const handleDeleteMarketPost = async (type: 'offer' | 'request', id: number) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const table = type === 'offer' ? 'inventory_offers' : 'inventory_requests';
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      toast.success(`${type} deleted`);
      fetchData();
    } catch (err) {
      toast.error(`Failed to delete ${type}`);
    } finally {
      setConfirmAction(null);
    }
  };

  const handleDeleteRating = async (id: number) => {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase.from('ratings').delete().eq('id', id);
      if (error) throw error;
      toast.success('Rating deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete rating');
    } finally {
      setConfirmAction(null);
    }
  };

  // --- Render Helpers ---

  const renderStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Pharmacies</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.pharmacies}</h3>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Active Items</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.activeItems}</h3>
          </div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Successful Exchanges</p>
            <h3 className="text-2xl font-bold text-slate-900">{stats.successfulExchanges}</h3>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrends = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-emerald-500" />
          <h3 className="font-bold text-slate-900">Top 5 Most Offered</h3>
        </div>
        <div className="space-y-3">
          {trends.offered.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-700">{item.name}</span>
              <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{item.count} offers</span>
            </div>
          ))}
          {trends.offered.length === 0 && <p className="text-slate-400 text-sm italic">No data available</p>}
        </div>
      </div>
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-blue-500" />
          <h3 className="font-bold text-slate-900">Top 5 Most Requested</h3>
        </div>
        <div className="space-y-3">
          {trends.requested.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-sm font-medium text-slate-700">{item.name}</span>
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{item.count} requests</span>
            </div>
          ))}
          {trends.requested.length === 0 && <p className="text-slate-400 text-sm italic">No data available</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-lg">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Control Panel</h1>
            <p className="text-slate-500">Platform Management & Moderation</p>
          </div>
        </div>

        {renderStats()}
        {renderTrends()}

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'pending', label: 'Pending Items', icon: Package },
            { id: 'pharmacies', label: 'Pharmacies', icon: Users },
            { id: 'admins', label: 'Admins', icon: Shield },
            { id: 'marketplace', label: 'Marketplace', icon: Store },
            { id: 'ratings', label: 'Ratings', icon: Star }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-lg" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {loading && (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-primary" size={48} />
              <p className="text-slate-500 font-medium">Loading data...</p>
            </div>
          )}

          {!loading && activeTab === 'pending' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Item Details</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Brand</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Price</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Barcode</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingItems.map(item => (
                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{item.english_name}</div>
                        <div className="text-sm text-slate-500">{item.arabic_name}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{item.brand}</td>
                      <td className="p-4 text-sm font-bold text-emerald-600">{item.price} EGP</td>
                      <td className="p-4 text-xs font-mono text-slate-400">{item.barcode}</td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveItem(item)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                            title="Approve"
                          >
                            <CheckCircle size={20} />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'delete_pending', id: item.id })}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                            title="Reject"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {pendingItems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 italic">No pending items to review</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'pharmacies' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Pharmacy</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Contact</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Location</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pharmacies.map(pharmacy => (
                    <tr key={pharmacy.pharmacy_id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{pharmacy.pharmacy_name}</div>
                        <div className="text-xs text-slate-400">ID: {pharmacy.pharmacy_id}</div>
                      </td>
                      <td className="p-4 text-sm text-slate-600">{pharmacy.phone}</td>
                      <td className="p-4 text-sm text-slate-600">
                        <div>{pharmacy.city}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[150px]">{pharmacy.address}</div>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-[10px] font-bold uppercase px-2 py-1 rounded-full",
                          pharmacy.account_status === 'blacklisted' ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {pharmacy.account_status || 'active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setConfirmAction({ type: 'blacklist_pharmacy', id: pharmacy.pharmacy_id, data: pharmacy.account_status })}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              pharmacy.account_status === 'blacklisted' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
                            )}
                            title={pharmacy.account_status === 'blacklisted' ? "Unblacklist" : "Blacklist"}
                          >
                            <Ban size={20} />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ type: 'delete_pharmacy', id: pharmacy.pharmacy_id })}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
                            title="Delete Account"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'admins' && (
            <div className="p-6 space-y-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <UserPlus size={18} className="text-primary" />
                  Add New System Admin
                </h3>
                <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    type="email"
                    required
                    placeholder="Admin Email"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="text"
                    required
                    placeholder="User UID (from Auth)"
                    value={newAdmin.uid}
                    onChange={(e) => setNewAdmin({ ...newAdmin, uid: e.target.value })}
                    className="p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isAddingAdmin}
                    className="bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isAddingAdmin ? <Loader2 className="animate-spin" /> : <><Plus size={18} /> Add Admin</>}
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Admin Email</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">UID</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase">Added On</th>
                      <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map(admin => (
                      <tr key={admin.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{admin.email}</td>
                        <td className="p-4 text-xs font-mono text-slate-400">{admin.uid}</td>
                        <td className="p-4 text-sm text-slate-500">{new Date(admin.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => setConfirmAction({ type: 'delete_admin', id: admin.id })}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === 'marketplace' && (
            <div className="p-6 space-y-8">
              <div>
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Store size={18} className="text-emerald-500" />
                  Active Offers
                </h3>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Item</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Pharmacy</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Posted</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeOffers.map(offer => (
                        <tr key={offer.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{offer.arabic_name}</div>
                            <div className="text-xs text-slate-400">{offer.english_name}</div>
                          </td>
                          <td className="p-4 text-sm text-slate-600">{offer.pharmacies?.pharmacy_name || offer.pharmacy_name}</td>
                          <td className="p-4 text-sm text-slate-500">{offer.created_at ? new Date(offer.created_at).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setConfirmAction({ type: 'delete_market', id: offer.id, data: 'offer' })}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <ClipboardList size={18} className="text-blue-500" />
                  Active Requests
                </h3>
                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Item</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Pharmacy</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase">Posted</th>
                        <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRequests.map(request => (
                        <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{request.arabic_name}</div>
                            <div className="text-xs text-slate-400">{request.english_name}</div>
                          </td>
                          <td className="p-4 text-sm text-slate-600">{request.pharmacies?.pharmacy_name || request.pharmacy_name}</td>
                          <td className="p-4 text-sm text-slate-500">{request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}</td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => setConfirmAction({ type: 'delete_market', id: request.id, data: 'request' })}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {!loading && activeTab === 'ratings' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">From → To</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Rating</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Comment</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Date</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map(rating => (
                    <tr key={rating.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="text-sm font-bold text-slate-900">
                          {rating.from_pharmacy?.pharmacy_name || 'Unknown'}
                        </div>
                        <div className="text-[10px] text-slate-400">to</div>
                        <div className="text-sm font-bold text-emerald-600">
                          {rating.to_pharmacy?.pharmacy_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              className={cn(s <= rating.stars ? "fill-amber-400 text-amber-400" : "text-slate-200")}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 max-w-xs truncate" title={rating.comment}>
                        {rating.comment || <span className="text-slate-300 italic">No comment</span>}
                      </td>
                      <td className="p-4 text-xs text-slate-400">
                        {new Date(rating.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setConfirmAction({ type: 'delete_rating', id: rating.id })}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {ratings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-slate-400 italic">No ratings found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Confirm Action</h3>
            <p className="text-slate-500 text-center mb-8">
              {confirmAction.type === 'delete_pending' && 'Are you sure you want to reject and delete this pending item?'}
              {confirmAction.type === 'delete_pharmacy' && 'WARNING: This will permanently delete this pharmacy and all its data. This cannot be undone.'}
              {confirmAction.type === 'blacklist_pharmacy' && `Are you sure you want to ${confirmAction.data === 'blacklisted' ? 'activate' : 'blacklist'} this pharmacy?`}
              {confirmAction.type === 'delete_admin' && 'Are you sure you want to remove this system administrator?'}
              {confirmAction.type === 'delete_market' && `Are you sure you want to delete this ${confirmAction.data}?`}
              {confirmAction.type === 'delete_rating' && 'Are you sure you want to delete this rating?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'delete_pending') handleDeletePending(confirmAction.id as number);
                  if (confirmAction.type === 'delete_pharmacy') handleDeletePharmacy(confirmAction.id as string);
                  if (confirmAction.type === 'blacklist_pharmacy') handleBlacklistPharmacy(confirmAction.id as string, confirmAction.data);
                  if (confirmAction.type === 'delete_admin') handleDeleteAdmin(confirmAction.id as string);
                  if (confirmAction.type === 'delete_market') handleDeleteMarketPost(confirmAction.data, confirmAction.id as number);
                  if (confirmAction.type === 'delete_rating') handleDeleteRating(confirmAction.id as number);
                }}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
