/**
 * Standardized Debugging Utility (The Flashlight)
 */

type LogCategory = 'SUPABASE' | 'AUTH' | 'NAVIGATION' | 'GLOBAL-ERROR' | 'UI';

export const debugLog = (category: LogCategory, message: string, data?: any) => {
  const prefix = `[APP-DEBUG][${category}]`;
  const timestamp = new Date().toLocaleTimeString();
  
  if (data) {
    console.log(`${prefix}[${timestamp}] ${message}`, data);
  } else {
    console.log(`${prefix}[${timestamp}] ${message}`);
  }
};

export const debugError = (category: LogCategory, message: string, error?: any) => {
  const prefix = `[APP-DEBUG][${category}]`;
  const timestamp = new Date().toLocaleTimeString();
  
  console.error(`${prefix}[${timestamp}] ❌ ${message}`, error || '');
};
