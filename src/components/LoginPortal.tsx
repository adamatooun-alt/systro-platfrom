import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Activity, X } from 'lucide-react';

interface LoginPortalProps {
  lang: 'ar' | 'en' | 'he';
  setLang: (lang: 'ar' | 'en' | 'he') => void;
  toast: { text: string; type: 'success' | 'warning' | 'info' | 'error' } | null;
  enteredName: string;
  setEnteredName: (name: string) => void;
  enteredEmail: string;
  setEnteredEmail: (email: string) => void;
  showGoogleFallbackModal: boolean;
  setShowGoogleFallbackModal: (show: boolean) => void;
  handleRealGoogleSignIn: (isFallbackMode?: boolean) => Promise<void>;
  handleGoogleSignIn: (email: string, name: string) => Promise<void>;
  triggerToast: (text: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  t: any;
}

export default function LoginPortal({
  lang,
  setLang,
  toast,
  enteredName,
  setEnteredName,
  enteredEmail,
  setEnteredEmail,
  showGoogleFallbackModal,
  setShowGoogleFallbackModal,
  handleRealGoogleSignIn,
  handleGoogleSignIn,
  triggerToast,
  t,
}: LoginPortalProps) {
  const [customName, setCustomName] = React.useState('');
  const [customEmail, setCustomEmail] = React.useState('');
  const [showManualForm, setShowManualForm] = React.useState(false);

  React.useEffect(() => {
    if (!showGoogleFallbackModal) {
      setCustomName('');
      setCustomEmail('');
      setShowManualForm(false);
    }
  }, [showGoogleFallbackModal]);

  return (
    <div className="min-h-screen bg-[#031A17] text-white font-sans antialiased selection:bg-amber-500 selection:text-black flex flex-col justify-between relative overflow-hidden">
      
      {/* Responsive Top Header Container (No overlaps on any screen width) */}
      <div className="w-full relative z-50 flex flex-col items-center bg-[#051E1A]/80 backdrop-blur-md border-b border-amber-500/20">
        
        {/* Custom Top Announcement Bar Featuring Ali */}
        <div id="ali-premium-top-banner" className="w-full bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 py-2.5 px-4 text-center select-none flex items-center justify-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="text-[10px] sm:text-xs font-black text-amber-400 tracking-wide leading-relaxed">
            {lang === 'ar' 
              ? 'بإشراف وإدارة آدم عطون | المنصة الرقمية المعتمدة للإنقاذ السريع والخدمات الصناعية 🛠️✨' 
              : lang === 'he'
              ? 'בפיקוח ובניהול אדם עטון | פלטפורמת החילוץ המוסמכת והשירותים התעשייתיים 🛠️✨'
              : 'Supervised & Managed by Adam Atoun | The Certified Digital Platform for Rapid Rescue & Road Services 🛠️✨'}
          </span>
        </div>

        {/* Clean Language Selector Bar placed directly under the announcement bar - no overlaps */}
        <div className="w-full flex justify-center py-2 border-t border-[#031A17]/45 bg-[#031A17]/60">
          <div className="flex items-center gap-1 bg-sky-950/45 border border-sky-500/15 p-1 rounded-2xl shadow-md">
            {[
              { code: 'ar', label: 'عربي' },
              { code: 'he', label: 'עברית' },
              { code: 'en', label: 'English' }
            ].map((item) => (
              <button
                key={item.code}
                onClick={() => setLang(item.code as any)}
                className={`px-3 py-1 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  lang === item.code
                    ? 'bg-sky-500/25 text-sky-100 border border-sky-400/25 shadow-inner'
                    : 'text-sky-300/60 hover:text-sky-200 hover:bg-sky-500/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Soft background ambient blurs (completely passive and non-blocking, behind text) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] left-[10%] w-[60%] h-[50%] rounded-full bg-cyan-500/8 blur-[130px]"></div>
        <div className="absolute top-[30%] -right-[15%] w-[50%] h-[50%] rounded-full bg-teal-500/6 blur-[140px]"></div>
        <div className="absolute -bottom-[10%] left-[15%] w-[45%] h-[45%] rounded-full bg-emerald-500/8 blur-[120px]"></div>
      </div>

      {/* Dynamic Toast Alerts inside Login Page */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-4 px-6 rounded-2xl border shadow-2xl backdrop-blur-md animate-fade-in transition-all bg-blue-500/20 border-blue-500/30 text-blue-200">
          {toast.type === 'success' && <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />}
          {toast.type === 'info' && <Activity className="w-5 h-5 shrink-0 text-blue-400" />}
          <span className="text-sm font-black font-sans">{toast.text}</span>
        </div>
      )}

      {/* Central Logo & Brand Header Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 pt-6 md:pt-12">
        <div className="flex flex-col items-center gap-6 text-center w-full max-w-md">
          
          {/* Interactive 3D/Glassmorphic Systro Icon */}
          <div className="flex flex-col items-center gap-3 select-none mb-2 animate-fade-in">
            <div className="w-24 h-24 sm:w-28 sm:h-28 relative rounded-[28px] sm:rounded-[32px] overflow-hidden p-[2px] bg-gradient-to-tr from-sky-400 via-teal-300 to-emerald-400 shadow-[0_15px_35px_rgba(6,182,212,0.25)] flex items-center justify-center">
              {/* High-quality internal background gradient with glass overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0CC1C6] via-[#029FA5] to-[#01686C] rounded-[26px] sm:rounded-[30px] overflow-hidden">
                {/* Glossy overlay */}
                <div className="absolute top-0 inset-x-0 h-1/2 bg-white/20 rounded-t-[26px] sm:rounded-[30px] filter blur-[0.5px]"></div>
              </div>
              
              {/* Styled fluid "S" SVG with glowing nodes matching the uploaded screenshot */}
              <svg className="w-16 h-16 sm:w-20 sm:h-20 relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#014A4D" floodOpacity="0.5" />
                  </filter>
                  <linearGradient id="sGrad" x1="10%" y1="0%" x2="90%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="50%" stopColor="#E0FAFC" />
                    <stop offset="100%" stopColor="#A5F3FC" />
                  </linearGradient>
                </defs>
                
                {/* Fluid glowing particles/lines trails in background */}
                <path d="M15 70 C 35 85, 70 65, 85 40" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.25" strokeDasharray="3 3" />
                <path d="M20 55 C 40 70, 75 55, 80 25" stroke="#00F5FF" strokeWidth="1.2" strokeOpacity="0.4" />
                
                {/* Floating glowing nodes (glowing circles matching screenshot) */}
                <circle cx="85" cy="40" r="3.5" fill="#FFFFFF" />
                <circle cx="80" cy="25" r="2.5" fill="#00F5FF" />
                <circle cx="20" cy="55" r="3" fill="#00F5FF" />
                <circle cx="33" cy="67" r="4" fill="#E0FAFC" />
                <circle cx="15" cy="70" r="2" fill="#FFFFFF" />
                <circle cx="68" cy="35" r="4.5" fill="#FFFFFF" />

                {/* Main Stylized "S" wave curves - thick flowing design */}
                <path 
                  d="M 75,32 
                     C 70,22  45,22  32,28 
                     C 20,34  22,46  38,48 
                     C 58,50  78,48  74,68 
                     C 70,82  42,84  25,74" 
                  stroke="url(#sGrad)" 
                  strokeWidth="11" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  filter="url(#shadow)"
                />
                
                {/* Inner highlight line to add premium 3D glass sheen to S */}
                <path 
                  d="M 70,30 
                     C 66,24  46,24  35,29 
                     C 25,34  26,44  39,46 
                     C 56,48  73,46  71,64 
                     C 68,76  44,78  28,70" 
                  stroke="#FFFFFF" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  strokeOpacity="0.8"
                />
              </svg>
            </div>
            
            {/* Brand Name text below the logo - bold, beautiful turquoise matching the image */}
            <span className="text-3xl sm:text-4xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#38BDF8] via-[#06B6D4] to-[#2DD4BF] select-none font-sans filter drop-shadow-[0_2px_10px_rgba(6,182,212,0.2)]">
              Systro
            </span>
          </div>

          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex items-center gap-2.5">
              {/* Glowing Orange Dot */}
              <span className="w-3.5 h-3.5 rounded-full bg-[#FCAD62] shadow-[0_0_12px_rgba(252,173,98,0.7)] shrink-0 animate-pulse"></span>
              {/* Elegant cream/beige text */}
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-[#FDF6E2] select-none">
                {lang === 'ar' ? 'لننطلق' : lang === 'he' ? 'בואו נתחיל' : "Let's Go"}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-emerald-100/70 font-semibold max-w-sm leading-relaxed select-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {lang === 'ar' 
                ? 'مرحباً بك في شبكة سيسترو لإنقاذ السيارات - بوابتك الآمنة متوفرة الآن بنقرة واحدة' 
                : 'Welcome to Systro Rescue Network - Your secure entrance is now one click away'}
            </p>
          </div>
        </div>
      </main>

      {/* Elegant Bottom Sheet Container (matches bottom sheet on screenshot 2) */}
      <div className="w-full max-w-[460px] mx-auto px-4 pb-10 md:pb-14 shrink-0 -mt-4">
        <div className="bg-[#0B1513] border border-emerald-950 rounded-[36px] pt-10 pb-8 px-8 sm:pt-12 sm:pb-10 sm:px-10 space-y-8 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#FCAD62]/5 rounded-full blur-xl"></div>
          
          {/* Tooltip Badge on Top of the Sheet */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[11px] sm:text-xs font-black px-5 py-2 rounded-full shadow-lg flex items-center gap-1 shrink-0 select-none animate-bounce">
            <span>{lang === 'ar' ? 'عملية تسجيل الدخول السابقة' : lang === 'he' ? 'תהליך התחברות קודם' : 'Previous session active'}</span>
            <div className="absolute bottom-[-3px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-[#2563EB] rotate-45"></div>
          </div>

          <div className="pt-2 space-y-5">
            <div className="text-center space-y-2.5">
              <h4 className="text-lg sm:text-xl font-black text-[#FDF6E2]">
                {lang === 'ar' ? 'تسجيل دخول موحد عبر Google' : 'Google Single Sign-On'}
              </h4>
              <p className="text-xs sm:text-sm text-emerald-300 font-extrabold leading-relaxed">
                {lang === 'ar' 
                  ? 'اضغط للمتابعة الفورية والتوصيل الآمن لحسابك بنظام سيسترو المعزز' 
                  : 'Click to authenticate instantly and sync with secure Systro portal'}
              </p>
            </div>

            {/* Main Google Button */}
            <button
              onClick={() => handleRealGoogleSignIn()}
              className="w-full py-4.5 bg-white hover:bg-slate-50 text-slate-800 font-extrabold rounded-2xl text-sm sm:text-[15px] transition-all flex items-center justify-center gap-3 shadow-xl border border-slate-100 hover:shadow-2xl cursor-pointer"
            >
              <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span className="font-sans font-black tracking-wide text-slate-800">
                {lang === 'ar' ? 'المتابعة باستخدام حساب Google' : lang === 'he' ? 'המשך באמצעות חשבון Google' : 'Continue with Google Account'}
              </span>
            </button>

            {/* Security and Protection Note */}
            <div className="pt-4 border-t border-emerald-950/40 flex items-center justify-center gap-1.5 text-xs text-emerald-300/80 font-bold select-none uppercase tracking-widest text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'بوابة مشفرة بالكامل بواسطة Google OAuth 2.0' : 'Fully secure and encrypted by Google OAuth 2.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Chooser Fallback Dialog (matches user screenshot 1) */}
      {showGoogleFallbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-t-[28px] sm:rounded-[28px] max-w-sm w-full p-6 space-y-6 shadow-2xl text-slate-800 relative">
            
            {/* Top Close Button (matches layout) */}
            <button 
              onClick={() => setShowGoogleFallbackModal(false)}
              className="absolute top-4 left-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4 pt-2">
              {/* Google multi-color G logo */}
              <div className="flex flex-col items-center gap-2 text-center">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-[11px] font-bold text-slate-500 tracking-wide font-sans">
                  {lang === 'ar' ? 'تسجيل الدخول باستخدام حساب Google' : lang === 'he' ? 'התחברות באמצעות Google' : 'Sign in with Google'}
                </span>
              </div>

              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight select-none">
                  {lang === 'ar' ? 'تسجيل الدخول الآمن إلى "Systro"' : lang === 'he' ? 'התחברות מאובטחת אל "Systro"' : 'Secure Sign-In to "Systro"'}
                </h2>
              </div>
            </div>

            {!showManualForm ? (
              <div className="space-y-5 animate-fade-in text-center">
                <p className="text-xs text-slate-500 font-bold leading-relaxed px-2">
                  {lang === 'ar' 
                    ? 'اضغط أدناه للاتصال المباشر واسترجاع تفاصيل حسابك تلقائياً وبأمان من Google لمتابعة الدخول دون الحاجة لكتابة البيانات يدوياً.' 
                    : lang === 'he'
                    ? 'לחץ למטה כדי להתחבר ולקבל את פרטי החשבון שלך באופן אוטומטי ומאובטח מ-Google ללא צורך בהקלדה ידנית.'
                    : 'Click below to connect and retrieve your account details automatically and securely from Google to sign in without typing.'}
                </p>

                <button
                  type="button"
                  onClick={async () => {
                    await handleRealGoogleSignIn(true);
                  }}
                  className="w-full py-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-md shadow-sky-600/20 hover:shadow-lg cursor-pointer"
                >
                  <svg className="w-5 h-5 bg-white p-0.5 rounded-full shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>
                    {lang === 'ar' ? 'استيراد الحساب والاتصال التلقائي' : lang === 'he' ? 'ייבוא חשבון והתחברות אוטומטית' : 'Import Account & Auto Connect'}
                  </span>
                </button>

                <div className="pt-4 border-t border-slate-100 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(true)}
                    className="text-xs font-extrabold text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
                  >
                    {lang === 'ar' ? 'أو أدخل بيانات حسابك يدوياً (كحل بديل)' : lang === 'he' ? 'או הזן את פרטי החשבון ידנית (חלופי)' : 'Or enter account details manually (alternative)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGoogleFallbackModal(false)}
                    className="text-xs text-slate-400 hover:text-slate-500 font-bold transition-colors cursor-pointer"
                  >
                    {lang === 'ar' ? 'إلغاء وإغلاق البوابة' : lang === 'he' ? 'ביטול וסגירת השער' : 'Cancel & Close Portal'}
                  </button>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmedName = customName.trim();
                  const trimmedEmail = customEmail.trim();
                  if (!trimmedName || !trimmedEmail) {
                    triggerToast(
                      lang === 'ar' 
                        ? 'الرجاء تعبئة جميع الحقول بشكل صحيح!' 
                        : lang === 'he'
                        ? 'אנא מלא את כל השדות בצורה נכונה!'
                        : 'Please fill in all fields correctly!', 
                      'warning'
                    );
                    return;
                  }
                  if (!trimmedEmail.includes('@')) {
                    triggerToast(
                      lang === 'ar' 
                        ? 'الرجاء إدخال بريد إلكتروني صحيح!' 
                        : lang === 'he'
                        ? 'אנא הזן כתובת אימייל תקינה!'
                        : 'Please enter a valid email address!', 
                      'warning'
                    );
                    return;
                  }
                  setShowGoogleFallbackModal(false);
                  await handleGoogleSignIn(trimmedEmail, trimmedName);
                  triggerToast(
                    lang === 'ar' 
                      ? `تم تسجيل الدخول بنجاح بحسابك: ${trimmedName}` 
                      : lang === 'he'
                      ? `התחברת בהצלחה עם החשבון: ${trimmedName}`
                      : `Successfully logged in under your account: ${trimmedName}`, 
                    'success'
                  );
                }}
                className="space-y-4 animate-fade-in"
              >
                <div className="space-y-1 text-left">
                  <label className={`block text-[11px] font-bold text-slate-500 uppercase tracking-wide ${lang === 'ar' || lang === 'he' ? 'text-right' : 'text-left'}`}>
                    {lang === 'ar' ? 'الاسم الكامل' : lang === 'he' ? 'שם מלא' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل اسمك الكريم' : lang === 'he' ? 'הכנס את שמך המלא' : 'Enter your full name'}
                    className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-500 font-bold ${lang === 'ar' || lang === 'he' ? 'text-right' : 'text-left'}`}
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className={`block text-[11px] font-bold text-slate-500 uppercase tracking-wide ${lang === 'ar' || lang === 'he' ? 'text-right' : 'text-left'}`}>
                    {lang === 'ar' ? 'البريد الإلكتروني للـ Google' : lang === 'he' ? 'כתובת אימייל של גוגל' : 'Google Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-sky-500 font-mono text-left"
                  />
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualForm(false);
                      }}
                      className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                    >
                      {lang === 'ar' ? 'رجوع للخلف' : lang === 'he' ? 'חזור' : 'Go Back'}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl text-xs shadow-md shadow-sky-600/10 transition-colors cursor-pointer text-center"
                    >
                      {lang === 'ar' ? 'متابعة الدخول' : lang === 'he' ? 'המשך התחברות' : 'Continue'}
                    </button>
                  </div>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
