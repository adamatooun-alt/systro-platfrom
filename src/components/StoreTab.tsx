import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Trash2, 
  ShoppingCart, 
  CheckCircle2, 
  Sparkles, 
  ExternalLink, 
  Phone, 
  Package, 
  Tag, 
  X, 
  Info,
  ShieldCheck,
  Truck,
  ArrowRight,
  ArrowLeft,
  Check,
  Filter
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { Product } from '../types';

interface StoreTabProps {
  lang: 'ar' | 'en' | 'he';
  t: any;
  userRole: 'client' | 'technician' | null;
  isAdminUnlocked: boolean;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToAdmin?: () => void;
  phoneNumber?: string;
  clientName?: string;
}

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-jump-starter',
    title: 'Emergency Jump Starter 12000mAh',
    arTitle: 'شاحن ومُشغل بطاريات السيارات الذكي 12000mAh',
    price: 280,
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80',
    description: 'Portable emergency battery booster with smart clamps, LED torch, and USB power bank.',
    arDescription: 'جهاز تشغيل بطاريات السيارة عند الانقطاع المفاجئ مع كابلات حماية ذكية، كشاف LED ثلاثي، ومخرج شحن سريع للهواتف.',
    category: 'Emergency',
    arCategory: 'معدات طوارئ',
    inStock: true,
    createdAt: Date.now() - 300000
  },
  {
    id: 'prod-car-battery-60ah',
    title: 'Heavy Duty 60Ah Maintenance-Free Car Battery',
    arTitle: 'بطارية سيارة هيفي دوتي 60 أمبير جافة مع ضمان',
    price: 420,
    image: 'https://images.unsplash.com/photo-1599256872237-5dcc0fbe9668?w=800&q=80',
    description: 'High performance battery suited for tough heat conditions with 18 months warranty.',
    arDescription: 'بطارية جافة عالية الأداء مقاومة لدرجات الحرارة العالية مع ضمان 18 شهراً وخدمة توصيل وتركيب فوري.',
    category: 'Batteries',
    arCategory: 'بطاريات',
    inStock: true,
    createdAt: Date.now() - 200000
  },
  {
    id: 'prod-tyre-compressor',
    title: 'Safari Digital Heavy Duty Tyre Inflator 12V',
    arTitle: 'منفاخ إطارات رقمي سفاري 12V مع شاشة LCD',
    price: 190,
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&q=80',
    description: 'Fast inflation air compressor with auto shut-off, digital pressure gauge, and carry bag.',
    arDescription: 'ضاغط هواء سريع جداً يعمل على ولاعة السيارة مع شاشة رقمية لتحديد الضغط والتوقف التلقائي عند اكتمال الهواء.',
    category: 'Tyres',
    arCategory: 'صيانة إطارات',
    inStock: true,
    createdAt: Date.now() - 100000
  }
];

