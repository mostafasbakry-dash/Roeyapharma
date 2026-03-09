import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Download, Upload, Loader2, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { getSupabase } from '@/src/lib/supabase';

interface BulkUploadProps {
  onSuccess?: () => void;
}

export const BulkUpload = ({ onSuccess }: BulkUploadProps) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [validBarcodes, setValidBarcodes] = useState<Set<string>>(new Set());

  const supabase = getSupabase();

  const formatBarcode = (val: any): string => {
    if (val === null || val === undefined) return "";
    let str = String(val).trim();
    
    // Handle scientific notation (e.g., 6.221E+12)
    if (str.toLowerCase().includes('e+')) {
      const num = Number(str);
      if (!isNaN(num)) {
        // Convert to full numeric string without grouping
        str = num.toLocaleString('fullwide', { useGrouping: false });
      }
    }
    
    // Remove any non-digit characters
    return str.replace(/\D/g, '');
  };

  const validateBarcodeLength = (barcode: string) => {
    if (barcode.length > 0 && (barcode.length < 8 || barcode.length > 14)) {
      toast.error(`Warning: Barcode [${barcode}] has an unusual length. Please verify it matches the Master list`, {
        icon: '⚠️',
        duration: 4000
      });
      return false;
    }
    return true;
  };

  const formatExcelDate = (serial: any): string => {
    if (!serial) return '';
    
    // If it's already a string in YYYY-MM-DD format
    if (typeof serial === 'string' && /^\d{4}-\d{2}-\d{2}/.test(serial)) {
      return serial.split('T')[0];
    }

    // If it's a number (Excel serial date)
    if (typeof serial === 'number') {
      // Excel bug: 1900 is not a leap year, but Excel thinks it is.
      // 25569 is the number of days between 1900-01-01 and 1970-01-01
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // If it's a JS Date object
    if (serial instanceof Date) {
      const year = serial.getFullYear();
      const month = String(serial.getMonth() + 1).padStart(2, '0');
      const day = String(serial.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return String(serial);
  };

  const downloadTemplate = () => {
    console.log('Download Template clicked');
    const template = [
      {
        'Barcode': '6221000000001',
        'Drug Name EN': 'Panadol Advance',
        'Drug Name AR': 'بانادول ادفانس',
        'Expiry Date (YYYY-MM-DD)': '2026-05-01',
        'Discount %': 25,
        'Quantity': 10,
        'Price': 120
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Roeya_Template.xlsx');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File Upload triggered');
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgress(0);
    setPreviewData([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('The file is empty');
        setLoading(false);
        return;
      }

      // Process and clean data for preview
      const cleanedData = jsonData.map((row: any) => {
        const barcode = formatBarcode(row['Barcode']);
        validateBarcodeLength(barcode);
        return {
          ...row,
          barcode: barcode,
          expiry_date: formatExcelDate(row['Expiry Date (YYYY-MM-DD)']),
        };
      });

      // Existence Check: Bulk check barcodes in Master list
      if (supabase) {
        const barcodes = cleanedData.map(d => d.barcode).filter(b => b !== "");
        const { data: masterItems, error: masterError } = await supabase
          .from('master')
          .select('barcode')
          .in('barcode', barcodes);

        if (masterError) {
          console.error('Master bulk check error:', masterError);
        }

        const validSet = new Set(masterItems?.map(m => m.barcode?.toString().trim()) || []);
        setValidBarcodes(validSet);
      }

      setPreviewData(cleanedData);
      toast.success(`Loaded ${cleanedData.length} items. Please review before confirming.`);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(`Failed to process Excel file: ${err.message}`);
    } finally {
      setLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (previewData.length === 0) return;

    setLoading(true);
    setProgress(0);

    const ADD_OFFER_WEBHOOK_URL = 'https://n8n.srv1168218.hstgr.cloud/webhook/add-offer';
    const PENDING_ITEMS_WEBHOOK_URL = 'https://n8n.srv1168218.hstgr.cloud/webhook/pending_items';

    try {
      const pharmacy_id_str = localStorage.getItem('pharmacy_id');
      const pharmacy_id = pharmacy_id_str ? parseInt(pharmacy_id_str) : 0;
      
      let successCount = 0;
      let pendingCount = 0;
      let errorMessages: string[] = [];

      for (let i = 0; i < previewData.length; i++) {
        const row = previewData[i];
        const barcode = row.barcode;
        
        // Intelligent Routing
        if (validBarcodes.has(barcode)) {
          // 1. Items in Master list -> Send to inventory_offers webhook
          const payload = {
            pharmacy_id: pharmacy_id,
            barcode: barcode,
            english_name: row['Drug Name EN'],
            arabic_name: row['Drug Name AR'],
            expiry_date: row.expiry_date,
            discount: row['Discount %'],
            quantity: row['Quantity'],
            price: row['Price']
          };

          try {
            const response = await fetch(ADD_OFFER_WEBHOOK_URL, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ payload }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              if (response.status === 400) {
                throw new Error(`Invalid data format (likely Expiry Date): ${errorText}`);
              }
              throw new Error(errorText || `Server responded with ${response.status}`);
            }

            successCount++;
          } catch (fetchErr: any) {
            console.error(`Error uploading item ${barcode}:`, fetchErr);
            errorMessages.push(`Failed to upload [${barcode}]: ${fetchErr.message}`);
          }
        } else {
          // 2. Items NOT in Master list -> Send to pending_items webhook for Admin review
          const payload = {
            pharmacy_id: pharmacy_id,
            barcode: barcode,
            english_name: row['Drug Name EN'] || '',
            arabic_name: row['Drug Name AR'] || '',
            price: typeof row['Price'] === 'string' 
              ? parseFloat(row['Price'].replace(/[^\d.]/g, '')) 
              : Number(row['Price'] || 0)
          };

          try {
            const response = await fetch(PENDING_ITEMS_WEBHOOK_URL, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ payload }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText || `Server responded with ${response.status}`);
            }

            pendingCount++;
          } catch (fetchErr: any) {
            console.error(`Error sending item ${barcode} to pending:`, fetchErr);
            errorMessages.push(`Failed to send [${barcode}] to review: ${fetchErr.message}`);
          }
        }

        setProgress(Math.round(((i + 1) / previewData.length) * 100));
      }

      if (errorMessages.length > 0) {
        errorMessages.forEach(msg => toast.error(msg, { duration: 5000 }));
      }

      // Dual Feedback
      if (successCount > 0) {
        toast.success(`${successCount} offers added to your inventory.`);
      }
      
      if (pendingCount > 0) {
        toast.success(`${pendingCount} items sent for review.`, {
          icon: '📝',
          duration: 6000
        });
      }

      if (successCount > 0 || pendingCount > 0) {
        setPreviewData([]);
        if (onSuccess) onSuccess();
      } else if (errorMessages.length === 0) {
        toast.error('No items were processed.');
      }
    } catch (err: any) {
      console.error('Confirm upload error:', err);
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shrink-0">
            <FileSpreadsheet size={48} />
          </div>
          
          <div className="flex-1 text-center md:text-start">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('bulk_upload')}</h2>
            <p className="text-slate-500 mb-6">
              Upload multiple offers at once using our Excel template. 
              Each row will be processed and added to your inventory.
            </p>
            
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all"
              >
                <Download size={20} />
                {t('download_template')}
              </button>
              
              <label className="relative flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-all cursor-pointer shadow-md shadow-primary/20">
                <Upload size={20} />
                {t('upload_file')}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
              </label>

              {previewData.length > 0 && (
                <button
                  onClick={handleConfirmUpload}
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                  Confirm Upload ({previewData.length} items)
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="mt-8 space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-slate-600">
              <span className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                Processing items...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-800">
            <p className="font-bold mb-1">Important Note:</p>
            <p>Please ensure all dates are in YYYY-MM-DD format and barcodes are 13-digit numbers. Duplicate items (same barcode and expiry) will be flagged.</p>
          </div>
        </div>
      </div>

      {previewData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-bold text-lg text-slate-900">Preview Data</h3>
            <button 
              onClick={() => setPreviewData([])}
              className="text-sm text-slate-500 hover:text-rose-500 font-medium"
            >
              Clear Preview
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Barcode</th>
                  <th className="px-6 py-3">Drug Name</th>
                  <th className="px-6 py-3">Expiry</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewData.map((row, idx) => {
                  const isValid = validBarcodes.has(row.barcode);
                  return (
                    <tr key={idx} className={isValid ? "hover:bg-slate-50" : "bg-rose-50"}>
                      <td className="px-6 py-4 font-mono">{row.barcode}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{row['Drug Name EN']}</span>
                          <span className="text-xs text-slate-500">{row['Drug Name AR']}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{row.expiry_date}</td>
                      <td className="px-6 py-4 font-bold">{row['Price']}</td>
                      <td className="px-6 py-4">
                        {isValid ? (
                          <span className="text-emerald-600 font-bold">Ready</span>
                        ) : (
                          <span className="text-rose-600 font-bold">Not in Master List</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
