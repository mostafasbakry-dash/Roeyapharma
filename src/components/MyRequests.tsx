import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Trash2, Loader2, X, ShieldCheck, Edit2, PlusCircle, MinusCircle, AlertCircle, Info, RefreshCw } from 'lucide-react';
import { Request as MarketRequest, Drug } from '@/src/types';
import { DrugSearch } from '@/src/components/DrugSearch';
import { toast } from 'react-hot-toast';
import { getSupabase } from '@/src/lib/supabase';
import { cn, formatQuantity } from '@/src/lib/utils';
import { AddMissingItemModal } from './AddMissingItemModal';
import { AddRequestModal } from './AddRequestModal';

export const MyRequests = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MarketRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const [missingItemQuery, setMissingItemQuery] = useState('');
  
  // New states for advanced management
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showDeductActionModal, setShowDeductActionModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [quantityAction, setQuantityAction] = useState<'add' | 'deduct' | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [stripsValue, setStripsValue] = useState(0);
  const [editData, setEditData] = useState({ quantity: 1, strips_count: 0 });

  const pharmacy_id_str = localStorage.getItem('pharmacy_id') || '';
  const isAdmin = localStorage.getItem('is_admin') === 'true';
  const pharmacy_id = (pharmacy_id_str === 'admin' || isAdmin) ? null : parseInt(pharmacy_id_str);

  const fetchRequests = useCallback(async () => {
    if (pharmacy_id === null || isNaN(pharmacy_id)) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: fetchError } = await supabase
        .from('inventory_requests')
        .select('*')
        .eq('pharmacy_id', pharmacy_id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      setRequests(data || []);
    } catch (err) {
      setError(err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [pharmacy_id, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDeleteRequest = async (id: string) => {
    const request = requests.find(r => r.id === id);
    if (request) {
      setSelectedRequest(request);
      setShowCancelModal(true);
    }
  };

  const archiveItem = async (request: any, quantity: number, stripsCount: number, actionType: string) => {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error: archiveError } = await supabase
        .from('sales_archive')
        .insert([{
          pharmacy_id: request.pharmacy_id,
          item_id: request.id,
          arabic_name: request.arabic_name,
          english_name: request.english_name,
          barcode: request.barcode,
          quantity: quantity,
          strips_count: stripsCount,
          price: 0, // Requests don't have price
          discount: 0, // Requests don't have discount
          created_at: new Date().toISOString(),
          action_type: actionType
        }]);

      if (archiveError) {
        toast.error(t('dashboard_archive_failed_msg', { message: archiveError.message }));
        return false;
      }
      return true;
    } catch (err) {
      toast.error(t('dashboard_archive_failed'));
      return false;
    }
  };

  const handleFullCancel = async (actionType: string) => {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      // 1. Explicitly delete from inventory_requests
      const { error: deleteError } = await supabase
        .from('inventory_requests')
        .delete()
        .eq('id', selectedRequest.id);
      
      if (deleteError) throw deleteError;

      // 2. Archive the item
      const success = await archiveItem(selectedRequest, selectedRequest.quantity, selectedRequest.strips_count || 0, actionType);
      
      if (success) {
        // 3. UI Update (Optimistic)
        const removedId = selectedRequest.id;
        setRequests(prev => prev.filter(r => r.id !== removedId));
        
        toast.success(t('dashboard_archive_success'));
        setShowCancelModal(false);
        setSelectedRequest(null);
      }
    } catch (err) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async () => {
    if (!selectedRequest || !quantityAction) return;
    
    if (quantityAction === 'add') {
      setLoading(true);
      try {
        const supabase = getSupabase();
        if (supabase) {
          const newQty = (selectedRequest.quantity || 0) + quantityValue;
          const newStrips = (selectedRequest.strips_count || 0) + stripsValue;
          const { error: updateError } = await supabase
            .from('inventory_requests')
            .update({ 
              quantity: newQty,
              strips_count: newStrips
            })
            .eq('id', selectedRequest.id);
          
          if (updateError) throw updateError;
          
          // UI Update (Optimistic)
          setRequests(prev => prev.map(r => 
            r.id === selectedRequest.id ? { ...r, quantity: newQty, strips_count: newStrips } : r
          ));
          
          toast.success(t('dashboard_qty_update_success'));
          setShowQuantityModal(false);
          setSelectedRequest(null);
        }
      } catch (err) {
        toast.error(t('error_generic'));
      } finally {
        setLoading(false);
      }
    } else {
      setShowQuantityModal(false);
      setShowDeductActionModal(true);
    }
  };

  const handleDeductArchive = async (actionType: string) => {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const newQty = (selectedRequest.quantity || 0) - quantityValue;
      const newStrips = (selectedRequest.strips_count || 0) - stripsValue;
      
      // 1. Explicitly update or delete from inventory_requests
      if (newQty <= 0 && newStrips <= 0) {
        const { error: deleteError } = await supabase
          .from('inventory_requests')
          .delete()
          .eq('id', selectedRequest.id);
        if (deleteError) throw deleteError;
      } else {
        const { error: updateError } = await supabase
          .from('inventory_requests')
          .update({ 
            quantity: Math.max(0, newQty),
            strips_count: Math.max(0, newStrips)
          })
          .eq('id', selectedRequest.id);
        if (updateError) throw updateError;
      }

      // 2. Archive the item
      const success = await archiveItem(selectedRequest, quantityValue, stripsValue, actionType);
      
      if (success) {
        // 3. UI Update (Optimistic)
        if (newQty <= 0 && newStrips <= 0) {
          setRequests(prev => prev.filter(r => r.id !== selectedRequest.id));
        } else {
          setRequests(prev => prev.map(r => 
            r.id === selectedRequest.id ? { ...r, quantity: Math.max(0, newQty), strips_count: Math.max(0, newStrips) } : r
          ));
        }
        
        toast.success(t('dashboard_archive_success'));
        setShowDeductActionModal(false);
        setSelectedRequest(null);
      }
    } catch (err) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error: updateError } = await supabase
          .from('inventory_requests')
          .update({ 
            quantity: editData.quantity,
            strips_count: editData.strips_count
          })
          .eq('id', selectedRequest.id);
        
        if (updateError) throw updateError;
        
        // UI Update (Optimistic)
        setRequests(prev => prev.map(r => 
          r.id === selectedRequest.id ? { ...r, quantity: editData.quantity, strips_count: editData.strips_count } : r
        ));
        
        toast.success(t('dashboard_update_success'));
        setShowEditModal(false);
        setSelectedRequest(null);
      }
    } catch (err) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('my_requests')}</h1>
          <p className="text-slate-500">{t('dashboard_requests_tagline')}</p>
        </div>
        <button
          onClick={() => {
            const pid = localStorage.getItem('pharmacy_id');
            if (!pid) {
              toast.error(t('dashboard_complete_profile_first'));
              navigate('/profile');
              return;
            }
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
        >
          <Plus size={20} />
          {t('add_request')}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-start">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('drug')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('quantity')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('dashboard_status')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="animate-spin text-primary" size={32} />
                      <span className="text-sm text-slate-500">{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : requests.length > 0 ? (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{request.english_name}</span>
                        <span className="text-xs text-slate-500">{request.barcode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {formatQuantity(request.quantity, request.strips_count || 0, i18n)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {t('dashboard_active')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setQuantityAction(null);
                            setQuantityValue(0);
                            setStripsValue(0);
                            setShowQuantityModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                          title={t('dashboard_update_quantity')}
                        >
                          <PlusCircle size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setEditData({ 
                              quantity: request.quantity,
                              strips_count: request.strips_count || 0
                            });
                            setShowEditModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title={t('edit')}
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRequest(request.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title={t('cancel')}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    {error ? t('dashboard_failed_load') : t('dashboard_no_items')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-12 flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-primary" size={32} />
              <span className="text-sm text-slate-500">{t('loading')}</span>
            </div>
          ) : requests.length > 0 ? (
            requests.map((request) => (
              <div key={request.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 text-sm">{request.english_name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{request.barcode}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                    {t('dashboard_active')}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-slate-400 uppercase font-bold text-[9px]">{t('quantity')}</span>
                    <span className="font-bold text-slate-700 text-sm">
                      {formatQuantity(request.quantity, request.strips_count || 0, i18n)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-50">
                  <button 
                    onClick={() => {
                      setSelectedRequest(request);
                      setQuantityAction(null);
                      setQuantityValue(0);
                      setStripsValue(0);
                      setShowQuantityModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                  >
                    <PlusCircle size={14} />
                    {t('dashboard_update_quantity')}
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedRequest(request);
                      setEditData({ 
                        quantity: request.quantity,
                        strips_count: request.strips_count || 0
                      });
                      setShowEditModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold active:scale-95 transition-transform"
                  >
                    <Edit2 size={14} />
                    {t('edit')}
                  </button>
                  <button 
                    onClick={() => handleDeleteRequest(request.id)}
                    className="p-2 bg-rose-50 text-rose-600 rounded-lg active:scale-95 transition-transform"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500 text-sm">
              {error ? t('dashboard_failed_load') : t('dashboard_no_items')}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddRequestModal 
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchRequests}
          onAddMissing={(query) => {
            setMissingItemQuery(query);
            setShowMissingModal(true);
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="bg-primary p-4 md:p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{t('edit')}</h2>
              <button onClick={() => setShowEditModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditRequest} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{i18n.language === 'ar' ? 'علبة' : 'Packs'}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editData.quantity}
                    onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{i18n.language === 'ar' ? 'وحدة' : 'Units'}</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editData.strips_count}
                    onChange={(e) => setEditData({ ...editData, strips_count: parseInt(e.target.value) || 0 })}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <button
                disabled={loading}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4"
              >
                {loading ? <Loader2 className="animate-spin" /> : t('save')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal (Archive Actions) */}
      {showCancelModal && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl shadow-2xl p-8 text-center animate-in slide-in-from-bottom md:zoom-in duration-300 relative">
            <button 
              onClick={() => setShowCancelModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('archive_question')}</h2>
            <p className="text-slate-500 mb-8">{t('dashboard_archive_request_msg')}</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleFullCancel(t('archive_purchased'))}
                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                {t('archive_purchased')}
              </button>
              <button
                onClick={() => handleFullCancel(t('archive_transferred'))}
                className="py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {t('archive_transferred')}
              </button>
            </div>
            <button 
              onClick={() => setShowCancelModal(false)}
              className="mt-6 text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Update Quantity Modal */}
      {showQuantityModal && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom md:zoom-in duration-300">
            <div className="bg-primary p-4 md:p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{t('dashboard_update_quantity')}</h2>
              <button onClick={() => setShowQuantityModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setQuantityAction('add')}
                  className={cn(
                    "flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    quantityAction === 'add' ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400"
                  )}
                >
                  <PlusCircle size={32} />
                  <span className="font-bold">{t('dashboard_add')}</span>
                </button>
                <button
                  onClick={() => setQuantityAction('deduct')}
                  className={cn(
                    "flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    quantityAction === 'deduct' ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400"
                  )}
                >
                  <MinusCircle size={32} />
                  <span className="font-bold">{t('dashboard_deduct')}</span>
                </button>
              </div>

              {quantityAction && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{i18n.language === 'ar' ? 'علبة' : 'Packs'}</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={quantityAction === 'deduct' ? (selectedRequest.quantity || 0) : undefined}
                        value={quantityValue}
                        onChange={(e) => setQuantityValue(parseInt(e.target.value) || 0)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">{i18n.language === 'ar' ? 'وحدة' : 'Units'}</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max={quantityAction === 'deduct' ? (selectedRequest.strips_count || 0) : undefined}
                        value={stripsValue}
                        onChange={(e) => setStripsValue(parseInt(e.target.value) || 0)}
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleUpdateQuantity}
                    disabled={quantityValue === 0 && stripsValue === 0}
                    className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {t('dashboard_continue')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Deduct Action Modal */}
      {showDeductActionModal && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in duration-200 relative">
            <button 
              onClick={() => setShowDeductActionModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X size={20} />
            </button>
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Info size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('archive_question')}</h2>
            <p className="text-slate-500 mb-8">{formatQuantity(quantityValue, stripsValue, i18n)}</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleDeductArchive(t('archive_purchased'))}
                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                {t('archive_purchased')}
              </button>
              <button
                onClick={() => handleDeductArchive(t('archive_transferred'))}
                className="py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {t('archive_transferred')}
              </button>
            </div>
            <button 
              onClick={() => setShowDeductActionModal(false)}
              className="mt-6 text-slate-400 hover:text-slate-600 text-sm font-medium"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {showMissingModal && (
        <AddMissingItemModal 
          onClose={() => setShowMissingModal(false)} 
          initialQuery={missingItemQuery}
        />
      )}
    </div>
  );
};
