import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Loader2, CheckCircle2 } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';
import { toast } from 'react-hot-toast';

interface AddMissingItemModalProps {
  onClose: () => void;
  initialQuery?: string;
}

export const AddMissingItemModal = ({ onClose, initialQuery }: AddMissingItemModalProps) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: initialQuery || '',
    barcode: '',
    brand: '',
    price: '',
    category: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_ar || !formData.name_en || !formData.brand || !formData.price) {
      const errorMsg = i18n.language === 'ar' 
        ? 'يرجى إكمال جميع الحقول المطلوبة (الاسم، البراند، السعر)' 
        : 'Please complete all required fields (Name, Brand, Price)';
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Supabase not initialized');

      const pharmacy_id = localStorage.getItem('pharmacy_id');
      
      const { error } = await supabase
        .from('pending_items')
        .insert([{
          arabic_name: formData.name_ar,
          english_name: formData.name_en,
          barcode: formData.barcode,
          brand: formData.brand,
          price: parseFloat(formData.price),
          final_category: formData.category,
          added_by: pharmacy_id
        }]);

      if (error) throw error;

      setSubmitted(true);
      toast.success(i18n.language === 'ar' 
        ? 'تم إرسال الصنف بنجاح وبانتظار المراجعة' 
        : 'Item sent successfully and is pending review');
      
      // Close after a short delay to show success state
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Error adding pending item:', err);
      toast.error(t('error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        {submitted ? (
          <div className="p-8 text-center animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {i18n.language === 'ar' ? 'تم الإرسال بنجاح' : 'Sent Successfully'}
            </h2>
            <p className="text-slate-600 leading-relaxed">
              {i18n.language === 'ar' 
                ? 'تم إرسال الصنف بنجاح وبانتظار المراجعة' 
                : 'Item sent successfully and is pending review'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-primary p-6 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {i18n.language === 'ar' ? 'إضافة صنف جديد' : 'Add New Item'}
              </h2>
              <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">
                      {i18n.language === 'ar' ? 'الاسم بالعربية (مطلوب)' : 'Arabic Name (Required)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all text-right"
                      placeholder="مثال: بنادول اكسترا"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">
                      {i18n.language === 'ar' ? 'الاسم بالإنجليزية (مطلوب)' : 'English Name (Required)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
                      placeholder="Example: Panadol Extra"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase px-1">
                        {i18n.language === 'ar' ? 'البراند (مطلوب)' : 'Brand (Required)'}
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.brand}
                        onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="GSK"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase px-1">
                        {i18n.language === 'ar' ? 'السعر (مطلوب)' : 'Price (Required)'}
                      </label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">
                      {i18n.language === 'ar' ? 'القسم (اختياري)' : 'Category (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all"
                      placeholder={i18n.language === 'ar' ? 'مثال: مسكنات' : 'Example: Analgesics'}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase px-1">
                      {i18n.language === 'ar' ? 'الباركود (اختياري)' : 'Barcode (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary transition-all font-mono"
                      placeholder="6221234567890"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : (i18n.language === 'ar' ? 'إرسال للمراجعة' : 'Send for Review')}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
