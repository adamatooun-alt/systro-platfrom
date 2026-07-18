import React, { useState } from 'react';
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
  Briefcase
} from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

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
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
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

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 animate-fade-in space-y-8 bg-slate-50 text-slate-900 rounded-3xl border border-slate-200 shadow-2xl my-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10 border-b border-slate-200 pb-6 text-slate-900">
        <div className="space-y-2 text-center sm:text-right rtl:sm:text-right ltr:sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center sm:justify-start">
            <h2 className="text-2xl font-black text-slate-900">{t.adminTitle || (lang === 'ar' ? 'بوابة الإدارة والرقابة المالية لـ سيسترو' : 'Systro Admin Portal')}</h2>
            {/* Verified Domain Badge - Relocated to Administration Portal */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold shrink-0 shadow-sm select-none">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shrink-0"></span>
              <span>{lang === 'ar' ? `نطاق موثق: ${customDomain}` : `Verified Domain: ${customDomain}`}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-semibold">{lang === 'ar' ? 'فصل وتحكيم المنازعات المالية والودائع المعلقة لحل الخلافات بين العملاء والفنيين.' : 'Arbitrate active disputes, refund clients, or dispatch technician escrow payouts manually.'}</p>
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
