import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  ShieldCheck, 
  AlertTriangle, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Wrench, 
  Lock, 
  Lightbulb, 
  ThumbsUp,
  MessageSquare,
  Phone,
  Send,
  HeartHandshake
} from 'lucide-react';
import { ServiceType, SystemStats } from '../types';

interface HomeTabProps {
  lang: 'ar' | 'en' | 'he';
  isLoggedIn: boolean;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  userRole: 'client' | 'technician' | 'guest' | null;
  setUserRole: (role: 'client' | 'technician' | 'guest' | null) => void;
  setActiveTab: (tab: string) => void;
  t: any;
  stats: SystemStats;
  servicesList: Array<{
    id: ServiceType;
    name: string;
    desc: string;
    icon: React.ComponentType<any>;
    color: string;
    basePrice: number;
  }>;
  setSelectedService: (id: ServiceType) => void;
  enteredName: string;
  setEnteredName: (name: string) => void;
  enteredEmail: string;
  setEnteredEmail: (email: string) => void;
  handleGoogleSignIn: (email: string, name: string) => Promise<void>;
  triggerToast: (text: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  loggedInUserName: string;
}

export default function HomeTab({
  lang,
  isLoggedIn,
  setIsLoggedIn,
  userRole,
  setUserRole,
  setActiveTab,
  t,
  stats,
  servicesList,
  setSelectedService,
  enteredName,
  setEnteredName,
  enteredEmail,
  setEnteredEmail,
  handleGoogleSignIn,
  triggerToast,
  loggedInUserName,
}: HomeTabProps) {
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterIssue, setReporterIssue] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterIssue.trim()) {
      triggerToast(
        lang === 'ar' 
          ? 'الرجاء كتابة تفاصيل المشكلة أولاً!' 
          : 'Please enter the details of the issue first!', 
        'warning'
      );
      return;
    }

    setIsSubmittingIssue(true);
    try {
      await addDoc(collection(db, "website_issues"), {
        name: reporterName.trim() || 'Anonymous',
        phone: reporterPhone.trim() || 'Not Provided',
        issue: reporterIssue.trim(),
        createdAt: serverTimestamp()
      });

      triggerToast(
        lang === 'ar' 
          ? '✅ تم إرسال البلاغ بنجاح! شكراً لمساعدتنا في تحسين شبكة سيسترو.' 
          : '✅ Issue submitted successfully! Thank you for helping us improve Systro.', 
        'success'
      );

      // Reset form
      setReporterName('');
      setReporterPhone('');
      setReporterIssue('');
    } catch (error: any) {
      console.error("Error submitting website issue:", error);
      triggerToast(
        lang === 'ar' 
          ? '❌ عذراً، فشل إرسال البلاغ. الرجاء المحاولة مجدداً.' 
          : '❌ Sorry, failed to submit issue. Please try again.', 
        'error'
      );
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  return (
    <div className="animate-fade-in">
      
      {/* Main Hero Header Section */}
      <section className="relative overflow-hidden pt-12 md:pt-24 pb-16 md:pb-32 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Ambient glows */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>

        <div className="text-center space-y-6 max-w-4xl mx-auto">
          {/* Pre-heading Gold Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] md:text-xs font-bold text-amber-500 leading-none select-none tracking-wide">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse-ring"></span>
            <span>{t.heroPre}</span>
          </div>

          {/* Bold Typography matching Image 7 */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
            {t.heroTitle1} <br className="md:hidden" />
            <span className="text-amber-500 underline decoration-amber-500/20 decoration-wavy">{t.heroTitleHighlighted}</span> {t.heroTitle2}
          </h2>

          {/* Paragraph details */}
          <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-3xl mx-auto font-medium">
            {t.heroDesc}
          </p>

          {/* Main Requested Dual-Action Service Buttons (عميل مقطوع vs مقدم خدمة صناعي) */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-center gap-5 max-w-2xl mx-auto">
            {/* Action 1: عميل مقطوع */}
            <button 
              onClick={() => {
                setIsLoggedIn(true);
                setUserRole('client');
                setActiveTab('simulator');
                triggerToast(
                  lang === 'ar' 
                    ? 'أهلاً بك! تم التوجيه كعميل مقطوع - تفضل بتحديد موقعك لطلب الفنيين فورا.' 
                    : lang === 'he'
                    ? 'ברוך הבא! מצב לקוח תקוע הופעל - אנא בחר מיקום להזמנת סיוע מיידי.'
                    : 'Welcome! Stranded Client mode is active - please select your location to request assistance.', 
                  'success'
                );
              }}
              className="w-full md:flex-1 h-16 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black rounded-2xl shadow-xl shadow-amber-500/15 hover:scale-105 transition-all text-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-xl">🚗</span>
              <span className="font-black text-base">{lang === 'ar' ? 'عميل مقطوع' : lang === 'he' ? 'לקוח תקוע' : 'Stranded Client'}</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>

            {/* Action 2: مقدم خدمة صناعي */}
            <button 
              onClick={() => {
                setIsLoggedIn(true);
                setUserRole('technician');
                setActiveTab('simulator');
                triggerToast(
                  lang === 'ar' 
                    ? 'أهلاً بك! تم التوجيه كمقدم خدمة صناعي - يمكنك الآن تصفح طلبات العملاء وتقديم الأسعار.' 
                    : lang === 'he'
                    ? 'ברוך הבא! מצב ספק שירות הופעל - כעת תוכל להגיש הצעות מחיר ללקוחות.'
                    : 'Welcome! Industrial Provider mode is active - you can now view requests and submit bids.', 
                  'success'
                );
              }}
              className="w-full md:flex-1 h-16 bg-[#111827]/90 hover:bg-[#1E293B]/90 text-white font-black rounded-2xl border border-gray-800 shadow-xl hover:scale-105 transition-all text-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-xl">🛠️</span>
              <span className="font-black text-base">{lang === 'ar' ? 'مقدم خدمة صناعي' : lang === 'he' ? 'ספק שירות תעשייתי' : 'Industrial Service Provider'}</span>
              <ChevronRight className="w-5 h-5 shrink-0 text-gray-400" />
            </button>
          </div>

          {/* Tag Checklist */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs font-bold text-gray-400 select-none">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
              <span>{t.bulletEscrow}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-amber-500" />
              <span>{t.bulletEta}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4.5 h-4.5 text-blue-500" />
              <span>{t.bulletVerified}</span>
            </div>
          </div>
        </div>
      </section>

      {/* DYNAMIC REAL-TIME STATS PANEL (Image 6 layout) */}
      <section className="border-y border-[#1E293B]/60 bg-[#0A0B10]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-y-2 lg:divide-y-0 lg:divide-x-2 lg:divide-x-reverse divide-[#1E293B]/40">
            
            {/* Active Technicians */}
            <div className="text-center space-y-2 p-4 lg:p-0">
              <div className="text-4xl md:text-5xl font-black text-amber-500 font-mono tracking-tight">
                {stats.activeTechnicians} / {stats.maxTechnicians}
              </div>
              <div className="text-xs md:text-sm font-bold text-gray-400">
                {t.statActiveTechs}
              </div>
            </div>

            {/* Completed Rescues */}
            <div className="text-center space-y-2 p-4 lg:p-0 pt-8 lg:pt-0">
              <div className="text-4xl md:text-5xl font-black text-white font-mono tracking-tight">
                {stats.completedRescues}
              </div>
              <div className="text-xs md:text-sm font-bold text-gray-400">
                {t.statCompletedRescues}
              </div>
            </div>

            {/* Satisfaction Rate */}
            <div className="text-center space-y-2 p-4 lg:p-0">
              <div className="text-4xl md:text-5xl font-black text-blue-400 font-mono tracking-tight">
                {stats.satisfactionRate}%
              </div>
              <div className="text-xs md:text-sm font-bold text-gray-400">
                {t.statSatisfaction}
              </div>
            </div>

            {/* Active Emergencies */}
            <div className="text-center space-y-2 p-4 lg:p-0 pt-8 lg:pt-0">
              <div className="text-4xl md:text-5xl font-black text-emerald-400 font-mono tracking-tight">
                {stats.activeEmergencies}
              </div>
              <div className="text-xs md:text-sm font-bold text-gray-400">
                {t.statActiveEmergencies}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ROAD SERVICES DESCRIPTION & GRID (Images 4 & 5) */}
      <section className="py-16 md:py-28 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="space-y-4 text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs md:text-sm font-black uppercase text-amber-500 tracking-wider block">
            {t.servicesHeader}
          </span>
          <h3 className="text-2xl md:text-4xl font-black text-white">
            {t.servicesTitle}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed font-medium">
            {t.servicesSub}
          </p>
        </div>

        {/* Grid display */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesList.map(service => {
            const IconComponent = service.icon;
            return (
              <div 
                key={service.id} 
                onClick={() => {
                  setSelectedService(service.id);
                  if (isLoggedIn) {
                    setActiveTab('simulator');
                  } else {
                    const element = document.getElementById('login-portal-section');
                    if (element) element.scrollIntoView({ behavior: 'smooth' });
                    triggerToast(lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً لطلب الخدمة المباشرة!' : 'Please sign in first to submit a live rescue request!', 'info');
                  }
                }}
                className="p-6 bg-[#0F1424]/60 hover:bg-[#0F1424]/90 border border-gray-800 hover:border-gray-700 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col justify-between group h-64"
              >
                <div className="space-y-4">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${service.color}`}>
                    <IconComponent className="w-6 h-6" />
                  </div>

                  {/* Header */}
                  <h4 className="text-base md:text-lg font-black text-white group-hover:text-amber-500 transition-colors">
                    {service.name}
                  </h4>

                  {/* Desc */}
                  <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-medium">
                    {service.desc}
                  </p>
                </div>

                <div className="text-xs font-bold text-amber-500 flex items-center gap-1.5 self-end">
                  <span>{lang === 'ar' ? 'جرب الخدمة الآن' : 'Test service now'}</span>
                  <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FINANCIAL INNOVATION & ESCROW SAFEKEEPING (Images 2 & 3) */}
      <section className="py-16 md:py-24 bg-[#0A0B10] border-t border-gray-900 px-4 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left text instructions (Image 2) */}
          <div className="lg:col-span-5 space-y-6">
            <span className="text-xs md:text-sm font-black text-amber-500 uppercase tracking-widest block">
              {t.finPre}
            </span>
            
            <h3 className="text-3xl md:text-4xl font-black text-white leading-tight">
              {t.finTitle}
            </h3>

            <p className="text-sm md:text-base text-gray-400 leading-relaxed font-medium">
              {t.finDesc}
            </p>

            {/* Sub features list */}
            <div className="space-y-4">
              {/* Customer Protection */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#0F1424]/40 border border-gray-900 hover:border-gray-800 transition-colors">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl mt-1">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{t.custProtectionTitle}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">{t.custProtectionDesc}</p>
                </div>
              </div>

              {/* Technician Protection */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#0F1424]/40 border border-gray-900 hover:border-gray-800 transition-colors">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl mt-1">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">{t.techRightTitle}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">{t.techRightDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Escrow Vault graphical model card (Image 3) */}
          <div className="lg:col-span-7 bg-[#111827]/70 border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="absolute -top-3 left-6">
              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {t.vaultSecureBadge}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base md:text-lg font-black text-white">{t.vaultTitle}</h4>
                <p className="text-xs text-gray-400 font-medium">{t.vaultSub}</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* Vault Locked holding simulation display */}
            <div className="p-5 bg-[#0F1424] border border-gray-800 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider">{t.vaultResValue}</span>
                <span className="text-2xl font-black text-white font-mono">150 ₪ <span className="text-xs text-gray-400 font-bold font-sans">({lang === 'ar' ? 'شيكل' : 'Shekel'})</span></span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase">
                  {t.vaultReservedBadge}
                </span>
                <span className="text-xs text-gray-400 font-semibold">{t.vaultAwaiting}</span>
              </div>
            </div>

            {/* 3 columns list detailing payouts - Stack on mobile, grid on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Partner Technician details */}
              <div className="p-4 bg-[#0A0B10] border border-gray-950 rounded-xl text-center space-y-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">{t.vaultPartnerTech}</span>
                <span className="text-xs md:text-sm font-black text-white block truncate">رائد مسعود</span>
              </div>

              {/* Systro Commission */}
              <div className="p-4 bg-[#0A0B10] border border-gray-950 rounded-xl text-center space-y-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">{t.vaultCommission}</span>
                <span className="text-xs md:text-sm font-black text-amber-500 font-mono block">20% (30 ₪)</span>
              </div>

              {/* Net Profit */}
              <div className="p-4 bg-[#0A0B10] border border-gray-950 rounded-xl text-center space-y-1">
                <span className="text-[9px] font-bold text-gray-500 uppercase block">{t.vaultNetEarnings}</span>
                <span className="text-xs md:text-sm font-black text-emerald-400 font-mono block">120 ₪</span>
              </div>
            </div>

            {/* Bulbed mechanism guide */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl flex gap-3 text-xs leading-relaxed text-gray-300 font-medium">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
              <p>
                <span className="font-extrabold text-amber-500">{t.vaultMechanismTitle}: </span>
                {t.vaultMechanismDesc}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* SECURITY PORTAL ACCESS GATE (Dynamic Google Login & Role Choice) */}
      <section id="login-portal-section" className="py-20 md:py-28 bg-[#050505] px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center">
          
          {/* Main Container */}
          <div className="w-full max-w-lg bg-[#0F1424]/60 border border-gray-800 rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl"></div>

            {!isLoggedIn ? (
              /* Unified Gmail Secure Login */
              <div className="space-y-6">
                <div className="space-y-3 text-center">
                  <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h4 className="text-xl font-black text-white">{lang === 'ar' ? 'بوابة التحقق وتسجيل الدخول بحساب Google' : 'Google Secure Sign-In Portal'}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    {lang === 'ar' 
                      ? 'بوابة التحقق الموحدة لشبكة سيسترو. يرجى إدخال بريدك الإلكتروني (Gmail) واسمك للمزامنة الفورية مع السيرفر والتحضير للمهام.' 
                      : 'Unified secure gateway for the Systro rescue network. Please specify your Gmail address and full name to start live map operations.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Name input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'الاسم بالكامل (Google Display Name):' : 'Full Profile Name (Google Name):'}</label>
                    <input 
                      type="text" 
                      required
                      value={enteredName}
                      onChange={(e) => setEnteredName(e.target.value)}
                      placeholder={lang === 'ar' ? 'مثال: أدهم عطون' : 'e.g. Adam Atoun'} 
                      className="w-full px-4 py-3 bg-[#0A0B10] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors"
                    />
                  </div>

                  {/* Gmail input */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">{lang === 'ar' ? 'البريد الإلكتروني لجوجل (Verified Gmail):' : 'Google Gmail Address:'}</label>
                    <input 
                      type="email" 
                      required
                      value={enteredEmail}
                      onChange={(e) => setEnteredEmail(e.target.value)}
                      placeholder="e.g. adam@gmail.com" 
                      className="w-full px-4 py-3 bg-[#0A0B10] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-mono text-xs transition-colors"
                    />
                  </div>

                  {/* Submit action */}
                  <button 
                    onClick={() => {
                      if (!enteredName.trim() || !enteredEmail.trim()) {
                        triggerToast(lang === 'ar' ? 'الرجاء إدخال الاسم والبريد الإلكتروني للمتابعة!' : 'Please enter your name and email to proceed!', 'warning');
                        return;
                      }
                      if (!enteredEmail.includes('@')) {
                        triggerToast(lang === 'ar' ? 'الرجاء إدخال بريد إلكتروني صحيح!' : 'Please enter a valid email address!', 'warning');
                        return;
                      }
                      handleGoogleSignIn(enteredEmail, enteredName);
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
                  >
                    <span>{lang === 'ar' ? 'دخول فوري وآمن بـ Google Account' : 'Secure Fast Google Sign-In'}</span>
                    <span>→]</span>
                  </button>
                </div>
              </div>
            ) : (
              /* User is logged in, show Role Selection Screen if userRole is null */
              <div className="space-y-6">
                <div className="space-y-2 text-center select-none">
                  <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    {lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Authentication Successful'}
                  </span>
                  <h4 className="text-xl font-black text-white mt-3">
                    {lang === 'ar' ? `مرحباً بك ${loggedInUserName}` : `Welcome ${loggedInUserName}`}
                  </h4>
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    {lang === 'ar' 
                      ? 'لقد سجلت دخولك بحساب Google بنجاح. اختر خيارك الآن للمتابعة (ويمكنك تبديله بأي لحظة في الهيدر):' 
                      : 'Google authentication completed. Select your profile role to launch the workspace (you can switch roles anytime at the header):'}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 select-none">
                  {/* Customer Button Option */}
                  <button 
                    onClick={() => {
                      setUserRole('client');
                      setActiveTab('simulator');
                      triggerToast(lang === 'ar' ? 'تم تفعيل وضع الزبون المقطوع!' : 'Stranded Customer role activated!', 'success');
                    }}
                    className="p-5 bg-[#0A0B10] hover:bg-[#111827] border border-amber-500/30 hover:border-amber-500/70 rounded-2xl text-right flex items-start gap-4 transition-all cursor-pointer group"
                  >
                    <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl group-hover:bg-amber-500/20 transition-colors shrink-0">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-black text-white">{lang === 'ar' ? 'زبون (أنا مقطوع على الطريق وبحاجة لإنقاذ طارئ)' : 'Stranded Client (I need emergency road rescue)'}</h5>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        {lang === 'ar' 
                          ? 'حدد موقعك الجغرافي، اختر نوع العطل، استقبل عروض الأسعار من الفنيين على الخريطة وتحكم بالدفع الآمن عبر خزنة الضمان.' 
                          : 'Pin your location, request help, receive real-time technician bids, and handle payments safely via Escrow.'}
                      </p>
                    </div>
                  </button>

                  {/* Provider Button Option */}
                  <button 
                    onClick={() => {
                      setUserRole('technician');
                      setActiveTab('simulator');
                      triggerToast(lang === 'ar' ? 'تم تفعيل وضع مقدم الخدمات الشريك!' : 'Partner Service Provider role activated!', 'success');
                    }}
                    className="p-5 bg-[#0A0B10] hover:bg-[#111827] border border-blue-500/30 hover:border-blue-500/70 rounded-2xl text-right flex items-start gap-4 transition-all cursor-pointer group"
                  >
                    <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl group-hover:bg-blue-500/20 transition-colors shrink-0">
                      <Wrench className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h5 className="text-sm font-black text-white">{lang === 'ar' ? 'مقدم خدمات (ميكانيكي، كهربائي، صاحب ونش سحب...) ' : 'Service Provider (Mechanic, Electrician, Tow Truck...)'}</h5>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        {lang === 'ar' 
                          ? 'سجل تخصصك، أضف بيانات ومركبة الصيانة الخاصة بك للخريطة، قدم عروض أسعار للعملاء المقطوعين، واستقبل الدفعات.' 
                          : 'Register your trades, list work logs on the road network, bid on nearby emergency alerts, and receive earnings.'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Dynamic Support & Contact Section */}
      <section id="support-contact-section" className="bg-[#0D0F1A] border-t border-gray-900 py-16 px-4 md:px-8 relative overflow-hidden">
        {/* Subtle decorative glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          
          {/* Left Column: Help / Explanatory Copy & Direct Admin Contact */}
          <div className="lg:col-span-5 space-y-6 text-right rtl:text-right ltr:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full text-xs font-bold uppercase tracking-wider">
              <HeartHandshake className="w-4 h-4 text-amber-500" />
              <span>{lang === 'ar' ? 'فريق الدعم والمساندة الفنية' : 'Support & Technical Assistance'}</span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {lang === 'ar' 
                  ? 'هل تواجه أي مشاكل أو أعطال في المنصة؟' 
                  : 'Facing any issues or bugs on the platform?'}
              </h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                {lang === 'ar' 
                  ? 'ملاحظاتك تهمنا كثيراً لتطوير الخدمة! إذا صادفتك أي مشكلة برمجية، تأخير، أو خطأ في النظام، يرجى كتابتها فوراً ليصل تقريرك مباشرة إلى المهندس آدم عطون للمتابعة الفورية.' 
                  : 'Your feedback is extremely valuable to us! If you encounter any software bugs, delays, or system errors, please report them here to reach Eng. Adam Atoun immediately for resolving.'}
              </p>
            </div>

            {/* Direct Contact Card */}
            <div className="bg-[#0A0B10]/90 border border-gray-800 p-6 rounded-3xl space-y-5 shadow-xl">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">
                  {lang === 'ar' ? 'للتواصل الهاتفي الفوري والطارئ:' : 'Direct Phone & Instant WhatsApp:'}
                </h4>
                <p className="text-xs text-gray-500 font-semibold">
                  {lang === 'ar' ? 'يمكنك التحدث مباشرة مع الإدارة والدعم الفني على مدار الساعة.' : 'Get in touch with the management and support team anytime.'}
                </p>
              </div>

              {/* Phone display */}
              <div className="flex items-center gap-3 bg-[#0F1424] px-4 py-3 border border-gray-800 rounded-xl justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <Phone className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-black text-white font-mono tracking-wider" dir="ltr">
                    +972 53-831-6779
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-500 uppercase font-mono bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">
                  {lang === 'ar' ? 'نشط الآن' : 'LIVE SUPPORT'}
                </span>
              </div>

              {/* Interactive buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href="tel:+972538316779"
                  className="py-3 px-4 bg-[#111827] hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'اتصال مباشر' : 'Direct Call'}</span>
                </a>
                <a 
                  href="https://wa.me/972538316779"
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'واتس اب مباشر' : 'WhatsApp'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Report Issue Form */}
          <div className="lg:col-span-7 bg-[#0A0B10]/75 border border-gray-800 p-8 rounded-3xl space-y-6 shadow-2xl relative text-right rtl:text-right ltr:text-left">
            <div className="space-y-1">
              <h4 className="text-lg font-black text-white flex items-center gap-2 justify-start">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                <span>{lang === 'ar' ? 'نموذج الإبلاغ المباشر عن مشكلة' : 'Direct Issue Report Form'}</span>
              </h4>
              <p className="text-xs text-gray-400 font-semibold">
                {lang === 'ar' ? 'سيتم إرسال هذا التقرير فوراً إلى لوحة تحكم المسؤول.' : 'Your report will be sent directly to the Admin Dashboard.'}
              </p>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {lang === 'ar' ? 'اسمك الكريم (اختياري):' : 'Your Name (Optional):'}
                  </label>
                  <input 
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: أحمد العبد' : 'e.g. John Doe'}
                    className="w-full px-4 py-3 bg-[#0F1424] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {lang === 'ar' ? 'رقم هاتفك للتواصل (اختياري):' : 'Phone Number (Optional):'}
                  </label>
                  <input 
                    type="text"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: +972 59-123-4567' : 'e.g. +972 59-123-4567'}
                    className="w-full px-4 py-3 bg-[#0F1424] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {lang === 'ar' ? 'تفاصيل العطل أو المشكلة بدقة:' : 'Detailed Description of the Issue:'}
                </label>
                <textarea 
                  required
                  rows={4}
                  value={reporterIssue}
                  onChange={(e) => setReporterIssue(e.target.value)}
                  placeholder={lang === 'ar' ? 'صف المشكلة التي واجهتك، أين حدثت، وما الذي ظهر لك على الشاشة بالتفصيل...' : 'Please describe the bug or issue, where did it happen, and any errors displayed...'}
                  className="w-full px-4 py-3 bg-[#0F1424] border border-gray-800 focus:border-amber-500 outline-none text-white font-medium text-xs transition-colors rounded-xl resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingIssue}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-105 disabled:brightness-50 disabled:cursor-not-allowed text-black font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
              >
                {isSubmittingIssue ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <span>{lang === 'ar' ? 'جاري إرسال البلاغ...' : 'Sending Report...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0" />
                    <span>{lang === 'ar' ? 'إرسال البلاغ فوراً للمهندس آدم عطون' : 'Submit Issue to Eng. Adam Atoun'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER SECTION (Image 1 layout) */}
      <footer className="bg-[#0A0B10] border-t border-gray-900 py-16 px-4 md:px-8 select-none">
        <div className="max-w-7xl mx-auto space-y-12">
          
          {/* Primary Footer Block */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-gray-900 pb-12">
            
            {/* Brand and Description */}
            <div className="text-center md:text-right rtl:md:text-right ltr:md:text-left space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                </div>
                <h4 className="text-lg font-black text-white">
                  {t.logoTitle} <span className="text-amber-500">{t.logoRescue}</span>
                </h4>
              </div>
              <p className="text-xs text-gray-500 font-bold max-w-md">
                {t.logoSub} — {t.slogan}
              </p>
            </div>

            {/* Navigation lists */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-gray-400">
              <button onClick={() => setActiveTab('home')} className="hover:text-amber-500 transition-colors cursor-pointer">{t.home}</button>
              <button onClick={() => setActiveTab('services')} className="hover:text-amber-500 transition-colors cursor-pointer">{t.services}</button>
              <button 
                onClick={() => {
                  if (!isLoggedIn) {
                    triggerToast(lang === 'ar' ? 'سجل دخولك للدخول إلى بوابة طلبات الطوارئ!' : 'Sign in to access the emergency rescue portal!', 'warning');
                  } else {
                    setActiveTab('simulator');
                  }
                }} 
                className="hover:text-amber-500 transition-colors cursor-pointer"
              >
                {t.simulator}
              </button>
            </div>

          </div>

          {/* Bottom Copyright & admin access gateway pill button */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-semibold text-gray-500">
            <p>
              {lang === 'ar' ? 'جميع الحقوق محفوظة (Systro Rescue) سيسترو إنقاذ 2026 ©' : 'All rights reserved (Systro Rescue) Systro Rescue 2026 ©'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Note: Verification domain (TrustPortal) trigger removed from client footer completely as requested */}
              {/* Pill Gate */}
              <button 
                onClick={() => setActiveTab('admin')}
                className="px-5 py-2.5 bg-[#111827] hover:bg-[#1F2937] border border-gray-800 text-gray-400 hover:text-white transition-all rounded-full flex items-center gap-2 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{t.adminGateway}</span>
              </button>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
}
