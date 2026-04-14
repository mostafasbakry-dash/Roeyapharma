import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';
import ReactMarkdown from 'react-markdown';

export const Terms = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<{ ar: string; en: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLegalContent = async () => {
      setLoading(true);
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');

        const { data, error } = await supabase
          .from('legal_content')
          .select('content_ar, content_en')
          .eq('type', 'terms_and_conditions')
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setContent({
            ar: data.content_ar,
            en: data.content_en
          });
        } else {
          throw new Error('No terms and conditions found');
        }
      } catch (err: any) {
        console.error('[APP-DEBUG][LEGAL] Fetch failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLegalContent();
  }, []);

  const currentContent = i18n.language === 'ar' ? content?.ar : content?.en;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            {t('terms_and_conditions')}
          </h1>
        </div>
        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
          <Shield size={24} />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-slate-500 font-medium">{t('terms_loading')}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-rose-500 text-center">
              <AlertCircle size={40} />
              <p className="font-medium">{t('terms_failed')}</p>
              <p className="text-sm text-slate-400">{error}</p>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              <div className="text-slate-700 leading-relaxed text-lg">
                <ReactMarkdown>{currentContent || ''}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500 text-center">
          {t('terms_last_updated')}
        </p>
      </div>
    </div>
  );
};
