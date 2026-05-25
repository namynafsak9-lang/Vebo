import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Eye, ArrowUpRight } from 'lucide-react';

interface ProductCardProps {
  key?: string;
  product: Product;
  onViewDetails: (product: Product) => void;
}

export default function ProductCard({ product, onViewDetails }: ProductCardProps) {
  return (
    <div 
      className="group bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-slate-100 flex flex-col justify-between h-full relative text-right"
    >
      <div className="absolute top-4 right-4 z-10">
        <span className="inline-block bg-white/90 backdrop-blur-md text-text-main font-semibold text-[10px] md:text-xs uppercase tracking-wider px-3 py-1 rounded-full shadow-sm border border-slate-100">
          {product.category}
        </span>
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">
        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80";
          }}
        />
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button 
            onClick={() => onViewDetails(product)}
            className="bg-white text-text-main hover:bg-slate-50 p-3 rounded-full shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 font-bold text-xs cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            عرض سريع
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start gap-2">
            <h3 
              onClick={() => onViewDetails(product)}
              className="text-text-main font-bold text-base line-clamp-1 hover:text-accent transition-colors cursor-pointer"
            >
              {product.title}
            </h3>
            <span className="text-accent font-extrabold text-[15px] whitespace-nowrap">
              {formatCurrency(product.price)}
            </span>
          </div>
          <p className="text-text-muted text-xs line-clamp-2 font-normal leading-relaxed">
            {product.description}
          </p>
        </div>

        <button
          onClick={() => onViewDetails(product)}
          className="w-full mt-2 py-2.5 px-4 bg-slate-55 border border-slate-150 hover:bg-slate-50 text-text-main rounded-xl font-bold transition-all duration-200 text-xs flex items-center justify-center gap-2 group-hover:border-accent group-hover:text-accent cursor-pointer"
        >
          التفاصيل الكاملة
          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
