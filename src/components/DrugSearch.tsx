import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, PlusCircle } from 'lucide-react';
import { getSupabase } from '@/src/lib/supabase';
import { Drug } from '@/src/types';
import { cn } from '@/src/lib/utils';
import { AddMissingItemModal } from './AddMissingItemModal';

interface DrugSearchProps {
  onSelect: (drug: Drug) => void;
  onAddMissing?: (query: string) => void;
  className?: string;
}

export const DrugSearch = ({ onSelect, onAddMissing, className }: DrugSearchProps) => {
  const { t, i18n } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Drug[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchDrugs = async () => {
      if (query.length < 3) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        console.error('Supabase client not initialized');
        return;
      }

      setLoading(true);
      try {
        // Hybrid Search Logic
        const isNumeric = /^\d+$/.test(query);
        const isBarcode = isNumeric && query.length >= 8;
        
        let orFilter = `arabic_name.ilike.%${query}%,english_name.ilike.%${query}%`;
        if (isBarcode) {
          orFilter += `,barcode.eq.${query}`;
        }

        const { data, error } = await supabase
          .from('master')
          .select('*')
          .or(orFilter)
          .limit(10);

        console.log('Supabase search results:', data);
        if (error) throw error;

        // Map the results to our Drug type
        const mappedData = (data || []).map((item: any) => ({
          id: item.id,
          barcode: item.barcode,
          price: item.price,
          manufacturer: item.manufacturer,
          name_en: item.english_name,
          name_ar: item.arabic_name
        }));

        setResults(mappedData);
        setHasSearched(true);
        
        // Selection Behavior: If exact barcode match and single result, select automatically
        if (isBarcode && mappedData.length === 1 && mappedData[0].barcode.toString() === query) {
          console.log(`Exact barcode match found: ${mappedData[0].name_en}`);
          onSelect(mappedData[0]);
          setQuery('');
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchDrugs, 300);
    return () => clearTimeout(debounce);
  }, [query, onSelect]);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search_placeholder')}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-primary animate-spin" size={20} />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            results.map((drug) => (
              <button
                key={drug.id}
                onClick={() => {
                  console.log(`Drug selected from search: ${drug.name_en} (${drug.barcode})`);
                  onSelect(drug);
                  setQuery('');
                  setIsOpen(false);
                }}
                className="w-full text-start px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col gap-1"
              >
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-900">{drug.name_en}</span>
                  <span className="text-xs font-mono text-slate-400">{drug.barcode}</span>
                </div>
                <span className="text-sm text-slate-500">{drug.name_ar}</span>
                <span className="text-xs text-primary font-medium">{drug.manufacturer}</span>
              </button>
            ))
          ) : hasSearched && !loading && (
            <div className="p-4 text-center space-y-3">
              <p className="text-slate-500 text-sm">
                {i18n.language === 'ar' ? 'لم يتم العثور على نتائج' : 'No results found'}
              </p>
              {onAddMissing && (
                <button
                  type="button"
                  onClick={() => {
                    onAddMissing(query);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-50 text-emerald-600 rounded-xl font-bold hover:bg-emerald-100 transition-all border border-emerald-100"
                >
                  <PlusCircle size={18} />
                  <span>
                    {i18n.language === 'ar' ? 'الصنف غير موجود؟ أضفه الآن' : 'Item not found? Add it now'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
