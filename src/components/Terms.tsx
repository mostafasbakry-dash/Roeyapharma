import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';

export const Terms = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<{ ar: string; en: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLegalContent = async () => {
      try {
        const supabase = getSupabase();
        if (!supabase) throw new Error('Supabase not initialized');

        const { data, error } = await supabase
          .from('legal_content')
          .select('*')
          .eq('type', 'terms')
          .maybeSingle();

        if (error && error.code !== 'PGRST116') throw error;
        if (data) {
          setContent({
            ar: data.content_ar,
            en: data.content_en
          });
        }
      } catch (err: any) {
        if (err?.code !== 'PGRST116' && err?.status !== 406) {
          console.error('Error fetching legal content:', err);
        }
        setError(err.message);
        // Fallback content if fetch fails
        setContent({
          ar: `الشروط والأحكام
اللغة العربية
1. طبيعة الخدمة: يعد التطبيق منصة إلكترونية (وسيط تقني) تهدف لتسهيل التواصل بين الصيدليات المسجلة لتبادل الأدوية الراكدة. التطبيق ليس طرفاً في أي عملية تبادل، ولا يعد صيدلية أو مخزن أدوية.
2. إخلاء المسؤولية عن عملية التبادل: تتم عمليات التبادل بناءً على الاتفاق المباشر بين الصيدليات. ولا يتحقق التطبيق من جودة الأدوية، تاريخ صلاحيتها، ظروف تخزينها، أو مشروعية تداولها. تقع المسؤولية كاملة على عاتق الصيدليات المتبادلة (المرسل والمستقبل).
3. المعاملات المالية: أي اتفاقات مالية أو تسويات نقدية تتم بين الصيدليات هي شأن داخلي بينهما. لا يتقاضى التطبيق أي عمولات عن عمليات التبادل، ولا يتدخل في تحديد الأسعار أو التحصيل المالي.
4. الخصومات والتسعير: للصيدليات الحق الكامل في التفاوض والنقاش حول قيمة الخصم الممنوح على الأدوية المتبادلة دون أدنى تدخل أو فرض قيود من إدارة التطبيق.
5. الشحن والتوصيل: الصيدليات هي المسؤولة مسؤولية كاملة عن اختيار وسيلة النقل والتوصيل المناسبة وضمان سلامة الدواء أثناء النقل. لا يوفر التطبيق خدمات شحن ولا يتحمل مسؤولية تلف أو ضياع الشحنات.`,
          en: `English Version
1. Nature of Service: The Application is a digital platform (technical intermediary) designed to facilitate communication between registered pharmacies for the exchange of stagnant medications. The Application is not a party to any exchange process and is not classified as a pharmacy or a drug store.
2. Disclaimer of Exchange Process: Exchanges are conducted based on direct agreements between pharmacies. The Application does not verify the quality, expiry dates, storage conditions, or legality of the medications. Full responsibility lies with the participating pharmacies (Sender and Receiver).
3. Financial Transactions: Any financial agreements or monetary settlements between pharmacies are strictly private matters between them. The Application does not charge any commissions on exchanges and does not intervene in pricing or payment collection.
4. Discounts and Pricing: Pharmacies have the full right to negotiate and discuss discount rates on exchanged medications without any interference or restrictions from the Application management.
5. Shipping and Delivery: Pharmacies are solely responsible for choosing the method of transport and delivery, ensuring the safety of the medication during transit. The Application does not provide shipping services and holds no liability for damaged or lost shipments.`
        });
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
            {i18n.language === 'ar' ? 'الشروط والأحكام' : 'Terms and Conditions'}
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
              <p className="text-slate-500 font-medium">Loading content...</p>
            </div>
          ) : error && !content ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-rose-500">
              <AlertCircle size={40} />
              <p className="font-medium">Failed to load terms and conditions</p>
            </div>
          ) : (
            <div className="prose prose-slate max-w-none">
              <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-lg">
                {currentContent}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <p className="text-sm text-slate-500 text-center">
          {i18n.language === 'ar' 
            ? 'آخر تحديث: فبراير 2026' 
            : 'Last Updated: February 2026'}
        </p>
      </div>
    </div>
  );
};
