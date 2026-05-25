export interface Category {
  id: string;
  name: string;
  createdAt: any;
  updatedAt: any;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  createdAt: any;
  updatedAt: any;
}

export interface Ad {
  id: string;
  slot: 'header' | 'sidebar' | 'feed';
  imageUrl: string;
  targetUrl: string;
  title: string;
  categoryTarget?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  governorate?: string;
  shippingFee?: number;
  items: {
    productId: string;
    productTitle: string;
    price: number;
    quantity: number;
  }[];
  totalPrice: number;
  status: 'pending' | 'completed' | 'canceled';
  isDeleted?: boolean;
  createdAt: any;
}

export interface Governorate {
  name: string;
  shippingFee: number;
}

export const EGYPT_GOVERNORATES: Governorate[] = [
  { name: 'القاهرة', shippingFee: 40 },
  { name: 'الجيزة', shippingFee: 40 },
  { name: 'الإسكندرية', shippingFee: 50 },
  { name: 'القليوبية', shippingFee: 45 },
  { name: 'المنوفية', shippingFee: 55 },
  { name: 'الغربية', shippingFee: 55 },
  { name: 'الدقهلية', shippingFee: 55 },
  { name: 'الشرقية', shippingFee: 55 },
  { name: 'البحيرة', shippingFee: 55 },
  { name: 'دمياط', shippingFee: 60 },
  { name: 'بورسعيد', shippingFee: 60 },
  { name: 'الإسماعيلية', shippingFee: 60 },
  { name: 'السويس', shippingFee: 60 },
  { name: 'كفر الشيخ', shippingFee: 55 },
  { name: 'الفيوم', shippingFee: 65 },
  { name: 'بني سويف', shippingFee: 65 },
  { name: 'المنيا', shippingFee: 70 },
  { name: 'أسيوط', shippingFee: 75 },
  { name: 'سوهاج', shippingFee: 80 },
  { name: 'قنا', shippingFee: 85 },
  { name: 'الأقصر', shippingFee: 90 },
  { name: 'أسوان', shippingFee: 95 },
  { name: 'مطروح', shippingFee: 100 },
  { name: 'الوادي الجديد', shippingFee: 110 },
  { name: 'البحر الأحمر', shippingFee: 90 },
  { name: 'شمال سيناء', shippingFee: 110 },
  { name: 'جنوب سيناء', shippingFee: 110 }
];

