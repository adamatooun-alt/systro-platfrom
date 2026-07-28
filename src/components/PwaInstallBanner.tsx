import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share2, Sparkles, ExternalLink, Info, ShieldCheck } from 'lucide-react';

interface PwaInstallBannerProps {
  lang: 'ar' | 'en' | 'he';
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({ lang, triggerToast }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      setShowBanner(false);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(iosDevice);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect when app installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      triggerToast(
        lang === 'ar' ? 'تم تثبيت تطبيق سيسترو بنجاح على جهازك! 🎉' : 'Systro App installed successfully! 🎉',
        'success'
      );
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [lang, triggerToast]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        triggerToast(lang === 'ar' ? 'جاري تثبيت التطبيق...' : 'Installing application...', 'info');
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowGuideModal(true);
    } else {
      setShowGuideModal(true);
    }
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Floating PWA Install Bar at Top */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 px-4 py-2.5 shadow-lg border-b border-amber-300 flex items-center justify-between gap-3 text-xs font-bold relative z-40 animate-fade-in">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md font-black text-sm">
            <Smartphone className="w-4 h-4 animate-bounce" />
          </div>
          <div className="truncate text-right rtl:text-right ltr:text-left">
            <span className="font-black text-slate-950 block text-xs">
              {lang === 'ar' ? 'تثبيت تطبيق سيسترو على هاتفك 📲' : 'Install Systro App on your Phone 📲'}
            </span>
            <span className="text-[10px] text-slate-900 font-semibold hidden sm:inline">
              {lang === 'ar' ? 'تطبيق سريع PWA يشتغل بدون متجر بكامل المميزات' : 'Fast PWA app works offline with full features'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 text-xs cursor-pointer hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'تثبيت التطبيق مجاناً' : 'Install App Free'}</span>
          </button>

          <button
            onClick={() => setShowGuideModal(true)}
            title={lang === 'ar' ? 'كيفية التثبيت وقراءة التعليمات' : 'How to install'}
            className="p-1.5 bg-slate-900/20 hover:bg-slate-900/30 text-slate-950 rounded-lg transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowBanner(false)}
            className="p-1 text-slate-900/60 hover:text-slate-950 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Guide Modal - كيفية تحويل وتثبيت التطبيق */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in text-right rtl:text-right ltr:text-left">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 border border-slate-800 shadow-2xl relative text-white animate-scale-up">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 rtl:right-4 ltr:left-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'دليل تحويل الموقع إلى تطبيق PWA & APK' : 'Guide: PWA & APK App Conversion'}</span>
              </div>
              <h3 className="text-xl font-black text-white leading-tight">
                {lang === 'ar' ? 'كيف تقوم بتثبيت التطبيق على جهازك؟ 📲' : 'How to Install Systro App on Your Device'}
              </h3>
            </div>

            {/* Step 1: PWA Installation */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2.5 text-amber-400 font-black text-sm">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">1</span>
                <span>{lang === 'ar' ? 'التثبيت الفوري عبر تقنية PWA (الأسهل والأسرع):' : 'Instant PWA Installation (Fastest & Easiest):'}</span>
              </div>

              {isIOS ? (
                <div className="space-y-2 text-xs text-slate-300 font-medium">
                  <p className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>1. اضغط على زر <b>المشاركة (Share)</b> في أسفل متصفح Safari.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>2. اختر <b>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</b>.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>3. سيظهر تطبيق سيسترو مباشرة على شاشتك بأيقونة كاملة وبدون شريط متصفح!</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-xs text-slate-300 font-medium">
                  <p className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>1. اضغط على زر <b>تثبيت التطبيق</b> الموضح أعلى الصفحة.</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>2. وافق على التثبيت وسينزل التطبيق كـ App حقيقي على أجهزة أندرويد ووندوز وMac.</span>
                  </p>
                </div>
              )}
            </div>

            {/* Step 2: APK Conversion Instructions */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/50 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs">2</span>
                <span>{lang === 'ar' ? 'تحويله إلى ملف تطبيق أندرويد (APK) مجاناً:' : 'Convert to Android APK File Free:'}</span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed">
                {lang === 'ar'
                  ? 'يمكنك استخدام منصات مثل Web2App أو Appilix أو PWABuilder وتحويل رابط الموقع الحالي مباشرة إلى ملف أندرويد APK جاهز للتحميل والتثبيت!'
                  : 'You can use Web2App, Appilix, or PWABuilder to convert this web app URL into a downloadable Android APK file.'}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowGuideModal(false);
                  handleInstallClick();
                }}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{lang === 'ar' ? 'تثبيت الآن على الجهاز 📲' : 'Install Now on Device 📲'}</span>
              </button>
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
