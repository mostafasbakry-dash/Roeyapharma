import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  AlertCircle,
  Plus,
  Loader2,
  ShieldCheck,
  Star
} from 'lucide-react';
import { Offer, Request as MarketRequest } from '@/src/types';
import { formatCurrency, cn, getExpiryStatus, formatQuantity } from '@/src/lib/utils';
import { getSupabase } from '@/src/lib/supabase';
import { toast } from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

export const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOffers: 0,
    totalRequests: 0,
    totalOffersValue: 0,
    soldItems: 0,
    successScore: 0,
    avgRating: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [error, setError] = useState<any>(null);
  const [allOffers, setAllOffers] = useState<any[]>([]);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showOptimizationModal, setShowOptimizationModal] = useState(false);
  const [requestedOffersMatch, setRequestedOffersMatch] = useState<any[]>([]);
  const [availableRequestsMatch, setAvailableRequestsMatch] = useState<any[]>([]);
  const [activeMatchTab, setActiveMatchTab] = useState<'requested' | 'available'>('requested');
  const [telegram, setTelegram] = useState<string | null>(null);

  const sendTelegramWebhook = async (chatId: string, message: string) => {
    if (!chatId) return;

    const payload = {
      chat_id: chatId,
      message: message
    };
    
    try {
      await fetch('https://n8n.srv1168218.hstgr.cloud/webhook/sendtelegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      // Silent error logging for network issues
    }
  };

  const fetchStats = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const current_user_id_str = localStorage.getItem('pharmacy_id');
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    
    if (!current_user_id_str) {
      setLoading(false);
      return;
    }

    // If admin, we don't fetch personal pharmacy stats
    if (isAdmin) {
      setLoading(false);
      return;
    }

    const current_user_id = parseInt(current_user_id_str);
    if (isNaN(current_user_id)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Offers
      const { data: offers, count: offersCount, error: offersError } = await supabase
        .from('inventory_offers')
        .select('*', { count: 'exact' })
        .eq('pharmacy_id', current_user_id);

      if (offersError) {
        // Silent fail
      }

      // 2. Fetch Requests
      const { data: requests, count: requestsCount, error: requestsError } = await supabase
        .from('inventory_requests')
        .select('*', { count: 'exact' })
        .eq('pharmacy_id', current_user_id);

      if (requestsError) {
        // Silent fail
      }

      // 3. Fetch Sales Archive for Sold Items and Success Score
      const { data: archive, count: archiveCount, error: archiveError } = await supabase
        .from('sales_archive')
        .select('*', { count: 'exact' })
        .eq('pharmacy_id', current_user_id);

      if (archiveError) {
        // Silent fail
      }

      // 4. Fetch Ratings for Cumulative Rating
      const { data: ratings, error: ratingsError } = await supabase
        .from('ratings')
        .select('stars')
        .eq('to_pharmacy_id', current_user_id);

      if (ratingsError) {
        // Silent fail
      }

      // Calculate stats
      const totalOffers = offersCount || 0;
      const totalRequests = requestsCount || 0;
      const successScore = archiveCount || 0;
      
      const avgRating = ratings && ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length
        : 0;
      
      // Total Value Calculation: sum(price * quantity) from inventory_offers
      const totalOffersValue = (offers || []).reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.quantity) || 0;
        return sum + (price * qty);
      }, 0);
      
      // Sold Quantity Counter: sum(quantity) from sales_archive where action_type matches Offer labels
      // Only items archived from 'Offers' count towards 'Sold Quantity'
      const offerSaleLabels = ['بيع داخلي', 'Internal Sale', 'تحويل', 'Transfer', 'بيع', 'Sell Out Roeya', 'تم البيع خارج رؤية', 'Transfer in Roeya', 'تم التحويل عبر رؤية'];
      const filteredArchive = (archive || []).filter(item => offerSaleLabels.includes(item.action_type));
      
      const soldQuantity = filteredArchive.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

      setStats({
        totalOffers,
        totalRequests,
        totalOffersValue,
        soldItems: soldQuantity,
        successScore,
        avgRating
      });

      setAllOffers(offers || []);

      // 5. Fetch Telegram Chat ID
      const { data: profileData, error: profileError } = await supabase
        .from('pharmacies')
        .select('telegram')
        .eq('pharmacy_id', current_user_id)
        .maybeSingle();
      
      if (profileError) {
        // Silent fail
      }

      if (profileData) {
        setTelegram(profileData.telegram);
      } else {
        // Show one-time toast if telegram is empty
        const toastKey = `telegram_toast_shown_${current_user_id}`;
        if (!localStorage.getItem(toastKey)) {
          toast(t('telegram_alert_msg'), {
            icon: '🔔',
            duration: 5000
          });
          localStorage.setItem(toastKey, 'true');
        }
      }

      // 6. Smart Match Logic
      const { data: allOffersData } = await supabase.from('inventory_offers').select('*');
      const { data: allRequestsData } = await supabase.from('inventory_requests').select('*');

      if (allOffersData && allRequestsData) {
        const myOffers = allOffersData.filter(o => o.pharmacy_id === current_user_id);
        const othersRequests = allRequestsData.filter(r => r.pharmacy_id !== current_user_id);
        
        const myRequests = allRequestsData.filter(r => r.pharmacy_id === current_user_id);
        const othersOffers = allOffersData.filter(o => o.pharmacy_id !== current_user_id);

        const reqMatches = myOffers.filter(myOffer => 
          othersRequests.some(otherReq => otherReq.barcode === myOffer.barcode)
        ).map(myOffer => {
          const matchingReqs = othersRequests.filter(r => r.barcode === myOffer.barcode);
          return { ...myOffer, matches: matchingReqs };
        });

        const availMatches = myRequests.filter(myReq => 
          othersOffers.some(otherOffer => otherOffer.barcode === myReq.barcode)
        ).map(myReq => {
          const matchingOffers = othersOffers.filter(o => o.barcode === myReq.barcode);
          return { ...myReq, matches: matchingOffers };
        });

        setRequestedOffersMatch(reqMatches);
        setAvailableRequestsMatch(availMatches);

        // Webhook Trigger with Tracking
        const allMatchPairs: string[] = [];
        
        // My Offers matching others' Requests
        myOffers.forEach(myOffer => {
          othersRequests.forEach(otherReq => {
            if (otherReq.barcode === myOffer.barcode) {
              allMatchPairs.push(`${myOffer.id}:${otherReq.id}`);
            }
          });
        });

        // My Requests matching others' Offers
        myRequests.forEach(myReq => {
          othersOffers.forEach(otherOffer => {
            if (otherOffer.barcode === myReq.barcode) {
              allMatchPairs.push(`${otherOffer.id}:${myReq.id}`);
            }
          });
        });

        if (allMatchPairs.length > 0) {
          const chatId = profileData?.telegram;
          if (chatId) {
            const notifiedMatchesKey = 'roeya_notified_matches';
            const notifiedMatchesStr = localStorage.getItem(notifiedMatchesKey) || '[]';
            let notifiedMatches: string[] = [];
            try {
              notifiedMatches = JSON.parse(notifiedMatchesStr);
            } catch (e) {
              notifiedMatches = [];
            }

            const newMatches = allMatchPairs.filter(pair => !notifiedMatches.includes(pair));

            if (newMatches.length > 0) {
              sendTelegramWebhook(chatId, t('telegram_match_msg'));
              
              // Update notified matches in localStorage
              const updatedNotifiedMatches = Array.from(new Set([...notifiedMatches, ...allMatchPairs]));
              localStorage.setItem(notifiedMatchesKey, JSON.stringify(updatedNotifiedMatches));
            }
          }
        }
      }

      // Combine and sort for recent activity (Offers, Requests, and Archive)
      // Filter out erroneous activity records (0 EGP and PURCHASED status)
      const activity = [
        ...(offers || []).map(o => ({ ...o, type: 'offer' })),
        ...(requests || []).map(r => ({ ...r, type: 'request' })),
        ...(archive || [])
          .filter(a => !(Number(a.price) === 0 && (a.action_type === 'تم الشراء' || a.action_type === 'Purchased')))
          .map(a => ({ ...a, type: 'archive' }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10); // Show more in the list

      setRecentActivity(activity);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'offer': return <Package size={20} />;
      case 'request': return <ShoppingCart size={20} />;
      case 'archive': return <TrendingUp size={20} />;
      default: return <Package size={20} />;
    }
  };

  const getActivityLabel = (item: any) => {
    const offerSaleLabels = ['بيع داخلي', 'Internal Sale', 'تحويل', 'Transfer', 'بيع', 'Sell Out Roeya', 'تم البيع خارج رؤية', 'Transfer in Roeya', 'تم التحويل عبر رؤية'];
    const requestLabels = ['تم الشراء', 'Purchased', 'تم التحويل', 'Transferred', 'Purchased Out Roeya', 'تم الشراء خارج رؤية', 'Transferred in Roeya', 'تم التحويل عبر رؤية'];

    if (item.type === 'offer') return t('activity_new_offer');
    if (item.type === 'request') return t('activity_new_request');
    if (item.type === 'archive') {
      if (offerSaleLabels.includes(item.action_type)) return t('activity_sold');
      if (requestLabels.includes(item.action_type)) return t('activity_completed');
      return t('item_archived');
    }
    return t('activity');
  };

  const isPriceActivity = (item: any) => {
    const offerSaleLabels = ['بيع داخلي', 'Internal Sale', 'تحويل', 'Transfer', 'بيع', 'Sell Out Roeya', 'تم البيع خارج رؤية', 'Transfer in Roeya', 'تم التحويل عبر رؤية'];
    return item.type === 'offer' || (item.type === 'archive' && offerSaleLabels.includes(item.action_type));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('dashboard')}</h1>
          <p className="text-slate-500">{t('dashboard_tagline')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/my-requests')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700 hover:bg-slate-50 transition-all"
          >
            <Plus size={18} />
            {t('add_request')}
          </button>
          <button 
            onClick={() => navigate('/my-offers')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-all shadow-md shadow-primary/20"
          >
            <Plus size={18} />
            {t('add_offer')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
        <StatCard 
          title={t('stats_total_offers')} 
          value={stats.totalOffers} 
          icon={Package} 
          color="bg-blue-500"
        />
        <StatCard 
          title={t('stats_total_requests')} 
          value={stats.totalRequests} 
          icon={ShoppingCart} 
          color="bg-indigo-500"
        />
        <StatCard 
          title={t('stats_total_value')} 
          value={formatCurrency(stats.totalOffersValue)} 
          icon={DollarSign} 
          color="bg-emerald-500"
        />
        <StatCard 
          title={t('stats_sold_items')} 
          value={stats.soldItems} 
          icon={TrendingUp} 
          color="bg-amber-500"
        />
        <StatCard 
          title={t('success_score')} 
          value={stats.successScore} 
          icon={ShieldCheck} 
          color="bg-emerald-600"
        />
        <StatCard 
          title={t('cumulative_rating')} 
          value={stats.avgRating > 0 ? stats.avgRating.toFixed(1) : t('not_available')} 
          icon={Star} 
          color="bg-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Smart Match Widget */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{t('items_found')}</h2>
            </div>
            <div className={cn(
              "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm transition-all",
              (requestedOffersMatch.length > 0 || availableRequestsMatch.length > 0) && "animate-pulse-green"
            )}>
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setActiveMatchTab('requested')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold transition-all",
                    activeMatchTab === 'requested' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {t('my_offers')}
                </button>
                <button
                  onClick={() => setActiveMatchTab('available')}
                  className={cn(
                    "flex-1 py-3 text-xs font-bold transition-all",
                    activeMatchTab === 'available' ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  {t('my_requests')}
                </button>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                {activeMatchTab === 'requested' ? (
                  requestedOffersMatch.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {requestedOffersMatch.slice(0, 5).map((match, i) => (
                        <div 
                          key={i} 
                          onClick={() => navigate(`/marketplace?barcode=${match.barcode}&view=requests`)}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{match.english_name}</p>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                              {match.matches.length} {t('matches')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-500">{match.barcode}</p>
                            {match.matches[0]?.pharmacies?.city && (
                              <p className="text-[10px] text-primary font-bold">{match.matches[0].pharmacies.city}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      {t('no_matches')}
                    </div>
                  )
                ) : (
                  availableRequestsMatch.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {availableRequestsMatch.slice(0, 5).map((match, i) => (
                        <div 
                          key={i} 
                          onClick={() => navigate(`/marketplace?barcode=${match.barcode}&view=offers`)}
                          className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-slate-900 text-sm group-hover:text-primary transition-colors">{match.english_name}</p>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase">
                              {match.matches.length} {t('matches')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-slate-500">{match.barcode}</p>
                            {match.matches[0]?.pharmacies?.city && (
                              <p className="text-[10px] text-primary font-bold">{match.matches[0].pharmacies.city}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      {t('no_matches')}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">{t('recent_activity')}</h2>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : recentActivity.length > 0 ? (
                recentActivity.map((item, i) => (
                  <div key={i} className="p-4 border-b border-slate-100 last:border-0 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className={cn(
                        "w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0",
                        item.type === 'archive' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
                      )}>
                        {React.cloneElement(getActivityIcon(item.type) as React.ReactElement, { size: 16 })}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm md:text-base whitespace-normal leading-tight">{item.english_name}</p>
                        <p className="text-[10px] md:text-xs text-slate-500 whitespace-normal">
                          {new Date(item.created_at).toLocaleDateString()} • {getActivityLabel(item)}
                        </p>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <p className="font-bold text-slate-900 text-sm md:text-base">
                        {isPriceActivity(item) 
                          ? formatCurrency(Number(item.price) || 0) 
                          : formatQuantity(item.quantity, item.strips_count || 0, i18n)
                        }
                      </p>
                      <p className={cn(
                        "text-[9px] md:text-[10px] font-bold uppercase",
                        item.type === 'archive' ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {item.type === 'archive' ? item.action_type : t('dashboard_active')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-500">
                  {error ? t('failed_load_activity') : t('no_recent_activity')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">{t('quick_actions')}</h2>
            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => setShowExpiryModal(true)}
                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:shadow-md transition-all group text-start w-full"
              >
                <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('near_expiry_alert')}</p>
                  <p className="text-xs text-slate-500">{t('check_items_expiring')}</p>
                </div>
              </button>
              <button 
                onClick={() => setShowOptimizationModal(true)}
                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-primary hover:shadow-md transition-all group text-start w-full"
              >
                <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">{t('optimization_tips')}</p>
                  <p className="text-xs text-slate-500">{t('increase_sales_discounts')}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Priority Expiry Watch */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{t('priority_expiry_watch')}</h2>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {loading ? (
                <div className="p-12 flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary" size={32} />
                </div>
              ) : allOffers.filter(o => {
                const status = getExpiryStatus(o.expiry_date);
                return status.color !== 'slate';
              }).length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {allOffers
                    .filter(o => getExpiryStatus(o.expiry_date).color !== 'slate')
                    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
                    .slice(0, 5)
                    .map((offer, i) => {
                      const status = getExpiryStatus(offer.expiry_date);
                      return (
                        <div key={i} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <p className="font-bold text-slate-900 text-sm whitespace-normal leading-tight flex-1 me-2">{offer.english_name}</p>
                            <span className={cn(
                               "px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0",
                               status.color === 'rose' && "bg-rose-100 text-rose-700",
                               status.color === 'orange' && "bg-orange-100 text-orange-700",
                               status.color === 'emerald' && "bg-emerald-100 text-emerald-700"
                             )}>
                               {status.label}
                             </span>
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500">
                            <span>{t('expiry_date')}: {new Date(offer.expiry_date).toLocaleDateString()}</span>
                            <span className="font-mono font-bold text-slate-700">{t('days_left', { count: status.days })}</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShieldCheck size={24} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium">{t('all_items_safe')}</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Near Expiry Modal */}
      {showExpiryModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="bg-rose-500 p-4 md:p-6 text-white flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <AlertCircle size={20} md:size={24} />
                {t('near_expiry_alert')}
              </h2>
              <button onClick={() => setShowExpiryModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto space-y-3 md:space-y-4">
              {allOffers.filter(o => {
                const status = getExpiryStatus(o.expiry_date);
                return status.color === 'rose'; // Only Critical (Red) items
              }).length > 0 ? (
                allOffers
                  .filter(o => {
                    const status = getExpiryStatus(o.expiry_date);
                    return status.color === 'rose';
                  })
                  .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
                  .map((offer, i) => {
                    const status = getExpiryStatus(offer.expiry_date);
                    return (
                      <div key={i} className="flex items-center justify-between p-3 md:p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-rose-100 text-rose-600 shrink-0">
                            <AlertCircle size={16} md:size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm md:text-base">{offer.english_name}</p>
                            <p className="text-[10px] md:text-xs text-slate-500">
                              {t('expiry_date')}: {new Date(offer.expiry_date).toLocaleDateString()} ({t('days_left', { count: status.days })})
                            </p>
                          </div>
                        </div>
                        <div className="px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold bg-rose-100 text-rose-700 shrink-0">
                          {status.label}
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-12 text-slate-500">
                  {t('no_critical_items')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Optimization Tips Modal */}
      {showOptimizationModal && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full md:max-w-2xl rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="bg-emerald-500 p-4 md:p-6 text-white flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-bold flex items-center gap-2">
                <TrendingUp size={20} md:size={24} />
                {t('optimization_tips')}
              </h2>
              <button onClick={() => setShowOptimizationModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <div className="p-4 md:p-6 max-h-[70vh] overflow-y-auto space-y-3 md:space-y-4">
              {allOffers.filter(o => {
                const status = getExpiryStatus(o.expiry_date);
                return status.color === 'rose' || status.color === 'orange' || status.color === 'emerald';
              }).length > 0 ? (
                allOffers
                  .filter(o => {
                    const status = getExpiryStatus(o.expiry_date);
                    return status.color === 'rose' || status.color === 'orange' || status.color === 'emerald';
                  })
                  .map((offer, i) => {
                    const status = getExpiryStatus(offer.expiry_date);
                    return (
                      <div key={i} className="p-3 md:p-4 border border-slate-100 rounded-xl space-y-2 md:space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 md:gap-3">
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                              <TrendingUp size={14} md:size={16} />
                            </div>
                            <p className="font-bold text-slate-900 text-sm md:text-base">{offer.english_name}</p>
                          </div>
                          <div className="text-end">
                            <p className="text-[10px] text-slate-500">{t('current_discount')}</p>
                            <p className="font-bold text-primary text-sm md:text-base">{offer.discount}%</p>
                          </div>
                        </div>
                        <div className="bg-slate-50 p-2 md:p-3 rounded-lg flex items-start gap-2 md:gap-3">
                          <div className="mt-1 p-1 bg-white rounded shadow-sm text-emerald-600 shrink-0">
                            <Star size={12} md:size={14} />
                          </div>
                          <div>
                            <p className="text-xs md:text-sm font-bold text-slate-900">{t('recommendation')}</p>
                            <p className="text-[10px] md:text-xs text-slate-600">{status.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <div className="text-center py-12 text-slate-500">
                  {t('no_optimization_tips')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
