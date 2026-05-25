import React from 'react';
import { Product } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { motion } from 'motion/react';
import { X, Calendar, Tag, ShieldCheck, ShoppingCart } from 'lucide-react';
import { showToast } from '../lib/toast';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductDetailModal({ product, onClose, onAddToCart }: ProductDetailModalProps) {
  // Simple check to close on dark backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row relative"
      >
        {/* Close Button Trigger */}
        <button 
          onClick={onClose}
          className="absolute top-4 left-4 z-20 p-2 text-white bg-black/60 backdrop-blur-md rounded-full hover:bg-black/80 transition-colors cursor-pointer border border-white/10"
          aria-label="إغلاق التفاصيل"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Product Visual Area */}
        <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:h-full min-h-[300px] bg-slate-50 relative overflow-hidden shrink-0">
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>

        {/* Detail Specifications Area */}
        <div className="p-6 md:p-8 flex-1 flex flex-col justify-between gap-6 overflow-y-auto max-h-[85vh] md:max-h-[550px] text-right">
          <div className="space-y-4">
            {/* Category Tag & Time */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-accent/15 text-accent text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                <Tag className="w-3.5 h-3.5" />
                {product.category}
              </span>
              
              {product.createdAt && (
                <span className="text-text-muted text-[11px] font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(product.createdAt)}
                </span>
              )}
            </div>

            {/* Title & Price */}
            <div className="space-y-1">
              <h2 className="text-text-main text-xl md:text-2xl font-black tracking-tight leading-tight">
                {product.title}
              </h2>
              <div className="text-2xl font-extrabold text-accent">
                {formatCurrency(product.price)}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-border w-full" />

            {/* Full Long Description */}
            <div className="space-y-1">
              <h4 className="text-text-main text-xs font-black uppercase tracking-wider">
                تفاصيل المنتج
              </h4>
              <p className="text-text-muted text-sm leading-relaxed whitespace-pre-line font-normal">
                {product.description}
              </p>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            {/* Guarantees */}
            <div className="flex items-center gap-2 text-xs text-text-muted bg-slate-50 border border-slate-100 p-3 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              <span>حماية كاملة للمشتري وقائمة معتمدة وآمنة بنسبة 100٪.</span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
              className="w-full py-3 px-5 bg-accent hover:bg-blue-700 text-white rounded-xl font-bold transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              أضف إلى السلة الحالية
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
