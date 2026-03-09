import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Calendar, 
  Filter, 
  Loader2, 
  TrendingUp, 
  ArrowUpDown,
  FileText
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { getSupabase } from '@/src/lib/supabase';
import { cn } from '@/src/lib/utils';
import { startOfDay, startOfWeek, startOfMonth, isAfter, format, parseISO } from 'date-fns';

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export const Reports = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [filter, setFilter] = useState<TimeFilter>('month');
  const [error, setError] = useState<string | null>(null);

  const fetchArchiveData = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const pharmacy_id = localStorage.getItem('pharmacy_id');
    if (!pharmacy_id) return;

    setLoading(true);
    setError(null);
    try {
      const { data: archive, error: archiveError } = await supabase
        .from('sales_archive')
        .select('*')
        .eq('pharmacy_id', pharmacy_id)
        .order('created_at', { ascending: false });

      if (archiveError) throw archiveError;
      setData(archive || []);
    } catch (err: any) {
      console.error('Reports Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchiveData();
  }, [fetchArchiveData]);

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date | null = null;

    if (filter === 'today') startDate = startOfDay(now);
    else if (filter === 'week') startDate = startOfWeek(now);
    else if (filter === 'month') startDate = startOfMonth(now);

    if (!startDate) return data;

    return data.filter(item => isAfter(parseISO(item.created_at), startDate!));
  }, [data, filter]);

  const sortedData = useMemo(() => {
    // Default sorting: Most sold/transferred item to least (by quantity)
    return [...filteredData].sort((a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0));
  }, [filteredData]);

  const chartData = useMemo(() => {
    // Group by date and count transactions
    const groups: { [key: string]: number } = {};
    
    filteredData.forEach(item => {
      const dateKey = format(parseISO(item.created_at), 'yyyy-MM-dd');
      groups[dateKey] = (groups[dateKey] || 0) + 1;
    });

    return Object.entries(groups)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  if (loading && data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('reports_title')}</h1>
          <p className="text-slate-500">{t('reports_tagline')}</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                filter === f 
                  ? "bg-primary text-white shadow-md" 
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              {t(`filter_${f}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="text-primary" size={24} />
          <h2 className="text-xl font-bold text-slate-900">{t('transaction_evolution')}</h2>
        </div>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={12}
                  tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' 
                  }}
                  labelFormatter={(val) => format(parseISO(val), 'PPPP')}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <BarChart3 size={48} className="mb-2 opacity-20" />
              <p>{t('no_transactions')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="text-primary" size={24} />
            <h2 className="text-xl font-bold text-slate-900">{t('reports')}</h2>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            {sortedData.length} {t('transactions')}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-start">{t('item_name')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">
                  <div className="flex items-center justify-center gap-1">
                    {t('quantity')}
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">{t('type')}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-end">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedData.length > 0 ? (
                sortedData.map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.english_name}</span>
                        <span className="text-xs text-slate-500">{item.arabic_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-bold text-slate-700">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold uppercase",
                        item.action_type.includes('بيع') || item.action_type.includes('Sale') || item.action_type.includes('Purchased')
                          ? "bg-emerald-100 text-emerald-700" 
                          : "bg-indigo-100 text-indigo-700"
                      )}>
                        {item.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-end text-sm text-slate-500 font-medium">
                      {format(parseISO(item.created_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    {t('no_transactions')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
