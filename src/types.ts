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
