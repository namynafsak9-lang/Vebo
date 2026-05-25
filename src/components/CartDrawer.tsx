import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, Trash2, ExternalLink, FileText, ShoppingBag, Clipboard, Check, MapPin, User, Phone, CheckCircle } from 'lucide-react';
import { CartItem, EGYPT_GOVERNORATES } from '../types';
import { formatCurrency } from '../lib/utils';
import { db, collection, addDoc, onSnapshot, doc } from '../firebase';
import { showToast } from '../lib/toast';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, q: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedGovName, setSelectedGovName] = useState('القاهرة');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState<string | null>(null);
  const [customFees, setCustomFees] = useState<Record<string, number>>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'shipping_fees'), (snapshot) => {
      if (snapshot.exists()) {
        setCustomFees(snapshot.data() as Record<string, number>);
      }
    });
    return () => unsub();
  }, []);

  const getGovernoratesList = () => {
    return EGYPT_GOVERNORATES.map(gov => ({
      name: gov.name,
      shippingFee: customFees[gov.name] !== undefined ? Number(customFees[gov.name]) : gov.shippingFee
    }));
  };

  const getSubtotal = () => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  };

  const getSelectedGov = () => {
    const list = getGovernoratesList();
    return list.find(g => g.name === selectedGovName) || list[0];
  };

  const getShippingFee = () => {
    return getSelectedGov().shippingFee;
  };

  const calculateTotal = () => {
    return getSubtotal() + getShippingFee();
  };

  const handleCopyOrderSummary = (orderText: string) => {
    navigator.clipboard.writeText(orderText);
    setCopiedSummary(true);
    showToast("تم نسخ تفاصيل الطلب بنجاح إلى الحافظة!", "success");
    setTimeout(() => setCopiedSummary(false), 3000);
  };

  const generateOrderText = () => {
    const sub = getSubtotal();
    const shipFee = getShippingFee();
    const itemsText = cartItems
      .map((item) => `- ${item.product.title} (الكمية: ${item.quantity}) - بسعر ${formatCurrency(item.product.price * item.quantity)}`)
      .join('\n');
    return `طلب جديد من منصة ڤيبو (Vebo):\n\n` +
      `اسم العميل: ${customerName}\n` +
      `رقم الهاتف: ${customerPhone}\n` +
      `المحافظة: ${selectedGovName}\n` +
      `سعر التوصيل للمحافظة: ${formatCurrency(shipFee)}\n` +
      `العنوان: ${customerAddress || 'غير محدد'}\n\n` +
      `تفاصيل المنتجات:\n${itemsText}\n\n` +
      `قيمة المنتجات: ${formatCurrency(sub)}\n` +
      `الإجمالي الكلي بالترصيد: ${formatCurrency(sub + shipFee)}`;
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showToast("السلة فارغة حالياً. أضف بعض المنتجات أولاً.", "error");
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      showToast("يرجى إدخال اسمك ورقم الهاتف لإكمال الطلب.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderSummaryText = generateOrderText();

      // 1. Save order to Firestore orders collection
      const orderRef = await addDoc(collection(db, 'orders'), {
        customerName,
        customerPhone,
        customerAddress,
        governorate: selectedGovName,
        shippingFee: getShippingFee(),
        items: cartItems.map(item => ({
          productId: item.product.id,
          productTitle: item.product.title,
          price: item.product.price,
          quantity: item.quantity
        })),
        totalPrice: calculateTotal(),
        status: 'pending',
        isDeleted: false,
        createdAt: new Date()
      });

      setLastPlacedOrderId(orderRef.id);

      // 2. Automatically copy to clipboard for convenience
      try {
        await navigator.clipboard.writeText(orderSummaryText);
      } catch (clipboardErr) {
        console.warn("Could not copy order summary automatically: ", clipboardErr);
      }

      showToast("تم إرسال الطلب بنجاح لمراجعة الإدارة!", "success");
    } catch (error) {
      console.error("Checkout Error:", error);
      showToast("حدث خطأ أثناء معالجة الطلب، يرجى المحاولة لاحقاً.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAfterSuccess = () => {
    setLastPlacedOrderId(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    onClearCart();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 cursor-pointer"
          />

          {/* Drawer Panel */}
          <motion.div
            key="cart-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 left-0 h-full w-full max-w-md bg-white shadow-2xl z-55 flex flex-col text-right border-r border-slate-100"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-500 transition-colors cursor-pointer"
                title="إغلاق السلة"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="text-text-main font-black text-sm uppercase flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-accent" />
                  سلة الشراء المشتركة
                </span>
                <span className="bg-accent/10 text-accent font-black text-xs px-2.5 py-0.5 rounded-full">
                  {cartItems.length}
                </span>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {lastPlacedOrderId ? (
                <div className="py-12 px-2 text-center space-y-6 animate-fade-in text-right" dir="rtl">
                  <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle className="w-12 h-12 text-emerald-500" />
                  </div>
                  <div className="space-y-2.5 text-center">
                    <h3 className="text-text-main font-black text-lg">تم إرسال طلبك بنجاح!</h3>
                    <p className="text-xs text-text-muted leading-relaxed max-w-xs mx-auto">
                      تم تسجيل طلبك مباشرة في نظام المتجر بنجاح. سيتم مراجعة طلبك وتأكيد الشحن قريباً!
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-right space-y-3 max-w-sm mx-auto">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-text-muted font-bold">كود تتبع الطلب:</span>
                      <span className="font-mono font-black text-accent bg-accent/5 px-2.5 py-1 rounded-lg text-[10px] select-all">{lastPlacedOrderId}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                      <span className="text-text-muted font-bold">اسم المستلم:</span>
                      <span className="text-text-main font-black">{customerName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                      <span className="text-text-muted font-bold">رقم الهاتف:</span>
                      <span className="text-text-main font-black font-mono">{customerPhone}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                      <span className="text-text-muted font-bold">المحافظة:</span>
                      <span className="text-text-main font-black">{selectedGovName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                      <span className="text-text-muted font-bold">المبلغ الإجمالي الكلي:</span>
                      <span className="text-accent font-black text-sm">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 pt-4 max-w-sm mx-auto">
                    <button
                      onClick={() => handleCopyOrderSummary(generateOrderText())}
                      className="w-full py-3 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Clipboard className="w-4 h-4" />
                      <span>نسخ الفاتورة للحافظة</span>
                    </button>
                    <button
                      onClick={resetAfterSuccess}
                      className="w-full py-3 bg-accent text-white hover:bg-blue-700 font-black rounded-xl text-xs cursor-pointer transition-all shadow-md"
                    >
                      متابعة التسوق والطلب مجدداً
                    </button>
                  </div>
                </div>
              ) : cartItems.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-text-main font-bold text-sm">سلة تسوقك فارغة</h3>
                    <p className="text-xs text-text-muted">تصفح المعروضات في المتجر وأضف منتجاتك المفضلة هنا للطلب دفعة واحدة.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Cart Items List */}
                  <div className="space-y-3.5">
                    <span className="text-[10px] font-black tracking-wider text-text-muted uppercase block border-b border-slate-100 pb-1.5">المنتجات المختارة</span>
                    {cartItems.map((item) => (
                      <div
                        key={item.product.id}
                        className="flex items-center gap-3 p-3 bg-slate-50/50 border border-slate-150 rounded-2xl transition-all"
                      >
                        {/* Image */}
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.title}
                          className="w-14 h-14 object-cover rounded-xl border border-slate-200"
                        />

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-text-main font-bold text-xs truncate leading-normal">
                            {item.product.title}
                          </h4>
                          <div className="text-[11px] font-extrabold text-accent mt-1">
                            {formatCurrency(item.product.price)}
                          </div>
                        </div>

                        {/* Interactive Quantity Sizer */}
                        <div className="flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden h-8">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1.5 hover:bg-slate-50 text-slate-500 cursor-pointer h-full flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 font-mono text-xs font-bold text-text-main text-center min-w-[24px]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1.5 hover:bg-slate-50 text-slate-500 cursor-pointer h-full flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Remove item button */}
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="إزالة من السلة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Customer Checkout Form */}
                  <div className="space-y-4 pt-4 border-t border-slate-150">
                    <span className="text-[10px] font-black tracking-wider text-text-muted uppercase block mr-1">بيانات مستلم الطلب</span>
                    
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      {/* Name field */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          الاسم الثلاثي المعتمد
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="مثال: محمد أحمد علي"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl outline-none focus:border-accent bg-white text-right"
                        />
                      </div>

                      {/* Phone field */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          رقم الهاتف الذكي للتواصل
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="مثال: 01012345678"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl outline-none focus:border-accent bg-white text-right"
                        />
                      </div>

                      {/* Governorate field */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          المحافظة (لتحديد قيمة الشحن وتأكيد العنوان)
                        </label>
                        <select
                          value={selectedGovName}
                          onChange={(e) => setSelectedGovName(e.target.value)}
                          className="w-full text-xs font-extrabold p-2.5 border border-slate-200 rounded-xl outline-none focus:border-accent bg-white text-right cursor-pointer"
                        >
                          {getGovernoratesList().map((gov) => (
                            <option key={gov.name} value={gov.name}>
                              {gov.name} (تكلفة التوصيل: {formatCurrency(gov.shippingFee)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Address field */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-text-muted flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          عنوان التوصيل السكني التفصيلي (اختياري)
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: كفر الشيخ، شارع الجيش بجوار مسجد المغفرة"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          className="w-full text-xs font-semibold p-2.5 border border-slate-200 rounded-xl outline-none focus:border-accent bg-white text-right"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary copy panel */}
                  <div className="p-3 bg-amber-50 border border-amber-150 rounded-2xl flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-amber-800 leading-normal">
                      💡 سيتم نسخ تفاصيل السلة تلقائياً لحافظة هاتفك بمجرد الشراء لمزيد من السهولة!
                    </span>
                    {customerName && customerPhone && (
                      <button
                        onClick={() => handleCopyOrderSummary(generateOrderText())}
                        className="self-end inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 border border-amber-200 text-amber-900 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        {copiedSummary ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
                        <span>{copiedSummary ? "تم نسخ النص!" : "نسخ ملخص السلة يدوياً"}</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Summary & Checkout buttons */}
            {cartItems.length > 0 && !lastPlacedOrderId && (
              <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-4">
                <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs text-xs font-semibold space-y-2.5 text-right">
                  <div className="flex justify-between text-text-muted">
                    <span>قيمة المشتريات:</span>
                    <span className="font-bold text-text-main">{formatCurrency(getSubtotal())}</span>
                  </div>
                  <div className="flex justify-between text-text-muted border-t border-slate-100 pt-2.5">
                    <span>تكلفة التوصيل ({selectedGovName}):</span>
                    <span className="font-bold text-text-main">{formatCurrency(getShippingFee())}</span>
                  </div>
                  <div className="flex justify-between text-text-main border-t border-slate-150 pt-2.5 text-xs font-black">
                    <span>الإجمالي الكلي المستحق للدفع:</span>
                    <span className="text-sm font-black text-accent">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    onClick={onClearCart}
                    className="py-3 px-4 text-xs font-bold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-xl cursor-pointer transition-colors"
                    title="تفريغ السلة تماماً"
                  >
                    تفريغ
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-5 bg-accent hover:bg-blue-700 text-white rounded-xl font-bold transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isSubmitting ? "جاري معالجة الطلب..." : "تأكيد وإرسال الطلب الآن"}</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
