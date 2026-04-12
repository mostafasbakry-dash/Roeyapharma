import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface SearchableSelectProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  disabled,
  required,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="text-xs font-bold text-slate-500 uppercase px-1 mb-1 block">
          {label}
        </label>
      )}
      <div
        className={cn(
          "relative flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-primary transition-all cursor-pointer",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-primary"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {icon && (
          <div className="pl-3 text-slate-400">
            {icon}
          </div>
        )}
        <div className="flex-1 px-3 py-3 text-slate-700 truncate">
          {value || <span className="text-slate-400">{placeholder}</span>}
        </div>
        <div className="pr-3 text-slate-400">
          <ChevronDown size={18} className={cn("transition-transform", isOpen && "rotate-180")} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[110] w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option}
                  className={cn(
                    "px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 transition-colors",
                    value === option ? "bg-primary/5 text-primary font-bold" : "text-slate-700"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option);
                  }}
                >
                  {option}
                </div>
              ))
            ) : (
              <div className="px-4 py-4 text-sm text-slate-400 text-center">
                No matches found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
