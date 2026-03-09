import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return `${amount.toLocaleString('en-EG')} EGP`;
}

export function getDistance(city1: string, city2: string) {
  // Simple mock distance logic for sorting
  if (city1 === city2) return 0;
  return 1; // In a real app, we'd have a distance matrix
}

export function getExpiryStatus(expiryDate: string) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const currentYear = today.getFullYear();
  const expiryYear = expiry.getFullYear();

  if (diffDays < 0) {
    return { label: 'Expired', color: 'rose', days: diffDays, suggestion: 'Remove from inventory' };
  }
  
  if (diffDays < 90) {
    return { 
      label: 'Critical', 
      color: 'rose', 
      days: diffDays, 
      suggestion: 'Suggest 50% discount or more' 
    };
  }
  
  if (diffDays <= 180) {
    return { 
      label: 'Near Expiry', 
      color: 'orange', 
      days: diffDays, 
      suggestion: 'Suggest 30% discount' 
    };
  }
  
  if (expiryYear === currentYear) {
    return { 
      label: 'Expiring this year', 
      color: 'emerald', 
      days: diffDays, 
      suggestion: 'Suggest 15-20% discount' 
    };
  }
  
  return { label: 'Safe', color: 'slate', days: diffDays, suggestion: 'Standard pricing' };
}
