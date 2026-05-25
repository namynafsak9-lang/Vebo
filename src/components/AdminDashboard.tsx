import React, { useState, useEffect } from 'react';
import { db, auth, onSnapshot, collection, doc, deleteDoc, updateDoc, setDoc, signInWithPopup, googleProvider, Timestamp, serverTimestamp } from '../firebase';
import { Product, Ad, Category, Order, EGYPT_GOVERNORATES } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import VeboLogo from './VeboLogo';
import { formatCurrency, formatDate } from '../lib/utils';
import ToastContainer from './ToastContainer';
import { showToast } from '../lib/toast';
import { 
  Package, LayoutDashboard, Database, Link as LinkIcon, Plus, Trash2, Edit, Save, 
  X, Check, LogOut, ShieldAlert, ArrowLeft, RefreshCw, Layers, ExternalLink, ShieldCheck, Tag, Settings, ShoppingBag
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
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'categories' | 'ads' | 'orders' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shippingFees, setShippingFees] = useState<Record<string, number>>({});
  const [ordersView, setOrdersView] = useState<'active' | 'trash'>('active');
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

  // Custom confirmation dialog state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: 'product' | 'category' | 'ad';
    title: string;
  } | null>(null);

  // Track auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Sync products, categories, ads, orders, settings
  useEffect(() => {
    if (!isPasscodeUnlocked && (!currentUser || currentUser.email !== 'ma6922249@gmail.com')) return;

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

    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const orderList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        orderList.sort((a, b) => {
          const tA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const tB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return tB.getTime() - tA.getTime();
        });
        setOrders(orderList);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'orders')
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'shipping_fees'),
      (snapshot) => {
        if (snapshot.exists()) {
          setShippingFees(snapshot.data() as Record<string, number>);
        }
      }
    );

    return () => {
      unsubProds();
      unsubCats();
      unsubAds();
      unsubOrders();
      unsubSettings();
    };
  }, [currentUser, isPasscodeUnlocked]);

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
      showToast("فشل تسجيل الدخول أو تم حظره. يرجى السماح بالنوافذ المنبثقة.", "error");
    }
  };

  const handleLogout = async () => {
    await auth.signOut();
  };

  // Seeding initial beautiful layout
  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      // 1. Seed Categories with unique predefined English keys
      const categorySeeds = [
        { id: "cat_electronics", name: "إلكترونيات" },
        { id: "cat_stationery", name: "أدوات مكتبية" },
        { id: "cat_fashion", name: "ملابس وموضة" },
        { id: "cat_home_lifestyle", name: "المنزل وأسلوب الحياة" },
        { id: "cat_beauty", name: "مستحضرات عناية وتجميل" }
      ];

      for (const cat of categorySeeds) {
        await setDoc(doc(db, 'categories', cat.id), {
          name: cat.name,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      // 2. Seed prefilled products with unique predefined English keys
      const productSeeds = [
        {
          id: "prod_headphones_pro",
          title: "سماعات رأس عازلة للضوضاء Pro",
          description: "استمتع بتجربة عزل ضوضاء نشط فائق الجودة مع بطارية تدوم حتى 40 ساعة، صوت محيطي لاسلكي عالي الدقة، ووسادات أذن ميموري فوم مريحة للغاية للارتداء الطويل.",
          price: 299.99,
          category: "إلكترونيات",
          imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"
        },
        {
          id: "prod_office_chair",
          title: "كرسي مكتب شبكي طبي مريح",
          description: "دعم متكامل ومخصص للعمود الفقري مع مساند ذراع ثلاثية الأبعاد قابلة للتعديل، شبكة خلفية جيدة التهوية، وضبط ارتفاع هيدروليكي انسيابي.",
          price: 349.50,
          category: "أدوات مكتبية",
          imageUrl: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&w=600&q=80"
        },
        {
          id: "prod_bamboo_mug",
          title: "كوب حراري ذكي من الخيزران",
          description: "كوب مصنوع يدوياً من الخيزران الطبيعي وجدار داخلي مزدوج من الفولاذ المقاوم للصدأ يحفظ برودة وسخونة المشروبات لمدة 24 ساعة.",
          price: 28.00,
          category: "المنزل وأسلوب الحياة",
          imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=600&q=80"
        },
        {
          id: "prod_backpack_leather",
          title: "حقيبة ظهر عصرية من جلد صديق للبيئة",
          description: "مقاومة للماء بتصميم في غاية الأناقة والجميل، جيب مبطن للكمبيوتر المحمول حتى 16 بوصة، وجيوب سرية مريحة للتنقلات اليومية والرحلات سفر.",
          price: 85.00,
          category: "ملابس وموضة",
          imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80"
        },
        {
          id: "prod_rgb_keyboard",
          title: "لوحة مفاتيح ميكانيكية مضيئة RGB",
          description: "مفاتيح بنية ميكانيكية توفر ملمساً ممتازاً، هيكل معدني متين، وإضاءة RGB خلفية ملونة بالكامل وقابلة للتخصيص حسب اختيارك.",
          price: 139.99,
          category: "إلكترونيات",
          imageUrl: "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=600&q=80"
        }
      ];

      for (const item of productSeeds) {
        const { id, ...itemData } = item;
        await setDoc(doc(db, 'products', id), {
          ...itemData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      showToast("تمت تهيئة وتوليد جميع البيانات التجريبية بنجاح عالي!", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل التوليد. الرجاء التأكد من قواعد الأمان والاتصال.", "error");
    } finally {
      setIsSeeding(false);
    }
  };

  // Submit product form (Create / Update)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const actualCategory = productForm.category || (categories[0]?.name || PRESET_CATEGORIES[0]);
    if (!productForm.title || !productForm.description || !productForm.price || !productForm.imageUrl) {
      showToast("يرجى ملء جميع حقول المنتج الأساسية.", "error");
      return;
    }

    try {
      const priceNum = parseFloat(productForm.price);
      if (isNaN(priceNum) || priceNum < 0) {
        showToast("سعر المنتج غير صالح.", "error");
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
          updatedAt: serverTimestamp()
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
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
      showToast("تم حفظ المنتج بنجاح.", "success");
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
  const handleDeleteProduct = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      const prod = products.find(p => p.id === id);
      setDeleteConfirm({
        id,
        type: 'product',
        title: prod ? prod.title : 'هذا المنتج'
      });
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', id));
      showToast("تم حذف المنتج بنجاح.", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  // Category Submit
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast("اسم القسم مطلوب.", "error");
      return;
    }
    try {
      if (editingCategory) {
        const docRef = doc(db, 'categories', editingCategory.id);
        await updateDoc(docRef, {
          name: categoryForm.name.trim(),
          updatedAt: serverTimestamp()
        });
        setEditingCategory(null);
      } else {
        const cleanId = `cat_${Date.now()}`;
        await setDoc(doc(db, 'categories', cleanId), {
          name: categoryForm.name.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setCategoryForm({ name: '' });
      showToast("تم حفظ القسم بنجاح.", "success");
    } catch (err) {
      handleFirestoreError(err, editingCategory ? OperationType.UPDATE : OperationType.CREATE, 'categories');
    }
  };

  // Delete category
  const handleDeleteCategory = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      const cat = categories.find(c => c.id === id);
      setDeleteConfirm({
        id,
        type: 'category',
        title: cat ? cat.name : 'هذا القسم'
      });
      return;
    }
    try {
      await deleteDoc(doc(db, 'categories', id));
      showToast("تم حذف القسم بنجاح.", "success");
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
      showToast("حقول عنوان الإعلان والصورة والوجهة هي حقول إلزامية.", "error");
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
          updatedAt: serverTimestamp()
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
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }

      setTargetedAdForm({
        slot: 'header',
        categoryTarget: 'all',
        title: '',
        imageUrl: '',
        targetUrl: ''
      });
      showToast("تم حفظ حملة الإعلان المستهدفة بنجاح.", "success");
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

  const handleDeleteAd = async (id: string, bypassConfirm = false) => {
    if (!bypassConfirm) {
      const adItem = ads.find(a => a.id === id);
      setDeleteConfirm({
        id,
        type: 'ad',
        title: adItem ? adItem.title : 'هذا الإعلان'
      });
      return;
    }
    try {
      await deleteDoc(doc(db, 'ads', id));
      showToast("تم حذف الإعلان بنجاح.", "success");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `ads/${id}`);
    }
  };

  // Submit custom shipping fees
  const handleSaveShippingFees = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'shipping_fees'), shippingFees);
      showToast("تم تحديث أسعار شحن المحافظات بنجاح.", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل في حفظ أسعار شحن المحافظات.", "error");
    }
  };

  // Soft Delete Order (move to trash)
  const handleSoftDeleteOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        isDeleted: true,
        updatedAt: serverTimestamp()
      });
      showToast("تم نقل الطلب إلى سلة المحذوفات مؤقتاً.", "info");
    } catch (err) {
      console.error(err);
      showToast("فشل نقل طلب العميل للمحذوفات.", "error");
    }
  };

  // Restore Order from trash
  const handleRestoreOrder = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        isDeleted: false,
        updatedAt: serverTimestamp()
      });
      showToast("تم استعادة الطلب بنجاح إلى القائمة النشطة.", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل استعادة طلب العميل.", "error");
    }
  };

  // Permanent Delete Order
  const handlePermanentDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      showToast("تم حذف الطلب نهائياً بنجاح.", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل الحذف النهائي لطلب العميل.", "error");
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: 'pending' | 'completed' | 'canceled') => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status,
        updatedAt: serverTimestamp()
      });
      showToast("تم تحديث حالة الطلب بنجاح.", "success");
    } catch (err) {
      console.error(err);
      showToast("فشل تحديث حالة الطلب.", "error");
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
                placeholder="أدخل رمز المرور"
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
          {!isAdminSession ? (
            <button
              onClick={handleGoogleLogin}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs animate-pulse hover:animate-none"
              title="يجب ربط بريدك الإلكتروني ma6922249@gmail.com لتتمكن من إضافة وتعديل البيانات بنجاح"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.94 5.94 0 018 12.57c0-3.3 2.67-5.97 5.99-5.97 1.503 0 2.873.553 3.937 1.455l3.125-3.125C19.166 3.195 16.595 2 13.99 2 8.163 2 3.43 6.733 3.43 12.57S8.163 23.14 13.99 23.14c5.84 0 10.51-4.218 10.51-10.57 0-.71-.054-1.42-.164-2.115H12.24z"/>
              </svg>
              <span>ربط حساب Google كمسؤول</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-[11px] font-black border border-emerald-150">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>جوجل متصل كمسؤول</span>
            </div>
          )}

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
            <div className="flex border border-slate-150 bg-white p-1 rounded-2xl max-w-4xl overflow-x-auto gap-1 shadow-xs">
              <button
                onClick={() => setActiveSubTab('products')}
                className={`px-4.5 py-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'products' ? "bg-accent text-white shadow-md" : "text-text-muted hover:text-text-main hover:bg-slate-50"
                }`}
              >
                <Package className="w-4 h-4" />
                كتالوج المنتجات ({products.length})
              </button>
              <button
                onClick={() => setActiveSubTab('categories')}
                className={`px-4.5 py-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'categories' ? "bg-accent text-white shadow-md" : "text-text-muted hover:text-text-main hover:bg-slate-50"
                }`}
              >
                <Tag className="w-4 h-4" />
                أقسام وتصنيفات المتجر ({categories.length})
              </button>
              <button
                onClick={() => setActiveSubTab('ads')}
                className={`px-4.5 py-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'ads' ? "bg-accent text-white shadow-md" : "text-text-muted hover:text-text-main hover:bg-slate-50"
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                الإعلانات المستهدفة ({ads.length})
              </button>
              <button
                onClick={() => setActiveSubTab('orders')}
                className={`px-4.5 py-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'orders' ? "bg-accent text-white shadow-md" : "text-text-muted hover:text-text-main hover:bg-slate-50"
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                طلبات العملاء الحالية ({orders.length})
              </button>
              <button
                onClick={() => setActiveSubTab('settings')}
                className={`px-4.5 py-3 rounded-xl text-xs font-black tracking-tight flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeSubTab === 'settings' ? "bg-accent text-white shadow-md" : "text-text-muted hover:text-text-main hover:bg-slate-50"
                }`}
              >
                <Settings className="w-4 h-4" />
                أسعار شحن المحافظات
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

            {/* TAB CONTAINER 4: ORDERS MANAGEMENT */}
            {activeSubTab === 'orders' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-right">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-text-main text-base font-black tracking-tight">إدارة طلبات المبيعات الحالية</h3>
                    <p className="text-[11px] text-text-muted">متابعة طلبات الشراء الواردة من السلة المشتركة وتغيير حالتها أو تصفيتها</p>
                  </div>
                  
                  {/* Active vs Deleted Bin toggle */}
                  <div className="flex bg-slate-100 p-1 rounded-xl self-start gap-1 border border-slate-200">
                    <button
                      onClick={() => setOrdersView('active')}
                      className={`px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        ordersView === 'active'
                          ? "bg-white text-text-main shadow-xs"
                          : "text-text-muted hover:text-text-main"
                      }`}
                    >
                      الطلبات النشطة ({orders.filter(o => o.isDeleted !== true).length})
                    </button>
                    <button
                      onClick={() => setOrdersView('trash')}
                      className={`px-4.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                        ordersView === 'trash'
                          ? "bg-rose-50 text-rose-700 shadow-xs border border-rose-100"
                          : "text-text-muted hover:text-text-main"
                      }`}
                    >
                      سلة المحذوفات ({orders.filter(o => o.isDeleted === true).length})
                    </button>
                  </div>
                </div>

                {orders.filter(o => ordersView === 'trash' ? o.isDeleted === true : o.isDeleted !== true).length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-16 h-16 bg-slate-50 text-slate-350 rounded-full flex items-center justify-center mx-auto">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-text-main font-bold text-sm">
                        {ordersView === 'trash' ? 'سلة المحذوفات فارغة' : 'لا توجد طلبات جارية'}
                      </h4>
                      <p className="text-xs text-text-muted">
                        {ordersView === 'trash' ? 'الطلبات التي تحذفها ستظهر هنا أولاً لتتمكن من استعادتها أو مسحها نهائياً.' : 'سيظهر هنا أي طلب شراء يرسله العملاء من خلال السلة.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                    {orders
                      .filter(o => ordersView === 'trash' ? o.isDeleted === true : o.isDeleted !== true)
                      .map((order) => {
                        const totalItemsCount = order.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 0;
                        return (
                          <div
                            key={order.id}
                            className="border border-slate-250 bg-slate-50/20 rounded-2xl p-5 hover:bg-white hover:shadow-md transition-all space-y-4 text-right"
                          >
                            {/* Top row */}
                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-150 pb-3.5">
                              <div className="space-y-1 text-right">
                                <span className="text-[10px] text-text-muted font-mono leading-none block">رقم وتوقيت الطلب</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-black text-text-main bg-slate-100 px-2 py-0.5 rounded-md">{order.id}</span>
                                  <span className="text-[11px] text-text-muted">{formatDate(order.createdAt)}</span>
                                </div>
                              </div>

                              {/* Status Display or actions depending on tab */}
                              {ordersView === 'active' ? (
                                <div className="flex items-center gap-2.5">
                                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black ${
                                    order.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-650 border border-emerald-150'
                                      : order.status === 'canceled'
                                        ? 'bg-rose-50 text-rose-650 border border-rose-150'
                                        : 'bg-amber-50 text-amber-650 border border-amber-150'
                                  }`}>
                                    {order.status === 'completed' ? '✓ مكتمل' : order.status === 'canceled' ? '✕ ملغي' : '● قيد المراجعة'}
                                  </span>

                                  <div className="flex border border-slate-200 rounded-lg overflow-hidden h-8 bg-white">
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                      className="px-2.5 text-[10px] font-black text-emerald-600 hover:bg-emerald-50 border-l border-slate-200 cursor-pointer"
                                      title="تأشير كمكتمل"
                                    >
                                      مكتمل
                                    </button>
                                    <button
                                      onClick={() => handleUpdateOrderStatus(order.id, 'canceled')}
                                      className="px-2.5 text-[10px] font-black text-rose-500 hover:bg-rose-50 cursor-pointer"
                                      title="تأشير كملغي"
                                    >
                                      ملغي
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <span className="bg-rose-50 border border-rose-150 text-rose-700 text-[10px] font-black px-2.5 py-1 rounded-xl">
                                  ⚠️ طلب محذوف مؤقتاً
                                </span>
                              )}
                            </div>

                            {/* Client info with governorates */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs font-semibold text-right border border-slate-150">
                              <div className="space-y-1">
                                <span className="text-[9px] text-text-muted leading-none block">العميل المستلم</span>
                                <span className="text-text-main font-bold">{order.customerName}</span>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] text-text-muted leading-none block">الجوال والاتصال</span>
                                <span className="text-text-main font-bold font-mono">{order.customerPhone}</span>
                              </div>
                              <div className="space-y-1 border-t border-slate-150 pt-2 col-span-1">
                                <span className="text-[9px] text-text-muted leading-none block">المحافظة والشحن</span>
                                <span className="text-text-main font-bold">
                                  {order.governorate || 'القاهرة'} (شحن: {formatCurrency(order.shippingFee ?? 40)})
                                </span>
                              </div>
                              <div className="space-y-1 border-t border-slate-150 pt-2 col-span-1">
                                <span className="text-[9px] text-text-muted leading-none block">العنوان السكني</span>
                                <span className="text-text-main font-bold block truncate" title={order.customerAddress}>
                                  {order.customerAddress || 'غير معرّف'}
                                </span>
                              </div>
                            </div>

                            {/* Items included in list */}
                            <div className="space-y-2">
                              <span className="text-[10px] text-text-muted font-black uppercase block text-right">المنتجات المختارة ({totalItemsCount} قطع):</span>
                              <div className="divide-y divide-slate-150 max-h-40 overflow-y-auto bg-white border border-slate-150 rounded-xl px-3 py-1.5">
                                {order.items?.map((item, idx) => (
                                  <div key={idx} className="py-2 flex items-center justify-between text-xs font-semibold">
                                    <span className="text-text-main font-black">{item.productTitle}</span>
                                    <span className="text-text-muted font-mono">
                                      {item.quantity} × {formatCurrency(item.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Order actions footer */}
                            <div className="flex items-center justify-between pt-3.5 border-t border-slate-150">
                              <div className="text-xs font-black">
                                الإجمالي الكلي: <span className="text-accent text-sm font-black mr-1">{formatCurrency(order.totalPrice || 0)}</span>
                              </div>

                              {ordersView === 'active' ? (
                                <button
                                  onClick={() => handleSoftDeleteOrder(order.id)}
                                  className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer text-xs font-extrabold flex items-center gap-1.5"
                                  title="نقل الطلب للمحذوفات"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  حذف الطلب
                                </button>
                              ) : (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleRestoreOrder(order.id)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl transition-all cursor-pointer text-xs font-extrabold flex items-center gap-1"
                                    title="استعادة الطلب مجدداً"
                                  >
                                    استعادة
                                  </button>
                                  <button
                                    onClick={() => handlePermanentDeleteOrder(order.id)}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer text-xs font-extrabold flex items-center gap-1"
                                    title="حذف نهائي للطلب"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    حذف نهائي
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTAINER 5: SHIPPING SETTINGS */}
            {activeSubTab === 'settings' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-right w-full mx-auto font-sans">
                <div className="border-b border-slate-150 pb-4">
                  <h3 className="text-text-main text-base font-black tracking-tight">إعدادات وتعديل أسعار شحن المحافظات</h3>
                  <p className="text-[11px] text-text-muted">قم بتغيير تكلفة شحن وتوصيل الطلبات لكل محافظة من محافظات جمهورية مصر العربية وسيتم تحديثها فوراً للعملاء داخل السلة.</p>
                </div>

                <form onSubmit={handleSaveShippingFees} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[480px] overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
                    {EGYPT_GOVERNORATES.map((gov) => {
                      return (
                        <div key={gov.name} className="bg-white border border-slate-200 p-3.5 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-350 transition-all">
                          <span className="text-xs font-black text-text-main shrink-0">{gov.name}</span>
                          <div className="flex items-center gap-1.5 w-24">
                            <input
                              type="number"
                              min={0}
                              placeholder={gov.shippingFee.toString()}
                              value={shippingFees[gov.name] !== undefined ? shippingFees[gov.name] : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setShippingFees(prev => ({
                                  ...prev,
                                  [gov.name]: val === '' ? gov.shippingFee : Number(val)
                                }));
                              }}
                              className="w-full text-xs font-bold p-1.5 border border-slate-200 rounded-lg outline-none focus:border-accent bg-slate-50/50 text-center font-mono"
                            />
                            <span className="text-[10px] font-bold text-text-muted shrink-0">ج.م</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-amber-50 border border-amber-150 p-4 rounded-2xl">
                    <span className="text-[10px] font-bold text-amber-900 text-right leading-relaxed mb-2 sm:mb-0">
                      💡 ملاحظة: الأسعار الفارغة ستعتمد تلقائياً قيم التوصيل الافتراضية المحددة مسبقاً لكل محافظة. لتخصيص السعر، اكتب القيمة الجديدة مباشرة.
                    </span>
                    <button
                      type="submit"
                      className="py-3 px-5 bg-accent hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shrink-0 self-end sm:self-auto"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ أسعار التوصيل</span>
                    </button>
                  </div>
                </form>
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

      {/* Modern Custom Delete Confirmation Overlay */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-[2rem] max-w-sm w-full p-6 shadow-2xl space-y-5 text-right">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="p-3 bg-red-50 text-red-500 rounded-2xl">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-base font-black text-text-main mt-2">تأكيد عملية الحذف</h3>
              <p className="text-xs text-text-muted leading-relaxed">
                هل أنت متأكد من حذف <strong className="text-text-main font-bold">"{deleteConfirm.title}"</strong> نهائياً؟ لا يمكن التراجع عن هذا الإجراء بعد تنفيذه من قاعدة البيانات.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 text-xs font-bold text-text-muted hover:text-text-main bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer text-center transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                type="button"
                onClick={async () => {
                  const { id, type } = deleteConfirm;
                  setDeleteConfirm(null);
                  if (type === 'product') {
                    await handleDeleteProduct(id, true);
                  } else if (type === 'category') {
                    await handleDeleteCategory(id, true);
                  } else if (type === 'ad') {
                    await handleDeleteAd(id, true);
                  }
                }}
                className="flex-1 py-3 text-xs font-black text-white bg-rose-500 hover:bg-rose-600 rounded-xl cursor-pointer text-center transition-colors shadow-xs"
              >
                تأكيد الحذف النهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global localized toasts for the admin view */}
      <ToastContainer />

    </div>
  );
}
