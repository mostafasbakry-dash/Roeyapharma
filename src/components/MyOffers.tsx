import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Trash2, Edit2, Loader2, AlertCircle, X, ShieldCheck, Info, MinusCircle, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Offer, Drug } from '@/src/types';
import { DrugSearch } from '@/src/components/DrugSearch';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { BulkUpload } from '@/src/components/BulkUpload';
import { cn, getExpiryStatus } from '@/src/lib/utils';
import { getSupabase } from '@/src/lib/supabase';
import { AddMissingItemModal } from './AddMissingItemModal';

export const MyOffers = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<Offer[]>([]);
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
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [quantityAction, setQuantityAction] = useState<'add' | 'deduct' | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [editData, setEditData] = useState({ price: 0, discount: 0 });
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [formData, setFormData] = useState({
    expiry_date: '',
    discount: 20,
    quantity: 1,
    price: 0
  });

  const pharmacy_id_str = localStorage.getItem('pharmacy_id') || '';
  const pharmacy_id = pharmacy_id_str === 'admin' ? '' : pharmacy_id_str;

  const fetchOffers = useCallback(async () => {
    if (!pharmacy_id) return;
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching from inventory_offers...');
      const supabase = getSupabase();
      if (!supabase) return;

      const { data, error: fetchError } = await supabase
        .from('inventory_offers')
        .select('arabic_name, english_name, pharmacy_id, expiry_date, price, quantity, barcode, discount, created_at, id')
        .eq('pharmacy_id', pharmacy_id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('MyOffers Fetch Error:', fetchError.message, fetchError.details, fetchError.hint);
      }
      console.log('MyOffers Fetch Success:', data?.length, 'items');
      setOffers(data || []);
    } catch (err) {
      console.error('Fetch Offers Error:', err);
      setError(err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  }, [pharmacy_id, t]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Add Offer form submitted', formData, selectedDrug);
    if (!selectedDrug) return;

    // Check for duplicates (Barcode + Expiry)
    const duplicate = offers.find(o => o.barcode === selectedDrug.barcode && o.expiry_date === formData.expiry_date);
    if (duplicate) {
      if (!window.confirm(t('warning_duplicate'))) return;
    }

    setLoading(true);
    try {
      const pharmacy_id_str = localStorage.getItem('pharmacy_id');
      const pharmacy_id = pharmacy_id_str ? parseInt(pharmacy_id_str) : 0;
      
      const payload = {
        expiry_date: formData.expiry_date,
        pharmacy_id: pharmacy_id,
        drug_id: selectedDrug.id,
        english_name: selectedDrug.name_en || '',
        arabic_name: selectedDrug.name_ar || '',
        manufacturer: selectedDrug.manufacturer || '',
        barcode: selectedDrug.barcode ? selectedDrug.barcode.toString().replace(/\D/g, '') : "0",
        quantity: formData.quantity,
        price: formData.price,
        discount: formData.discount
      };

      const response = await fetch('https://n8n.srv1168218.hstgr.cloud/webhook/add-offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) throw new Error('Failed to add offer');

      toast.success(t('success_added'));
      setShowAddModal(false);
      setSelectedDrug(null);
      fetchOffers(); // Refresh the list
    } catch (err) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    // This is now replaced by the Cancel logic
    const offer = offers.find(o => o.id === id);
    if (offer) {
      setSelectedOffer(offer);
      setShowCancelModal(true);
    }
  };

  const archiveItem = async (offer: Offer, quantity: number, actionType: string) => {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error: archiveError } = await supabase
        .from('sales_archive')
        .insert([{
          pharmacy_id: offer.pharmacy_id,
          item_id: offer.id,
          arabic_name: offer.arabic_name,
          english_name: offer.english_name,
          barcode: offer.barcode,
          quantity: quantity,
          price: offer.price,
          discount: offer.discount,
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

  const isRtl = i18n.language === 'ar';

  const handleFullCancel = async (actionType: string) => {
    if (!selectedOffer) return;
    setLoading(true);
    try {
      // Optimistic Update
      const removedId = selectedOffer.id;
      setOffers(prev => prev.filter(o => o.id !== removedId));

      const success = await archiveItem(selectedOffer, selectedOffer.quantity, actionType);
      if (success) {
        toast.success('تم تحديث البيانات ونقل السجل للأرشيف بنجاح');
        setShowCancelModal(false);
        setSelectedOffer(null);
        // Add a small delay to allow the background DB trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        fetchOffers();
      } else {
        // Rollback if failed
        fetchOffers();
      }
    } catch (err) {
      toast.error(t('error_generic'));
      fetchOffers();
    } finally {
      setLoading(false);
    }
  };

  const handleDirectDelete = async () => {
    if (!selectedOffer) return;
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error: deleteError } = await supabase
        .from('inventory_offers')
        .delete()
        .eq('id', selectedOffer.id);

      if (deleteError) throw deleteError;

      toast.success('تم حذف العرض بنجاح');
      setShowCancelModal(false);
      setSelectedOffer(null);
      fetchOffers();
    } catch (err) {
      console.error('Delete Error:', err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async () => {
    if (!selectedOffer || !quantityAction) return;
    
    if (quantityAction === 'add') {
      setLoading(true);
      try {
        const supabase = getSupabase();
        if (supabase) {
          const newQty = selectedOffer.quantity + quantityValue;
          const { error: updateError } = await supabase
            .from('inventory_offers')
            .update({ quantity: newQty })
            .eq('id', selectedOffer.id);
          
          if (updateError) throw updateError;
          
          toast.success('تم تحديث الكمية بنجاح');
          setShowQuantityModal(false);
          setSelectedOffer(null);
          fetchOffers();
        }
      } catch (err) {
        toast.error(t('error_generic'));
      } finally {
        setLoading(false);
      }
    } else {
      // Deduct logic: first ask for amount (already in quantityValue), then show action modal
      setShowQuantityModal(false);
      setShowDeductActionModal(true);
    }
  };

  const handleDeductArchive = async (actionType: string) => {
    if (!selectedOffer) return;
    setLoading(true);
    try {
      const success = await archiveItem(selectedOffer, quantityValue, actionType);
      if (success) {
        toast.success('تم تحديث البيانات ونقل السجل للأرشيف بنجاح');
        setShowDeductActionModal(false);
        setSelectedOffer(null);
        // Add a small delay to allow the background DB trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        fetchOffers();
      }
    } catch (err) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOffer) return;
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (supabase) {
        const { error: updateError } = await supabase
          .from('inventory_offers')
          .update({ 
            price: editData.price, 
            discount: editData.discount 
          })
          .eq('id', selectedOffer.id);
        
        if (updateError) throw updateError;
        
        toast.success('تم تحديث البيانات بنجاح');
        setShowEditModal(false);
        setSelectedOffer(null);
        fetchOffers();
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
          <h1 className="text-3xl font-bold text-slate-900">{t('my_offers')}</h1>
          <p className="text-slate-500">Manage your inventory and stock</p>
        </div>
        <button
          onClick={() => {
            console.log('Open Add Offer Modal clicked');
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
          {t('add_offer')}
        </button>
      </div>

      <BulkUpload onSuccess={fetchOffers} />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('drug')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('expiry_date')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('discount')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('price')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">{t('quantity')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {offers.length > 0 ? (
                offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{offer.english_name}</span>
                        <span className="text-xs text-slate-500">{offer.barcode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {(() => {
                        const status = getExpiryStatus(offer.expiry_date);
                        return (
                          <span className={cn(
                            "px-2 py-1 rounded text-xs font-bold",
                            status.color === 'rose' && "bg-rose-100 text-rose-700",
                            status.color === 'orange' && "bg-orange-100 text-orange-700",
                            status.color === 'emerald' && "bg-emerald-100 text-emerald-700",
                            status.color === 'slate' && "bg-slate-100 text-slate-700"
                          )}>
                            {format(new Date(offer.expiry_date), 'MMM yyyy')}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary">{offer.discount}%</span>
                    </td>
                    <td className="px-6 py-4 font-bold">{offer.price} {t('egp')}</td>
                    <td className="px-6 py-4">{offer.quantity}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedOffer(offer);
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
                            setSelectedOffer(offer);
                            setEditData({ price: offer.price, discount: offer.discount });
                            setShowEditModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteOffer(offer.id)}
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
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
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
              <h2 className="text-xl font-bold">{t('add_offer')}</h2>
              <button 
                onClick={() => {
                  console.log('Close Add Offer Modal clicked');
                  setShowAddModal(false);
                }} 
                className="hover:bg-white/20 p-1 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAddOffer} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('search_drug')}</label>
                {!selectedDrug ? (
                  <DrugSearch 
                    onSelect={(drug) => {
                      setSelectedDrug(drug);
                      setFormData({ ...formData, price: drug.price || 0 });
                    }} 
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
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('expiry_date')}</label>
                    <input
                      type="month"
                      required
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('discount')} %</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: parseInt(e.target.value) || 0 })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('quantity')}</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t('price')} ({t('egp')})</label>
                    <input
                      type="number"
                      required
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                    />
                  </div>
                </div>
              )}

              <button
                disabled={loading || !selectedDrug || !selectedDrug.barcode || parseInt(selectedDrug.barcode.toString().replace(/\D/g, '')) === 0 || !formData.price || formData.price <= 0}
                className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20"
              >
                {loading ? <Loader2 className="animate-spin" /> : t('add_offer')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">{t('edit')}</h2>
              <button onClick={() => setShowEditModal(false)} className="hover:bg-white/20 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditOffer} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('price')} ({t('egp')})</label>
                <input
                  type="number"
                  required
                  value={editData.price}
                  onChange={(e) => setEditData({ ...editData, price: parseFloat(e.target.value) || 0 })}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('discount')} %</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={editData.discount}
                  onChange={(e) => setEditData({ ...editData, discount: parseInt(e.target.value) || 0 })}
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
      {showCancelModal && selectedOffer && (
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
            <p className="text-slate-500 mb-8">سيتم نقل هذا العرض إلى الأرشيف</p>
            <div className="grid grid-cols-1 gap-3">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleFullCancel(t('archive_internal_sale'))}
                  className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
                >
                  {t('archive_internal_sale')}
                </button>
                <button
                  onClick={() => handleFullCancel(t('archive_transfer'))}
                  className="py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                  {t('archive_transfer')}
                </button>
              </div>
              <button
                onClick={handleDirectDelete}
                className="py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-500/20"
              >
                {isRtl ? 'حذف نهائي (بدون أرشيف)' : 'Permanent Delete (No Archive)'}
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
      {showQuantityModal && selectedOffer && (
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
                      max={quantityAction === 'deduct' ? selectedOffer.quantity : undefined}
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
      {showDeductActionModal && selectedOffer && (
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
                onClick={() => handleDeductArchive(t('archive_internal_sale'))}
                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/20"
              >
                {t('archive_internal_sale')}
              </button>
              <button
                onClick={() => handleDeductArchive(t('archive_transfer'))}
                className="py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
              >
                {t('archive_transfer')}
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
