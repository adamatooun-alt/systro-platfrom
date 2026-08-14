import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
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
  HeartHandshake,
  Globe,
  Search,
  Languages,
  Check,
  X
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
  loggedInUserEmail: string;
  showSosButton?: boolean;
  setShowSosButton?: (val: boolean) => void;
}

const globalLanguages = [
  { code: 'ar', nameAr: 'العربية', nameEn: 'Arabic', flag: '🇸🇦' },
  { code: 'en', nameAr: 'الإنجليزية', nameEn: 'English', flag: '🇺🇸' },
  { code: 'he', nameAr: 'العبرية', nameEn: 'Hebrew', flag: '🇮🇱' },
  { code: 'fr', nameAr: 'الفرنسية', nameEn: 'French', flag: '🇫🇷' },
  { code: 'es', nameAr: 'الإسبانية', nameEn: 'Spanish', flag: '🇪🇸' },
  { code: 'de', nameAr: 'الألمانية', nameEn: 'German', flag: '🇩🇪' },
  { code: 'it', nameAr: 'الإيطالية', nameEn: 'Italian', flag: '🇮🇹' },
  { code: 'tr', nameAr: 'التركية', nameEn: 'Turkish', flag: '🇹🇷' },
  { code: 'ru', nameAr: 'الروسية', nameEn: 'Russian', flag: '🇷🇺' },
  { code: 'zh-CN', nameAr: 'الصينية المبسطة', nameEn: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', nameAr: 'اليابانية', nameEn: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', nameAr: 'الكورية', nameEn: 'Korean', flag: '🇰🇷' },
  { code: 'hi', nameAr: 'الهندية', nameEn: 'Hindi', flag: '🇮🇳' },
  { code: 'pt', nameAr: 'البرتغالية', nameEn: 'Portuguese', flag: '🇵🇹' },
  { code: 'nl', nameAr: 'الهولندية', nameEn: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', nameAr: 'البولندية', nameEn: 'Polish', flag: '🇵🇱' },
  { code: 'uk', nameAr: 'الأوكرانية', nameEn: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ro', nameAr: 'الرومانية', nameEn: 'Romanian', flag: '🇷🇴' },
  { code: 'el', nameAr: 'اليونانية', nameEn: 'Greek', flag: '🇬🇷' },
  { code: 'sv', nameAr: 'السويدية', nameEn: 'Swedish', flag: '🇸🇪' },
  { code: 'no', nameAr: 'النرويجية', nameEn: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', nameAr: 'الدانماركية', nameEn: 'Danish', flag: '🇩🇰' },
  { code: 'fi', nameAr: 'الفنلندية', nameEn: 'Finnish', flag: '🇫🇮' },
  { code: 'th', nameAr: 'التايلاندية', nameEn: 'Thai', flag: '🇹🇭' },
  { code: 'vi', nameAr: 'الفيتنامية', nameEn: 'Vietnamese', flag: '🇻🇳' },
  { code: 'id', nameAr: 'الإندونيسية', nameEn: 'Indonesian', flag: '🇮🇩' },
  { code: 'ms', nameAr: 'الماليزية', nameEn: 'Malay', flag: '🇲🇾' },
  { code: 'fa', nameAr: 'الفارسية', nameEn: 'Persian', flag: '🇮🇷' },
  { code: 'ur', nameAr: 'الأوردو', nameEn: 'Urdu', flag: '🇵🇰' },
  { code: 'sw', nameAr: 'السواحيلية', nameEn: 'Swahili', flag: '🇰🇪' },
  { code: 'tl', nameAr: 'التاغالوغية', nameEn: 'Tagalog', flag: '🇵🇭' },
  { code: 'bg', nameAr: 'البلغارية', nameEn: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', nameAr: 'الكرواتية', nameEn: 'Croatian', flag: '🇭🇷' },
  { code: 'cs', nameAr: 'التشيكية', nameEn: 'Czech', flag: '🇨🇿' },
  { code: 'hu', nameAr: 'الهنغارية', nameEn: 'Hungarian', flag: '🇭🇺' },
  { code: 'is', nameAr: 'الآيسلندية', nameEn: 'Icelandic', flag: '🇮🇸' },
  { code: 'ka', nameAr: 'الجورجية', nameEn: 'Georgian', flag: '🇬🇪' },
  { code: 'mt', nameAr: 'المالطية', nameEn: 'Maltese', flag: '🇲🇹' },
  { code: 'sr', nameAr: 'الصربية', nameEn: 'Serbian', flag: '🇷🇸' },
  { code: 'sk', nameAr: 'السلوفاكية', nameEn: 'Slovak', flag: '🇸🇰' },
  { code: 'sl', nameAr: 'السلوفينية', nameEn: 'Slovenian', flag: '🇸🇮' }
];

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
  loggedInUserEmail,
  showSosButton = true,
  setShowSosButton,
}: HomeTabProps) {
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterIssue, setReporterIssue] = useState('');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [isTranslateLoaded, setIsTranslateLoaded] = useState(false);
  const [showTranslateWidget, setShowTranslateWidget] = useState(false);
  const [translateSearchQuery, setTranslateSearchQuery] = useState('');
  const [translateSelectedLang, setTranslateSelectedLang] = useState('');

  // Roadside Safety Checklist State
  const [safetyChecklist, setSafetyChecklist] = useState([
    { id: 1, textAr: 'تأمين المركبة في مكان مستقر وآمن على جانب الطريق 🚗', textEn: 'Secure the vehicle in a stable, safe roadside spot 🚗', textHe: 'אבטח את הרכב במקום יציב ובטוח בצד הדרך 🚗', done: false },
    { id: 2, textAr: 'تشغيل مصابيح التنبيه الرباعية (الغمازات) فوراً ⚠️', textEn: 'Turn on the hazard alert lights (double blinkers) immediately ⚠️', textHe: 'הפעל את אורות האזהרה המרובעים מייד ⚠️', done: false },
    { id: 3, textAr: 'ارتداء سترة الأمان الفسفورية العاكسة قبل النزول 🦺', textEn: 'Put on your high-visibility reflective vest before exiting 🦺', textHe: 'לבש אפוד זוהר מחזיר אור לפני היציאה 🦺', done: false },
    { id: 4, textAr: 'وضع مثلث التحذير العاكس على مسافة مناسبة خلف السيارة 🔺', textEn: 'Place the reflective warning triangle behind the vehicle 🔺', textHe: 'הצב משולש אזהרה מחזיר אור מאחורי הרכב 🔺', done: false },
    { id: 5, textAr: 'الابتعاد عن مسارات حركة السير النشطة والوقوف في مكان آمن 🛡️', textEn: 'Stay clear of active traffic lanes and wait in a secure area 🛡️', textHe: 'התרחק מנתיבי התנועה הפעילים והמתן באזור בטוח 🛡️', done: false },
  ]);

  // Estimator Calculator State
  const [estimatorDistance, setEstimatorDistance] = useState(15);
  const [estimatorService, setEstimatorService] = useState<ServiceType>('towing');
  const [estimatorNightShift, setEstimatorNightShift] = useState(false);
  const [estimatorEmergency, setEstimatorEmergency] = useState(false);

  // Helper calculation formulas
  const getServiceBasePrice = (type: ServiceType) => {
    switch (type) {
      case 'fuel': return 50;
      case 'locksmith': return 100;
      case 'mechanic': return 150;
      case 'towing': return 200;
      case 'battery': return 80;
      case 'taxi': return 40;
      default: return 100;
    }
  };

  const getServiceDistanceRate = (type: ServiceType) => {
    switch (type) {
      case 'towing': return 5;
      case 'taxi': return 3;
      default: return 2;
    }
  };

  const calcBasePrice = getServiceBasePrice(estimatorService);
  const calcDistanceRate = getServiceDistanceRate(estimatorService);
  const calcDistanceCharge = estimatorDistance * calcDistanceRate;
  
  let calcSubtotal = calcBasePrice + calcDistanceCharge;
  if (estimatorNightShift) {
    calcSubtotal *= 1.25;
  }
  if (estimatorEmergency) {
    calcSubtotal += 30;
  }
  
  const calcFinalPrice = Math.round(calcSubtotal);
  const calcEscrowFee = Math.round(calcFinalPrice * 0.2);
  const calcEta = Math.max(10, Math.round(10 + (estimatorDistance * 1.5)));

  const triggerGoogleTranslate = (code: string, name: string) => {
    setTranslateSelectedLang(code);
    
    // Attempt 1: Find the native Google Translate select element and trigger a change
    const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (selectEl) {
      selectEl.value = code;
      selectEl.dispatchEvent(new Event('change'));
      triggerToast(
        lang === 'ar' 
          ? `✅ تم تحويل لغة الموقع بنجاح إلى: ${name}` 
          : lang === 'he'
          ? `✅ שפת האתר שונתה בהצלחה ל: ${name}`
          : `✅ Website translated successfully to: ${name}`,
        'success'
      );
    } else {
      // Attempt 2: Set standard google trans cookie
      const cookieValue = `/auto/${code}`;
      document.cookie = `googtrans=${cookieValue}; path=/;`;
      document.cookie = `googtrans=${cookieValue}; path=/; domain=${window.location.hostname};`;
      
      triggerToast(
        lang === 'ar' 
          ? `🔄 جاري تحويل لغة الموقع إلى ${name}...` 
          : lang === 'he'
          ? `🔄 מתרגם את האתר ל-${name}...`
          : `🔄 Translating website to ${name}...`,
        'success'
      );
      
      setTimeout(() => {
        window.location.reload();
      }, 700);
    }
  };

  const handleSubmitIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reporterIssue.trim()) {
      triggerToast(
        lang === 'ar' 
          ? 'الرجاء كتابة تفاصيل المشكلة أولاً!' 
          : lang === 'he'
          ? 'אנא הזן את פרטי הבעיה תחילה!'
          : 'Please write issue details first!',
        'warning'
      );
      return;
    }
    
    setIsSubmittingIssue(true);
    try {
      await addDoc(collection(db, "website_issues"), {
        name: reporterName,
        phone: reporterPhone,
        issue: reporterIssue,
        createdAt: serverTimestamp(),
        lang
      });
      triggerToast(
        lang === 'ar' 
          ? '✅ تم إرسال بلاغك بنجاح! شكراً لمساعدتنا في تحسين الخدمة.' 
          : lang === 'he'
          ? '✅ הדיווח נשלח בהצלחה! תודה على עזרתך.'
          : '✅ Issue submitted successfully! Thanks for helping us improve.', 
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
          : lang === 'he'
          ? '❌ מצטערים, שליחת הדיווח נכשלה. אנא נסה שנית.'
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
                  {/* Main Requested Dual-Action Service Buttons (عميل مقطوع vs طلب تكسي) */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-center gap-5 max-w-4xl mx-auto">
            {/* Action 1: لوحة الخدمات والزبون */}
            <button 
              type="button"
              onClick={() => {
                setUserRole('client');
                sessionStorage.setItem('systro_user_role', 'client');
                setActiveTab('client');
                triggerToast(
                  lang === 'ar' 
                    ? 'أهلاً بك في صفحة العميل والبلاغات - تفضل باختيار الخدمة وتحديد موقعك لطلب الفنيين فوراً.' 
                    : lang === 'he'
                    ? 'ברוך הבא לדף הלקוח - אנא בחר שירות ומיקום להזמנת סיוע מיידי.'
                    : 'Welcome to Client Portal - select service and pin your location to request assistance.', 
                  'success'
                );
                if (loggedInUserEmail) {
                  setDoc(doc(db, "users", loggedInUserEmail), { role: 'client' }, { merge: true }).catch(err => {
                    console.error("Failed to save user role on HomeTab click:", err);
                  });
                }
              }}
              className="w-full md:flex-1 h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/15 hover:scale-105 transition-all text-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-xl">🚗</span>
              <span className="font-black text-base">{lang === 'ar' ? 'الخدمات (لوحة الزبون)' : lang === 'he' ? 'שירותים' : 'Services'}</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>

            {/* Action 2: طلب تكسي خاص / VIP */}
            <button 
              onClick={() => {
                setActiveTab('taxi');
                triggerToast(
                  lang === 'ar' 
                    ? 'بوابة حجز تكسي وخدمات VIP نشطة الآن! اختر وجهتك لبدء الرحلة بضمان سيسترو المالي.' 
                    : lang === 'he'
                    ? 'בחר יעד והזמן נסיעה במונית פרימיום כעת עם הגנת סיסטרו.'
                    : 'Taxi and VIP Booking Portal is active! Pick your destination with Systro protection.', 
                  'info'
                );
              }}
              className="w-full md:flex-1 h-16 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-450 hover:to-amber-500 text-black font-black rounded-2xl shadow-xl shadow-amber-500/10 hover:scale-105 transition-all text-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-xl">🚕</span>
              <span className="font-black text-base">{lang === 'ar' ? 'حجز تكسي VIP' : lang === 'he' ? 'הזמנת מונית VIP' : 'Book Taxi VIP'}</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
            </button>

            {/* Action 3: لوحة الفنيين والبلاغات الحية */}
            <button 
              onClick={() => {
                setUserRole('technician');
                sessionStorage.setItem('systro_user_role', 'technician');
                setActiveTab('simulator');
                triggerToast(
                  lang === 'ar' 
                    ? 'أهلاً بك في لوحة الفنيين - جارٍ استعراض البلاغات ونداءات الاستغاثة النشطة على الطريق 🛠️' 
                    : 'Welcome to Technician Hub - viewing active road emergency alerts 🛠️', 
                  'success'
                );
              }}
              className="w-full md:flex-1 h-16 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/15 hover:scale-105 transition-all text-sm flex items-center justify-center gap-3 cursor-pointer border border-blue-400/30"
            >
              <span className="text-xl">🛠️</span>
              <span className="font-black text-base">{lang === 'ar' ? 'لوحة الفنيين (البلاغات)' : 'Technician Hub (Alerts)'}</span>
              <ChevronRight className="w-5 h-5 shrink-0" />
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

            <p className="text-sm md:text-base text-slate-200 leading-relaxed font-semibold">
              {t.finDesc}
            </p>

            {/* Sub features list */}
            <div className="space-y-4">
              {/* Customer Protection */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#0F1424] border border-gray-800 hover:border-gray-700 transition-colors shadow-sm">
                <div className="p-3 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl mt-1 shrink-0">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white">{t.custProtectionTitle}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">{t.custProtectionDesc}</p>
                </div>
              </div>

              {/* Technician Protection */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#0F1424] border border-gray-800 hover:border-gray-700 transition-colors shadow-sm">
                <div className="p-3 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl mt-1 shrink-0">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-extrabold text-white">{t.techRightTitle}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-semibold">{t.techRightDesc}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Escrow Vault graphical model card (Image 3) */}
          <div className="lg:col-span-7 bg-[#111827] border border-gray-700/80 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative text-right rtl:text-right ltr:text-left">
            <div className="absolute -top-3 left-6">
              <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                {t.vaultSecureBadge}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-lg md:text-xl font-black text-white drop-shadow-sm">{t.vaultTitle}</h4>
                <p className="text-xs md:text-sm text-amber-300 font-extrabold mt-1 leading-relaxed">{t.vaultSub}</p>
              </div>
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30 shrink-0">
                <ShieldCheck className="w-7 h-7 animate-pulse" />
              </div>
            </div>

            <hr className="border-gray-800" />

            {/* Vault Locked holding simulation display */}
            <div className="p-5 bg-[#0B0F19] border border-gray-700 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-inner">
              <div className="space-y-1">
                <span className="text-xs text-slate-300 font-black block uppercase tracking-wider">{t.vaultResValue}</span>
                <span className="text-3xl font-black text-amber-400 font-mono drop-shadow">150 ₪ <span className="text-xs text-slate-200 font-extrabold font-sans">({lang === 'ar' ? 'شيكل' : lang === 'he' ? 'שקל' : 'Shekel'})</span></span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-black px-3.5 py-1.5 rounded-full uppercase shadow-sm">
                  {t.vaultReservedBadge}
                </span>
                <span className="text-xs text-slate-200 font-black">{t.vaultAwaiting}</span>
              </div>
            </div>

            {/* 3 columns list detailing payouts - Stack on mobile, grid on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Partner Technician details */}
              <div className="p-4 bg-[#0B0F19] border border-gray-700 rounded-xl text-center space-y-1.5">
                <span className="text-[11px] font-black text-slate-300 uppercase block">{t.vaultPartnerTech}</span>
                <span className="text-sm font-black text-white block truncate">رائد مسعود</span>
              </div>

              {/* Systro Commission */}
              <div className="p-4 bg-[#0B0F19] border border-gray-700 rounded-xl text-center space-y-1.5">
                <span className="text-[11px] font-black text-slate-300 uppercase block">{t.vaultCommission}</span>
                <span className="text-sm font-black text-amber-400 font-mono block">20% (30 ₪)</span>
              </div>

              {/* Net Profit */}
              <div className="p-4 bg-[#0B0F19] border border-gray-700 rounded-xl text-center space-y-1.5">
                <span className="text-[11px] font-black text-slate-300 uppercase block">{t.vaultNetEarnings}</span>
                <span className="text-sm font-black text-emerald-400 font-mono block">120 ₪</span>
              </div>
            </div>

            {/* Bulbed mechanism guide */}
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-100 font-bold">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
              <p>
                <span className="font-extrabold text-amber-400">{t.vaultMechanismTitle}: </span>
                {t.vaultMechanismDesc}
              </p>
            </div>
          </div>

        </div>
      </section>



      {/* NEW INTERACTIVE ROAD SAFETY & COST ESTIMATOR UTILITY SECTIONS */}
      <section className="py-16 md:py-24 bg-[#080B14] border-t border-gray-900 px-4 md:px-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          
          {/* Header */}
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs md:text-sm font-black text-amber-500 uppercase tracking-widest block">
              {lang === 'ar' ? '🛠️ أدوات السلامة والمساعدة الذكية' : lang === 'he' ? '🛠️ כלי בטיחות ועזר חכמים' : '🛠️ SMART SAFETY & ESTIMATION TOOLS'}
            </span>
            <h3 className="text-2xl md:text-4xl font-black text-white leading-tight">
              {lang === 'ar' ? 'تفاعل، احسب تكلفتك، وتأكد من سلامتك' : lang === 'he' ? 'חשב עלויות, ודא בטיחות בדרכים' : 'Interact, Calculate Costs, & Stay Safe'}
            </h3>
            <p className="text-xs md:text-sm text-gray-400 font-medium">
              {lang === 'ar' ? 'نقدم لك نظاماً تفاعلياً متكاملاً لمساعدتك في لحظات الطوارئ وتقدير التكاليف الحقيقية ومدة الوصول بذكاء.' : lang === 'he' ? 'אנו מציעים מערכת אינטראקטיבית שתעזור לך להעריך עלויות וזמנים ולהישאר بטוח בזמן אمت.' : 'We provide an integrated interactive assistant to help you estimate service costs, calculate arrival times, and follow safety protocols.'}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* 1. Roadside Safety Checklist */}
            <div className="lg:col-span-6 bg-[#0E1322] border border-gray-800 p-6 md:p-8 rounded-3xl space-y-6 shadow-xl text-right rtl:text-right ltr:text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-white flex items-center gap-2 justify-start">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    {lang === 'ar' ? 'دليل الأمان التفاعلي على الطريق' : lang === 'he' ? 'מדריך בטיחות אינטראקטיבי' : 'Interactive Road Safety Guide'}
                  </h4>
                  <p className="text-xs text-gray-400 font-semibold">
                    {lang === 'ar' ? 'أكمل الخطوات لضمان سلامتك وسلامة عائلتك على الطريق المزدحم' : lang === 'he' ? 'השלם את השלב כדי להבטיח בטיחות' : 'Complete these vital safety steps while waiting for your rescue.'}
                  </p>
                </div>
                <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black">
                  {Math.round((safetyChecklist.filter(t => t.done).length / safetyChecklist.length) * 100)}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(safetyChecklist.filter(t => t.done).length / safetyChecklist.length) * 100}%` }}
                ></div>
              </div>

              {/* Checklist list */}
              <div className="space-y-3">
                {safetyChecklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSafetyChecklist(prev => prev.map(t => t.id === item.id ? { ...t, done: !t.done } : t));
                      if (!item.done) {
                        triggerToast(
                          lang === 'ar' ? 'خطوة ممتازة! تابع تأمين موقعك.' : 'Great job! Keep staying safe.',
                          'success'
                        );
                      }
                    }}
                    className={`w-full text-right p-3.5 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                      item.done 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                        : 'bg-[#0B0E19] border-gray-800 hover:border-gray-700 text-slate-200'
                    }`}
                  >
                    <span className="text-xs font-bold leading-relaxed">
                      {lang === 'ar' ? item.textAr : lang === 'he' ? item.textHe : item.textEn}
                    </span>
                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      item.done ? 'bg-emerald-500 border-emerald-400 text-black' : 'border-gray-600 bg-transparent'
                    }`}>
                      {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Checklist Summary Footer */}
              {safetyChecklist.every(t => t.done) && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-xs leading-relaxed text-emerald-300 font-extrabold animate-bounce">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <p>
                    {lang === 'ar' 
                      ? 'رائع جداً! لقد أكملت جميع خطط الأمان بنجاح. فنيو سيسترو في طريقهم إليك الآن وهم يقدّرون وعيك العالي بالسلامة.' 
                      : 'Excellent! You have successfully completed all safety steps. Stay in your safe position.'}
                  </p>
                </div>
              )}
            </div>

            {/* 2. Price & ETA Estimator Slider Calculator */}
            <div className="lg:col-span-6 bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-xl text-right rtl:text-right ltr:text-left">
              <div className="space-y-1">
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2 justify-start">
                  <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                  {lang === 'ar' ? 'حاسبة التكلفة الفورية ومؤقت ETA' : lang === 'he' ? 'מחשבון עלויות וזמנים מיידי' : 'Instant Cost & ETA Estimator'}
                </h4>
                <p className="text-xs text-slate-600 font-semibold">
                  {lang === 'ar' ? 'حدد نوع الخدمة والمسافة للحصول على تقدير فوري للتكلفة وضمان سيسترو المالي' : lang === 'he' ? 'בחר סוג שירות ומרחק כדי לקבל הערכת מחיר מיידית' : 'Adjust the options below to get live price structures and travel duration.'}
                </p>
              </div>

              {/* Form elements */}
              <div className="space-y-4">
                
                {/* Service Selector */}
                <div className="flex flex-col gap-1.5 text-right">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {lang === 'ar' ? 'نوع الخدمة المطلوبة:' : lang === 'he' ? 'סוג השירות המבוקש:' : 'Select Service Type:'}
                  </label>
                  <select
                    value={estimatorService}
                    onChange={(e) => setEstimatorService(e.target.value as ServiceType)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-amber-500 outline-none text-slate-900 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    <option value="towing">{lang === 'ar' ? '🚚 سحب ونقل سيارات (توتنج)' : '🚚 Towing / Rescue'}</option>
                    <option value="mechanic">{lang === 'ar' ? '🛠️ ميكانيكي طوارئ وصيانة' : '🛠️ Emergency Mechanic'}</option>
                    <option value="battery">{lang === 'ar' ? '🔋 شحن وتبديل بطارية السيارة' : '🔋 Battery Boost / Replace'}</option>
                    <option value="locksmith">{lang === 'ar' ? '🔑 فتح أقفال وتأمين مفاتيح' : '🔑 Locksmith Support'}</option>
                    <option value="fuel">{lang === 'ar' ? '⛽ توصيل وقود وبنزين طارئ' : '⛽ Emergency Fuel Delivery'}</option>
                    <option value="taxi">{lang === 'ar' ? '🚕 تكسي خاص / رحلة VIP' : '🚕 VIP Private Taxi'}</option>
                  </select>
                </div>

                {/* Distance Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {lang === 'ar' ? 'المسافة التقريبية بالفني:' : 'Estimated Distance:'}
                    </span>
                    <span className="text-xs font-black text-amber-600 font-mono">
                      {estimatorDistance} {lang === 'ar' ? 'كم' : 'KM'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={estimatorDistance}
                    onChange={(e) => setEstimatorDistance(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold">
                    <span>1 {lang === 'ar' ? 'كم' : 'KM'}</span>
                    <span>50 {lang === 'ar' ? 'كم' : 'KM'}</span>
                    <span>100 {lang === 'ar' ? 'كم' : 'KM'}</span>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Night Shift Toggle */}
                  <button
                    onClick={() => setEstimatorNightShift(!estimatorNightShift)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      estimatorNightShift 
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-extrabold shadow-sm' 
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <span className="text-sm">🌙</span>
                    <span className="text-[11px]">{lang === 'ar' ? 'وردية ليلية (+25%)' : 'Night Shift (+25%)'}</span>
                  </button>

                  {/* Emergency Dispatch Toggle */}
                  <button
                    onClick={() => setEstimatorEmergency(!estimatorEmergency)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                      estimatorEmergency 
                        ? 'bg-red-100 border-red-400 text-red-950 font-extrabold shadow-sm' 
                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 font-bold'
                    }`}
                  >
                    <span className="text-sm">⚡</span>
                    <span className="text-[11px]">{lang === 'ar' ? 'طلب عاجل جداً (+30 ₪)' : 'Urgent Emergency (+30 ₪)'}</span>
                  </button>
                </div>

              </div>

              <hr className="border-slate-200" />

              {/* Dynamic Outputs displays */}
              <div className="grid grid-cols-2 gap-3 text-center">
                {/* Price Result Block */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-slate-500 block uppercase">
                    {lang === 'ar' ? 'السعر المقدر النهائي' : 'ESTIMATED PRICE'}
                  </span>
                  <span className="text-2xl font-black text-amber-600 font-mono block">
                    {calcFinalPrice} ₪
                  </span>
                  <span className="text-[9px] text-emerald-600 font-extrabold block">
                    + {calcEscrowFee} ₪ {lang === 'ar' ? 'ضمان أمان مسترجع' : 'Escrow Sec.'}
                  </span>
                </div>

                {/* ETA Result Block */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black text-slate-500 block uppercase">
                    {lang === 'ar' ? 'الوقت المتوقع للوصول' : 'ESTIMATED ETA'}
                  </span>
                  <span className="text-2xl font-black text-blue-600 font-mono block">
                    {calcEta} {lang === 'ar' ? 'دقيقة' : 'MINS'}
                  </span>
                  <span className="text-[9px] text-sky-600 font-extrabold block">
                    ⚡ {lang === 'ar' ? 'أقرب فني نشط بالمنطقة' : 'Nearest dispatch active'}
                  </span>
                </div>
              </div>

            </div>

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
              <span>
                {lang === 'ar' 
                  ? 'فريق الدعم والمساندة الفنية' 
                  : lang === 'he'
                  ? 'צוות תמיכה וסיוע טכני'
                  : 'Support & Technical Assistance'}
              </span>
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl md:text-3xl font-black text-white leading-tight">
                {lang === 'ar' 
                  ? 'هل تواجه أي مشاكل أو أعطال في المنصة؟' 
                  : lang === 'he'
                  ? 'נתקלת בבעיה או תקלה בפלטפורמה?'
                  : 'Facing any issues or bugs on the platform?'}
              </h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                {lang === 'ar' 
                  ? 'ملاحظاتك تهمنا كثيراً لتطوير الخدمة! إذا صادفتك أي مشكلة برمجية، تأخير، أو خطأ في النظام، يرجى كتابتها فوراً ليصل تقريرك مباشرة إلى فريق الدعم والمتابعة الفورية.' 
                  : lang === 'he'
                  ? 'המשוב שלך חשוב לנו מאוד לפיתוח השירות! אם נתקלת בבעיית תוכנה, עיכוב או שגיאת מערכת, אנא דווח עליה כאן כדי להגיע לצוות התמיכה באופן מיידי לטיפול פתרון.'
                  : 'Your feedback is extremely valuable to us! If you encounter any software bugs, delays, or system errors, please report them here to reach our support team immediately for resolving.'}
              </p>
            </div>

            {/* Direct Contact Card */}
            <div className="bg-[#0A0B10]/90 border border-gray-800 p-6 rounded-3xl space-y-5 shadow-xl">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white">
                  {lang === 'ar' 
                    ? 'للتواصل الهاتفي الفوري والطارئ:' 
                    : lang === 'he'
                    ? 'ליצירת קשר טלפוני מיידי ודחוף:'
                    : 'Direct Phone & Instant WhatsApp:'}
                </h4>
                <p className="text-xs text-gray-500 font-semibold">
                  {lang === 'ar' 
                    ? 'يمكنك التحدث مباشرة مع الإدارة والدعم الفني على مدار الساعة.' 
                    : lang === 'he'
                    ? 'תוכל לדבר ישירות עם ההנהלה ותמיכה טכנית 24/7.'
                    : 'Get in touch with the management and support team anytime.'}
                </p>
              </div>

              {/* Phone display */}
              <div className="flex items-center gap-3 bg-[#0F1424] px-4 py-3 border border-gray-800 rounded-xl justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg">
                    <Phone className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-black text-slate-900 font-mono tracking-wider" dir="ltr">
                    +972 53-831-6779
                  </span>
                </div>
                <span className="text-[10px] font-bold text-amber-500 uppercase font-mono bg-amber-500/10 px-2 py-0.5 rounded animate-pulse">
                  {lang === 'ar' ? 'نشط الآن' : lang === 'he' ? 'פעיל כעת' : 'LIVE SUPPORT'}
                </span>
              </div>

              {/* Interactive buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a 
                  href="tel:+972538316779"
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm text-center"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'اتصال مباشر' : lang === 'he' ? 'חיוג ישיר' : 'Direct Call'}</span>
                </a>
                <a 
                  href="https://wa.me/972538316779"
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md text-center"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'واتس اب مباشر' : lang === 'he' ? 'וואטסאפ ישיר' : 'WhatsApp'}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Report Issue Form */}
          <div className="lg:col-span-7 bg-[#0A0B10]/75 border border-gray-800 p-8 rounded-3xl space-y-6 shadow-2xl relative text-right rtl:text-right ltr:text-left">
            <div className="space-y-1">
              <h4 className="text-lg font-black text-white flex items-center gap-2 justify-start">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></span>
                <span>
                  {lang === 'ar' 
                    ? 'نموذج الإبلاغ المباشر عن مشكلة' 
                    : lang === 'he'
                    ? 'טופס דיווח ישיר על בעיה'
                    : 'Direct Issue Report Form'}
                </span>
              </h4>
              <p className="text-xs text-gray-400 font-semibold">
                {lang === 'ar' 
                  ? 'سيتم إرسال هذا التقرير فوراً إلى لوحة تحكم المسؤول.' 
                  : lang === 'he'
                  ? 'דיווח זה יישלח ישירות ללוח הבקרה של המנהל.'
                  : 'Your report will be sent directly to the Admin Dashboard.'}
              </p>
            </div>

            <form onSubmit={handleSubmitIssue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {lang === 'ar' 
                      ? 'اسمك الكريم (اختياري):' 
                      : lang === 'he'
                      ? 'שמך המלא (אופציונלי):'
                      : 'Your Name (Optional):'}
                  </label>
                  <input 
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: أحمد العبد' : lang === 'he' ? 'לדוגמה: ישראל ישראלי' : 'e.g. John Doe'}
                    className="w-full px-4 py-3 bg-[#0F1424] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors rounded-xl"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    {lang === 'ar' 
                      ? 'رقم هاتفك للتواصل (اختياري):' 
                      : lang === 'he'
                      ? 'מספר הטלפון שלך (אופציונלי):'
                      : 'Phone Number (Optional):'}
                  </label>
                  <input 
                    type="text"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: +972 59-123-4567' : lang === 'he' ? 'לדוגמה: +972 50-123-4567' : 'e.g. +972 59-123-4567'}
                    className="w-full px-4 py-3 bg-[#0F1424] border border-gray-800 focus:border-amber-500 outline-none text-white font-bold text-xs transition-colors rounded-xl"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {lang === 'ar' 
                    ? 'تفاصيل العطل أو المشكلة بدقة:' 
                    : lang === 'he'
                    ? 'פרטי התקלה או הבעיה במדויק:'
                    : 'Detailed Description of the Issue:'}
                </label>
                <textarea 
                  required
                  rows={4}
                  value={reporterIssue}
                  onChange={(e) => setReporterIssue(e.target.value)}
                  placeholder={
                    lang === 'ar' 
                      ? 'صف المشكلة التي واجهتك، أين حدثت، وما الذي ظهر لك على الشاشة بالتفصيل...' 
                      : lang === 'he'
                      ? 'תאר את הבעיה בה נתקלת, היכן היא התרחשה ומה הופיע על המסך בפירוט...'
                      : 'Please describe the bug or issue, where did it happen, and any errors displayed...'
                  }
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
                    <span>
                      {lang === 'ar' 
                        ? 'جاري إرسال البلاغ...' 
                        : lang === 'he'
                        ? 'שולח דיווח...'
                        : 'Sending Report...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 shrink-0" />
                    <span>
                      {lang === 'ar' 
                        ? 'إرسال البلاغ فوراً لفريق الدعم والمهندسين' 
                        : lang === 'he'
                        ? 'שלח דיווח מיידי לצוות התמיכה'
                        : 'Submit Issue to Support Team'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER SECTION (Image 1 layout) */}
      <footer className="bg-[#0A0B10] border-t border-gray-800 py-12 px-4 md:px-8 select-none">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Primary Footer Block */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-gray-800 pb-8">
            
            {/* Brand and Description */}
            <div className="text-center md:text-right rtl:md:text-right ltr:md:text-left space-y-3">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <img src="/icon.svg" alt="Systro Logo" className="w-8 h-8 rounded-xl object-contain border border-sky-400/30 shadow-md" />
                <h4 className="text-lg font-black text-sky-400 font-mono">
                  systro
                </h4>
              </div>
              <p className="text-xs text-gray-400 font-medium max-w-md">
                systro
              </p>
            </div>

            {/* Navigation lists */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs md:text-sm font-bold text-gray-200">
              <button onClick={() => setActiveTab('home')} className="hover:text-amber-400 transition-colors cursor-pointer">{t.home}</button>
              <button onClick={() => setActiveTab('client')} className="hover:text-amber-400 transition-colors cursor-pointer">{lang === 'ar' ? 'صفحة العميل 👤' : 'Client Page'}</button>
              <button 
                onClick={() => {
                  setActiveTab('simulator');
                  triggerToast(
                    lang === 'ar' 
                      ? 'أهلاً بك في صفحة العمليات - تفضل بتحديد موقعك لطلب الفنيين فورا.' 
                      : lang === 'he'
                      ? 'ברוך הבא לדף הפעילויות - אנא בחר מיקום להזמנת סיוע מיידי.'
                      : 'Welcome to Operations - please select your location to request assistance.', 
                    'success'
                  );
                }} 
                className="hover:text-amber-400 transition-colors cursor-pointer"
              >
                {t.simulator}
              </button>
            </div>

          </div>

          {/* Bottom Copyright & admin access gateway pill button */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs md:text-sm font-black text-amber-300">
            <p>
              {lang === 'ar' 
                ? 'جميع الحقوق محفوظة سيسترو 2026 ©' 
                : lang === 'he'
                ? 'כל הזכויות שמורות ל-Systro 2026 ©'
                : 'All rights reserved Systro 2026 ©'}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              {/* Note: Verification domain (TrustPortal) trigger removed from client footer completely as requested */}
              {/* Pill Gate */}
              <button 
                onClick={() => setActiveTab('admin')}
                className="px-5 py-2.5 bg-[#121625] hover:bg-[#1A2035] border border-amber-500/30 text-amber-400 hover:text-white transition-all rounded-full flex items-center gap-2 cursor-pointer font-bold shadow-sm"
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
