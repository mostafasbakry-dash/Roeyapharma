export const EGYPT_CITIES = [
  "Cairo", "Giza", "Alexandria", "Dakahlia", "Red Sea", "Beheira", "Fayoum", "Gharbia", "Ismailia", "Monufia", "Minya", "Qalyubia", "New Valley", "Sharqia", "Suez", "Aswan", "Assiut", "Beni Suef", "Port Said", "Damietta", "South Sinai", "Kafr El Sheikh", "Matrouh", "Luxor", "Qena", "North Sinai", "Sohag"
].sort();

export interface Drug {
  id: string;
  barcode: string;
  name_en: string;
  name_ar: string;
  price: number;
  manufacturer?: string;
}

export interface PharmacyProfile {
  id: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  license_no: string;
  email: string;
  telegram: string;
  profile_pic?: string;
}

export interface Offer {
  id: string;
  pharmacy_id: string;
  drug_id: string;
  english_name: string;
  arabic_name: string;
  barcode: string;
  expiry_date: string;
  discount: number;
  price: number;
  quantity: number;
  pharmacy_name: string;
  pharmacy_address: string;
  created_at: string;
  pharmacies?: {
    pharmacy_id: string;
    city: string;
    phone?: string;
    pharmacy_name?: string;
    address?: string;
    telegram?: string;
    rating?: number;
    review_count?: number;
    success_score?: number;
    is_verified?: boolean;
  };
}

export interface Request {
  id: string;
  pharmacy_id: string;
  drug_id: string;
  english_name: string;
  arabic_name: string;
  barcode: string;
  quantity: number;
  created_at: string;
}
