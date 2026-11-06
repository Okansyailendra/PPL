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
  due_date: string;
  status: 'UNPAID' | 'PAID';
  created_at?: string;
  related_trx_id?: string | null;
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
  created_at: string;
  transaction_date?: string;
  type: 'IN' | 'OUT';
  category?: string;
  payment_method: 'CASH' | 'CREDIT';
  total_amount: number;
  items: TransactionItem[];
  debt_id?: string | null;
}

export interface Product {
  id: string;
  umkm_id?: string;
  name: string;
  brand?: string;
  category?: string;
  categoryLabel?: string;
  price: number;
  cost_price?: number;
  stock: number;
  min_stock: number;
  unit: string;
  image?: string;
  isLowStock?: boolean;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  iconName: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
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
