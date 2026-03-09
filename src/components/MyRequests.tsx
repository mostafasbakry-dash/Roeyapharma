import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Plus, Trash2, Loader2, X, ShieldCheck, Edit2, PlusCircle, MinusCircle, AlertCircle, Info } from 'lucide-react';
import { Request as MarketRequest, Drug } from '@/src/types';
import { DrugSearch } from '@/src/components/DrugSearch';
import { toast } from 'react-hot-toast';
import { getSupabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';
import { AddMissingItemModal } from './AddMissingItemModal';

export const MyRequests = () => {
  const { t } = useTranslation();
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
  const [editData, setEditData] = useState({ quantity: 1 });

  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [quantity, setQuantity] = useState(1);

  const pharmacy_id_str = localStorage.getItem('pharmacy_id') || '';
  const pharmacy_id = pharmacy_id_str === 'admin' ? '' : pharmacy_id_str;

  const fetchRequests = useCallback(async () => {
    if (!pharmacy_id) return;
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching from inventory_requests...');
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: fetchError } = await supabase
        .from('inventory_requests')
        .select('arabic_name, english_name, pharmacy_id, quantity, barcode, created_at, id')
        .eq('pharmacy_id', pharmacy_id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('MyRequests Fetch Error:', fetchError.message, fetchError.details, fetchError.hint);
      }
      console.log('MyRequests Fetch Success:', data?.length, 'items');
      setRequests(data || []);
    } catch (err) {
      console.error('Fetch Requests Error:', err);
      setError(err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [pharmacy_id, t]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Add Request form submitted', { selectedDrug, quantity });
    if (!selectedDrug) return;

    setLoading(true);
    try {
      const pharmacy_id_str = localStorage.getItem('pharmacy_id');
      const pharmacy_id = pharmacy_id_str ? parseInt(pharmacy_id_str) : 0;
      
      const payload = {
        pharmacy_id: pharmacy_id,
        drug_id: selectedDrug.id,
        english_name: selectedDrug.name_en,
        arabic_name: selectedDrug.name_ar,
        barcode: selectedDrug.barcode ? selectedDrug.barcode.toString().replace(/\D/g, '') : "0",
        quantity: quantity
      };

      const response = await fetch('https://n8n.srv1168218.hstgr.cloud/webhook/add-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) throw new Error('Failed to add request');

      toast.success(t('success_added'));
      setShowAddModal(false);
      setSelectedDrug(null);
      setQuantity(1);
      fetchRequests(); // Refresh the list
    } catch (err) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    const request = requests.find(r => r.id === id);
    if (request) {
      setSelectedRequest(request);
      setShowCancelModal(true);
    }
  };

  const archiveItem = async (request: any, quantity: number, actionType: string) => {
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
          price: 0, // Requests don't have price
          discount: 0, // Requests don't have discount
          created_at: new Date().toISOString(),
          action_type: actionType
        }]);

      if (archiveError) {
        console.error('Archive Error:', archiveError);
        toast.error('Failed to archive record: ' + archiveError.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Archive Exception:', err);
      toast.error('Failed to archive record');
      return false;
    }
  };

  const handleFullCancel = async (actionType: string) => {
    if (!selectedRequest) return;
    setLoading(true);
    try {
      // Optimistic Update
      const removedId = selectedRequest.id;
      setRequests(prev => prev.filter(r => r.id !== removedId));

      const success = await archiveItem(selectedRequest, selectedRequest.quantity, actionType);
      if (success) {
        toast.success('تم تحديث البيانات ونقل السجل للأرشيف بنجاح');
        setShowCancelModal(false);
        setSelectedRequest(null);
        // Add a small delay to allow the background DB trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        fetchRequests();
      } else {
        // Rollback if failed
        fetchRequests();
      }
    } catch (err) {
      toast.error(t('error_generic'));
      fetchRequests();
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
          const newQty = selectedRequest.quantity + quantityValue;
          const { error: updateError } = await supabase
            .from('inventory_requests')
            .update({ quantity: newQty })
            .eq('id', selectedRequest.id);
          
          if (updateError) throw updateError;
          
          toast.success('تم تحديث الكمية بنجاح');
          setShowQuantityModal(false);
          setSelectedRequest(null);
          fetchRequests();
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
      const success = await archiveItem(selectedRequest, quantityValue, actionType);
      if (success) {
        toast.success('تم تحديث البيانات ونقل السجل للأرشيف بنجاح');
        setShowDeductActionModal(false);
        setSelectedRequest(null);
        // Add a small delay to allow the background DB trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        fetchRequests();
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
          .update({ quantity: editData.quantity })
          .eq('id', selectedRequest.id);
        
        if (updateError) throw updateError;
        
        toast.success('تم تحديث البيانات بنجاح');
        setShowEditModal(false);
        setSelectedRequest(null);
        fetchRequests();
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
          <p className="text-slate-500">List the drugs you are looking for</p>
        </div>
        <button
          onClick={() => {
            console.log('Open Add Request Modal clicked');
            const pid = localStorage.getItem('pharmacy_id');
            if (!pid) {
              toast.error('Please complete your pharmacy profile first to start adding items');
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
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('drug')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('quantity')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length > 0 ? (
                requests.map((request) => (
                  <tr key={request.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{request.english_name}</span>
                        <span className="text-xs text-slate-500">{request.barcode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{request.quantity}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      Active
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setQuantityAction(null);
                            setQuantityValue(1);
                            setShowQuantityModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                          title="Update Quantity"
                        >
                          <PlusCircle size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedRequest(request);
                            setEditData({ quantity: request.quantity });
                            setShowEditModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteRequest(request.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Cancel"
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
                    {error ? 'Failed to load items' : 'No items found'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{t('add_request')}</h2>
              <button 
                onClick={() => {
                  console.log('Close Add Request Modal clicked');
                  setShowAddModal(false);
                }} 
                className="hover:bg-white/20 p-1 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddRequest} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('search_drug')}</label>
                {!selectedDrug ? (
                  <DrugSearch 
                    onSelect={(drug) => setSelectedDrug(drug)} 
                    onAddMissing={(query) => {
                      setMissingItemQuery(query);
                      setShowMissingModal(true);
                    }}
                  />
                ) : (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <ShieldCheck size={18} />
                        <span>Drug Verified</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setSelectedDrug(null)} 
                        className="text-slate-400 hover:text-red-500 text-xs font-bold uppercase"
                      >
                        {t('change')}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase px-1">{t('english_name')}</label>
                        <input 
                          disabled 
                          value={selectedDrug.name_en || ''} 
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase px-1">{t('arabic_name')}</label>
                        <input 
                          disabled 
                          value={selectedDrug.name_ar || ''} 
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-medium text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase px-1">{t('barcode')}</label>
                        <input 
                          disabled 
                          value={selectedDrug.barcode || ''} 
                          className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedDrug && (
                <div className="space-y-1 animate-in slide-in-from-bottom-4 duration-300">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('quantity')}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  />
                </div>
              )}

              <button
                disabled={loading || !selectedDrug || !selectedDrug.barcode || parseInt(selectedDrug.barcode.toString().replace(/\D/g, '')) === 0 || !quantity || quantity <= 0}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : t('add_request')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{t('edit')}</h2>
              <button onClick={() => setShowEditModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditRequest} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('quantity')}</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={editData.quantity}
                  onChange={(e) => setEditData({ ...editData, quantity: parseInt(e.target.value) || 1 })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center animate-in zoom-in duration-200 relative">
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
            <p className="text-slate-500 mb-8">سيتم نقل هذا الطلب إلى الأرشيف</p>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">تحديث الكمية</h2>
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
                  <span className="font-bold">إضافة</span>
                </button>
                <button
                  onClick={() => setQuantityAction('deduct')}
                  className={cn(
                    "flex-1 py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2",
                    quantityAction === 'deduct' ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400"
                  )}
                >
                  <MinusCircle size={32} />
                  <span className="font-bold">خصم</span>
                </button>
              </div>

              {quantityAction && (
                <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">الكمية</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max={quantityAction === 'deduct' ? selectedRequest.quantity : undefined}
                      value={quantityValue}
                      onChange={(e) => setQuantityValue(parseInt(e.target.value) || 1)}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={handleUpdateQuantity}
                    className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
                  >
                    متابعة
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
            <p className="text-slate-500 mb-8">سيتم أرشفة {quantityValue} وحدة</p>
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
