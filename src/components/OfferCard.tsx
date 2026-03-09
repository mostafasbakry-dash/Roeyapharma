import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Tag, MapPin, Building2, ArrowRight, Star, ShieldCheck } from 'lucide-react';
import { Offer } from '@/src/types';
import { formatCurrency, cn } from '@/src/lib/utils';
import { format } from 'date-fns';

interface OfferCardProps {
  offer: any;
  onAction?: (offer: any) => void;
  onConfirm?: (offer: any) => void;
  actionLabel?: string;
  isOwner?: boolean;
  [key: string]: any;
}

export const OfferCard = ({ offer, onAction, onConfirm, actionLabel, isOwner, userCity }: OfferCardProps) => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';
  const isNearExpiry = offer.expiry_date && (new Date(offer.expiry_date).getTime() - new Date().getTime() < 1000 * 60 * 60 * 24 * 90); // 90 days
  const pharmacyCity = offer.pharmacies?.city || offer.pharmacy_address?.split(',')[0];
  const isInUserCity = userCity && pharmacyCity && userCity.trim().toLowerCase() === pharmacyCity.trim().toLowerCase();

  return (
    <div className={cn(
      "bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all group flex flex-col h-full",
      isNearExpiry && "border-orange-200 bg-orange-50/30",
      isInUserCity && "border-emerald-200 ring-1 ring-emerald-100"
    )}>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">
                {isRtl ? offer.arabic_name : offer.english_name}
              </h3>
              {isInUserCity && (
                <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                  {t('in_your_city')}
                </span>
              )}
            </div>
            <p className="text-xs font-mono text-slate-400">{offer.barcode}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            {offer.discount !== undefined && offer.discount > 0 && (
              <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-bold">
                {offer.discount}% OFF
              </div>
            )}
            {isNearExpiry && (
              <div className="bg-orange-100 text-orange-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {t('near_expiry')}
              </div>
            )}
            <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
              {isRtl ? `الكمية: ${offer.quantity}` : `Qty: ${offer.quantity}`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {offer.expiry_date && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">{t('expiry_date')}</span>
                <span className="text-sm font-medium">{format(new Date(offer.expiry_date), 'MMM yyyy')}</span>
              </div>
            </div>
          )}
          {offer.price !== undefined && (
            <div className="flex items-center gap-2 text-slate-600">
              <Tag size={16} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400 font-bold">{t('price')}</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(offer.price)}</span>
              </div>
            </div>
          )}
        </div>

        {!isOwner && (
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-start gap-2 text-slate-600">
              <Building2 size={16} className="text-slate-400 mt-1 shrink-0" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {offer.pharmacies?.pharmacy_name || offer.pharmacy_name || 'Unknown Pharmacy'}
                  </span>
                  {offer.pharmacies?.rating !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={cn(
                              star <= Math.round(offer.pharmacies?.rating || 0) 
                                ? "fill-amber-400 text-amber-400" 
                                : "text-slate-200"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-bold text-slate-700">
                        {offer.pharmacies.rating > 0 ? offer.pharmacies.rating.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({offer.pharmacies.review_count || 0})
                      </span>
                    </div>
                  )}
                  {offer.pharmacies?.is_verified && (
                    <div className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full" title={t('verified_pharmacy')}>
                      <ShieldCheck size={12} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} />
                  <span>
                    {offer.pharmacies?.city || offer.pharmacy_address?.split(',')[0] || 'Unknown Location'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto space-y-2 pt-6">
          {onAction && (
            <button
              onClick={() => {
                console.log(`Offer Card Action clicked for offer: ${offer.id}`);
                onAction(offer);
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {actionLabel || t('view_details')}
              <ArrowRight size={18} className={cn(isRtl && "rotate-180")} />
            </button>
          )}
          
          {onConfirm && !isOwner && (
            <button
              onClick={() => onConfirm(offer)}
              className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              {i18n.language === 'ar' ? 'تأكيد التعامل' : 'Confirm Transaction'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
