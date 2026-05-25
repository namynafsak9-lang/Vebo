import React, { useState, useEffect } from 'react';
import { db, auth, onSnapshot, collection, doc, deleteDoc, updateDoc, setDoc, signInWithPopup, googleProvider, Timestamp } from '../firebase';
import { Product, Ad, Category } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import VeboLogo from './VeboLogo';
import { formatCurrency, formatDate } from '../lib/utils';
import { 
  Package, LayoutDashboard, Database, Link as LinkIcon, Plus, Trash2, Edit, Save, 
  X, Check, LogOut, ShieldAlert, ArrowLeft, RefreshCw, Layers, ExternalLink, ShieldCheck, Tag
} from 'lucide-react';

interface AdminDashboardProps {
  onBackToHome: () => void;
}

const PRESET_CATEGORIES = ["إلكترونيات", "أدوات مكتبية", "ملابس وموضة", "المنزل وأسلوب الحياة", "مستحضرات عناية وتجميل"];

const INITIAL_MOCK_PRODUCTS: Partial<Product>[] = [
  {
    title: "سماعات رأس عازلة للضوضاء Pro",
    description: "استمتع بتجربة عزل ضوضاء نشط فائق الجودة مع بطارية تدوم حتى 40 ساعة، صوت محيطي لاسلكي عالي الدقة، ووسادات أذن ميموري فوم مريحة للغاية للارتداء الطويل.",
    price: 299.99,
    category: "إلكترونيات",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "كرسي مكتب شبكي طبي مريح",
    description: "دعم متكامل ومخصص للعمود الفقري مع مساند ذراع ثلاثية الأبعاد قابلة للتعديل، شبكة خلفية جيدة التهوية، وضبط ارتفاع هيدروليكي انسيابي.",
    price: 349.50,
    category: "أدوات مكتبية",
    imageUrl: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "كوب حراري ذكي من الخيزران",
    description: "كوب مصنوع يدوياً من الخيزران الطبيعي وجدار داخلي مزدوج من الفولاذ المقاوم للصدأ يحفظ برودة وسخونة المشروبات لمدة 24 ساعة.",
    price: 28.00,
    category: "المنزل وأسلوب الحياة",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "حقيبة ظهر عصرية من جلد صديق للبيئة",
    description: "مقاومة للماء بتصميم في غاية الأناقة والجميل، جيب مبطن للكمبيوتر المحمول حتى 16 بوصة، وجيوب سرية مريحة للتنقلات اليومية والرحلات سفر.",
    price: 85.00,
    category: "ملابس وموضة",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80"
  },
  {
    title: "لوحة مفاتيح ميكانيكية مضيئة RGB",
    description: "مفاتيح بنية ميكانيكية توفر ملمساً ممتازاً، هيكل معدني متين، وإضاءة RGB خلفية ملونة بالكامل وقابلة للتخصيص حسب اختيارك.",
    price: 139.99,
    category: "إلكترونيات",
    imageUrl: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80"
  }
];

