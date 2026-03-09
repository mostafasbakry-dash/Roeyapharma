import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, X, Loader2, MessageSquare } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/src/lib/utils';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratedPharmacyId: string;
  ratedPharmacyName: string;
  relatedItemId: string;
  onSuccess?: () => void;
}

export const RatingModal = ({ 
  isOpen, 
  onClose, 
  ratedPharmacyId, 
  ratedPharmacyName, 
  relatedItemId,
  onSuccess 
}: RatingModalProps) => {
  const { t, i18n } = useTranslation();
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raterPharmacyId = localStorage.getItem('pharmacy_id');
    if (!raterPharmacyId) return;

    setLoading(true);
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { error } = await supabase
        .from('ratings')
        .insert({
          to_pharmacy_id: Number(ratedPharmacyId),
          from_pharmacy_id: Number(raterPharmacyId),
          stars: Number(stars),
          comment,
          related_item_id: Number(relatedItemId)
        });

      if (error) throw error;

      toast.success(i18n.language === 'ar' ? 'شكراً لك! تم تقييم الصيدلية بنجاح' : 'Thank You! Pharmacy rated successfully');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Rating Submit Error:', err);
      // Handle 409 Conflict or Unique Constraint Violation (Postgres code 23505)
      if (err.code === '23505' || err.status === 409) {
        toast.success(i18n.language === 'ar' ? 'تم تسجيل تقييمك بنجاح' : 'Your rating was recorded');
        onSuccess?.();
        onClose();
      } else {
        toast.error(t('error_generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
        <div className="bg-primary p-6 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold">{t('rate_pharmacy')}</h2>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-slate-500">{t('rating_question', { name: ratedPharmacyName })}</p>
            <h3 className="text-lg font-bold text-slate-900">{ratedPharmacyName}</h3>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setStars(num)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star 
                  size={40} 
                  className={cn(
                    "transition-colors",
                    num <= stars ? "fill-amber-400 text-amber-400" : "text-slate-200"
                  )} 
                />
              </button>
            ))}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase px-1 flex items-center gap-2">
              <MessageSquare size={14} />
              {t('rating_comment')}
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary outline-none min-h-[100px] resize-none"
              placeholder="..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : t('rating_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
