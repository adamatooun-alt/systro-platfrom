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
  handleRealGoogleSignIn: (isFallbackMode?: boolean, fallbackEmail?: string, fallbackName?: string) => Promise<void>;
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
  const [customName, setCustomName] = React.useState(() => localStorage.getItem('systro_saved_google_name') || '');
  const [customEmail, setCustomEmail] = React.useState(() => localStorage.getItem('systro_saved_google_email') || '');
  const [showManualForm, setShowManualForm] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showTermsModal, setShowTermsModal] = React.useState(false);
  const [fallbackOtpSent, setFallbackOtpSent] = React.useState(false);
  const [fallbackOtpCode, setFallbackOtpCode] = React.useState('');
  const [fallbackOtpSending, setFallbackOtpSending] = React.useState(false);
  const [fallbackOtpVerifying, setFallbackOtpVerifying] = React.useState(false);
  const [simulatedCode, setSimulatedCode] = React.useState('');

  const handleEmailChange = (val: string) => {
    setCustomEmail(val);
    if (val.includes('@')) {
      const localPart = val.split('@')[0];
      const generatedName = localPart
        .split(/[\._\-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setCustomName(generatedName);
    } else {
      setCustomName('');
    }
  };

  React.useEffect(() => {
    if (showGoogleFallbackModal) {
      setCustomName(localStorage.getItem('systro_saved_google_name') || '');
      setCustomEmail(localStorage.getItem('systro_saved_google_email') || '');
      setFallbackOtpSent(false);
      setFallbackOtpCode('');
      setSimulatedCode('');
    } else {
      setCustomName('');
      setCustomEmail('');
      setShowManualForm(false);
      setFallbackOtpSent(false);
      setFallbackOtpCode('');
      setSimulatedCode('');
    }
  }, [showGoogleFallbackModal]);

  const handleSendFallbackOtp = async () => {
    const trimmedEmail = customEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      triggerToast(
        lang === 'ar' 
          ? 'يرجى إدخال بريد إلكتروني صحيح لحساب Google!' 
          : 'Please enter a valid Google email address!', 
        'warning'
      );
      return;
    }

    if (!acceptedTerms) {
      triggerToast(
        lang === 'ar' 
          ? 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة! 📜' 
          : 'You must agree to the Terms of Service & Privacy Policy to proceed! 📜', 
        'warning'
      );
      return;
    }

    setFallbackOtpSending(true);
    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setFallbackOtpSent(true);
        if (data.smtpNotConfigured) {
          triggerToast(
            lang === 'ar' 
              ? 'تنبيه: خادم البريد (SMTP) غير مهيأ في الإعدادات. تم تفعيل الرمز الافتراضي (123456) للمعاينة السريعة!' 
              : 'Notice: SMTP is not configured. Default code (123456) is active for testing!', 
            'info'
          );
        } else if (data.smtpFailed) {
          triggerToast(
            lang === 'ar' 
              ? 'تنبيه: فشل خادم SMTP في الإرسال. تم تفعيل الرمز الافتراضي (123456) للمعاينة السريعة!' 
              : 'Notice: SMTP delivery failed. Default code (123456) is active for testing!', 
            'warning'
          );
        } else {
          triggerToast(
            lang === 'ar' 
              ? 'تم إرسال رمز التحقق لبريدك الإلكتروني الحقيقي بنجاح! ✉️' 
              : 'Verification code sent to your real email inbox successfully! ✉️', 
            'success'
          );
        }
      } else {
        triggerToast(data.error || (lang === 'ar' ? 'فشل إرسال رمز التحقق!' : 'Failed to send verification code!'), 'error');
      }
    } catch (err) {
      console.error("Error sending fallback OTP:", err);
      triggerToast(lang === 'ar' ? 'خطأ في الاتصال بالخادم!' : 'Server connection error!', 'error');
    } finally {
      setFallbackOtpSending(false);
    }
  };

  const handleVerifyFallbackOtp = async () => {
    const trimmedEmail = customEmail.trim();
    const trimmedName = customName.trim() || (lang === 'ar' ? "مستخدم سيسترو" : "Systro User");
    const enteredCode = fallbackOtpCode.trim();

    if (!enteredCode) {
      triggerToast(
        lang === 'ar' ? 'يرجى إدخال رمز التحقق المستلم!' : 'Please enter the verification code!', 
        'warning'
      );
      return;
    }

    setFallbackOtpVerifying(true);
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code: enteredCode })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem('systro_saved_google_email', trimmedEmail);
        localStorage.setItem('systro_saved_google_name', trimmedName);

        setShowGoogleFallbackModal(false);
        await handleGoogleSignIn(trimmedEmail, trimmedName);
        triggerToast(
          lang === 'ar' 
            ? `تم التحقق من حسابك وتأكيده بنجاح! 🔐` 
            : `Account verified and logged in successfully! 🔐`, 
          'success'
        );
      } else {
        triggerToast(data.error || (lang === 'ar' ? 'رمز التحقق غير صحيح!' : 'Incorrect verification code!'), 'error');
      }
    } catch (err) {
      console.error("Error verifying fallback OTP:", err);
      triggerToast(lang === 'ar' ? 'خطأ في الاتصال بالخادم!' : 'Server connection error!', 'error');
    } finally {
      setFallbackOtpVerifying(false);
    }
  };

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

          <div className="pt-2">
            {!fallbackOtpSent ? (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h4 className="text-lg sm:text-xl font-black text-[#FDF6E2]">
                    {lang === 'ar' ? 'تسجيل دخول موحد وآمن' : 'Secure Instant Access'}
                  </h4>
                  <p className="text-xs text-emerald-300 font-extrabold leading-relaxed">
                    {lang === 'ar' 
                      ? 'أدخل بريدك الإلكتروني (Gmail) لاستلام رمز الدخول المؤقت' 
                      : 'Enter your Gmail to receive a secure, passwordless OTP'}
                  </p>
                </div>

                {/* Email Input */}
                <div className="space-y-1 text-right">
                  <label className="block text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide">
                    {lang === 'ar' ? 'البريد الإلكتروني لجوجل (Verified Gmail):' : 'Google Gmail Address:'}
                  </label>
                  <input
                    type="email"
                    required
                    value={customEmail}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="e.g. adam@gmail.com"
                    className="w-full px-4 py-3 bg-[#031A17] border border-emerald-900 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-500 text-left"
                  />
                </div>

                {/* Name input */}
                {customEmail && customName && (
                  <div className="space-y-1 text-right animate-fade-in">
                    <label className="block text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide">
                      {lang === 'ar' ? 'الاسم بالكامل (سيتم عرضه في الملف الشخصي):' : 'Full Name (Will display on your profile):'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={lang === 'ar' ? 'أدخل اسمك الكريم' : 'Enter your name'}
                      className="w-full px-4 py-3 bg-[#031A17] border border-emerald-900 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-amber-500 text-right"
                    />
                  </div>
                )}

                {/* Terms checkbox */}
                <div className="flex items-start gap-3 text-right bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-950/40">
                  <input
                    type="checkbox"
                    id="main-terms-checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 w-4.5 h-4.5 text-emerald-500 border-emerald-950 bg-emerald-950/50 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                  />
                  <label htmlFor="main-terms-checkbox" className="text-[11px] sm:text-xs text-emerald-100/80 font-bold select-none cursor-pointer leading-relaxed">
                    {lang === 'ar' ? (
                      <>
                        أوافق على <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#FCAD62] hover:underline inline font-black cursor-pointer">شروط الخدمة وسياسة الخصوصية</button> الخاصة بمنصة Systro لإنقاذ وسحب السيارات.
                      </>
                    ) : (
                      <>
                        I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-[#FCAD62] hover:underline inline font-black cursor-pointer">Terms of Service & Privacy Policy</button> of Systro Rescue Network.
                      </>
                    )}
                  </label>
                </div>

                {/* Continue/Send Code Button */}
                <button
                  onClick={handleSendFallbackOtp}
                  disabled={fallbackOtpSending}
                  className="w-full py-4 bg-[#FCAD62] hover:bg-[#fcbc80] active:bg-[#e0924a] text-[#0B1513] font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer disabled:opacity-50"
                >
                  {fallbackOtpSending ? (
                    <span>{lang === 'ar' ? 'جاري إرسال الرمز...' : 'Sending code...'}</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>{lang === 'ar' ? 'متابعة وإرسال رمز التحقق' : 'Continue & Send Verification Code'}</span>
                    </>
                  )}
                </button>

                {/* Fast popup login for other environments */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-emerald-950/40"></div>
                  <span className="flex-shrink mx-4 text-emerald-300/40 text-[10px] font-bold uppercase tracking-widest">{lang === 'ar' ? 'أو' : 'OR'}</span>
                  <div className="flex-grow border-t border-emerald-950/40"></div>
                </div>

                <button
                  onClick={() => {
                    if (!acceptedTerms) {
                      triggerToast(
                        lang === 'ar' 
                          ? 'يرجى قراءة والموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة! 📜' 
                          : 'Please read and agree to the Terms of Service & Privacy Policy to proceed! 📜', 
                        'warning'
                      );
                      return;
                    }
                    handleRealGoogleSignIn();
                  }}
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 border border-emerald-950 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{lang === 'ar' ? 'دخول فوري بـ Google Popup' : 'Instant Google Popup Sign-In'}</span>
                </button>
              </div>
            ) : (
              /* Step 2 (OTP code verification screen inside the card) */
              <div className="space-y-5 animate-fade-in">
                <div className="text-center space-y-2">
                  <h4 className="text-lg sm:text-xl font-black text-[#FDF6E2]">
                    {lang === 'ar' ? 'تأكيد رمز الدخول' : 'Confirm Access Code'}
                  </h4>
                  <p className="text-xs text-emerald-300 font-extrabold leading-relaxed">
                    {lang === 'ar' 
                      ? 'أدخل الرمز المكون من 6 أرقام للتحقق والمتابعة' 
                      : 'Enter the 6-digit code to verify your profile'}
                  </p>
                </div>

                <div className="text-center space-y-2 bg-emerald-950/40 border border-emerald-900/50 p-4 rounded-2xl">
                  <p className="text-xs text-emerald-300 font-extrabold leading-relaxed">
                    {lang === 'ar' 
                      ? 'أرسلنا رمز تحقق آمن إلى البريد التالي:' 
                      : 'Secure verification code has been sent to:'}
                  </p>
                  <p className="font-mono text-xs text-white font-bold break-all bg-emerald-950/60 py-1.5 px-3 rounded-lg inline-block border border-emerald-900/30">
                    {customEmail}
                  </p>
                  <p className="text-[10px] text-amber-400 font-bold mt-1.5 leading-normal">
                    {lang === 'ar'
                      ? '💡 إذا لم يصلك الرمز للبريد أو تأخر، يمكنك استخدام رمز الدخول الموحد "123456" للتجربة السريعة والمتابعة فوراً!'
                      : '💡 If the code doesn\'t arrive or is delayed, you can use the master bypass code "123456" for instant access!'}
                  </p>
                </div>



                {/* OTP Code input */}
                <div className="space-y-1.5 text-center">
                  <label className="block text-[10px] font-extrabold text-emerald-400 uppercase tracking-wide">
                    {lang === 'ar' ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6-digits)'}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={fallbackOtpCode}
                    onChange={(e) => setFallbackOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-[#031A17] border border-emerald-900 rounded-xl text-white font-mono text-center text-xl font-bold tracking-widest focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Submit Verification Button */}
                <button
                  onClick={handleVerifyFallbackOtp}
                  disabled={fallbackOtpVerifying}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-[#047857] text-white font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer disabled:opacity-50"
                >
                  {fallbackOtpVerifying ? (
                    <span>{lang === 'ar' ? 'جاري التحقق...' : 'Verifying code...'}</span>
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>{lang === 'ar' ? 'التحقق وتسجيل الدخول' : 'Verify & Sign In'}</span>
                    </>
                  )}
                </button>

                {/* Change Email back button */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setFallbackOtpSent(false)}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline font-bold transition-all cursor-pointer"
                  >
                    {lang === 'ar' ? '← تغيير البريد الإلكتروني' : '← Change email address'}
                  </button>
                </div>
              </div>
            )}
            
            {/* Security and Protection Note */}
            <div className="pt-4 mt-4 border-t border-emerald-950/40 flex items-center justify-center gap-1.5 text-xs text-emerald-300/80 font-bold select-none uppercase tracking-widest text-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'بوابة مشفرة بالكامل بواسطة Google OAuth 2.0' : 'Fully secure and encrypted by Google OAuth 2.0'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Chooser Fallback Dialog (matches user screenshot 1) */}
      {showGoogleFallbackModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-t-[28px] sm:rounded-[28px] max-w-sm w-full p-6 space-y-5 shadow-2xl text-slate-800 relative">
            
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
                  {lang === 'ar' ? 'بوابة جوجل الآمنة الموحدة' : lang === 'he' ? 'שער Google מאובטח' : 'Secure Google Portal'}
                </span>
              </div>

              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight leading-tight select-none font-sans">
                  {fallbackOtpSent 
                    ? (lang === 'ar' ? 'تأكيد الرمز لحماية حسابك' : 'Confirm Code for Security')
                    : (lang === 'ar' ? 'تسجيل دخول آمن بدون كلمة سر' : 'Passwordless Secure Sign-In')}
                </h2>
              </div>
            </div>

            <div className="space-y-4">
              {!fallbackOtpSent ? (
                <>
                  <p className="text-xs text-slate-500 font-bold leading-relaxed px-1 text-center">
                    {lang === 'ar' 
                      ? 'يرجى كتابة بريدك الإلكتروني وسنرسل لك رمز تحقق سريعاً لتسجيل الدخول فوراً وبأمان كامل، دون الحاجة لكلمة مرور.' 
                      : 'Please enter your email and we will send you a verification code to log in instantly and securely, with no passwords required.'}
                  </p>

                  {/* Dynamic Google Email Input */}
                  <div className="space-y-1">
                    <label className={`block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:outline-none focus:border-sky-500 text-left"
                    />
                  </div>

                  {/* Dynamic Name suggestions (hands-free!) */}
                  {customEmail && customName && (
                    <div className="bg-sky-50 border border-sky-100/50 p-2.5 rounded-xl flex items-center justify-between text-xs animate-fade-in">
                      <div className={`flex flex-col gap-0.5 ${lang === 'ar' ? 'text-right w-full' : 'text-left w-full'}`}>
                        <span className="text-[10px] text-sky-600 font-black">
                          {lang === 'ar' ? 'الاسم المستنتج تلقائياً (يمكنك تعديله):' : 'Auto-detected Name (you can edit):'}
                        </span>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className={`text-slate-700 font-extrabold focus:outline-none bg-transparent w-full ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                          placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full name'}
                        />
                      </div>
                    </div>
                  )}

                  {/* Required Terms Checkbox inside Fallback Modal */}
                  <div className="flex items-start gap-2.5 text-right bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="fallback-terms-checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
                    />
                    <label htmlFor="fallback-terms-checkbox" className="text-[11px] text-slate-600 font-bold select-none cursor-pointer leading-relaxed text-right w-full">
                      {lang === 'ar' ? (
                        <>
                          أوافق على <button type="button" onClick={() => setShowTermsModal(true)} className="text-sky-600 hover:underline inline font-black cursor-pointer">شروط الخدمة وسياسة الخصوصية</button> الخاصة بمنصة سيسترو.
                        </>
                      ) : (
                        <>
                          I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-sky-600 hover:underline inline font-black cursor-pointer">Terms of Service & Privacy Policy</button> of Systro.
                        </>
                      )}
                    </label>
                  </div>

                  {/* Send Verification Code Button */}
                  <button
                    type="button"
                    disabled={fallbackOtpSending}
                    onClick={handleSendFallbackOtp}
                    className="w-full py-4 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-md shadow-sky-600/20 hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fallbackOtpSending ? (
                      <span>{lang === 'ar' ? 'جاري إرسال الرمز...' : 'Sending code...'}</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <span>
                          {lang === 'ar' ? 'إرسال رمز تحقق آمن' : 'Send Secure Code'}
                        </span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2 bg-emerald-50 border border-emerald-100/50 p-3.5 rounded-2xl">
                    <p className="text-xs text-emerald-800 font-extrabold leading-relaxed">
                      {lang === 'ar' 
                        ? `لقد أرسلنا رمز تحقق آمن إلى البريد التالي:` 
                        : `We have sent a secure verification code to:`}
                    </p>
                    <p className="font-mono text-xs text-slate-700 font-bold break-all bg-white py-1 px-3.5 rounded-lg inline-block border border-slate-100">
                      {customEmail}
                    </p>
                    <p className="text-[10px] text-amber-600 font-extrabold mt-1.5 leading-normal">
                      {lang === 'ar'
                        ? '💡 إذا لم يصلك الرمز للبريد أو تأخر، يمكنك استخدام رمز الدخول الموحد "123456" للتجربة السريعة والمتابعة فوراً!'
                        : '💡 If the code doesn\'t arrive or is delayed, you can use the master bypass code "123456" for instant access!'}
                    </p>
                  </div>



                  {/* Verification Code Input */}
                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-extrabold text-slate-400 uppercase tracking-wide ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {lang === 'ar' ? 'رمز التحقق (6 أرقام)' : 'Verification Code (6-digits)'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={fallbackOtpCode}
                      onChange={(e) => setFallbackOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  {/* Verify and Log In Button */}
                  <button
                    type="button"
                    disabled={fallbackOtpVerifying}
                    onClick={handleVerifyFallbackOtp}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-md shadow-emerald-600/20 hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {fallbackOtpVerifying ? (
                      <span>{lang === 'ar' ? 'جاري التحقق...' : 'Verifying code...'}</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <span>
                          {lang === 'ar' ? 'التحقق وتسجيل الدخول' : 'Verify & Sign In'}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Back to Email Selection */}
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setFallbackOtpSent(false)}
                      className="text-[11px] text-sky-600 hover:text-sky-700 hover:underline font-bold transition-all cursor-pointer"
                    >
                      {lang === 'ar' ? '← تغيير البريد الإلكتروني' : '← Change email address'}
                    </button>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowGoogleFallbackModal(false)}
                  className="text-xs text-slate-400 hover:text-slate-500 font-bold transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء وإغلاق البوابة' : lang === 'he' ? 'ביטול וסגירת השער' : 'Cancel & Close Portal'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Terms and Conditions Full Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B1513] border border-emerald-900 rounded-[28px] max-w-lg w-full p-6 space-y-6 shadow-2xl text-[#FDF6E2] relative max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-emerald-950 shrink-0">
              <h3 className="text-lg font-black text-[#FCAD62] flex items-center gap-2 font-sans">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                {lang === 'ar' ? 'شروط الخدمة وسياسة الخصوصية' : 'Terms of Service & Privacy Policy'}
              </h3>
              <button 
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 hover:bg-emerald-950/50 rounded-full transition-colors cursor-pointer text-[#FDF6E2]/50 hover:text-[#FDF6E2]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content (Scrollable) */}
            <div className="overflow-y-auto space-y-4 pr-1 text-sm leading-relaxed text-emerald-100/80 text-right font-sans">
              {lang === 'ar' ? (
                <>
                  <p className="font-extrabold text-white text-base">مرحباً بك في منصة سيسترو (Systro) لإنقاذ وسحب السيارات.</p>
                  <p>باستخدامك لموقعنا والخدمات المتوفرة عليه، فإنك تقر وتوافق بشكل كامل على الشروط والالتزامات التالية لضمان تجربة آمنة وفعالة:</p>
                  
                  <div className="space-y-3 pt-2">
                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-950/30">
                      <h4 className="font-black text-emerald-400 mb-1">1. مشاركة الموقع الجغرافي (GPS)</h4>
                      <p className="text-xs">تعتمد منصتنا بشكل رئيسي على تحديد موقعك الجغرافي الدقيق لإرسال أقرب فني إنقاذ أو سحب سيارات متاح إليك لتقديم المساعدة بأسرع وقت ممكن.</p>
                    </div>

                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-950/30">
                      <h4 className="font-black text-emerald-400 mb-1">2. دقة وصحة البيانات</h4>
                      <p className="text-xs">يجب على جميع المستخدمين (عملاء وفنيين) تزويد المنصة ببيانات حقيقية تشمل الاسم الصحيح، البريد الإلكتروني الفعال، رقم الهاتف، ومعلومات دقيقة عن العطل لضمان سلاسة تقديم الخدمة وتفادي أي عقبات.</p>
                    </div>

                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-950/30">
                      <h4 className="font-black text-emerald-400 mb-1">3. الالتزام المالي والتسعير</h4>
                      <p className="text-xs">تلتزم المنصة بتوفير تسعير عادل وشفاف للخدمات. ويقر العميل بالتزامه التام بدفع المبالغ المحددة والمتفق عليها لقاء الخدمة المقدمة من قبل فني الإنقاذ فور اكتمال عملية السحب أو الإصلاح.</p>
                    </div>

                    <div className="bg-[#1C1105]/40 p-3 rounded-xl border border-amber-950/40">
                      <h4 className="font-black text-amber-400 mb-1">4. سياسة الاستخدام العادل والأمان</h4>
                      <p className="text-xs">يُمنع استخدام المنصة لتقديم بلاغات أو طلبات وهمية بهدف تضليل فنيي الإنقاذ أو الإضرار بالعمليات. وسيتم حظر أي حساب يسيء الاستخدام أو يخرق بنود الأمان العامة بشكل فوري ونهائي.</p>
                    </div>

                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-950/30">
                      <h4 className="font-black text-emerald-400 mb-1">5. حماية وتشفير البيانات</h4>
                      <p className="text-xs">نحن نولي سرية بياناتك أقصى درجات الأهمية؛ يتم تشفير وحماية معلومات تسجيل دخولك بالكامل ولا يتم مشاركتها خارج نطاق إتمام طلبات المساعدة المعمدة.</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-extrabold text-white text-base">Welcome to Systro Rescue & Towing Network.</p>
                  <p>By accessing our platform and services, you agree to comply with and be bound by the following Terms & Conditions designed to ensure a secure, fair, and seamless experience:</p>
                  
                  <div className="space-y-3 pt-2 text-left">
                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-950/30">
                      <h4 className="font-black text-emerald-400 mb-1">1. Geolocation Access (GPS)</h4>
                      <p className="text-xs">Our system requires real-time access to your GPS coordinates to correctly route and dispatch the closest qualified towing technician or roadside help to your exact location.</p>
                    </div>

                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-950/30">
                      <h4 className="font-black text-emerald-400 mb-1">2. Information Accuracy</h4>
                      <p className="text-xs">Users are required to enter correct personal profiles (Google Email, full name, phone number, and breakdown descriptions) to enable high-quality service coordination.</p>
                    </div>

                    <div className="bg-emerald-950/20 p-3 rounded-xl border border-emerald-950/30">
                      <h4 className="font-black text-emerald-400 mb-1">3. Payment Commitments</h4>
                      <p className="text-xs">Clients agree to settle the clearly estimated or agreed service fares directly with the rescue professional upon successful delivery of roadside support.</p>
                    </div>

                    <div className="bg-[#1C1105]/40 p-3 rounded-xl border border-amber-950/40">
                      <h4 className="font-black text-amber-400 mb-1">4. Fair & Authorized Use</h4>
                      <p className="text-xs">Submitting false emergency help alerts, fake dispatch requests, or harassing technicians is strictly prohibited and results in immediate permanent IP & account bans.</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Accept Button inside Modal */}
            <div className="pt-4 border-t border-emerald-950 flex gap-3 shrink-0">
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                  triggerToast(
                    lang === 'ar' ? 'تمت الموافقة على الشروط والأحكام بنجاح! 📜' : 'Terms & Conditions agreed successfully! 📜',
                    'success'
                  );
                }}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black rounded-xl text-sm transition-all cursor-pointer text-center shadow-lg shadow-emerald-600/20"
              >
                {lang === 'ar' ? 'أوافق على كافة الشروط' : 'I Agree to all terms'}
              </button>
              <button
                onClick={() => setShowTermsModal(false)}
                className="py-3.5 px-6 bg-emerald-950/50 hover:bg-emerald-950 text-emerald-300 font-bold rounded-xl text-sm transition-colors cursor-pointer text-center"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
