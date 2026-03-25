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

export const DrugSearch = React.forwardRef<HTMLInputElement, DrugSearchProps>(({ onSelect, onAddMissing, className }, ref) => {
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
      if (query.length < 2) {
        setResults([]);
        setHasSearched(false);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) {
        return;
      }

      setLoading(true);
      try {
        const searchTerm = query.trim();
        // STRICT FIX: Hardcoded table name 'master' to prevent 404 errors
        const TABLE_NAME = 'master';
        
        console.log(`[DrugSearch] Searching for "${searchTerm}" in table "${TABLE_NAME}"`);

        // Construct the OR filter parts
        // We use .ilike for text columns and .eq for the numeric barcode column
        // to avoid Postgres Error 42883 (operator does not exist: bigint ~~* text)
        const filterParts = [
          `arabic_name.ilike.%${searchTerm}%`,
          `english_name.ilike.%${searchTerm}%`
        ];

        // Only add barcode to the OR filter if the search term is numeric
        const numericSearch = searchTerm.replace(/\s/g, '');
        if (/^\d+$/.test(numericSearch)) {
          filterParts.push(`barcode.eq.${numericSearch}`);
        }

        const { data, error } = await supabase
          .from(TABLE_NAME)
          .select('*')
          .or(filterParts.join(','))
          .limit(20);

        if (error) throw error;

        // Map the results to our Drug type using exact column names from SQL
        const mappedData = (data || []).map((item: any) => ({
          id: item.id,
          barcode: item.barcode,
          price: item.price,
          manufacturer: item.manufacturer,
          name_en: item.english_name,
          name_ar: item.arabic_name
        }));

        setResults(mappedData);
        console.log(`[DrugSearch] Results found: ${mappedData.length}`);
        setHasSearched(true);
        
        // Selection Behavior: If exact barcode match and single result, select automatically
        // We clean the query of spaces for barcode matching (e.g., '1 2 3' -> '123')
        const searchVal = searchTerm.replace(/\s/g, '');
        const isNumeric = /^\d+$/.test(searchVal);
        const isBarcode = isNumeric && searchVal.length >= 8;
        
        if (isBarcode && mappedData.length === 1 && mappedData[0].barcode.toString() === searchVal) {
          onSelect(mappedData[0]);
          setQuery('');
          setIsOpen(false);
        } else {
          setIsOpen(true);
        }
      } catch (err) {
        console.error('Drug search error:', err);
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
          ref={ref}
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
        <div 
          className="absolute z-[9999] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-x-hidden custom-scrollbar"
          style={{ 
            maxHeight: '300px', 
            overflowY: 'scroll',
            display: 'block'
          }}
        >
          {results.length > 0 ? (
            results.map((drug) => (
                <button
                  key={drug.id}
                  onClick={() => {
                    onSelect(drug);
                    setQuery('');
                    setIsOpen(false);
                  }}
                  className="w-full text-start px-4 py-3.5 md:py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex flex-col gap-0.5 transition-colors active:bg-slate-100"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 text-sm md:text-base truncate flex-1">{drug.name_en}</span>
                    <span className="text-[10px] md:text-xs font-mono text-slate-400 ml-2 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">{drug.barcode}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs md:text-sm text-slate-500 truncate flex-1">{drug.name_ar}</span>
                    <span className="text-[10px] md:text-xs text-primary font-bold uppercase tracking-wider ml-2 shrink-0">{drug.manufacturer}</span>
                  </div>
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
});

DrugSearch.displayName = 'DrugSearch';
