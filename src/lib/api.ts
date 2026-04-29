import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const TOKEN_KEY = "tsms_token";

export const tokenStore = {
  get: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set: (token: string) => {
    if (typeof window !== "undefined") localStorage.setItem(TOKEN_KEY, token);
  },
  clear: () => {
    if (typeof window !== "undefined") localStorage.removeItem(TOKEN_KEY);
  },
};

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type Role = "superadmin" | "owner" | "tailor";

export interface User {
  _id: string;
  id?: string;
  fullName: string;
  email?: string;
  phoneNumber: string;
  address?: string;
  photo?: string;
  role: Role;
  status?: "pending" | "approved" | "rejected";
  active?: boolean;
  owners?: string[];
  createdAt?: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  unique_code: number;
  createdAt?: string;
}

export interface Order {
  _id: string;
  customer_id: Customer | string;
  assigned_tailor_id?: User | string | null;
  owner_id?: User | string;
  total_price: number;
  deposit: number;
  remaining_price: number;
  design_image_url?: string;
  appointment_date?: string;
  status: "pending" | "in_progress" | "completed";
  createdAt?: string;
  updatedAt?: string;
}

export interface Measurement {
  _id?: string;
  order_id?: string;
  coat_length?: number;
  coat_waist?: number;
  coat_chest?: number;
  coat_shoulder?: number;
  pant_length?: number;
  pant_waist?: number;
  pant_hip?: number;
  pant_thigh?: number;
  pant_bottom?: number;
  vest_length?: number;
  vest_waist?: number;
  vest_chest?: number;
}

export interface PaymentEntry {
  amount: number;
  payment_type: "deposit" | "full";
  payment_date?: string;
}

export interface Payment {
  _id: string;
  order_id: string;
  history: PaymentEntry[];
}

export interface Design {
  _id?: string;
  order_id: string;
  coat_style?: string;
  pant_style?: string;
  vest_style?: string;
  notes?: string;
}

export const formatETB = (n: number | undefined | null) => {
  const v = Number(n ?? 0);
  return `ETB ${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const unwrap = <T = any>(res: any): T => {
  // backend may return { data: ... } or raw
  if (res?.data?.data !== undefined) return res.data.data as T;
  return res?.data as T;
};
