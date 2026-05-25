import React, { useState, useEffect } from 'react';
import { auth, db, onSnapshot, collection, signInWithPopup, googleProvider } from './firebase';
import { Product, Category } from './types';
import { handleFirestoreError, OperationType } from './lib/errorHandler';
import AdSlotComponent from './components/AdSlotComponent';
import ProductCard from './components/ProductCard';
import ProductDetailModal from './components/ProductDetailModal';
import AdminDashboard from './components/AdminDashboard';
import VeboLogo from './components/VeboLogo';
import { 
  ShoppingBag, Search, Filter, Shield, Sparkles, SlidersHorizontal, 
  HelpCircle, AlignCenter, Loader2, ArrowRight, Layers 
} from 'lucide-react';
import { AnimatePresence } from 'motion/react';

const CATEGORIES = ["جميع الفئات", "إلكترونيات", "أدوات مكتبية", "ملابس وموضة", "المنزل وأسلوب الحياة", "مستحضرات عناية وتجميل"];

export default function App() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View navigation: 'home' | 'admin'
  const [view, setView] = useState<'home' | 'admin'>(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.has('admin') || params.has('vebo-admin') || window.location.pathname.includes('/admin')) ? 'admin' : 'home';
  });
  
  // Search & Filters parameters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('جميع الفئات');
  
  // Modal details
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Hydrate categories dynamically
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      }
    );
    return () => unsub();
  }, []);

  // Authenticate listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Hydrate products
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert("فشل أو تم حظر نافذة تسجيل الدخول المنبثقة. يرجى إعادة المحاولة.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  // Filter products locally as database updates
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'جميع الفئات' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const isAdminSession = currentUser && currentUser.email === 'ma6922249@gmail.com';

  // Toggle Admin Screen
  if (view === 'admin') {
    return <AdminDashboard onBackToHome={() => setView('home')} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans rtl select-none" dir="rtl">
      
      {/* 1. Header & Navigation Menu */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Headline branding using the uploaded Custom Vebo Logo */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex flex-col items-start gap-1 cursor-pointer select-none" onClick={() => { setSearchQuery(''); setSelectedCategory('جميع الفئات'); }}>
              <VeboLogo showText={true} textSize="md" iconSize={40} />
              <p className="text-[10px] text-text-muted mt-0.5 leading-none font-medium mr-1.5">تسوّق منتجات مميزة مع عروض ترويجية مستهدفة</p>
            </div>
          </div>

          {/* Large Header Ad Placement Slot */}
          <div className="w-full md:max-w-xl mx-auto shrink-0">
            <AdSlotComponent slotId="header" activeCategory={selectedCategory} />
          </div>

          {/* Authenticated user control block */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {currentUser && (
              <div className="flex items-center gap-3.5 border-r border-slate-250 pr-3.5 bg-slate-55 p-1.5 pl-3 rounded-full flex-row-reverse">
                <img 
                  src={currentUser.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80"}
                  alt={currentUser.displayName || "صورة المستخدم"} 
                  className="w-7 h-7 rounded-full object-cover shadow-xs"
                />
                <div className="hidden lg:block text-right text-[11px] font-bold">
                  <div className="text-text-main truncate max-w-[100px] leading-tight">{currentUser.displayName}</div>
                  <div className="text-text-muted mt-0.5 leading-none text-[9px] font-mono">مسؤول المتجر المعتمد</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-1.5 hover:bg-slate-200 text-text-muted rounded-full transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* 2. Secondary Header with global live counts & visual hints */}
      <section className="bg-slate-900 text-slate-100 py-3.5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2.5 text-xs text-right">
          <div className="flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-yellow-400 shrink-0 animate-pulse" />
            <span>اكتشف أفضل المنتجات والمواصفات الحصرية مع مساحاتنا الإعلانية الذكية والفعالة.</span>
          </div>
          <div className="flex items-center gap-4.5 font-bold text-[11px] font-mono tracking-wider">
            <span>حالة المتجر العام: <span className="text-emerald-400">نشط ومباشر</span></span>
            <span className="hidden sm:inline">|</span>
            <span>إجمالي المنتجات: <span className="text-blue-300">{products.length}</span></span>
          </div>
        </div>
      </section>

      {/* 3. Main Workspace Grid */}
      <main className="flex-1 max-w-7xl mx-auto px-4 md:px-8 py-8 w-full grid grid-cols-1 lg:grid-cols-4 gap-8 items-start text-right">
        
        {/* Dynamic Left Sidebar: Filtering Controls & Vertical Strategic Ad Slot */}
        <aside className="lg:col-span-1 space-y-6">
          
          {/* Directory Filtering Control Board */}
          <div className="bg-card border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-row-reverse">
              <h3 className="text-text-main text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4.5 h-4.5 text-accent" />
                تصفية وتحديد الخيارات
              </h3>
              <span className="text-[10px] text-text-muted font-bold tracking-tight">
                {filteredProducts.length} نتيجة
              </span>
            </div>

            {/* Live Search Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider">البحث عن الكلمات المفتاحية</label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="ابحث باسم المنتج أو الوصف..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs font-semibold p-3 pr-9 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50/50 text-right"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 hover:bg-slate-100 p-1 rounded-full text-text-muted font-bold text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Styled category list selective clicks */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                تصنيفات المعروضات
              </label>
              <div className="flex flex-col gap-1.5">
                {(categories.length > 0 
                  ? ['جميع الفئات', ...categories.map(c => c.name)]
                  : ["جميع الفئات", "إلكترونيات", "أدوات مكتبية", "ملابس وموضة", "المنزل وأسلوب الحياة", "مستحضرات عناية وتجميل"]
                ).map(categoryStr => {
                  const isActive = selectedCategory === categoryStr;
                  return (
                    <button
                      key={categoryStr}
                      onClick={() => setSelectedCategory(categoryStr)}
                      className={`w-full text-right py-2 px-3 rounded-lg text-xs font-bold transition-all flex justify-between items-center cursor-pointer ${
                        isActive ? "bg-accent/10 text-accent font-black border-r-4 border-accent" : "text-text-muted hover:bg-slate-50 hover:text-text-main"
                      }`}
                    >
                      <span>{categoryStr}</span>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-accent" />}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Vertical Ad Space Panel Placement inside the filter column */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wider mr-1">إعلان جانبي موصى به</h4>
            <AdSlotComponent slotId="sidebar" activeCategory={selectedCategory} />
          </div>

        </aside>

        {/* Dynamic Products Board Grid Display */}
        <section className="lg:col-span-3 space-y-8">
          
          {loading ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-accent animate-spin" />
              <p className="text-xs text-text-muted font-bold uppercase tracking-widest">جاري تحميل قائمة المنتجات والفرز...</p>
            </div>
          ) : products.length === 0 ? (
            /* Blank Slate instructions helping user with Onboarding */
            <div className="bg-white border border-slate-200 rounded-3xl p-10 md:p-14 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto p-4">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-text-main text-lg font-black tracking-tight text-center">كتالوج المتجر فارغ حالياً</h3>
                <p className="text-xs text-text-muted leading-relaxed text-center">
                  لا توجد أي منتجات معروضة للبيع في الوقت الحالي. يرجى التحقق مرة أخرى في وقت لاحق لتصفح العروض المميزة.
                </p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <AlignCenter className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-text-main font-bold text-sm">لا توجد منتجات مطابقة لخيارات الفرز الحالية</h3>
              <p className="text-xs text-text-muted">حاول تعديل كلمات البحث أو تصفح تصنيفات جديدة.</p>
              <button 
                onClick={() => { setSearchQuery(''); setSelectedCategory('جميع الفئات'); }}
                className="text-xs text-accent font-bold hover:underline"
              >
                إعادة تعيين وبدء الفرز
              </button>
            </div>
          ) : (
            /* Products display grid interspersed with Banner Ad placements after the second product */
            <div className="space-y-8">
              
              {/* Product Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {filteredProducts.map((prod, index) => {
                  const items = [
                    <ProductCard 
                      key={prod.id} 
                      product={prod} 
                      onViewDetails={(p) => setSelectedProduct(p)} 
                    />
                  ];

                  // Strategically place the inline horizontal feed ad slot exactly after the second element in the listing grid!
                  if (index === 1) {
                    items.push(
                      <div key="inline-ad-feed" className="col-span-1 sm:col-span-2 lg:col-span-3 my-2 animate-fade-in shrink-0">
                        <AdSlotComponent slotId="feed" activeCategory={selectedCategory} />
                      </div>
                    );
                  }

                  return items;
                })}

              </div>

            </div>
          )}

        </section>

      </main>

      {/* 4. Static Humanized Footer Info */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 text-center text-text-muted text-xs font-medium rtl" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            حقوق الطبع والنشر &copy; 2026 منصة ڤيبو (Vebo). جميع الحقوق محفوظة.
          </div>
          <div className="text-[10px] text-text-muted font-mono">
            نظام حماية الإشهار الآمن &middot; متصل مع FIRESTORE
          </div>
        </div>
      </footer>

      {/* 5. Product Detail Modal Overlay Controller */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}
