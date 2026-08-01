import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle, Activity, X, Mail, CheckCircle2, Lock } from 'lucide-react';

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
  showAppleFallbackModal?: boolean;
  setShowAppleFallbackModal?: (show: boolean) => void;
  handleRealGoogleSignIn: (isFallbackMode?: boolean, fallbackEmail?: string, fallbackName?: string) => Promise<void>;
  handleRealAppleSignIn?: (isFallbackMode?: boolean, fallbackEmail?: string, fallbackName?: string) => Promise<void>;
  handleGoogleSignIn: (email: string, name: string, forceOverride?: boolean) => Promise<void>;
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
  showAppleFallbackModal = false,
  setShowAppleFallbackModal,
  handleRealGoogleSignIn,
  handleRealAppleSignIn,
  handleGoogleSignIn,
  triggerToast,
  t,
}: LoginPortalProps) {
  const [customName, setCustomName] = React.useState(() => sessionStorage.getItem('systro_saved_google_name') || '');
  const [customEmail, setCustomEmail] = React.useState(() => sessionStorage.getItem('systro_saved_google_email') || '');
  const [appleEmail, setAppleEmail] = React.useState(() => sessionStorage.getItem('systro_saved_apple_email') || '');
  const [appleName, setAppleName] = React.useState(() => sessionStorage.getItem('systro_saved_apple_name') || '');
  const [appleOtpSent, setAppleOtpSent] = React.useState(false);
  const [appleOtpCode, setAppleOtpCode] = React.useState('');
  const [appleOtpSending, setAppleOtpSending] = React.useState(false);
  const [appleOtpVerifying, setAppleOtpVerifying] = React.useState(false);
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [showTermsModal, setShowTermsModal] = React.useState(false);

  // Email Verification state
  const [fallbackOtpSent, setFallbackOtpSent] = React.useState(false);
  const [fallbackOtpCode, setFallbackOtpCode] = React.useState('');
  const [fallbackOtpSending, setFallbackOtpSending] = React.useState(false);
  const [fallbackOtpVerifying, setFallbackOtpVerifying] = React.useState(false);
  const [simulatedCode, setSimulatedCode] = React.useState('');
  const [resendCooldown, setResendCooldown] = React.useState(0);

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
      setCustomName(sessionStorage.getItem('systro_saved_google_name') || '');
      setCustomEmail(sessionStorage.getItem('systro_saved_google_email') || '');
      setFallbackOtpSent(false);
      setFallbackOtpCode('');
      setSimulatedCode('');
      setResendCooldown(0);
    } else {
      setCustomName('');
      setCustomEmail('');
      setFallbackOtpSent(false);
      setFallbackOtpCode('');
      setSimulatedCode('');
      setResendCooldown(0);
    }
  }, [showGoogleFallbackModal]);

  React.useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  React.useEffect(() => {
    if (!fallbackOtpSent) {
      setResendCooldown(0);
    }
  }, [fallbackOtpSent]);

  const handleSendFallbackOtp = async () => {
    const trimmedEmail = customEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      triggerToast(
        lang === 'ar' 
          ? 'يرجى إدخال بريد إلكتروني صحيح!' 
          : lang === 'he'
          ? 'אנא הזן כתובת אימייל תקינה!'
          : 'Please enter a valid email address!', 
        'warning'
      );
      return;
    }

    if (!acceptedTerms) {
      triggerToast(
        lang === 'ar' 
          ? 'يجب الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة! 📜' 
          : lang === 'he'
          ? 'עליך להסכים לתנאי השימוש ומדיניות הפרטיות כדי להמשיך! 📜'
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
        setResendCooldown(600); // 10 minutes
        if (data.simulatedCode) {
          setFallbackOtpCode(data.simulatedCode);
          setSimulatedCode(data.simulatedCode);
          triggerToast(
            lang === 'ar' 
              ? `تم إصدار رمز التحقق بنجاح: (${data.simulatedCode}) ✉️` 
              : `Verification code generated: (${data.simulatedCode}) ✉️`, 
            'info'
          );
        } else {
          setFallbackOtpCode('');
          triggerToast(
            lang === 'ar' 
              ? 'تم إرسال رمز التحقق لبريدك الإلكتروني بنجاح! ✉️' 
              : lang === 'he'
              ? 'קוד האימות נשלח לאימייל שלך בהצלחה! ✉️'
              : 'Verification code sent to your email inbox successfully! ✉️', 
            'success'
          );
        }
      } else {
        triggerToast(data.error || (lang === 'ar' ? 'فشل إرسال رمز التحقق!' : lang === 'he' ? 'שליחת קוד האימות נכשלה!' : 'Failed to send verification code!'), 'error');
      }
    } catch (err) {
      console.error("Error sending fallback OTP:", err);
      triggerToast(lang === 'ar' ? 'خطأ في الاتصال بالخادم!' : lang === 'he' ? 'שגיאת חיבור לשרת!' : 'Server connection error!', 'error');
    } finally {
      setFallbackOtpSending(false);
    }
  };

  const handleVerifyFallbackOtp = async () => {
    const trimmedEmail = customEmail.trim();
    const trimmedName = customName.trim() || (lang === 'ar' ? "مستخدم سيسترو" : lang === 'he' ? "משתמש סיסטרו" : "Systro User");
    const enteredCode = fallbackOtpCode.trim();

    if (!enteredCode) {
      triggerToast(
        lang === 'ar' ? 'يرجى إدخال رمز التحقق المستلم!' : lang === 'he' ? 'אנא הזן את קוד האימות שהתקבל!' : 'Please enter the verification code!', 
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
        sessionStorage.setItem('systro_saved_google_email', trimmedEmail);
        sessionStorage.setItem('systro_saved_google_name', trimmedName);

        setShowGoogleFallbackModal(false);
        await handleGoogleSignIn(trimmedEmail, trimmedName, true);
        triggerToast(
          lang === 'ar' 
            ? `تم التحقق من حسابك وتأكيده بنجاح! 🔐` 
            : lang === 'he'
            ? `חשבונך אומת והתחברת בהצלחה! 🔐`
            : `Account verified and logged in successfully! 🔐`, 
          'success'
        );
      } else {
        triggerToast(data.error || (lang === 'ar' ? 'رمز التحقق غير صحيح!' : lang === 'he' ? 'קוד האימות אינו תקין!' : 'Incorrect verification code!'), 'error');
      }
    } catch (err) {
      console.error("Error verifying fallback OTP:", err);
      triggerToast(lang === 'ar' ? 'خطأ في الاتصال بالخادم!' : lang === 'he' ? 'שגיאת חיבור לשרת!' : 'Server connection error!', 'error');
    } finally {
      setFallbackOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#031A17] text-white font-sans antialiased selection:bg-amber-500 selection:text-black flex flex-col justify-start items-center relative overflow-y-auto overflow-x-hidden pb-8">
      
      {/* Header Announcement Bar & Language Selector */}
      <div className="w-full relative z-50 flex flex-col items-center bg-[#051E1A]/80 backdrop-blur-md border-b border-amber-500/20 shrink-0">
        
        {/* Top Banner */}
        <div id="ali-premium-top-banner" className="w-full bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 py-2 px-4 text-center select-none flex items-center justify-center gap-2 border-b border-amber-500/10">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
          <span className="text-[11px] sm:text-xs font-black text-amber-300 tracking-wide leading-snug drop-shadow-sm">
            {lang === 'ar' 
              ? 'بإشراف وإدارة آدم عطون | المنصة الرقمية المعتمدة للإنقاذ السريع والخدمات الصناعية 🛠️✨' 
              : lang === 'he'
              ? 'בפיקוח ובניהול אדם עטון | פלטפורמת החילוץ המוסמכת והשירותים התעשייתיים 🛠️✨'
              : 'Supervised & Managed by Adam Atoun | The Certified Digital Platform for Rapid Rescue & Road Services 🛠️✨'}
          </span>
        </div>

        {/* Language Switcher Bar */}
        <div className="w-full flex justify-center py-1.5 border-t border-[#031A17]/45 bg-[#031A17]/60">
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

      {/* Soft Background Blurs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] left-[10%] w-[60%] h-[50%] rounded-full bg-cyan-500/8 blur-[130px]"></div>
        <div className="absolute top-[30%] -right-[15%] w-[50%] h-[50%] rounded-full bg-teal-500/6 blur-[140px]"></div>
        <div className="absolute -bottom-[10%] left-[15%] w-[45%] h-[45%] rounded-full bg-emerald-500/8 blur-[120px]"></div>
      </div>

      {/* Dynamic Toast Alerts */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 p-4 px-6 rounded-2xl border shadow-2xl backdrop-blur-md animate-fade-in transition-all bg-blue-500/20 border-blue-500/30 text-blue-200">
          {toast.type === 'success' && <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-400" />}
          {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />}
          {toast.type === 'info' && <Activity className="w-5 h-5 shrink-0 text-blue-400" />}
          <span className="text-sm font-black font-sans">{toast.text}</span>
        </div>
      )}

      {/* Central Content Area (Header + Card) */}
      <main className="w-full max-w-[460px] mx-auto px-4 pt-3 sm:pt-6 flex flex-col items-center gap-3 sm:gap-5 relative z-10 my-auto">
        
        {/* Central Logo & Brand Header Area */}
        <div className="flex flex-col items-center gap-2 text-center w-full">
          
          {/* Compact Systro Logo */}
          <div className="flex items-center justify-center gap-2.5 select-none animate-fade-in">
            <div className="w-12 h-12 sm:w-16 sm:h-16 relative rounded-[18px] sm:rounded-[22px] overflow-hidden p-[2px] bg-gradient-to-tr from-blue-400 via-cyan-300 to-teal-400 shadow-[0_8px_20px_rgba(37,99,235,0.35)] flex items-center justify-center shrink-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#1E3A8A] via-[#2563EB] to-[#06B6D4] rounded-[16px] sm:rounded-[20px] overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1/2 bg-white/10 rounded-t-[16px] sm:rounded-[20px] filter blur-[0.5px]"></div>
              </div>
              
              <svg className="w-8 h-8 sm:w-11 sm:h-11 relative z-10" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#1E3A8A" floodOpacity="0.5" />
                  </filter>
                  <linearGradient id="sGrad" x1="10%" y1="0%" x2="90%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="50%" stopColor="#E0F2FE" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
                
                <path d="M15 70 C 35 85, 70 65, 85 40" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="3 3" />
                <path d="M20 55 C 40 70, 75 55, 80 25" stroke="#38BDF8" strokeWidth="1.2" strokeOpacity="0.35" />
                
                <circle cx="85" cy="40" r="3.5" fill="#FFFFFF" />
                <circle cx="80" cy="25" r="2.5" fill="#38BDF8" />
                <circle cx="20" cy="55" r="3" fill="#38BDF8" />
                <circle cx="33" cy="67" r="4" fill="#E0F2FE" />
                <circle cx="15" cy="70" r="2" fill="#FFFFFF" />
                <circle cx="68" cy="35" r="4.5" fill="#FFFFFF" />

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
                
                <path 
                  d="M 70,30 
                     C 66,24  46,24  35,29 
                     C 25,34  26,44  39,46 
                     C 56,48  73,46  71,64 
                     C 68,76  44,78  28,70" 
                  stroke="#FFFFFF" 
                  strokeWidth="3" 
                  strokeLinecap="round"
                  strokeOpacity="0.85"
                />
              </svg>
            </div>
            
            <span className="text-2xl sm:text-3xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#38BDF8] via-[#0ea5e9] to-[#2563eb] select-none font-sans filter drop-shadow-[0_2px_10px_rgba(6,182,212,0.2)]">
              Systro
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FCAD62] shadow-[0_0_12px_rgba(252,173,98,0.7)] shrink-0 animate-pulse"></span>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-wide text-[#FDF6E2] select-none">
                {lang === 'ar' ? 'لننطلق' : lang === 'he' ? 'בואו נתחיל' : "Let's Go"}
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-100/70 font-semibold max-w-sm leading-tight select-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              {lang === 'ar' 
                ? 'مرحباً بك في شبكة سيسترو - اختر طريقة تسجيل الدخول المفضلّة للوصول الفوري' 
                : lang === 'he'
                ? 'ברוכים הבאים לרשת סיסטרו - בחר שיטת התחברות לגישה מיידית'
                : 'Welcome to Systro Network - Choose your preferred sign-in method for instant access'}
            </p>
          </div>
        </div>

        {/* Main Login Card Container */}
        <div className="w-full relative">
          {/* Badge above card border so it is 100% visible and never clipped */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white text-[11px] sm:text-xs font-black px-4 py-1.5 rounded-full shadow-[0_4px_14px_rgba(37,99,235,0.5)] z-20 whitespace-nowrap border border-sky-400/30 flex items-center gap-1.5">
            <span>🔐</span>
            <span>{lang === 'ar' ? 'تسجيل دخول آمن ومباشر' : lang === 'he' ? 'כניסה מאובטחת ומיידית' : 'Direct Secure Sign-In'}</span>
          </div>

          <div className="bg-[#0B1513] border border-emerald-950 rounded-[28px] sm:rounded-[36px] pt-8 pb-6 px-5 sm:pt-9 sm:pb-8 sm:px-8 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#FCAD62]/5 rounded-full blur-xl"></div>

            <div className="space-y-4 pt-1">
            
            {/* TWO SEPARATE CLEAN LOGIN BUTTONS */}
            <div className="space-y-3">
              {/* Button 1: Gmail / Google Sign In */}
              <button
                type="button"
                onClick={() => {
                  if (setShowAppleFallbackModal) setShowAppleFallbackModal(false);
                  handleRealGoogleSignIn();
                }}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-800 font-extrabold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer border border-slate-200 group"
              >
                <svg className="w-5 h-5 shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>
                  {lang === 'ar' ? 'تسجيل الدخول عبر Gmail' : lang === 'he' ? 'התחברות באמצעות Gmail' : 'Sign in with Gmail'}
                </span>
              </button>

              {/* Button 2: Sign in with Apple (Apple HIG Compliant) */}
              <button
                type="button"
                onClick={() => {
                  setShowGoogleFallbackModal(false);
                  if (handleRealAppleSignIn) {
                    handleRealAppleSignIn();
                  } else if (setShowAppleFallbackModal) {
                    setShowAppleFallbackModal(true);
                  }
                }}
                className="w-full py-3.5 px-4 bg-black hover:bg-neutral-900 active:bg-neutral-950 text-white font-extrabold rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer border border-neutral-800 group"
              >
                <svg className="w-5 h-5 fill-current text-white shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.9-14.38-6.08-3.6-2.93-7.53-7.69-11.79-14.28-6.19-9.5-11.03-20.13-14.52-31.88-3.48-11.75-5.23-22.85-5.23-33.3 0-14.2 3.52-25.85 10.57-34.96 7.05-9.12 15.89-13.78 26.51-13.98 4.95 0 10.29 1.22 16.03 3.65 5.74 2.43 9.77 3.65 12.09 3.65 1.82 0 5.82-1.25 12.02-3.75 6.19-2.5 11.39-3.68 15.59-3.56 11.4.63 20.67 4.95 27.81 12.98-10.01 6.08-14.89 14.65-14.64 25.72.25 8.7 3.55 16.14 9.9 22.32 6.35 6.18 13.99 9.8 22.92 10.87-2.31 6.83-5.24 13.68-8.79 20.55zM119.22 31.84c0-7.22 2.61-14.21 7.83-20.97 5.22-6.76 11.83-10.87 19.83-12.33.13 1.13.2 2.01.2 2.64 0 7.35-2.65 14.42-7.95 21.21-5.3 6.79-11.95 10.97-19.95 12.54-.13-.75-.2-1.78-.2-3.09z"/>
                </svg>
                <span>
                  {lang === 'ar' ? 'تسجيل الدخول باستخدام Apple' : lang === 'he' ? 'התחבר באמצעות Apple' : 'Sign in with Apple'}
                </span>
              </button>
            </div>

            {/* Security Note */}
            <div className="pt-2 border-t border-emerald-950/40 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-300/80 font-bold select-none text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{lang === 'ar' ? 'بوابة مشفرة ومحمية بالكامل 100% بدون كلمة سر' : lang === 'he' ? 'התחברות מאובטחת ומוצפנת 100%' : '100% Encrypted & Passwordless Secure Sign-In'}</span>
            </div>

            </div>
          </div>
        </div>
      </main>

      {/* Google Interactive Account Modal Fallback */}
      {showGoogleFallbackModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-white border border-slate-100 rounded-[28px] max-w-sm w-full p-6 space-y-5 shadow-2xl text-slate-800 relative my-auto">
            
            <button 
              onClick={() => setShowGoogleFallbackModal(false)}
              className="absolute top-4 left-4 p-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4 pt-2">
              <div className="flex flex-col items-center gap-2 text-center">
                <svg className="w-7 h-7" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fillRule="evenodd" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span className="text-[11px] font-bold text-slate-500 tracking-wide font-sans">
                  {lang === 'ar' ? 'بوابة جوجل الآمنة الموحدة' : 'Secure Google Portal'}
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
                      ? 'يرجى كتابة بريدك الإلكتروني وسنرسل لك رمز تحقق سريعاً لتسجيل الدخول فوراً وبأمان كامل.' 
                      : 'Please enter your email address to receive an instant verification code.'}
                  </p>

                  <div className="space-y-1">
                    <label className={`block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {lang === 'ar' ? 'البريد الإلكتروني (Gmail):' : lang === 'he' ? 'כתובת אימייל (Gmail):' : 'Gmail Email Address:'}
                    </label>
                    <input
                      type="email"
                      required
                      value={customEmail}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:outline-none focus:border-sky-500 text-left"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`block text-[10px] font-extrabold text-slate-500 uppercase tracking-wide ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {lang === 'ar' ? 'الاسم بالكامل:' : lang === 'he' ? 'שם מלא:' : 'Full Name:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={lang === 'ar' ? 'أدخل اسمك الكريم' : lang === 'he' ? 'הזן את שמך המלא' : 'Enter your full name'}
                      className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold text-sm focus:outline-none focus:border-sky-500 ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div className="flex items-start gap-2.5 text-right bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <input
                      type="checkbox"
                      id="fallback-terms-checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4.5 h-4.5 text-sky-600 border-slate-300 rounded focus:ring-sky-500 cursor-pointer"
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
                  </div>

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
                      placeholder="******"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:border-sky-500"
                    />
                  </div>

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

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setFallbackOtpSent(false)}
                      className="text-[11px] text-sky-600 hover:text-sky-700 hover:underline font-bold transition-all cursor-pointer"
                    >
                      {lang === 'ar' ? '← تغيير البريد الإلكتروني' : '← Change email address'}
                    </button>
                  </div>

                  <div className="text-center mt-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || fallbackOtpSending}
                      onClick={handleSendFallbackOtp}
                      className="text-[11px] text-sky-600 hover:text-sky-700 disabled:text-slate-400 font-bold transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-1.5 mx-auto"
                    >
                      {fallbackOtpSending ? (
                        <span>{lang === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
                      ) : resendCooldown > 0 ? (
                        <span>
                          {lang === 'ar' 
                            ? `إعادة إرسال الرمز بعد (${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, '0')})` 
                            : `Resend code in (${Math.floor(resendCooldown / 60)}:${String(resendCooldown % 60).padStart(2, '0')})`}
                        </span>
                      ) : (
                        <span>{lang === 'ar' ? '✉️ إعادة إرسال الرمز' : '✉️ Resend verification code'}</span>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Apple Interactive Account Modal Fallback */}
      {showAppleFallbackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in overflow-y-auto">
          <div className="bg-[#0f0f10] border border-neutral-800 rounded-[28px] max-w-sm w-full p-6 space-y-5 shadow-2xl text-white relative my-auto">
            
            <button 
              onClick={() => setShowAppleFallbackModal && setShowAppleFallbackModal(false)}
              className="absolute top-4 left-4 p-1.5 hover:bg-neutral-800 rounded-full transition-colors cursor-pointer text-neutral-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4 pt-2">
              <div className="flex flex-col items-center gap-2 text-center">
                <svg className="w-9 h-9 fill-current text-white" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.13-1.9-14.38-6.08-3.6-2.93-7.53-7.69-11.79-14.28-6.19-9.5-11.03-20.13-14.52-31.88-3.48-11.75-5.23-22.85-5.23-33.3 0-14.2 3.52-25.85 10.57-34.96 7.05-9.12 15.89-13.78 26.51-13.98 4.95 0 10.29 1.22 16.03 3.65 5.74 2.43 9.77 3.65 12.09 3.65 1.82 0 5.82-1.25 12.02-3.75 6.19-2.5 11.39-3.68 15.59-3.56 11.4.63 20.67 4.95 27.81 12.98-10.01 6.08-14.89 14.65-14.64 25.72.25 8.7 3.55 16.14 9.9 22.32 6.35 6.18 13.99 9.8 22.92 10.87-2.31 6.83-5.24 13.68-8.79 20.55zM119.22 31.84c0-7.22 2.61-14.21 7.83-20.97 5.22-6.76 11.83-10.87 19.83-12.33.13 1.13.2 2.01.2 2.64 0 7.35-2.65 14.42-7.95 21.21-5.3 6.79-11.95 10.97-19.95 12.54-.13-.75-.2-1.78-.2-3.09z"/>
                </svg>
                <span className="text-[11px] font-bold text-neutral-400 tracking-wide font-sans">
                  {lang === 'ar' ? 'Sign in with Apple ID' : lang === 'he' ? 'Sign in with Apple ID' : 'Sign in with Apple ID'}
                </span>
              </div>

              <div className="space-y-1 text-center">
                <h2 className="text-lg font-bold text-white tracking-tight leading-tight select-none font-sans">
                  {lang === 'ar' ? 'تسجيل الدخول باستخدام Apple' : lang === 'he' ? 'התחבר באמצעות Apple' : 'Sign in with Apple'}
                </h2>
                <p className="text-xs text-neutral-400 font-medium leading-relaxed px-1">
                  {lang === 'ar' 
                    ? 'أدخل حساب Apple ID أو iCloud الخاص بك للدخول السريع والآمن.' 
                    : lang === 'he'
                    ? 'הזן את חשבון ה-Apple ID או ה-iCloud שלך לכניסה מהירה ומאובטחת.'
                    : 'Enter your Apple ID or iCloud email address for fast, secure sign-in.'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {!appleOtpSent ? (
                <>
                  <div className="space-y-1">
                    <label className={`block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {lang === 'ar' ? 'البريد الإلكتروني لـ Apple ID / iCloud:' : 'Apple ID / iCloud Email:'}
                    </label>
                    <input
                      type="email"
                      required
                      value={appleEmail}
                      onChange={(e) => {
                        setAppleEmail(e.target.value);
                        if (e.target.value.includes('@') && !appleName) {
                          const username = e.target.value.split('@')[0];
                          const formattedName = username
                            .split(/[._-]/)
                            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                            .join(' ');
                          setAppleName(formattedName || (lang === 'ar' ? 'مستخدم Apple' : 'Apple User'));
                        }
                      }}
                      placeholder="name@icloud.com"
                      className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-white text-left"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {lang === 'ar' ? 'الاسم بالكامل:' : lang === 'he' ? 'שם מלא:' : 'Full Name:'}
                    </label>
                    <input
                      type="text"
                      required
                      value={appleName}
                      onChange={(e) => setAppleName(e.target.value)}
                      placeholder={lang === 'ar' ? 'أدخل اسمك الكريم' : lang === 'he' ? 'הזן את שמך המלא' : 'Enter full name'}
                      className={`w-full px-4 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-white ${lang === 'ar' ? 'text-right' : 'text-left'}`}
                    />
                  </div>

                  <div className="flex items-start gap-2.5 text-right bg-neutral-900/80 p-3 rounded-xl border border-neutral-800">
                    <input
                      type="checkbox"
                      id="apple-terms-checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 w-4.5 h-4.5 text-white border-neutral-600 rounded focus:ring-white cursor-pointer"
                    />
                    <label htmlFor="apple-terms-checkbox" className="text-[11px] text-neutral-300 font-bold select-none cursor-pointer leading-relaxed text-right w-full">
                      {lang === 'ar' ? (
                        <>
                          أوافق على <button type="button" onClick={() => setShowTermsModal(true)} className="text-white hover:underline inline font-black cursor-pointer">شروط الخدمة وسياسة الخصوصية</button> الخاصة بـ Apple و Systro.
                        </>
                      ) : (
                        <>
                          I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="text-white hover:underline inline font-black cursor-pointer">Terms & Privacy Policy</button> of Apple & Systro.
                        </>
                      )}
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={!appleEmail || !appleEmail.includes('@') || appleOtpSending}
                    onClick={async () => {
                      if (!acceptedTerms) {
                        triggerToast(lang === 'ar' ? 'يرجى الموافقة على شروط الخدمة أولاً!' : 'Please accept terms of service first!', 'warning');
                        return;
                      }
                      setAppleOtpSending(true);
                      sessionStorage.setItem('systro_saved_apple_email', appleEmail.trim());
                      sessionStorage.setItem('systro_saved_apple_name', appleName.trim() || 'Apple User');
                      
                      try {
                        const response = await fetch('/api/send-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: appleEmail.trim() })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                          setAppleOtpSent(true);
                          triggerToast(
                            lang === 'ar' 
                              ? `تم إرسال رمز التحقق الآمن إلى بريد Apple ID (${appleEmail.trim()}) بنجاح! ✉️` 
                              : `Verification code sent to Apple ID (${appleEmail.trim()})! ✉️`, 
                            'success'
                          );
                        } else {
                          // Fallback to direct login
                          if (handleRealAppleSignIn) {
                            await handleRealAppleSignIn(true, appleEmail.trim(), appleName.trim() || 'Apple User');
                          } else {
                            await handleGoogleSignIn(appleEmail.trim(), appleName.trim() || 'Apple User', true);
                            if (setShowAppleFallbackModal) setShowAppleFallbackModal(false);
                          }
                        }
                      } catch (err) {
                        if (handleRealAppleSignIn) {
                          await handleRealAppleSignIn(true, appleEmail.trim(), appleName.trim() || 'Apple User');
                        } else {
                          await handleGoogleSignIn(appleEmail.trim(), appleName.trim() || 'Apple User', true);
                          if (setShowAppleFallbackModal) setShowAppleFallbackModal(false);
                        }
                      } finally {
                        setAppleOtpSending(false);
                      }
                    }}
                    className="w-full py-3.5 bg-white hover:bg-neutral-200 active:bg-neutral-300 text-black font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {appleOtpSending ? (
                      <span>{lang === 'ar' ? 'جاري الاتصال بـ Apple...' : 'Connecting to Apple...'}</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <span>
                          {lang === 'ar' ? 'المتابعة مع Apple ID' : 'Continue with Apple ID'}
                        </span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-center space-y-2 bg-neutral-900 border border-neutral-800 p-3.5 rounded-2xl">
                    <p className="text-xs text-neutral-300 font-extrabold leading-relaxed">
                      {lang === 'ar' 
                        ? `لقد أرسلنا رمز التحقق إلى حساب Apple ID التالي:` 
                        : `Verification code sent to Apple ID:`}
                    </p>
                    <p className="font-mono text-xs text-white font-bold break-all bg-black py-1 px-3.5 rounded-lg inline-block border border-neutral-800">
                      {appleEmail}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className={`block text-[10px] font-extrabold text-neutral-400 uppercase tracking-wide ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                      {lang === 'ar' ? 'رمز التحقق المكون من 6 أرقام:' : '6-Digit Verification Code:'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={appleOtpCode}
                      onChange={(e) => setAppleOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="******"
                      className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-white font-mono text-center text-lg font-bold tracking-widest focus:outline-none focus:border-white"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={appleOtpVerifying || appleOtpCode.length < 6}
                    onClick={async () => {
                      setAppleOtpVerifying(true);
                      try {
                        const response = await fetch('/api/verify-otp', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: appleEmail.trim(), otp: appleOtpCode.trim() })
                        });
                        const data = await response.json();
                        if (response.ok && data.success) {
                          if (handleRealAppleSignIn) {
                            await handleRealAppleSignIn(true, appleEmail.trim(), appleName.trim() || 'Apple User');
                          } else {
                            await handleGoogleSignIn(appleEmail.trim(), appleName.trim() || 'Apple User');
                            if (setShowAppleFallbackModal) setShowAppleFallbackModal(false);
                          }
                          triggerToast(
                            lang === 'ar' ? 'تم تسجيل الدخول بنجاح عبر حساب Apple! ' : 'Signed in successfully via Apple ID! ',
                            'success'
                          );
                        } else {
                          triggerToast(data.error || (lang === 'ar' ? 'رمز التحقق غير صحيح!' : 'Invalid code!'), 'error');
                        }
                      } catch (err) {
                        triggerToast(lang === 'ar' ? 'خطأ أثناء التحقق!' : 'Error verifying code!', 'error');
                      } finally {
                        setAppleOtpVerifying(false);
                      }
                    }}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {appleOtpVerifying ? (
                      <span>{lang === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                        <span>
                          {lang === 'ar' ? 'تأكيد ودخول بحساب Apple' : 'Confirm & Sign in with Apple'}
                        </span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setAppleOtpSent(false)}
                      className="text-[11px] text-neutral-400 hover:text-white hover:underline font-bold transition-all cursor-pointer"
                    >
                      {lang === 'ar' ? '← تغيير حساب Apple ID' : '← Change Apple ID email'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terms of Service & Privacy Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0B1513] border border-emerald-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl text-emerald-100 max-h-[85vh] flex flex-col relative">
            <div className="flex items-center justify-between border-b border-emerald-900 pb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-lg text-white">
                  {lang === 'ar' ? 'شروط الخدمة وسياسة الخصوصية' : 'Terms of Service & Privacy Policy'}
                </h3>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-1.5 hover:bg-emerald-950 rounded-full transition-colors text-emerald-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 text-xs sm:text-sm text-emerald-200/90 leading-relaxed font-sans text-right" dir="rtl">
              <p className="font-bold text-amber-300">
                أهلاً بك في شبكة Systro للخدمات الرقمية والإنقاذ السريع.
              </p>
              <p>
                1. <strong>الخصوصية وأمان البيانات:</strong> نحن نلتزم بحماية بياناتك الشخصية وعدم مشاركتها مع أي طرف ثالث خارج إطار تقديم الخدمة وتسهيل التواصل.
              </p>
              <p>
                2. <strong>التحقق الآمن:</strong> يتم التحقق من الحسابات عبر بريد جوجل (Gmail) أو رمز البريد الإلكتروني المباشر (iOS Mail) لضمان بيئة آمنة وخالية من الحسابات الوهمية.
              </p>
              <p>
                3. <strong>الاستخدام العادل:</strong> يتعين على جميع المستخدمين والسائقين الالتزام بالمعايير الأخلاقية والمهنية أثناء طلب أو تقديم الخدمات.
              </p>
            </div>

            <div className="pt-3 border-t border-emerald-900 flex justify-end">
              <button
                onClick={() => {
                  setAcceptedTerms(true);
                  setShowTermsModal(false);
                }}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{lang === 'ar' ? 'موافقة وإغلاق' : 'Accept & Close'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