export default function AdminDashboard({ onBackToHome }: AdminDashboardProps) {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'ads'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);

  // Passcode gating state for Admin (Vebo)
  const [passcode, setPasscode] = useState('');
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(() => {
    return localStorage.getItem('vebo_admin_unlocked') === 'true';
  });
  const [passcodeError, setPasscodeError] = useState('');

  // Form states for Product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    imageUrl: ''
  });

  // Form states for Category
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: ''
  });

  // Form states for Targeted Ad campaign
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [targetedAdForm, setTargetedAdForm] = useState({
    slot: 'header' as 'header' | 'sidebar' | 'feed',
    categoryTarget: 'all',
    title: '',
    imageUrl: '',
    targetUrl: ''
  });

  // Track auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Sync products, categories, ads
  useEffect(() => {
    if (!currentUser || currentUser.email !== 'ma6922249@gmail.com') return;

    const unsubProds = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'products')
    );

    const unsubCats = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'categories')
    );

    const unsubAds = onSnapshot(
      collection(db, 'ads'),
      (snapshot) => {
        setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad)));
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'ads')
    );

    return () => {
      unsubProds();
      unsubCats();
      unsubAds();
    };
  }, [currentUser]);

  // Handle dynamic preset selection as categories load
  useEffect(() => {
    if (categories.length > 0 && !productForm.category) {
      setProductForm(prev => ({ ...prev, category: categories[0].name }));
    }
  }, [categories, productForm.category]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      alert("فشل تسجيل الدخول أو تم حظره. يرجى السماح بالنوافذ المنبثقة.");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  // Seeding initial beautiful layout
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      // 1. Seed Categories
      for (const catName of PRESET_CATEGORIES) {
        const cleanId = `cat_${catName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
        await setDoc(doc(db, 'categories', cleanId), {
          name: catName,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      // 2. Seed prefilled products
      for (const item of INITIAL_MOCK_PRODUCTS) {
        const cleanId = `prod_${item.title!.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
        await setDoc(doc(db, 'products', cleanId), {
          ...item,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      // 3. Seed targeted advertisements
      const sampleAds = [
        {
          id: "ad_header_all",
          slot: "header" as const,
          categoryTarget: "all",
          title: "عروض الربيع الكبرى - وفر أكثر اليوم!",
          imageUrl: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1200&h=160&q=80",
          targetUrl: "https://google.com"
        },
        {
          id: "ad_header_electronics",
          slot: "header" as const,
          categoryTarget: "إلكترونيات",
          title: "خصم 30% على سماعات الرأس والملحقات التقنية!",
          imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=1200&h=160&q=80",
          targetUrl: "https://google.com"
        },
        {
          id: "ad_sidebar_all",
          slot: "sidebar" as const,
          categoryTarget: "all",
          title: "مستلزمات حياة مستدامة وصديقة للبيئة",
          imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&h=600&q=80",
          targetUrl: "https://google.com"
        },
        {
          id: "ad_feed_all",
          slot: "feed" as const,
          categoryTarget: "all",
          title: "مستحضرات تجميل طبيعية وعضوية بجودة فائقة",
          imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&h=200&q=80",
          targetUrl: "https://google.com"
        }
      ];

      for (const adItem of sampleAds) {
        await setDoc(doc(db, 'ads', adItem.id), {
          slot: adItem.slot,
          categoryTarget: adItem.categoryTarget,
          title: adItem.title,
          imageUrl: adItem.imageUrl,
          targetUrl: adItem.targetUrl,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      alert("تمت تهيئة وتوليد جميع البيانات التجريبية بنجاح عالي!");
    } catch (err) {
      console.error(err);
      alert("فشل التوليد. الرجاء التأكد من قواعد الأمان والاتصال.");
    } finally {
      setIsSeeding(false);
    }
  };

  // Submit product form (Create / Update)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const actualCategory = productForm.category || (categories[0]?.name || PRESET_CATEGORIES[0]);
    if (!productForm.title || !productForm.description || !productForm.price || !productForm.imageUrl) {
      alert("يرجى ملء جميع حقول المنتج الأساسية.");
      return;
    }

    try {
      const priceNum = parseFloat(productForm.price);
      if (isNaN(priceNum) || priceNum < 0) {
        alert("سعر المنتج غير صالح.");
        return;
      }

      if (editingProduct) {
        const docRef = doc(db, 'products', editingProduct.id);
        await updateDoc(docRef, {
          title: productForm.title,
          description: productForm.description,
          price: priceNum,
          category: actualCategory,
          imageUrl: productForm.imageUrl,
          updatedAt: Timestamp.now()
        });
        setEditingProduct(null);
      } else {
        const cleanId = `prod_${Date.now()}`;
        await setDoc(doc(db, 'products', cleanId), {
          title: productForm.title,
          description: productForm.description,
          price: priceNum,
          category: actualCategory,
          imageUrl: productForm.imageUrl,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      // Reset form
      setProductForm({
        title: '',
        description: '',
        price: '',
        category: categories[0]?.name || PRESET_CATEGORIES[0],
        imageUrl: ''
      });
      alert("تم حفظ المنتج بنجاح.");
    } catch (err) {
      handleFirestoreError(err, editingProduct ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  // Edit product trigger
  const handleStartEdit = (prod: Product) => {
    setEditingProduct(prod);
    setProductForm({
      title: prod.title,
      description: prod.description,
      price: prod.price.toString(),
      category: prod.category,
      imageUrl: prod.imageUrl
    });
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المنتج نهائياً من الكتالوج؟")) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      alert("تم حذف المنتج.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  // Category Submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      alert("اسم القسم مطلوب.");
      return;
    }
    try {
      if (editingCategory) {
        const docRef = doc(db, 'categories', editingCategory.id);
        await updateDoc(docRef, {
          name: categoryForm.name.trim(),
          updatedAt: Timestamp.now()
        });
        setEditingCategory(null);
      } else {
        const cleanId = `cat_${Date.now()}`;
        await setDoc(doc(db, 'categories', cleanId), {
          name: categoryForm.name.trim(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }
      setCategoryForm({ name: '' });
      alert("تم حفظ القسم بنجاح.");
    } catch (err) {
      handleFirestoreError(err, editingCategory ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا القسم؟ قد يؤثر ذلك على تصفية المنتجات.")) return;
    try {
      await deleteDoc(doc(db, 'categories', id));
      alert("تم حذف القسم.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `categories/${id}`);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name });
  };

  // Submit dynamic targeted Ad campaign
  const handleTargetedAdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetedAdForm.title || !targetedAdForm.imageUrl || !targetedAdForm.targetUrl) {
      alert("حقول عنوان الإعلان والصورة والوجهة هي حقول إلزامية.");
      return;
    }

    try {
      if (editingAd) {
        const docRef = doc(db, 'ads', editingAd.id);
        await updateDoc(docRef, {
          slot: targetedAdForm.slot,
          categoryTarget: targetedAdForm.categoryTarget,
          title: targetedAdForm.title,
          imageUrl: targetedAdForm.imageUrl,
          targetUrl: targetedAdForm.targetUrl,
          updatedAt: Timestamp.now()
        });
        setEditingAd(null);
      } else {
        const cleanId = `ad_${targetedAdForm.slot}_${targetedAdForm.categoryTarget.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;
        await setDoc(doc(db, 'ads', cleanId), {
          slot: targetedAdForm.slot,
          categoryTarget: targetedAdForm.categoryTarget,
          title: targetedAdForm.title,
          imageUrl: targetedAdForm.imageUrl,
          targetUrl: targetedAdForm.targetUrl,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      }

      setTargetedAdForm({
        slot: 'header',
        categoryTarget: 'all',
        title: '',
        imageUrl: '',
        targetUrl: ''
      });
      alert("تم حفظ حملة الإعلان المستهدفة بنجاح.");
    } catch (err) {
      handleFirestoreError(err, editingAd ? OperationType.UPDATE : OperationType.CREATE, 'ads');
    }
  };

  // Load Ad configuration to form for editing
  const handleStartEditAd = (adItem: Ad) => {
    setEditingAd(adItem);
    setTargetedAdForm({
      slot: adItem.slot,
      categoryTarget: adItem.categoryTarget || 'all',
      title: adItem.title,
      imageUrl: adItem.imageUrl,
      targetUrl: adItem.targetUrl
    });
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الإعلان نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, 'ads', id));
      alert("تم حذف الإعلان.");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ads/${id}`);
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '2512') {
      setIsPasscodeUnlocked(true);
      localStorage.setItem('vebo_admin_unlocked', 'true');
      setPasscodeError('');
    } else {
      setPasscodeError('رمز المرور الذي أدخلته غير صحيح. يرجى المحاولة مرة أخرى.');
    }
  };

  const handlePasscodeLogout = () => {
    setIsPasscodeUnlocked(false);
    localStorage.removeItem('vebo_admin_unlocked');
    setPasscode('');
  };

  const isAdminSession = currentUser && currentUser.email === 'ma6922249@gmail.com';

  if (!isPasscodeUnlocked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans px-4 py-12 select-none" dir="rtl">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-2xl space-y-8 animate-fade-in text-center relative overflow-hidden">
          
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-accent/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-50/40 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col items-center gap-2">
            <VeboLogo showText={true} textSize="lg" iconSize={60} className="mx-auto mb-2" />
            <h1 className="text-xl font-black text-text-main flex items-center gap-1.5 justify-center leading-none">
              بوابة الإدارة الآمنة
            </h1>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 font-extrabold text-[10px] text-accent">
              <span>تأمين الدخول الخفي والمستقل</span>
            </div>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div className="text-right space-y-1.5">
              <label className="text-[10px] font-black text-text-muted uppercase tracking-wider mr-1">رمز المرور للمسؤول (Password)</label>
              <input
                type="password"
                required
                maxLength={4}
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value.replace(/[^0-9]/g, ''));
                  if (passcodeError) setPasscodeError('');
                }}
                placeholder="أدخل رمز المرور 2512"
                className="w-full text-center tracking-widest font-mono text-xl p-4 border border-slate-200 rounded-2xl outline-none focus:border-accent text-text-main bg-slate-50 focus:ring-4 focus:ring-accent/10 transition-all placeholder:tracking-normal placeholder:text-xs"
              />
            </div>

            {passcodeError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-semibold border border-red-100 text-right">
                {passcodeError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-accent hover:bg-blue-700 text-white rounded-2xl font-black text-xs transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              تأكيد الدخول الآمن
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-xs font-bold text-text-muted hover:text-text-main transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              العودة للمتجر الرئيسي
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none" dir="rtl">
      {/* Top Controls Admin Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBackToHome}
            className="p-2 hover:bg-slate-150 rounded-full transition-colors font-bold text-text-muted cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-right">
            <h1 className="text-text-main text-lg font-black tracking-tight flex items-center gap-2">
              <Database className="w-5 h-5 text-accent" />
              لوحة تحكم منصة ڤيبو (Vebo Admin)
            </h1>
            <p className="text-[11px] text-text-muted">إدارة قائمة المنتجات والأقسام الحركية وتوزيع الحملات الإعلانية المستهدفة بدقة</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePasscodeLogout}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            title="قفل لوحة التحكم"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            قفل لوحة التحكم
          </button>

          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Layers className="w-4 h-4" />
            {isSeeding ? "جاري التوليد والتهيئة..." : "تهيئة وتوليد بيانات تجريبية كاملة"}
          </button>
        </div>
      </header>

      {/* Main Container Flow */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6 text-right">
        
        {/* Render Independent Admin interfaces directly for passcode-unlocked admin */}
        <div className="space-y-6 animate-fade-in text-right">
            
            {/* Navigation Tabs Selector */}
            <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl max-w-md">
              <button
                onClick={() => setActiveSubTab('products')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSubTab === 'products' ? "bg-accent text-white shadow" : "text-text-muted hover:text-text-main"
                }`}
              >
                <Package className="w-4 h-4" />
                كتالوج المنتجات ({products.length})
              </button>
              <button
                onClick={() => setActiveSubTab('categories')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSubTab === 'categories' ? "bg-accent text-white shadow" : "text-text-muted hover:text-text-main"
                }`}
              >
                <Tag className="w-4 h-4" />
                الأقسام والتصنيفات ({categories.length})
              </button>
              <button
                onClick={() => setActiveSubTab('ads')}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeSubTab === 'ads' ? "bg-accent text-white shadow" : "text-text-muted hover:text-text-main"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                الإعلانات المستهدفة ({ads.length})
              </button>
            </div>

            {/* TAB CONTAINER 1: PRODUCT MANAGEMENT */}
            {activeSubTab === 'products' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-right">
                
                {/* Product form column */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 lg:col-span-1">
                  <div>
                    <h3 className="text-text-main text-base font-black tracking-tight">
                      {editingProduct ? `تعديل المنتج: ${editingProduct.title}` : "إضافة منتج جديد للكتالوج"}
                    </h3>
                    <p className="text-[11px] text-text-muted">أدخل مواصفات المنتج لعرضه بشكل سلس في المتجر</p>
                  </div>

                  <form onSubmit={handleProductSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">اسم المنتج</label>
                      <input 
                        type="text" 
                        required
                        value={productForm.title}
                        onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                        placeholder="مثال: سماعة لاسلكية عازلة للضوضاء"
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">الفئة التصنيفية للمنتج</label>
                      <select
                        value={productForm.category}
                        onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right cursor-pointer"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {categories.length === 0 && (
                          <option value="">-- لا يوجد تصنيفات حالية، يرجى التوليد والتهيئة أولاً --</option>
                        )}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">السعر ($ دولار)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        required
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        placeholder="مثال: 149.99"
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">رابط صورة المنتج (Image URL)</label>
                      <input 
                        type="url" 
                        required
                        value={productForm.imageUrl}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                        placeholder="مثال: https://images.unsplash.com/..."
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">وصف المنتج وتفاصيله الملموسة</label>
                      <textarea 
                        rows={4}
                        required
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        placeholder="اكتب هنا ميزات وفؤائد ومواصفات المنتج الإضافية..."
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      {editingProduct && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(null);
                            setProductForm({
                              title: '',
                              description: '',
                              price: '',
                              category: categories[0]?.name || '',
                              imageUrl: ''
                            });
                          }}
                          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-bold rounded-xl cursor-pointer"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-3 px-4 bg-accent hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        {editingProduct ? "تحديث المنتج" : "إضافة للكتالوج"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Products layout list */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs lg:col-span-2 text-right">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-text-main text-base font-black tracking-tight">المنتجات المعروضة حالياً</h3>
                    <p className="text-[11px] text-text-muted">جدول مبسط للتحكم بالمنتجات والأسعار وتوجيه الفرز</p>
                  </div>

                  <div className="overflow-x-auto">
                    {products.length === 0 ? (
                      <div className="p-12 text-center text-xs text-text-muted space-y-2">
                        <Database className="w-8 h-8 mx-auto text-slate-300" />
                        <div>لا توجد منتجات مسجلة في المتجر حالياً. يرجى تهيئة توليد البيانات التجريبية بالأعلى للبدء الفوري.</div>
                      </div>
                    ) : (
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-text-muted text-right">
                            <th className="p-4 text-right">المنتج</th>
                            <th className="p-4 text-right">القسم</th>
                            <th className="p-4 text-right">السعر</th>
                            <th className="p-4 text-left">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {products.map(product => (
                            <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs font-semibold text-right">
                              <td className="p-4 flex items-center gap-3 justify-start">
                                <img src={product.imageUrl} alt={product.title} className="w-10 h-10 object-cover rounded-lg bg-slate-100 border border-slate-150 shrink-0" />
                                <div className="max-w-[180px]">
                                  <div className="text-text-main font-bold truncate">{product.title}</div>
                                  <div className="text-[10px] text-text-muted line-clamp-1">{product.description}</div>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="inline-block bg-accent/10 text-accent rounded-full px-2 py-0.5 text-[10px] font-bold">
                                  {product.category}
                                </span>
                              </td>
                              <td className="p-4 text-emerald-600 font-bold">
                                {formatCurrency(product.price)}
                              </td>
                              <td className="p-4 text-left">
                                <div className="flex justify-start gap-1.5">
                                  <button
                                    onClick={() => handleStartEdit(product)}
                                    className="p-1.5 hover:bg-blue-50 text-accent rounded-lg transition-colors cursor-pointer"
                                    title="تعديل المنتج"
                                  >
                                    <Edit className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                                    title="حذف المنتج"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTAINER 2: CATEGORY MANAGEMENT */}
            {activeSubTab === 'categories' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-right">
                
                {/* Category form column */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 lg:col-span-1">
                  <div>
                    <h3 className="text-text-main text-base font-black tracking-tight border-b border-slate-100 pb-2">
                      {editingCategory ? `تعديل قسم: ${editingCategory.name}` : "إنشاء قسم منتجات جديد"}
                    </h3>
                    <p className="text-[11px] text-text-muted">أضف أقساماً جديدة لتوجيه فرز المنتجات والحملات الإعلانية</p>
                  </div>

                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">اسم القسم بالعربية</label>
                      <input 
                        type="text" 
                        required
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ name: e.target.value })}
                        placeholder="مثال: أحذية وحقائب"
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      {editingCategory && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(null);
                            setCategoryForm({ name: '' });
                          }}
                          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-bold rounded-xl cursor-pointer"
                        >
                          إلغاء
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-3 px-4 bg-accent hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        {editingCategory ? "حفظ تعديل الفئة" : "نشر كتصنيف جديد"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Categories layout list */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs lg:col-span-2 text-right">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-text-main text-base font-black tracking-tight">تصنيفات المتجر النشطة</h3>
                    <p className="text-[11px] text-text-muted">التحكم بالأقسام الموثقة في شريط المنتجات وقائمة الاستهداف</p>
                  </div>

                  <div className="overflow-x-auto">
                    {categories.length === 0 ? (
                      <div className="p-12 text-center text-xs text-text-muted space-y-2">
                        <Tag className="w-8 h-8 mx-auto text-slate-300" />
                        <div>لا توجد تصنيفات معرفة حالياً. اضغط على زر تهيئة البيانات بالأعلى لتركيب الفئات التلقائية.</div>
                      </div>
                    ) : (
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-text-muted text-right">
                            <th className="p-4 text-right">معرّف القسم الفريد</th>
                            <th className="p-4 text-right">اسم التصنيف</th>
                            <th className="p-4 text-right">تاريخ الإضافة</th>
                            <th className="p-4 text-left">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categories.map(cat => (
                            <tr key={cat.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs font-semibold text-right">
                              <td className="p-4 font-mono text-[10px] text-text-muted">
                                {cat.id}
                              </td>
                              <td className="p-4">
                                <span className="font-bold text-text-main">{cat.name}</span>
                              </td>
                              <td className="p-4 text-[10px] text-text-muted">
                                {formatDate(cat.createdAt)}
                              </td>
                              <td className="p-4 text-left">
                                <div className="flex justify-start gap-1.5">
                                  <button
                                    onClick={() => handleStartEditCategory(cat)}
                                    className="p-1.5 hover:bg-blue-50 text-accent rounded-lg transition-colors cursor-pointer"
                                    title="تعديل الاسم"
                                  >
                                    <Edit className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCategory(cat.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                                    title="حذف القسم"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTAINER 3: AD PLACEMENTS CONTROLLER */}
            {activeSubTab === 'ads' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start text-right">
                
                {/* Form to Create/Edit a Targeted Ad */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 lg:col-span-1">
                  <div>
                    <h3 className="text-text-main text-base font-black tracking-tight border-b border-slate-100 pb-2">
                      {editingAd ? `تعديل إعلان: ${editingAd.title}` : "إنشاء حملة إعلانية مستهدفة"}
                    </h3>
                    <p className="text-[11px] text-text-muted">أطلق إعلاناً جديداً وحدد القسم المناسب لعرضه بذكاء للمتابعين</p>
                  </div>

                  <form onSubmit={handleTargetedAdSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">موضع الإعلان (Slot Placement)</label>
                      <select
                        value={targetedAdForm.slot}
                        onChange={(e) => setTargetedAdForm({ ...targetedAdForm, slot: e.target.value as any })}
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right cursor-pointer"
                      >
                        <option value="header">أعلى الصفحة (الهيدر)</option>
                        <option value="sidebar">يمين الصفحة (الجانبي وبجوار التصفية)</option>
                        <option value="feed">وسط شبكة المنتجات (بين المعروضات)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">القسم المستهدف للظهور (Target Category)</label>
                      <select
                        value={targetedAdForm.categoryTarget}
                        onChange={(e) => setTargetedAdForm({ ...targetedAdForm, categoryTarget: e.target.value })}
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right cursor-pointer"
                      >
                        <option value="all">عام - للجميع (يظهر بجميع الأقسام افتراضياً)</option>
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">عنوان أو شعار الإعلان</label>
                      <input 
                        type="text" 
                        required
                        value={targetedAdForm.title}
                        onChange={(e) => setTargetedAdForm({ ...targetedAdForm, title: e.target.value })}
                        placeholder="مثال: خصومات الجمعة البيضاء 50%!"
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">رابط صورة بنر الإعلان (Image URL)</label>
                      <input 
                        type="url" 
                        required
                        value={targetedAdForm.imageUrl}
                        onChange={(e) => setTargetedAdForm({ ...targetedAdForm, imageUrl: e.target.value })}
                        placeholder="مثال: https://images.unsplash.com/..."
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">رابط توجيه الوجهة الخارجية (Target URL) - يفتح بتبويب جديد</label>
                      <input 
                        type="url" 
                        required
                        value={targetedAdForm.targetUrl}
                        onChange={(e) => setTargetedAdForm({ ...targetedAdForm, targetUrl: e.target.value })}
                        placeholder="مثال: https://google.com"
                        className="w-full text-xs font-semibold p-3 border border-slate-200 rounded-xl outline-none focus:border-accent bg-slate-50 text-right"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      {editingAd && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAd(null);
                            setTargetedAdForm({
                              slot: 'header',
                              categoryTarget: 'all',
                              title: '',
                              imageUrl: '',
                              targetUrl: ''
                            });
                          }}
                          className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-text-main text-xs font-bold rounded-xl cursor-pointer"
                        >
                          إلغاء التعديل
                        </button>
                      )}
                      <button
                        type="submit"
                        className="flex-1 py-3 px-4 bg-accent hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        {editingAd ? "تحديث حملة الإعلان" : "حفظ وإنشاء الإعلان"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* List of Targeted Advertisements */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs lg:col-span-2 text-right">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="text-text-main text-base font-black tracking-tight">إعلانات الاستهداف النشطة</h3>
                    <p className="text-[11px] text-text-muted">مراقبة بنرات الإعلانات والمواضع الاستراتيجية وتخصيص الفرز بالتعديل المباشر</p>
                  </div>

                  <div className="overflow-x-auto">
                    {ads.length === 0 ? (
                      <div className="p-12 text-center text-xs text-text-muted space-y-2">
                        <LayoutDashboard className="w-8 h-8 mx-auto text-slate-300" />
                        <div>لا توجد إعلانات مستهدفة مسجلة حالياً. استخدم نموذج الإضافة أو قم بتهيئة الزر بالأعلى لتنزيل حملات نموذجية حركية.</div>
                      </div>
                    ) : (
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-text-muted text-right">
                            <th className="p-4 text-right">الموضع</th>
                            <th className="p-4 text-right">الجمهور المستهدف</th>
                            <th className="p-4 text-right">شعار الإعلان / الرابط</th>
                            <th className="p-4 text-left">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ads.map(adItem => (
                            <tr key={adItem.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-xs font-semibold text-right">
                              <td className="p-4">
                                <span className={`inline-block px-2 text-[10px] py-0.5 rounded-full font-bold ${
                                  adItem.slot === 'header' ? 'bg-indigo-50 text-indigo-600' :
                                  adItem.slot === 'sidebar' ? 'bg-pink-50 text-pink-600' : 'bg-amber-50 text-amber-600'
                                }`}>
                                  {adItem.slot === 'header' ? 'أعلى الصفحة (Header)' :
                                   adItem.slot === 'sidebar' ? 'الجانب الأيمن (Sidebar)' : 'وسط المنتجات (Feed)'}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`inline-block px-2 py-0.5 text-[10px] rounded-lg font-bold ${
                                  adItem.categoryTarget === 'all' || !adItem.categoryTarget ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {adItem.categoryTarget === 'all' || !adItem.categoryTarget ? 'عام - لجميع المقاطع' : `قسم: ${adItem.categoryTarget}`}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2.5">
                                  <img src={adItem.imageUrl} className="w-10 h-7 object-cover rounded-md bg-slate-150 border" alt={adItem.title} />
                                  <div className="max-w-[170px]">
                                    <div className="text-text-main font-bold truncate">{adItem.title}</div>
                                    <a href={adItem.targetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline flex items-center gap-1">
                                      {adItem.targetUrl}
                                      <ExternalLink className="w-3 h-3 shrink-0" />
                                    </a>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-left">
                                <div className="flex justify-start gap-1.5">
                                  <button
                                    onClick={() => handleStartEditAd(adItem)}
                                    className="p-1.5 hover:bg-blue-50 text-accent rounded-lg transition-colors cursor-pointer"
                                    title="تعديل هذا الإعلان"
                                  >
                                    <Edit className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAd(adItem.id)}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                                    title="حذف هذا الإعلان"
                                  >
                                    <Trash2 className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Zero-Trust visual indicator */}
            <div className="bg-slate-100/50 border border-slate-200 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 text-right">
              <div className="space-y-1 max-w-xl">
                <h4 className="text-text-main text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-600">
                  <ShieldCheck className="w-5 h-5 animate-pulse" />
                  بروتوكول الأمان المتقدم مفعل (Zero-Trust Security Integration)
                </h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  تتم حماية وتحصين جميع العمليات السريعة لحساب المشرف بواسطة ملف تفويض قواعد الأمان الحامية
                  <code className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-red-500 font-mono text-[11px] mx-1">firestore.rules</code>.
                  يتم التحقق من تطابق البريد الإلكتروني للمسؤول الإداري <strong className="text-text-main">ma6922249@gmail.com</strong> وحالة التوثيق لاستبعاد التدخلات الخارجية التخريبية.
                </p>
              </div>
              <div className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-5 py-3 rounded-2xl shadow-xs text-xs font-sans font-black select-none shrink-0 cursor-default">
                المسؤول الإداري: ma6922249@gmail.com (مؤمن بالكامل)
              </div>
            </div>

          </div>

      </main>
    </div>
  );
}
