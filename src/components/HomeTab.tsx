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
            {/* Action 1: عميل مقطوع */}
            <button 
              onClick={async () => {
                setUserRole('client');
                sessionStorage.setItem('systro_user_role', 'client');
                if (loggedInUserEmail) {
                  try {
                    await setDoc(doc(db, "users", loggedInUserEmail), { role: 'client' }, { merge: true });
                  } catch (err) {
                    console.error("Failed to save user role on HomeTab click:", err);
                  }
                }
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
              className="w-full md:flex-1 h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-black rounded-2xl shadow-xl shadow-orange-500/15 hover:scale-105 transition-all text-sm flex items-center justify-center gap-3 cursor-pointer"
            >
              <span className="text-xl">🚗</span>
              <span className="font-black text-base">{lang === 'ar' ? 'عميل مقطوع' : lang === 'he' ? 'לקוח תקוע' : 'Stranded Client'}</span>
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
              <span className="font-black text-base">{lang === 'ar' ? 'حجز تكسي خاص / VIP' : lang === 'he' ? 'הזמנת מונית / VIP' : 'Book VIP Taxi'}</span>
              <ChevronRight className="w-5 h-5 shrink-0 text-black" />
            </button>
          </div>

          {/* SOS Floating Button Widget Configurator */}
          {setShowSosButton && (
            <div className="mt-8 mx-auto max-w-lg p-4 bg-gradient-to-br from-[#111827]/80 to-[#0F1424]/90 border border-amber-500/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl backdrop-blur-md text-right rtl:text-right ltr:text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle className="w-5.5 h-5.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-black text-white">
                    {lang === 'ar' ? 'زر الطوارئ السريع SOS 🚨' : lang === 'he' ? 'לחצן חירום מהיר SOS 🚨' : 'SOS Emergency Button 🚨'}
                  </h4>
                  <p className="text-[10px] md:text-[11px] text-gray-400 font-bold leading-normal mt-0.5">
                    {lang === 'ar' 
                      ? 'تفعيل زر عائم أحمر بأسفل الشاشة للاتصال بالشرطة وطواقم الإسعاف فوراً.' 
                      : lang === 'he'
                      ? 'הצג לחצן אדום צף בתחתית המסך לחיוג מהיר למשטره וצוותי רפואה.'
                      : 'Display a floating emergency action button for rapid dials.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowSosButton(!showSosButton);
                  triggerToast(
                    lang === 'ar' 
                      ? (!showSosButton ? '✅ تم إظهار زر SOS العائم بأسفل الشاشة!' : '❌ تم إخفاء زر SOS العائم') 
                      : lang === 'he'
                      ? (!showSosButton ? '✅ לחצן SOS הופעל בהצלחה!' : '❌ לחצן SOS הוסתר')
                      : (!showSosButton ? '✅ SOS floating button is now visible!' : '❌ SOS floating button hidden'), 
                    'info'
                  );
                }}
                className={`px-4 py-2 rounded-xl text-[11px] font-black tracking-wide border transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  showSosButton 
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 border-orange-600 shadow-lg shadow-orange-500/20 hover:scale-105' 
                    : 'bg-gray-900 text-gray-500 border-gray-800 hover:bg-gray-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showSosButton ? 'bg-slate-950 animate-pulse' : 'bg-gray-700'}`}></span>
                <span>{lang === 'ar' ? (showSosButton ? 'زر SOS نشط' : 'إظهار زر SOS') : lang === 'he' ? (showSosButton ? 'פעיל' : 'הצג לחצן') : (showSosButton ? 'SOS Enabled' : 'Show SOS')}</span>
              </button>
              <button
                onClick={() => {
                  setShowSosButton(!showSosButton);
                  triggerToast(
                    lang === 'ar' 
                      ? (!showSosButton ? '✅ تم إظهار زر SOS العائم بأسفل الشاشة!' : '❌ تم إخفاء زر SOS العائم') 
                      : lang === 'he'
                      ? (!showSosButton ? '✅ לחצן SOS הופעל בהצלחה!' : '❌ לחצן SOS הוסתר')
                      : (!showSosButton ? '✅ SOS floating button is now visible!' : '❌ SOS floating button hidden'), 
                    'info'
                  );
                }}
                className={`hidden px-4 py-2 rounded-xl text-[11px] font-black tracking-wide border transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  showSosButton 
                    ? 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                    : 'bg-gray-900 text-gray-500 border-gray-800'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showSosButton ? 'bg-red-500 animate-pulse' : 'bg-gray-700'}`}></span>
                <span>{lang === 'ar' ? (showSosButton ? 'زر SOS نشط' : 'إظهار زر SOS') : lang === 'he' ? (showSosButton ? 'פעיל' : 'הצג לחצן') : (showSosButton ? 'SOS Enabled' : 'Show SOS')}</span>
              </button>
            </div>
          )}

          {/* Google Global Translator Card */}
          <div className="mt-6 mx-auto max-w-lg p-5 bg-gradient-to-br from-[#111827]/80 to-[#0F1424]/90 border border-amber-500/10 rounded-2xl flex flex-col items-center justify-center gap-4 shadow-xl backdrop-blur-md text-center">
            <div className="flex items-center gap-3 w-full justify-start text-right rtl:text-right ltr:text-left">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0">
                <Globe className="w-5.5 h-5.5 animate-spin-slow" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs md:text-sm font-black text-white">
                  {lang === 'ar' ? 'مترجم جوجل الفوري العالمي 🌐' : lang === 'he' ? 'תרגום גוגל אוניברסלי 🌐' : 'Google Universal Translator 🌐'}
                </h4>
                <p className="text-[10px] md:text-[11px] text-gray-400 font-bold leading-normal mt-0.5">
                  {lang === 'ar' 
                    ? 'ترجمة الموقع بالكامل فوراً إلى أي لغة في العالم عبر مترجم قوقل التلقائي.' 
                    : lang === 'he'
                    ? 'תרגם את כל האתר באופן מיידי לכל שפה בעולם באמצעות גוגל טרנסלייט.'
                    : 'Translate the entire website instantly to any language in the world via Google.'}
                </p>
              </div>
            </div>

            {!showTranslateWidget ? (
              <button
                onClick={() => {
                  setShowTranslateWidget(true);
                  if (!isTranslateLoaded) {
                    if (!(window as any).googleTranslateElementInit) {
                      (window as any).googleTranslateElementInit = () => {
                        new (window as any).google.translate.TranslateElement({
                          pageLanguage: 'auto',
                          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
                          autoDisplay: true
                        }, 'google_translate_element');
                      };
                    }
                    
                    const id = 'google-translate-script';
                    if (!document.getElementById(id)) {
                      const script = document.createElement('script');
                      script.id = id;
                      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                      script.async = true;
                      document.body.appendChild(script);
                    }
                    setIsTranslateLoaded(true);
                  }
                  triggerToast(
                    lang === 'ar' 
                      ? '🔄 جاري تحميل أداة مترجم Google... اختر لغتك من القائمة المنسدلة.' 
                      : lang === 'he'
                      ? '🔄 טוען את כלי התרגום של גוגל... בחר את השפה שלך מהרשימה.'
                      : '🔄 Loading Google Translate... Select your language from the dropdown.',
                    'success'
                  );
                }}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-500/20 hover:scale-[1.02] border border-orange-600"
              >
                <span>🌍 {lang === 'ar' ? 'تفعيل الترجمة الفورية لجميع اللغات' : lang === 'he' ? 'הפעל תרגום מיידי' : 'Activate Instant Translation'}</span>
              </button>
            ) : (
              <div className="w-full flex flex-col gap-4 text-right rtl:text-right ltr:text-left">
                {/* Search Language Input field */}
                <div className="relative w-full">
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-orange-500/70">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={translateSearchQuery}
                    onChange={(e) => setTranslateSearchQuery(e.target.value)}
                    placeholder={
                      lang === 'ar' 
                        ? '🔍 ابحث عن أي لغة في العالم (مثال: فرنسية، إسبانية، صينية)...' 
                        : lang === 'he'
                        ? '🔍 חפש כל שפה בעולם (למשל: רוסית, ספרדית, סינית)...'
                        : '🔍 Search any language (e.g., Spanish, German, French)...'
                    }
                    className="w-full pl-4 pr-10 py-2.5 text-xs bg-white/5 border border-orange-500/20 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all font-bold"
                  />
                  {translateSearchQuery && (
                    <button
                      onClick={() => setTranslateSearchQuery('')}
                      className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick select language pills (most popular ones) */}
                <div className="flex flex-wrap gap-1.5 items-center justify-center py-1">
                  <span className="text-[10px] font-bold text-gray-500 mr-1">
                    {lang === 'ar' ? 'سريع:' : lang === 'he' ? 'מהיר:' : 'Quick:'}
                  </span>
                  {[
                    { code: 'ar', name: 'العربية', flag: '🇸🇦' },
                    { code: 'en', name: 'English', flag: '🇺🇸' },
                    { code: 'he', name: 'עברית', flag: '🇮🇱' },
                    { code: 'fr', name: 'Français', flag: '🇫🇷' },
                    { code: 'es', name: 'Español', flag: '🇪🇸' },
                    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
                    { code: 'ru', name: 'Русский', flag: '🇷🇺' }
                  ].map((quick) => (
                    <button
                      key={quick.code}
                      type="button"
                      onClick={() => triggerGoogleTranslate(quick.code, quick.name)}
                      className={`px-2.5 py-1 text-[11px] font-black rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                        translateSelectedLang === quick.code
                          ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                      }`}
                    >
                      <span>{quick.flag}</span>
                      <span>{quick.name}</span>
                    </button>
                  ))}
                </div>

                {/* Filtered Languages Search Results Grid */}
                <div className="max-h-48 overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar border border-white/5 bg-black/20 rounded-xl p-2">
                  {globalLanguages
                    .filter(item => {
                      const q = translateSearchQuery.toLowerCase().trim();
                      if (!q) return false; // Only show results if user is actively searching
                      return (
                        item.nameAr.includes(q) ||
                        item.nameEn.toLowerCase().includes(q) ||
                        item.code.toLowerCase().includes(q)
                      );
                    })
                    .map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => triggerGoogleTranslate(item.code, item.nameAr)}
                        className={`w-full px-3 py-2 text-xs font-bold rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                          translateSelectedLang === item.code
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                            : 'bg-white/[0.02] hover:bg-white/[0.06] text-gray-300 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.flag}</span>
                          <span>{item.nameAr}</span>
                          <span className="text-[10px] text-gray-500 font-normal">({item.nameEn})</span>
                        </div>
                        {translateSelectedLang === item.code && (
                          <Check className="w-3.5 h-3.5 text-orange-500" />
                        )}
                      </button>
                    ))}
                  
                  {/* If user is not searching, show a friendly helper message */}
                  {!translateSearchQuery && (
                    <div className="py-6 text-center flex flex-col items-center justify-center gap-1.5 text-gray-500">
                      <Languages className="w-6 h-6 text-orange-500/30 animate-pulse" />
                      <p className="text-[10px] font-bold">
                        {lang === 'ar'
                          ? 'اكتب اسم أي لغة بالصندوق أعلاه للبحث والترجمة الفورية!'
                          : lang === 'he'
                          ? 'הקלד שם של שפה כלשהי בתיבה למעלה כדי לחפש ולתרגם!'
                          : 'Type any language name in the search box to filter & translate!'}
                      </p>
                      <p className="text-[9px] text-gray-600 font-normal">
                        {lang === 'ar'
                          ? 'ندعم أكثر من 100 لغة حول العالم عبر خوادم Google'
                          : lang === 'he'
                          ? 'תמיכה במעל 100 שפות שונות ברחבי העולם'
                          : 'Over 100+ languages supported worldwide'}
                      </p>
                    </div>
                  )}

                  {translateSearchQuery && globalLanguages.filter(item => {
                    const q = translateSearchQuery.toLowerCase().trim();
                    return (
                      item.nameAr.includes(q) ||
                      item.nameEn.toLowerCase().includes(q) ||
                      item.code.toLowerCase().includes(q)
                    );
                  }).length === 0 && (
                    <div className="py-6 text-center text-gray-500 text-[10px] font-bold">
                      {lang === 'ar' ? '❌ عذراً، لم نجد لغة مطابقة لبحثك.' : lang === 'he' ? '❌ לא נמצאו תוצאות עבור החיפוש שלך.' : '❌ Sorry, no matching languages found.'}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center gap-2.5 mt-1 border-t border-white/5 pt-3">
                  {/* Direct Dropdown target for native Google Translate frame mounting */}
                  <div className="flex items-center gap-2 w-full justify-center">
                    <span className="text-[10px] font-black text-gray-500">
                      {lang === 'ar' ? 'اختيار اللغة التقليدي:' : lang === 'he' ? 'בחירת שפה קלאסית:' : 'Classic Language Selector:'}
                    </span>
                    <div id="google_translate_element" className="min-h-[42px] flex items-center justify-center py-1"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const iframe = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement;
                        if (iframe) {
                          const restoreButton = iframe.contentWindow?.document.querySelector('.goog-te-button button') as HTMLButtonElement;
                          if (restoreButton) restoreButton.click();
                        } else {
                          // Clear standard translation cookies to reload in original
                          document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                          document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
                          window.location.reload();
                        }
                      } catch (e) {
                        window.location.reload();
                      }
                    }}
                    className="text-[10px] text-orange-500 hover:text-orange-400 font-black transition-colors underline cursor-pointer flex items-center gap-1"
                  >
                    <span>🔄 {lang === 'ar' ? 'إعادة الموقع للغة الأصلية' : lang === 'he' ? 'חזור לשפת המקור' : 'Restore Original Language'}</span>
                  </button>
                </div>
              </div>
            )}
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
                    triggerToast(
                      lang === 'ar' 
                        ? 'الرجاء تسجيل الدخول أولاً لطلب الخدمة المباشرة!' 
                        : lang === 'he'
                        ? 'אנא התחבר תחילה כדי להזמין שירות חילוץ ישיר!'
                        : 'Please sign in first to submit a live rescue request!', 
                      'info'
                    );
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
                  <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-medium whitespace-pre-line">
                    {service.desc}
                  </p>
                </div>

                <div className="text-xs font-bold text-amber-500 flex items-center gap-1.5 self-end">
                  <span>
                    {lang === 'ar' 
                      ? 'جرب الخدمة الآن' 
                      : lang === 'he'
                      ? 'נסה את השירות כעת'
                      : 'Test service now'}
                  </span>
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
                <span className="text-2xl font-black text-white font-mono">150 ₪ <span className="text-xs text-gray-400 font-bold font-sans">({lang === 'ar' ? 'شيكل' : lang === 'he' ? 'שקל' : 'Shekel'})</span></span>
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
                  ? 'ملاحظاتك تهمنا كثيراً لتطوير الخدمة! إذا صادفتك أي مشكلة برمجية، تأخير، أو خطأ في النظام، يرجى كتابتها فوراً ليصل تقريرك مباشرة إلى المهندس آدم عطون للمتابعة الفورية.' 
                  : lang === 'he'
                  ? 'המשוב שלך חשוב לנו מאוד לפיתוח השירות! אם נתקלת בבעיית תוכנה, עיכוב או שגיאת מערכת, אנא דווח עליה כאן כדי להגיע למהנדס אדם עטון באופן מיידי לטיפול פתרון.'
                  : 'Your feedback is extremely valuable to us! If you encounter any software bugs, delays, or system errors, please report them here to reach Eng. Adam Atoun immediately for resolving.'}
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
                        ? 'إرسال البلاغ فوراً للمهندس آدم عطون' 
                        : lang === 'he'
                        ? 'שלח דיווח מיידי למהנדס אדם עטון'
                        : 'Submit Issue to Eng. Adam Atoun'}
                    </span>
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
                    triggerToast(
                      lang === 'ar' 
                        ? 'سجل دخولك للدخول إلى بوابة طلبات الطوارئ!' 
                        : lang === 'he'
                        ? 'התחבר כדי לגשת לפורטל קריאות חירום!'
                        : 'Sign in to access the emergency rescue portal!', 
                      'warning'
                    );
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
