import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  AlertCircle, 
  Coins, 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  Phone, 
  Trash2, 
  Search, 
  X, 
  Check, 
  Mail, 
  MessageSquare,
  AlertTriangle,
  Send,
  Sparkles,
  ExternalLink,
  Plus,
  Briefcase,
  ShoppingBag,
  Package,
  Tag,
  DollarSign,
  Edit3,
  Clock,
  MapPin,
  CreditCard,
  FileText,
  Eye,
  Filter
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, collection, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { Product, StoreOrder, StoreOrderStatus } from '../types';

interface AdminPanelProps {
  lang: string;
  t: any;
  customDomain: string;
  setCustomDomain: (d: string) => void;
  resetSimulation: () => void;
  smtpStatus: any;
  fetchSmtpStatus: () => void;
  whatsAppStatus: any;
  fetchWhatsAppStatus: () => void;
  escrows: any[];
  registeredUsers: any[];
  pendingServices: any[];
  activeServices: any[];
  adminServiceSearch: string;
  setAdminServiceSearch: (s: string) => void;
  handleApprovePendingService: (id: string, srv: any) => void;
  handleRejectPendingService: (id: string) => void;
  handleDeleteActiveService: (id: string) => void;
  websiteIssues: any[];
  handleDeleteWebsiteIssue: (id: string) => void;
  setIsAdminUnlocked: (unlocked: boolean) => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  TrustPortal: any;
  SmtpConfigPanel: any;
  WhatsAppConfigPanel: any;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  lang,
  t,
  customDomain,
  setCustomDomain,
  resetSimulation,
  smtpStatus,
  fetchSmtpStatus,
  whatsAppStatus,
  fetchWhatsAppStatus,
  escrows,
  registeredUsers,
  pendingServices,
  activeServices,
  adminServiceSearch,
  setAdminServiceSearch,
  handleApprovePendingService,
  handleRejectPendingService,
  handleDeleteActiveService,
  websiteIssues,
  handleDeleteWebsiteIssue,
  setIsAdminUnlocked,
  triggerToast,
  TrustPortal,
  SmtpConfigPanel,
  WhatsAppConfigPanel,
}) => {
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [adminUserRoleFilter, setAdminUserRoleFilter] = useState<'all' | 'client' | 'technician' | 'unassigned'>('all');

  // Store Product Management State
  const [products, setProducts] = useState<Product[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdPrice, setNewProdPrice] = useState<number>(150);
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('معدات طوارئ');
  const [newProdDescription, setNewProdDescription] = useState('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCategory, setEditCategory] = useState('');
  const [editImage, setEditImage] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInStock, setEditInStock] = useState<boolean>(true);
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Store Incoming Orders Management State
  const [storeOrders, setStoreOrders] = useState<StoreOrder[]>([]);
  const [storeOrderSearch, setStoreOrderSearch] = useState('');
  const [storeOrderStatusFilter, setStoreOrderStatusFilter] = useState<string>('all');

  // Sync products list from Firestore in Admin
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Product);
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setProducts(list);
    });
    return () => unsub();
  }, []);

  // Sync store orders list from Firestore in Admin
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'store_orders'), (snapshot) => {
      const list: StoreOrder[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as StoreOrder);
      });
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setStoreOrders(list);
    });
    return () => unsub();
  }, []);

  // Add Product Handler
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdTitle.trim() || newProdPrice <= 0) {
      triggerToast(
        lang === 'ar' ? 'يرجى إدخال اسم المنتج والسعر بشكل صحيح!' : 'Please enter valid product title and price!',
        'warning'
      );
      return;
    }

    setIsAddingProduct(true);
    try {
      const prodId = 'prod-' + Date.now();
      const defaultImg = newProdImage.trim() || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80';
      
      await setDoc(doc(db, 'products', prodId), {
        id: prodId,
        title: newProdTitle,
        arTitle: newProdTitle,
        price: Number(newProdPrice),
        image: defaultImg,
        description: newProdDescription,
        arDescription: newProdDescription,
        category: newProdCategory,
        arCategory: newProdCategory,
        inStock: true,
        createdAt: Date.now()
      });

      triggerToast(
        lang === 'ar' ? `تمت إضافة المنتج "${newProdTitle}" للمتجر بنجاح! 🎉` : `Product "${newProdTitle}" added to store! 🎉`,
        'success'
      );

      setNewProdTitle('');
      setNewProdPrice(150);
      setNewProdImage('');
      setNewProdDescription('');
    } catch (err: any) {
      console.error('Error adding product:', err);
      triggerToast(lang === 'ar' ? 'خطأ في إضافة المنتج!' : 'Failed to add product!', 'error');
    } finally {
      setIsAddingProduct(false);
    }
  };

  // Start Editing Product
  const startEditingProduct = (p: Product) => {
    setEditingProduct(p);
    setEditTitle(p.arTitle || p.title);
    setEditPrice(p.price);
    setEditCategory(p.arCategory || p.category || 'معدات طوارئ');
    setEditImage(p.image || '');
    setEditDescription(p.arDescription || p.description || '');
    setEditInStock(p.inStock !== false);
  };

  // Save Product Edits
  const handleSaveProductEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!editTitle.trim() || editPrice <= 0) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال البيانات بشكل صحيح!' : 'Please enter valid details!', 'warning');
      return;
    }

    setIsSavingEdit(true);
    try {
      await setDoc(doc(db, 'products', editingProduct.id), {
        title: editTitle.trim(),
        arTitle: editTitle.trim(),
        price: Number(editPrice),
        image: editImage.trim() || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80',
        description: editDescription.trim(),
        arDescription: editDescription.trim(),
        category: editCategory,
        arCategory: editCategory,
        inStock: editInStock
      }, { merge: true });

      triggerToast(
        lang === 'ar' ? `تم تحديث المنتج "${editTitle}" بنجاح! ✏️` : `Product "${editTitle}" updated! ✏️`,
        'success'
      );
      setEditingProduct(null);
    } catch (err) {
      console.error('Error updating product:', err);
      triggerToast(lang === 'ar' ? 'حدث خطأ أثناء تعديل المنتج!' : 'Failed to update product!', 'error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string, title: string) => {
    if (!window.confirm(lang === 'ar' ? `هل أنت تأكد من إزالة المنتج "${title}" من المتجر؟` : `Are you sure you want to remove "${title}"?`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'products', id));
      triggerToast(
        lang === 'ar' ? 'تمت إزالة المنتج من المتجر بنجاح 🗑️' : 'Product deleted from store 🗑️',
        'info'
      );
    } catch (err: any) {
      console.error('Error deleting product:', err);
      triggerToast(lang === 'ar' ? 'خطأ في إزالة المنتج!' : 'Failed to delete product!', 'error');
    }
  };

  // Update Store Order Status Handler
  const handleUpdateOrderStatus = async (orderId: string, newStatus: StoreOrderStatus) => {
    try {
      await updateDoc(doc(db, 'store_orders', orderId), {
        status: newStatus
      });
      triggerToast(
        lang === 'ar' ? `تم تغيير حالة الطلب #${orderId} بنجاح! 🔄` : `Order status updated for #${orderId}! 🔄`,
        'success'
      );
    } catch (err) {
      console.error('Error updating order status:', err);
      triggerToast(lang === 'ar' ? 'فشل تحديث حالة الطلب!' : 'Failed to update status!', 'error');
    }
  };

  // Delete Store Order Handler
  const handleDeleteStoreOrder = async (orderId: string) => {
    if (!window.confirm(lang === 'ar' ? `هل أنت تأكد من إزالة الطلب رقم #${orderId} نهائياً؟` : `Delete order #${orderId}?`)) return;
    try {
      await deleteDoc(doc(db, 'store_orders', orderId));
      triggerToast(
        lang === 'ar' ? 'تمت إزالة الطلب من القائمة 🗑️' : 'Order deleted 🗑️',
        'info'
      );
    } catch (err) {
      console.error('Error deleting order:', err);
      triggerToast(lang === 'ar' ? 'فشل حذف الطلب!' : 'Failed to delete order!', 'error');
    }
  };

  // Filtered Store Orders
  const filteredStoreOrders = storeOrders.filter(ord => {
    const searchLower = storeOrderSearch.toLowerCase();
    const matchesSearch = 
      ord.id.toLowerCase().includes(searchLower) ||
      ord.customerName.toLowerCase().includes(searchLower) ||
      ord.customerPhone.toLowerCase().includes(searchLower) ||
      ord.customerAddress.toLowerCase().includes(searchLower);

    const matchesStatus = storeOrderStatusFilter === 'all' || ord.status === storeOrderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Order Statistics
  const pendingOrdersCount = storeOrders.filter(o => o.status === 'pending').length;
  const totalStoreRevenue = storeOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 animate-fade-in space-y-8 bg-slate-50 text-slate-900 rounded-3xl border border-slate-200 shadow-2xl my-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200 pb-6 text-slate-900">
        <div className="space-y-2 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
            <h2 className="text-2xl font-black text-slate-900">{t.adminTitle || (lang === 'ar' ? 'بوابة الإدارة والرقابة المالية لـ سيسترو' : 'Systro Admin Portal')}</h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold shrink-0 shadow-sm select-none">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
              <span>{lang === 'ar' ? `نطاق موثق: ${customDomain}` : `Verified Domain: ${customDomain}`}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-semibold">{lang === 'ar' ? 'إدارة كاملة للمتجر، تعديل المنتجات، متابعة الطلبات الواردة، والرقابة على الودائع والمستخدمين.' : 'Manage store products, incoming customer orders, active disputes, and system security.'}</p>
        </div>
        <button 
          onClick={() => {
            setIsAdminUnlocked(false);
            sessionStorage.removeItem('systro_admin_unlocked');
            triggerToast(lang === 'ar' ? 'تم إغلاق لوحة الإدارة بنجاح!' : 'Admin Panel locked successfully!', 'info');
          }}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-black rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center justify-center gap-1.5 self-center sm:self-auto shadow-sm"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'قفل لوحة الإدارة 🔒' : 'Lock Admin Panel 🔒'}</span>
        </button>
      </div>

      {/* Quick Database & Simulator Reset Panel */}
      <div className="bg-red-50 border border-red-200 rounded-3xl p-5 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-800">
        <div className="space-y-1 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
          <h4 className="text-sm font-black text-red-900 flex items-center gap-2 justify-center sm:justify-start">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span>{lang === 'ar' ? 'أداة تنظيف وضبط قاعدة البيانات (Firebase)' : 'Firebase Database Cleanup Tool'}</span>
          </h4>
          <p className="text-xs text-slate-600 font-semibold">
            {lang === 'ar' 
              ? 'يقوم هذا الخيار بمسح كافة سجلات الطلبات النشطة، العروض والمحادثات من Firestore لإعادة تشغيل النظام من الصفر.' 
              : 'This option clears all active requests, technician bids, and chat transcripts from Firestore to allow clean testing.'}
          </p>
        </div>
        <button 
          onClick={resetSimulation}
          className="px-5 py-3 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-red-600/10 transition-all shrink-0 cursor-pointer"
        >
          {lang === 'ar' ? 'تفريغ Firestore وضبط النظام 🗑️' : 'Clear Firestore & Reset 🗑️'}
        </button>
      </div>

      {/* Real-time Domain Connection & Website Trust Panel */}
      {TrustPortal && (
        <TrustPortal 
          lang={lang === 'he' ? 'en' : lang} 
          triggerToast={triggerToast} 
          customDomain={customDomain}
          setCustomDomain={setCustomDomain}
        />
      )}

      {/* Real-time SMTP Connection & Diagnostics Panel */}
      {SmtpConfigPanel && (
        <SmtpConfigPanel 
          lang={lang}
          status={smtpStatus}
          onRefresh={fetchSmtpStatus}
          triggerToast={triggerToast}
        />
      )}

      {/* Real-time WhatsApp Connection & Diagnostics Panel */}
      {WhatsAppConfigPanel && (
        <WhatsAppConfigPanel 
          lang={lang}
          status={whatsAppStatus}
          onRefresh={fetchWhatsAppStatus}
          triggerToast={triggerToast}
        />
      )}

      {/* ========================================================= */}
      {/* 1. STORE PRODUCTS CONTROL PANEL (إدارة وتعديل منتجات المتجر) */}
      {/* ========================================================= */}
      <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-6 text-slate-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1 text-right rtl:text-right ltr:text-left">
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-500" />
              <span>{lang === 'ar' ? 'لوحة إدارة وتعديل منتجات المتجر 🛒' : 'Store Products Management Panel 🛒'}</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              {lang === 'ar' ? 'إضافة قطع غيار جديدة، تعديل الأسعار والتفاصيل والصور، أو إزالة منتج مع تحكم كامل بالمخزون.' : 'Add, edit details/price/images, or delete store products in real-time.'}
            </p>
          </div>
          <span className="px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs font-black rounded-full shrink-0">
            {lang === 'ar' ? `إجمالي المنتجات: ${products.length}` : `Total Products: ${products.length}`}
          </span>
        </div>

        {/* Add Product Form */}
        <form onSubmit={handleAddProduct} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-right rtl:text-right ltr:text-left">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-amber-500" />
            <span>{lang === 'ar' ? 'إضافة منتج جديد للمتجر' : 'Add New Product to Store'}</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">
                {lang === 'ar' ? 'اسم المنتج *' : 'Product Title *'}
              </label>
              <input
                type="text"
                required
                value={newProdTitle}
                onChange={(e) => setNewProdTitle(e.target.value)}
                placeholder={lang === 'ar' ? 'مثال: بطارية 60 أمبير جافة' : 'e.g., Car Battery 60Ah'}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Price */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">
                {lang === 'ar' ? 'السعر (شيقل ₪) *' : 'Price (ILS ₪) *'}
              </label>
              <input
                type="number"
                required
                min="1"
                value={newProdPrice}
                onChange={(e) => setNewProdPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">
                {lang === 'ar' ? 'الفئة' : 'Category'}
              </label>
              <select
                value={newProdCategory}
                onChange={(e) => setNewProdCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="معدات طوارئ">{lang === 'ar' ? 'معدات طوارئ' : 'Emergency'}</option>
                <option value="بطاريات">{lang === 'ar' ? 'بطاريات' : 'Batteries'}</option>
                <option value="صيانة إطارات">{lang === 'ar' ? 'صيانة إطارات' : 'Tyres'}</option>
                <option value="أدوات فحص">{lang === 'ar' ? 'أدوات فحص' : 'Diagnostics'}</option>
                <option value="زيوت وفلاتر">{lang === 'ar' ? 'زيوت وفلاتر' : 'Oil & Maintenance'}</option>
                <option value="إكسسوارات">{lang === 'ar' ? 'إكسسوارات' : 'Accessories'}</option>
              </select>
            </div>

            {/* Image URL */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500">
                {lang === 'ar' ? 'رابط صورة المنتج (اختياري)' : 'Image URL (Optional)'}
              </label>
              <input
                type="url"
                value={newProdImage}
                onChange={(e) => setNewProdImage(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500">
              {lang === 'ar' ? 'وصف المنتج والتفاصيل' : 'Description'}
            </label>
            <input
              type="text"
              value={newProdDescription}
              onChange={(e) => setNewProdDescription(e.target.value)}
              placeholder={lang === 'ar' ? 'تفاصيل الضمان، الحجم، أو المميزات الرئيسية...' : 'Warranty, size, or key specifications...'}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isAddingProduct}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingProduct ? (lang === 'ar' ? 'جاري الإضافة...' : 'Adding...') : (lang === 'ar' ? 'إضافة المنتج للمتجر 🛍️' : 'Add Product to Store 🛍️')}</span>
            </button>
          </div>
        </form>

        {/* Existing Products List Table/Grid */}
        <div className="space-y-4 text-right rtl:text-right ltr:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
              {lang === 'ar' ? 'المنتجات المعروضة حالياً بالمتجر (انقر لتعديل أي عنصر أو حذفه):' : 'Currently Available Products:'}
            </h4>

            {/* Filter Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث بالمنتجات...' : 'Search products...'}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>

          {products.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              {lang === 'ar' ? 'لا توجد منتجات مسجلة بالمتجر حالياً.' : 'No products currently registered in store.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {products
                .filter(p => (p.arTitle || p.title).toLowerCase().includes(productSearch.toLowerCase()))
                .map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3 relative group hover:border-amber-400 transition-all shadow-sm"
                  >
                    <img
                      src={p.image || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&q=80'}
                      alt={p.title}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 bg-slate-200"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-black text-slate-900 truncate">
                        {p.arTitle || p.title}
                      </div>
                      <div className="text-xs font-extrabold text-amber-600 font-mono">
                        {p.price} ₪
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <span>{p.arCategory || p.category}</span>
                        <span>•</span>
                        <span className={p.inStock !== false ? 'text-emerald-600' : 'text-red-500'}>
                          {p.inStock !== false ? 'متوفر' : 'غير متوفر'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Edit & Delete */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditingProduct(p)}
                        title={lang === 'ar' ? 'تعديل تفاصيل المنتج' : 'Edit product details'}
                        className="p-2 text-amber-600 hover:text-white hover:bg-amber-500 rounded-xl transition-all cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.arTitle || p.title)}
                        title={lang === 'ar' ? 'إزالة المنتج من المتجر' : 'Delete product from store'}
                        className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl border border-slate-200 text-right rtl:text-right ltr:text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">
                  {lang === 'ar' ? 'تعديل بيانات المنتج بالمتجر ✏️' : 'Edit Store Product Details ✏️'}
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProductEdit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">{lang === 'ar' ? 'اسم المنتج *' : 'Product Name *'}</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">{lang === 'ar' ? 'السعر (شيقل ₪) *' : 'Price (ILS ₪) *'}</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700">{lang === 'ar' ? 'الفئة' : 'Category'}</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="معدات طوارئ">معدات طوارئ</option>
                    <option value="بطاريات">بطاريات</option>
                    <option value="صيانة إطارات">صيانة إطارات</option>
                    <option value="أدوات فحص">أدوات فحص</option>
                    <option value="زيوت وفلاتر">زيوت وفلاتر</option>
                    <option value="إكسسوارات">إكسسوارات</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">{lang === 'ar' ? 'رابط الصورة' : 'Image URL'}</label>
                <input
                  type="url"
                  value={editImage}
                  onChange={(e) => setEditImage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-slate-700">{lang === 'ar' ? 'الوصف والتفاصيل' : 'Description'}</label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {/* Stock Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold">
                <span>{lang === 'ar' ? 'حالة التوفر بالمخزن:' : 'Stock Availability:'}</span>
                <button
                  type="button"
                  onClick={() => setEditInStock(!editInStock)}
                  className={`px-4 py-1.5 rounded-full font-black text-xs transition-all cursor-pointer ${
                    editInStock ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  }`}
                >
                  {editInStock ? (lang === 'ar' ? 'متوفر 🟢' : 'In Stock 🟢') : (lang === 'ar' ? 'غير متوفر 🔴' : 'Out of Stock 🔴')}
                </button>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSavingEdit ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات 💾' : 'Save Changes 💾')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. STORE INCOMING ORDERS MANAGEMENT (لوحة طلبات المتجر الواردة) */}
      {/* ========================================================= */}
      <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-6 text-slate-900">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1 text-right rtl:text-right ltr:text-left">
            <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <span>{lang === 'ar' ? 'لوحة متابعة طلبات المتجر الواردة والتفاصيل الشخصية 📦' : 'Store Orders & Customer Details Panel 📦'}</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold">
              {lang === 'ar' ? 'متابعة تفاصيل المشتري، العناوين، المنتجات المطلوبة، وتحديث حالة الشحن والتسليم مباشر.' : 'Monitor buyer contact info, delivery address, items list, and update order status.'}
            </p>
          </div>

          {/* Stats Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="px-3 py-1.5 bg-slate-900 text-amber-400 rounded-xl font-mono">
              {lang === 'ar' ? `إجمالي الطلبات: ${storeOrders.length}` : `Total Orders: ${storeOrders.length}`}
            </span>
            <span className="px-3 py-1.5 bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-xl font-mono">
              {lang === 'ar' ? `قيد المعالجة: ${pendingOrdersCount}` : `Pending: ${pendingOrdersCount}`}
            </span>
            <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 rounded-xl font-mono">
              {lang === 'ar' ? `المبيعات: ${totalStoreRevenue} ₪` : `Revenue: ${totalStoreRevenue} ₪`}
            </span>
          </div>
        </div>

        {/* Search & Status Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={storeOrderSearch}
              onChange={(e) => setStoreOrderSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث باسم المشتري، رقم الهاتف، رقم الطلب، أو المدينة...' : 'Search customer name, phone, order ID, or address...'}
              className="w-full pr-9 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
            {[
              { id: 'all', label: lang === 'ar' ? 'الكل 📦' : 'All' },
              { id: 'pending', label: lang === 'ar' ? 'قيد المراجعة 🟡' : 'Pending' },
              { id: 'processing', label: lang === 'ar' ? 'جاري التحضير 🔵' : 'Processing' },
              { id: 'shipped', label: lang === 'ar' ? 'تم الشحن 🚚' : 'Shipped' },
              { id: 'delivered', label: lang === 'ar' ? 'تم التسليم 🟢' : 'Delivered' },
              { id: 'cancelled', label: lang === 'ar' ? 'ملغي 🔴' : 'Cancelled' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStoreOrderStatusFilter(tab.id)}
                className={`px-3 py-2 rounded-xl font-extrabold shrink-0 cursor-pointer transition-all ${
                  storeOrderStatusFilter === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Cards List */}
        {filteredStoreOrders.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-400">
              {lang === 'ar' ? 'لا توجد طلبات متجر مسجلة حالياً تطابق الفرز والبحث.' : 'No store orders found matching criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStoreOrders.map((ord) => {
              const paymentLabel = ord.paymentMethod === 'cash' 
                ? (lang === 'ar' ? 'نقداً عند الاستلام 💵' : 'Cash on Delivery 💵')
                : ord.paymentMethod === 'card'
                ? (lang === 'ar' ? 'بطاقة ائتمان 💳' : 'Credit Card 💳')
                : (lang === 'ar' ? 'محفظة Escrow 🔒' : 'Escrow Vault 🔒');

              return (
                <div
                  key={ord.id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 hover:border-amber-400 transition-all shadow-sm text-right rtl:text-right ltr:text-left"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-900 text-amber-400 font-mono font-black text-xs rounded-lg">
                        #{ord.id}
                      </span>
                      <span className="text-xs text-slate-500 font-bold">
                        {ord.createdAtFormatted || new Date(ord.createdAt).toLocaleString()}
                      </span>
                    </div>

                    {/* Status Update Dropdown/Buttons */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500">{lang === 'ar' ? 'تحديث الحالة:' : 'Status:'}</span>
                      <select
                        value={ord.status}
                        onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value as StoreOrderStatus)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-extrabold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-amber-500"
                      >
                        <option value="pending">🟡 {lang === 'ar' ? 'قيد المراجعة (Pending)' : 'Pending'}</option>
                        <option value="processing">🔵 {lang === 'ar' ? 'جاري التحضير (Processing)' : 'Processing'}</option>
                        <option value="shipped">🚚 {lang === 'ar' ? 'تم الشحن والتوصيل (Shipped)' : 'Shipped'}</option>
                        <option value="delivered">🟢 {lang === 'ar' ? 'تم التسليم بنجاح (Delivered)' : 'Delivered'}</option>
                        <option value="cancelled">🔴 {lang === 'ar' ? 'إلغاء الطلب (Cancelled)' : 'Cancelled'}</option>
                      </select>

                      <button
                        onClick={() => handleDeleteStoreOrder(ord.id)}
                        title={lang === 'ar' ? 'حذف الطلب نهائياً' : 'Delete order'}
                        className="p-2 text-red-500 hover:text-white hover:bg-red-500 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Customer Personal Info Card */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'اسم المشتري:' : 'Customer Name:'}</span>
                      <span className="font-extrabold text-slate-900 text-sm">{ord.customerName}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'الهاتف والواتساب:' : 'Phone & WhatsApp:'}</span>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="font-mono font-black text-slate-900">{ord.customerPhone}</span>
                        <a
                          href={`https://wa.me/${ord.customerPhone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-lg transition-all"
                        >
                          واتساب 💬
                        </a>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'عنوان التوصيل:' : 'Delivery Address:'}</span>
                      <span className="font-bold text-slate-800">{ord.customerAddress}</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'طريقة التسديد:' : 'Payment:'}</span>
                      <span className="font-extrabold text-amber-700">{paymentLabel}</span>
                    </div>

                    {ord.notes && (
                      <div className="md:col-span-4 pt-2 border-t border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 block">{lang === 'ar' ? 'ملاحظات العميل والتوصيل:' : 'Customer Notes:'}</span>
                        <p className="text-slate-700 font-semibold text-xs bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                          {ord.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Items Breakdown Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-black text-slate-800 block">{lang === 'ar' ? 'قائمة المنتجات والمعدات المطلوبة:' : 'Ordered Items:'}</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {ord.items?.map((item, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs">
                          <img src={item.image} alt={item.title} className="w-11 h-11 rounded-lg object-cover bg-slate-100 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="font-extrabold text-slate-900 truncate">{item.arTitle || item.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono pt-0.5">
                              {item.price} ₪ × {item.quantity} = <span className="font-black text-amber-600">{item.price * item.quantity} ₪</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer Total */}
                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-black">
                    <span className="text-slate-600">{lang === 'ar' ? 'المبلغ الإجمالي المطلق للطلب:' : 'Total Amount:'}</span>
                    <span className="text-lg font-mono text-amber-600 font-black">{ord.totalAmount} ₪</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. DISPUTES & ESCROW HOLDINGS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Active Escrow Holdings list */}
        <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
          <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" />
            <span>{t.adminActiveEscrows || (lang === 'ar' ? 'الودائع المعلقة والضمانات المالية النشطة' : 'Active Escrow Holdings')}</span>
          </h3>

          {escrows.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-10 font-semibold">
              {t.adminNoEscrows || (lang === 'ar' ? 'لا توجد أي ودائع مالية معلقة حالياً.' : 'No active escrows currently.')}
            </p>
          ) : (
            <div className="space-y-3">
              {escrows.map(esc => (
                <div key={esc.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-1 text-right">
                    <div className="font-bold text-slate-800">{esc.serviceType}</div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {lang === 'ar' ? `العميل: ${esc.clientName} | الفني: ${esc.techName}` : `Client: ${esc.clientName} | Tech: ${esc.techName}`}
                    </div>
                  </div>
                  <div className="text-left space-y-1">
                    <div className="font-mono text-amber-600 font-extrabold">{esc.amount} ₪</div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      esc.status === 'escrowed' ? 'bg-amber-100 text-amber-700' :
                      esc.status === 'released' ? 'bg-emerald-100 text-emerald-700' :
                      esc.status === 'refunded' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {esc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registered Users Section */}
        <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-500" />
              <span>{lang === 'ar' ? 'المستخدمين المسجلين بالشبكة' : 'Registered Users Network'}</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
              {lang === 'ar' ? `المجموع: ${registeredUsers.length}` : `Total: ${registeredUsers.length}`}
            </span>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input 
              type="text"
              placeholder={lang === 'ar' ? 'بحث بالاسم، الإيميل أو الهاتف...' : 'Search by name, email or phone...'}
              value={adminUserSearch}
              onChange={(e) => setAdminUserSearch(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-xs text-slate-800 text-right rtl:text-right"
            />
            <select
              value={adminUserRoleFilter}
              onChange={(e) => setAdminUserRoleFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-xs text-slate-800 text-right rtl:text-right"
            >
              <option value="all">{lang === 'ar' ? 'جميع الأدوار' : 'All Roles'}</option>
              <option value="client">{lang === 'ar' ? 'العملاء' : 'Clients'}</option>
              <option value="technician">{lang === 'ar' ? 'الفنيين' : 'Technicians'}</option>
              <option value="unassigned">{lang === 'ar' ? 'غير معين' : 'Unassigned'}</option>
            </select>
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-3 pr-1">
            {registeredUsers.filter(u => {
              const matchesSearch = 
                u.name?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                u.email?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                (u.phone && u.phone.toLowerCase().includes(adminUserSearch.toLowerCase()));
              
              if (!matchesSearch) return false;
              if (adminUserRoleFilter === 'all') return true;
              if (adminUserRoleFilter === 'client') return u.role === 'client';
              if (adminUserRoleFilter === 'technician') return u.role === 'technician';
              if (adminUserRoleFilter === 'unassigned') return !u.role;
              return true;
            }).length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-10 font-semibold">
                {lang === 'ar' ? 'لا يوجد أي مستخدمين يطابقون خيارات البحث حالياً!' : 'No registered users match search!'}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {registeredUsers.filter(u => {
                  const matchesSearch = 
                    u.name?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                    u.email?.toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                    (u.phone && u.phone.toLowerCase().includes(adminUserSearch.toLowerCase()));
                  
                  if (!matchesSearch) return false;
                  if (adminUserRoleFilter === 'all') return true;
                  if (adminUserRoleFilter === 'client') return u.role === 'client';
                  if (adminUserRoleFilter === 'technician') return u.role === 'technician';
                  if (adminUserRoleFilter === 'unassigned') return !u.role;
                  return true;
                }).map(u => (
                  <div key={u.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between gap-3 text-right">
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'client' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          u.role === 'technician' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {u.role === 'client' ? (lang === 'ar' ? 'عميل' : 'Client') :
                           u.role === 'technician' ? (lang === 'ar' ? 'فني فزعة' : 'Technician') :
                           (lang === 'ar' ? 'ضيف' : 'Guest')}
                        </span>
                        <h4 className="text-xs font-black text-slate-800">{u.name || 'Anonymous'}</h4>
                      </div>
                      <p className="text-[10px] font-mono text-slate-500 truncate">{u.email}</p>
                      {u.phone && (
                        <p className="text-[10px] text-slate-600 font-bold">{u.phone}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={async () => {
                          await setDoc(doc(db, "users", u.id), { role: u.role === 'client' ? null : 'client' }, { merge: true });
                          triggerToast(
                            lang === 'ar' ? 'تم تحديث دور المستخدم!' : 'User role updated!',
                            'success'
                          );
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[9px] transition-colors border cursor-pointer ${
                          u.role === 'client' 
                            ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-300' 
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {u.role === 'client' ? (lang === 'ar' ? 'إلغاء كعميل' : 'Revoke Client') : (lang === 'ar' ? 'تعيين كعميل' : 'Set Client')}
                      </button>
                      <button 
                        onClick={async () => {
                          await setDoc(doc(db, "users", u.id), { role: u.role === 'technician' ? null : 'technician' }, { merge: true });
                          triggerToast(
                            lang === 'ar' ? 'تم تحديث دور الفني!' : 'User role updated!',
                            'success'
                          );
                        }}
                        className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-[9px] transition-colors border cursor-pointer ${
                          u.role === 'technician' 
                            ? 'bg-amber-100 hover:bg-amber-200 text-amber-700 border-amber-300' 
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {u.role === 'technician' ? (lang === 'ar' ? 'إلغاء كفني' : 'Revoke Tech') : (lang === 'ar' ? 'تعيين كفني' : 'Set Tech')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Row 2: Service management lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">

        {/* Proposed Custom Services List Section */}
        <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-amber-500" />
              <span>{lang === 'ar' ? 'الخدمات الخاصة المقترحة والموافقة' : 'Proposed Custom Services'}</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
              {lang === 'ar' ? `المقترح: ${pendingServices.length} | النشط: ${activeServices.length}` : `Pending: ${pendingServices.length} | Active: ${activeServices.length}`}
            </span>
          </div>

          {/* Quick Search across Services */}
          <div className="relative">
            <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder={lang === 'ar' ? 'البحث في الخدمات النشطة والمسجلة بالسيستم...' : 'Search active customized services...'}
              value={adminServiceSearch}
              onChange={(e) => setAdminServiceSearch(e.target.value)}
              className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-500 text-xs text-slate-800 text-right rtl:text-right"
            />
          </div>

          <div className="space-y-6">
            
            {/* Active Services sub-list */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                {lang === 'ar' ? 'الخدمات النشطة المتوفرة للعملاء بالشبكة' : 'Active Custom Services in App'}
              </h4>
              {activeServices.filter(s => s.name?.toLowerCase().includes(adminServiceSearch.toLowerCase()) || s.description?.toLowerCase().includes(adminServiceSearch.toLowerCase())).length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-4 font-semibold">
                  {lang === 'ar' ? 'لا توجد خدمات نشطة تطابق البحث.' : 'No active services matching criteria.'}
                </p>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {activeServices.filter(s => s.name?.toLowerCase().includes(adminServiceSearch.toLowerCase()) || s.description?.toLowerCase().includes(adminServiceSearch.toLowerCase())).map(srv => (
                    <div key={srv.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-xs text-right">
                      <div className="space-y-1">
                        <div className="font-extrabold text-slate-800 flex items-center gap-1.5 justify-end">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          <span>{srv.name}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-1">{srv.description}</p>
                        <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{srv.price}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteActiveService(srv.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200 cursor-pointer shrink-0"
                        title={lang === 'ar' ? 'حذف الخدمة' : 'Delete Service'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Proposed Custom Requests (Awaiting Admin review) */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1">
                {lang === 'ar' ? 'مقترحات قيد المراجعة والموافقة ⏳' : 'Custom Proposals Awaiting Approval ⏳'}
              </h4>
              {pendingServices.length === 0 ? (
                <div className="text-center py-6 text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                  <CheckCircle2 className="w-8 h-8 text-slate-300" />
                  <p className="text-[11px] font-bold">
                    {lang === 'ar' ? 'لا توجد طلبات جديدة مقترحة حالياً.' : 'No new custom service proposals awaiting review.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {pendingServices.map(srv => (
                    <div key={srv.id} className="p-4 bg-amber-50/40 border border-amber-200/50 rounded-2xl flex flex-col justify-between gap-3 text-right">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-amber-100 pb-2">
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                            {srv.price}
                          </span>
                          <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping shrink-0"></span>
                            <span>{srv.name}</span>
                          </h4>
                        </div>
                        <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                          {srv.description}
                        </p>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {lang === 'ar' ? `بواسطة: ${srv.clientName || 'غير معروف'} | هاتف: ${srv.phone || 'غير متوفر'}` : `By: ${srv.clientName || 'Anonymous'} | Phone: ${srv.phone || 'N/A'}`}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => handleApprovePendingService(srv.id, srv)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] rounded-xl shadow-md shadow-emerald-600/10 transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'موافقة ونشر بالشبكة' : 'Approve & Publish'}</span>
                        </button>
                        <button
                          onClick={() => handleRejectPendingService(srv.id)}
                          className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 border border-red-500/20 font-bold text-[10px] rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'رفض' : 'Reject'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Website Support Tickets & Complaints Section */}
        <div className="p-6 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>{lang === 'ar' ? 'بلاغات الأعطال والشكاوى' : 'Support Tickets & Complaints'}</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-bold">
              {lang === 'ar' ? `العدد: ${websiteIssues.length}` : `Count: ${websiteIssues.length}`}
            </span>
          </div>

          {websiteIssues.length === 0 ? (
            <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center gap-2 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/45 animate-pulse" />
              <p className="text-xs font-semibold">
                {lang === 'ar' ? 'كل شيء يعمل بامتياز! لا توجد شكاوى مسجلة حالياً 🎉' : 'Everything is perfect! No active complaints recorded. 🎉'}
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              {websiteIssues.map(issue => (
                <div key={issue.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col justify-between gap-3 text-right">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[9px] text-slate-500 font-semibold font-mono">
                        {issue.createdAt?.seconds 
                          ? new Date(issue.createdAt.seconds * 1000).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour12: true, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                          : (lang === 'ar' ? 'الآن' : 'Now')}
                      </span>
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping shrink-0"></span>
                        <span>{issue.name || 'Anonymous'}</span>
                      </h4>
                    </div>
                    
                    <p className="text-xs text-slate-700 font-bold leading-relaxed whitespace-pre-wrap">
                      {issue.issue}
                    </p>

                    {(issue.phone && issue.phone !== 'Not Provided') && (
                      <div className="flex items-center justify-end gap-1 text-[10px] text-amber-600 font-extrabold font-mono" dir="ltr">
                        <span>{issue.phone}</span>
                        <Phone className="w-3 h-3 shrink-0" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      onClick={() => handleDeleteWebsiteIssue(issue.id)}
                      className="py-1.5 px-3 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 text-red-600 text-[10px] font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'حل المشكلة وحذف البلاغ' : 'Resolve & Delete Report'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
