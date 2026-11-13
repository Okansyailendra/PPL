export interface UserSession {
  id: string;
  email: string;
  store_name: string;
  owner_name: string;
  phone_number?: string;
  warung_name?: string;
}

export interface Debt {
  id: string;
  umkm_id: string;
  customer_name: string;
  customer_phone?: string | null;
  amount: number;
  paid_amount?: number;
  remaining_amount?: number;
  due_date: string;
  type?: 'BARANG' | 'PINJAMAN_TUNAI';
  status: 'UNPAID' | 'PARTIAL' | 'PAID';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  related_trx_id?: string | null;
}

export interface PaymentLog {
  id: string;
  debt_id: string;
  umkm_id: string;
  amount_paid: number;
  payment_method?: 'CASH' | 'QRIS' | 'TRANSFER';
  notes?: string | null;
  payment_date?: string;
  created_at?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface TransactionItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
  costPrice?: number;
  unit?: string;
  subtotal?: number;
}

export interface Transaction {
  id: string;
  umkm_id?: string;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  created_at: string;
  transaction_date?: string;
  type: 'IN' | 'OUT';
  category?: string;
  payment_method: 'CASH' | 'QRIS' | 'CREDIT' | 'ONLINE' | 'TRANSFER';
  payment_status?: 'PENDING' | 'PAID' | 'SETTLEMENT' | 'UNPAID' | 'EXPIRE' | 'CANCEL' | 'FAILED';
  total_amount: number;
  shipping_cost?: number;
  courier?: string | null;
  courier_service?: string | null;
  tracking_number?: string | null;
  shipping_address?: string | null;
  snap_token?: string | null;
  items: TransactionItem[];
  debt_id?: string | null;
}

export interface ProductVariant {
  id: string;
  name: string;
  sublabel: string;
  price: number;
  savingsNote?: string;
  multiplier?: number;
}

export interface Product {
  id: string;
  umkm_id?: string;
  category_id?: string | null;
  name: string;
  brand?: string;
  category?: string | null;
  categoryLabel?: string;
  description?: string;
  equivalentNote?: string;
  price: number;
  harga_jual?: number;
  cost_price?: number;
  modal?: number;
  stock: number;
  min_stock: number;
  unit: string;
  weight?: number; // dalam gram (default 500)
  image?: string;
  image_url?: string;
  isLowStock?: boolean;
  created_at?: string;
  variants?: ProductVariant[];
}

export interface Category {
  id: string;
  umkm_id?: string;
  name: string;
  description?: string | null;
  iconName?: string;
  created_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: ProductVariant;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone?: string;
  items: CartItem[];
  total_amount: number;
  fulfillment_type: 'pickup' | 'delivery';
  delivery_address?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}