export const StoreTab: React.FC<StoreTabProps> = ({
  lang,
  t,
  userRole,
  isAdminUnlocked,
  triggerToast,
  onNavigateToAdmin,
  phoneNumber,
  clientName
}) => {
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Cart / Purchase State
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);
  const [orderSuccessModal, setOrderSuccessModal] = useState<boolean>(false);

  // Sync real-time products from Firestore
  useEffect(() => {
    let isMounted = true;
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Product);
      });

      if (list.length === 0) {
        // Seed default products to Firestore if empty
        DEFAULT_PRODUCTS.forEach(async (p) => {
          try {
            await setDoc(doc(db, 'products', p.id), p);
          } catch (e) {
            console.error('Error seeding default product:', e);
          }
        });
        if (isMounted) setProducts(DEFAULT_PRODUCTS);
      } else {
        // Sort newest first
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        if (isMounted) setProducts(list);
      }
      if (isMounted) setLoading(false);
    }, (error) => {
      console.error('Products subscription error:', error);
      // Fallback to defaults
      if (isMounted) {
        setProducts(DEFAULT_PRODUCTS);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Categories list
  const categories = Array.from(
    new Set(
      products.map(p => (lang === 'ar' ? (p.arCategory || p.category) : (p.category || p.arCategory)))
    )
  ).filter(Boolean) as string[];

  // Filtered products
  const filteredProducts = products.filter((p) => {
    const titleMatch = (p.arTitle || p.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
                       p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = (p.arDescription || p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const cat = lang === 'ar' ? (p.arCategory || p.category) : (p.category || p.arCategory);
    const categoryMatch = selectedCategory === 'all' || cat === selectedCategory;

    return (titleMatch || descMatch) && categoryMatch;
  });

  // Cart operations
  const addToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });
    triggerToast(
      lang === 'ar' 
        ? `تمت إضافة "${product.arTitle || product.title}" إلى السلة 🛒` 
        : `Added "${product.title}" to cart 🛒`,
      'success'
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      })
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit order via WhatsApp or Phone
  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;
    const itemsListText = cart
      .map(item => `• ${item.product.arTitle || item.product.title} (x${item.quantity}) - ${item.product.price * item.quantity} ₪`)
      .join('\n');

    const orderText = lang === 'ar'
      ? `مرحباً سيسترو 🛒، أرغب في طلب المنتجات التالية من المتجر:\n\n${itemsListText}\n\nإجمالي المبلغ: ${cartTotal} ₪\nاسم العميل: ${clientName || 'عميل سيسترو'}\nرقم الهاتف: ${phoneNumber || 'غير مدخل'}`
      : `Hello Systro 🛒, I would like to order the following products from the store:\n\n${itemsListText}\n\nTotal: ${cartTotal} ₪\nName: ${clientName || 'Customer'}\nPhone: ${phoneNumber || 'N/A'}`;

    const encoded = encodeURIComponent(orderText);
    window.open(`https://wa.me/972599999999?text=${encoded}`, '_blank');
    setCart([]);
    setIsCartOpen(false);
    setOrderSuccessModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in space-y-8 pb-24">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-amber-500/20 shadow-2xl p-6 sm:p-10 text-white">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl text-right rtl:text-right ltr:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide select-none">
              <ShoppingBag className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{lang === 'ar' ? 'متجر سيسترو الرسمي لقطع الغيار والمعدات' : 'Systro Official Auto Parts & Equipment Store'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              {lang === 'ar' ? 'المعدات، البطاريات ومستلزمات الطوارئ 🛠️' : 'Auto Parts, Batteries & Emergency Gear 🛠️'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              {lang === 'ar' 
                ? 'تصفح أفضل قطع الغيار، البطاريات المضمونة، وأدوات الإنقاذ مع خدمة التوصيل المباشر أو التركيب بواسطة فنيي سيسترو المعتمدين.' 
                : 'Browse genuine auto parts, guaranteed batteries, and rescue equipment with fast delivery or installation by verified technicians.'}
            </p>
          </div>

          {/* Cart Counter & Admin Management Shortcut */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative px-5 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center gap-2.5 text-xs sm:text-sm cursor-pointer hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{lang === 'ar' ? 'سلة المشتريات' : 'Shopping Cart'}</span>
              {cartItemCount > 0 && (
                <span className="w-6 h-6 bg-slate-950 text-amber-400 rounded-full text-xs font-black flex items-center justify-center animate-pulse">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Admin Manage Store Shortcut */}
            {isAdminUnlocked && onNavigateToAdmin && (
              <button
                onClick={onNavigateToAdmin}
                className="px-4 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{lang === 'ar' ? 'إدارة المنتجات في اللوحة ⚙️' : 'Manage Products in Admin ⚙️'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Feature Badges */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold text-slate-300">
          <div className="flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lang === 'ar' ? 'توصيل وتوصيل فوري' : 'Express Local Delivery'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === 'ar' ? 'منتجات أصلية مع ضمان' : 'Original Guaranteed Items'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Package className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lang === 'ar' ? 'تركيب مع الفنيين' : 'Tech Installation Option'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === 'ar' ? 'طلب مباشر عبر واتساب' : 'Direct WhatsApp Order'}</span>
          </div>
        </div>
      </div>

      {/* Search Bar & Categories Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 rtl:right-3.5 ltr:left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === 'ar' ? 'ابحث عن اسم المنتج، البطارية، أو المعدات...' : 'Search product name, battery, or equipment...'}
              className="w-full pr-10 rtl:pr-10 ltr:pl-10 pl-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 rtl:left-3 ltr:right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Active items count */}
          <div className="text-xs font-bold text-slate-500 px-2 shrink-0">
            {lang === 'ar' ? `عرض ${filteredProducts.length} من أصل ${products.length} منتج` : `Showing ${filteredProducts.length} of ${products.length} products`}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl font-extrabold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'الكل 🛍️' : 'All Items 🛍️'}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl font-extrabold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-slate-200 space-y-4 animate-pulse">
              <div className="w-full h-48 bg-slate-200 rounded-2xl"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-3 bg-slate-100 rounded w-full"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 bg-slate-200 rounded w-1/3"></div>
                <div className="h-10 bg-amber-200 rounded-xl w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4 max-w-md mx-auto my-8">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-black text-slate-800">
            {lang === 'ar' ? 'لم يتم العثور على منتجات مطابقة' : 'No matching products found'}
          </h3>
          <p className="text-xs text-slate-500 font-semibold">
            {lang === 'ar' ? 'جرب البحث بكلمة مختلفة أو اختر فئة أخرى من القائمة.' : 'Try searching with a different term or clear filters.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer"
          >
            {lang === 'ar' ? 'إعادة ضبط البحث 🔄' : 'Reset Search 🔄'}
          </button>
        </div>
      ) : (
        /* Products Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const title = lang === 'ar' ? (product.arTitle || product.title) : product.title;
            const desc = lang === 'ar' ? (product.arDescription || product.description) : (product.description || product.arDescription);
            const category = lang === 'ar' ? (product.arCategory || product.category) : (product.category || product.arCategory);

            return (
              <div
                key={product.id}
                onClick={() => setSelectedProductDetail(product)}
                className="bg-white rounded-3xl border border-slate-200 hover:border-amber-400/80 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer relative"
              >
                {/* Product Image Container */}
                <div className="relative w-full h-52 bg-slate-100 overflow-hidden">
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80'}
                    alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80';
                    }}
                  />
                  
                  {/* Category Pill Tag */}
                  {category && (
                    <span className="absolute top-3 right-3 rtl:right-3 ltr:left-3 px-3 py-1 bg-slate-900/80 backdrop-blur-md text-amber-300 text-[10px] font-black rounded-full border border-amber-500/30">
                      {category}
                    </span>
                  )}

                  {/* Stock Status Badge */}
                  <span className={`absolute bottom-3 left-3 rtl:left-3 ltr:right-3 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md ${
                    product.inStock !== false
                      ? 'bg-emerald-500/90 text-white'
                      : 'bg-red-500/90 text-white'
                  }`}>
                    {product.inStock !== false
                      ? (lang === 'ar' ? 'متوفر بالمخزن 🟢' : 'In Stock 🟢')
                      : (lang === 'ar' ? 'غير متوفر 🔴' : 'Out of Stock 🔴')}
                  </span>
                </div>

                {/* Card Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-black text-slate-900 text-base leading-snug group-hover:text-amber-600 transition-colors line-clamp-2">
                      {title}
                    </h3>
                    {desc && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                        {desc}
                      </p>
                    )}
                  </div>

                  {/* Price & Add to Cart Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {lang === 'ar' ? 'السعر الاصلي' : 'Price'}
                      </span>
                      <span className="text-xl font-black text-slate-950 font-mono">
                        {product.price} <span className="text-xs text-amber-600 font-extrabold">₪</span>
                      </span>
                    </div>

                    <button
                      onClick={(e) => addToCart(product, e)}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'إضافة للسلة' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Details Modal */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-scale-up space-y-0 text-right rtl:text-right ltr:text-left">
            {/* Header Image */}
            <div className="relative h-64 bg-slate-100">
              <img
                src={selectedProductDetail.image}
                alt={selectedProductDetail.title}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setSelectedProductDetail(null)}
                className="absolute top-4 right-4 rtl:right-4 ltr:left-4 p-2 bg-slate-950/60 hover:bg-slate-950 text-white rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg font-black text-slate-900 leading-tight">
                  {lang === 'ar' ? (selectedProductDetail.arTitle || selectedProductDetail.title) : selectedProductDetail.title}
                </h2>
                <div className="text-xl font-black text-amber-600 font-mono shrink-0">
                  {selectedProductDetail.price} ₪
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {lang === 'ar' ? (selectedProductDetail.arDescription || selectedProductDetail.description) : (selectedProductDetail.description || selectedProductDetail.arDescription)}
              </p>

              <div className="pt-2 flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{lang === 'ar' ? 'الفئة:' : 'Category:'} {lang === 'ar' ? (selectedProductDetail.arCategory || selectedProductDetail.category) : selectedProductDetail.category}</span>
                <span className="text-emerald-600">{lang === 'ar' ? 'متوفر للتوصيل الفوري' : 'Available for Instant Delivery'}</span>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => {
                    addToCart(selectedProductDetail);
                    setSelectedProductDetail(null);
                    setIsCartOpen(true);
                  }}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'شراء الآن وإضافة للسلة' : 'Buy Now & Add to Cart'}</span>
                </button>
                <button
                  onClick={() => setSelectedProductDetail(null)}
                  className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'ar' ? 'إغلاق' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Drawer Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between animate-slide-left p-6 space-y-6 text-right rtl:text-right ltr:text-left overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-black text-slate-900">
                  {lang === 'ar' ? 'سلة مشتريات قطع الغيار' : 'Auto Parts Shopping Cart'}
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">
                    {lang === 'ar' ? 'سلة المشتريات فارغة حالياً' : 'Your shopping cart is empty'}
                  </p>
                </div>
              ) : (
                cart.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3"
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-200"
                    />
                    <div className="flex-1 space-y-1">
                      <h4 className="text-xs font-black text-slate-900 line-clamp-1">
                        {lang === 'ar' ? (product.arTitle || product.title) : product.title}
                      </h4>
                      <div className="text-xs font-black text-amber-600 font-mono">
                        {product.price * quantity} ₪
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => updateQuantity(product.id, -1)}
                          className="w-6 h-6 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-black flex items-center justify-center cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-black font-mono">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, 1)}
                          className="w-6 h-6 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-black flex items-center justify-center cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary & Order Actions */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between text-sm font-black">
                  <span className="text-slate-600">{lang === 'ar' ? 'إجمالي الطلب:' : 'Order Total:'}</span>
                  <span className="text-xl font-mono text-slate-950 font-black">{cartTotal} ₪</span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={handleCheckoutWhatsApp}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'تأكيد الطلب مباشرة عبر واتساب 📲' : 'Confirm Order via WhatsApp 📲'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 border border-slate-200 shadow-2xl animate-scale-up">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 animate-bounce" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              {lang === 'ar' ? 'تم إرسال الطلب بنجاح!' : 'Order Sent Successfully!'}
            </h3>
            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              {lang === 'ar'
                ? 'تم فتح المحادثة عبر واتساب مع فريق خدمة عملاء سيسترو لمتابعة التوصيل والتركيب فوراً.'
                : 'WhatsApp chat opened with Systro support team to complete delivery & installation.'}
            </p>
            <button
              onClick={() => setOrderSuccessModal(false)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl transition-all cursor-pointer"
            >
              {lang === 'ar' ? 'ممتاز، حسناً 👍' : 'Great, Got it 👍'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
