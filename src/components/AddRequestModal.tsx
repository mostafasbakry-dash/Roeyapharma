import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { DrugSearch } from './DrugSearch';
import { toast } from 'react-hot-toast';
import { getSupabase } from '@/src/lib/supabase';
import { Drug } from '@/src/types';
import { cn } from '@/src/lib/utils';

interface AddRequestModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onAddMissing: (query: string) => void;
}

export const AddRequestModal = ({ onClose, onSuccess, onAddMissing }: AddRequestModalProps) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [stripsCount, setStripsCount] = useState(0);

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDrug) return;

    const normalizedBarcode = selectedDrug.barcode ? selectedDrug.barcode.toString().replace(/\D/g, '') : "0";
    const pharmacy_id_str = localStorage.getItem('pharmacy_id') || '';
    const isAdmin = localStorage.getItem('is_admin') === 'true';
    const pharmacy_id = (pharmacy_id_str === 'admin' || isAdmin) ? null : parseInt(pharmacy_id_str);

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      // 1. Duplicate Check (Pre-Webhook) - Query Supabase
      let query = supabase
        .from('inventory_requests')
        .select('id')
        .eq('barcode', normalizedBarcode);
      
      if (pharmacy_id !== null) {
        query = query.eq('pharmacy_id', pharmacy_id);
      } else {
        query = query.is('pharmacy_id', null);
      }

      const { data: existingRequest, error: checkError } = await query.maybeSingle();

      if (checkError) throw checkError;

      if (existingRequest) {
        toast.error(
          i18n.language === 'ar' 
            ? 'هذا الصنف مضاف مسبقاً في قائمة مطلوباتك، يمكنك تعديل الكميات مباشرة من القائمة.'
            : 'This item is already in your requests. You can adjust the quantity directly from the list.'
        );
        setLoading(false);
        return;
      }

      // 2. Proceed with Webhook if no duplicate exists
      const payload = {
        pharmacy_id: pharmacy_id,
        drug_id: selectedDrug.id,
        english_name: selectedDrug.name_en,
        arabic_name: selectedDrug.name_ar,
        barcode: normalizedBarcode,
        quantity: quantity,
        strips_count: stripsCount
      };

      const response = await fetch('https://n8n.srv1168218.hstgr.cloud/webhook/add-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload }),
      });

      if (!response.ok) throw new Error('Failed to add request');

      toast.success(t('success_added'));
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-3xl shadow-2xl animate-in slide-in-from-bottom md:zoom-in duration-300 max-h-[95vh] flex flex-col overflow-visible">
        <div className="bg-primary p-4 md:p-6 text-white flex justify-between items-center sticky top-0 z-10 rounded-t-3xl md:rounded-t-3xl">
          <h2 className="text-xl font-bold">{t('add_request')}</h2>
          <button 
            onClick={() => {
              onClose();
              setSelectedDrug(null);
            }} 
            className="hover:bg-white/20 p-1 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className={cn("flex-1 p-6 custom-scrollbar", !selectedDrug ? "overflow-visible" : "overflow-y-auto")}>
          <form onSubmit={handleAddRequest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">{t('search_drug')}</label>
              {!selectedDrug ? (
                <DrugSearch 
                  onSelect={(drug) => setSelectedDrug(drug)} 
                  onAddMissing={(query) => {
                    onAddMissing(query);
                  }}
                />
              ) : (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-200 hover:border-primary/30 hover:bg-slate-100/50 transition-all duration-300 group">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      <ShieldCheck size={18} />
                      <span className="text-xs uppercase tracking-wider">{t('dashboard_drug_verified')}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setSelectedDrug(null)} 
                      className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs hover:bg-slate-50 hover:text-primary hover:border-primary transition-all shadow-sm group-hover:shadow-md"
                    >
                      <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                      <span>{t('dashboard_change_drug')}</span>
                    </button>
                  </div>
                  
                <div className="grid grid-cols-1 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase px-1">{t('english_name')}</label>
                    <div className="w-full p-3 bg-white border border-slate-100 rounded-xl text-slate-700 font-bold shadow-sm text-sm md:text-base">
                      {selectedDrug.name_en || ''}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase px-1">{t('arabic_name')}</label>
                    <div className="w-full p-3 bg-white border border-slate-100 rounded-xl text-slate-700 font-bold text-right shadow-sm text-sm md:text-base">
                      {selectedDrug.name_ar || ''}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase px-1">{t('barcode')}</label>
                    <div className="w-full p-3 bg-white border border-slate-100 rounded-xl text-slate-500 font-mono text-sm shadow-sm">
                      {selectedDrug.barcode || ''}
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>

          {selectedDrug && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{i18n.language === 'ar' ? 'علبة' : 'Packs'}</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{i18n.language === 'ar' ? 'وحدة' : 'Units'}</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={stripsCount}
                  onChange={(e) => setStripsCount(parseInt(e.target.value) || 0)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary shadow-sm"
                />
              </div>
            </div>
          )}

          <button
            disabled={loading || !selectedDrug || !selectedDrug.barcode || parseInt(selectedDrug.barcode.toString().replace(/\D/g, '')) === 0 || (quantity <= 0 && stripsCount <= 0)}
            className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-primary/20"
          >
            {loading ? <Loader2 className="animate-spin" /> : t('add_request')}
          </button>
          </form>
        </div>
      </div>
    </div>
  );
};
