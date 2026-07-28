import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share2, Sparkles, ExternalLink, Info, ShieldCheck, MoreVertical, Compass, Globe } from 'lucide-react';

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
  const [isInIframe, setIsInIframe] = useState<boolean>(false);

  useEffect(() => {
    // Check if running inside iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }

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
      console.log('Systro PWA beforeinstallprompt captured!');
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
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          triggerToast(lang === 'ar' ? 'جاري تثبيت تطبيق سيسترو...' : 'Installing Systro App...', 'info');
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA install prompt error:', err);
        setShowGuideModal(true);
      }
    } else {
      // Prompt not captured automatically (e.g. inside iframe or browser menu required)
      setShowGuideModal(true);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
    triggerToast(
      lang === 'ar' ? 'تم فتح الموقع في نافذة جديدة. يمكنك تثبيته الآن مباشرة!' : 'Opened in new tab. You can install it directly!',
      'info'
    );
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Floating PWA Install Bar at Top */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 px-3 sm:px-4 py-2.5 shadow-xl border-b border-amber-300 flex items-center justify-between gap-2.5 text-xs font-bold relative z-40 animate-fade-in select-none">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md font-black text-sm">
            <Smartphone className="w-4 h-4 animate-bounce" />
          </div>
          <div className="truncate text-right rtl:text-right ltr:text-left">
            <span className="font-black text-slate-950 block text-xs sm:text-sm leading-tight">
              {lang === 'ar' ? 'تطبيق سيسترو للإنقاذ والتكسي والمتجر 📲' : 'Systro App - Emergency, Taxi & Store 📲'}
            </span>
            <span className="text-[10px] text-slate-900 font-bold block sm:inline opacity-90">
              {lang === 'ar' ? 'تثبيت سريع على الشاشة الرئيسية بدون متجر' : 'Install on Home Screen fast without app store'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 text-xs cursor-pointer hover:scale-105 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Install App'}</span>
          </button>

          <button
            onClick={() => setShowGuideModal(true)}
            title={lang === 'ar' ? 'طريقة التثبيت' : 'How to install'}
            className="p-1.5 bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 rounded-lg transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowBanner(false)}
            className="p-1 text-slate-950/60 hover:text-slate-950 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Detailed Guide Modal - حل مشكلة عدم نزول التطبيق فوراً */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in text-right rtl:text-right ltr:text-left">
          <div className="bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-5 border border-slate-800 shadow-2xl relative text-white animate-scale-up max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 rtl:right-4 ltr:left-4 p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-full transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="space-y-2 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'خطوات تثبيت تطبيق سيسترو 📲' : 'Systro App Installation Steps 📲'}</span>
              </div>
              <h3 className="text-xl font-black text-white leading-tight">
                {lang === 'ar' ? 'كيف تثبّت التطبيق على شاشة هاتفك؟' : 'How to Install Systro on your Phone?'}
              </h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                {lang === 'ar'
                  ? 'إذا لم ينزل التطبيق تلقائياً، يرجع ذلك لسياسات الأمان في المتصفحات. اتبع الخطوات البسيطة التالية بحسب نوع هاتفك:'
                  : 'If automatic prompt did not trigger, follow these easy steps according to your browser/phone:'}
              </p>
            </div>

            {/* If in Iframe Warning */}
            {isInIframe && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-400 font-black">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>{lang === 'ar' ? 'ملاحظة مهمة جداً (تتصفح من داخل معاينة):' : 'Important Note (Preview mode):'}</span>
                </div>
                <p className="text-slate-300 font-medium leading-relaxed">
                  {lang === 'ar'
                    ? 'المتصفحات تمنع تنزيل التطبيقات تلقائياً أثناء التصفح داخل إطار المعاينة. يرجى الضغط على الزر أدناه لفتح الموقع في متصفح خارجي مستقل، ثم اضغط "تثبيت".'
                    : 'Browsers block PWA prompt inside preview frames. Click below to open in a direct tab then install.'}
                </p>
                <button
                  onClick={handleOpenInNewTab}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition-all flex items-center justify-center gap-2 text-xs shadow-md cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'فتح الموقع في نافذة متصفح جديدة للتثبيت 🌐' : 'Open in New Browser Tab to Install 🌐'}</span>
                </button>
              </div>
            )}

            {/* Step Guides for Android / iOS */}
            <div className="space-y-3">
              {/* Android Guide */}
              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">1</span>
                    <span>{lang === 'ar' ? 'هواتف أندرويد (متصفح كروم / Chrome):' : 'Android Phones (Chrome / Samsung):'}</span>
                  </div>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-bold">Android</span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 font-medium">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-slate-900 rounded-lg text-amber-400 shrink-0 mt-0.5">
                      <MoreVertical className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">{lang === 'ar' ? 'الخطوة الأولى:' : 'Step 1:'}</span>
                      <span>{lang === 'ar' ? 'اضغط على زر القائمة (الثلاث نقاط Vertical ⋮) في أعلى أو أسفل المتصفح.' : 'Tap the 3 dots menu button ⋮ in top right of Chrome.'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-slate-900 rounded-lg text-amber-400 shrink-0 mt-0.5">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">{lang === 'ar' ? 'الخطوة الثانية:' : 'Step 2:'}</span>
                      <span>
                        {lang === 'ar'
                          ? 'اختر "تثبيت التطبيق" (Install App) أو "الإضافة إلى الشاشة الرئيسية" (Add to Home screen).'
                          : 'Select "Install App" or "Add to Home Screen".'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* iOS Guide */}
              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
                    <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">2</span>
                    <span>{lang === 'ar' ? 'هواتف آيفون (متصفح سفاري / Safari):' : 'iPhones (Safari Browser):'}</span>
                  </div>
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-md font-bold">iOS / Apple</span>
                </div>

                <div className="space-y-2 text-xs text-slate-300 font-medium">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-slate-900 rounded-lg text-amber-400 shrink-0 mt-0.5">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">{lang === 'ar' ? 'الخطوة الأولى:' : 'Step 1:'}</span>
                      <span>{lang === 'ar' ? 'اضغط على زر المشاركة (Share) المربع مع سهم في أسفل الشاشة.' : 'Tap the Share icon at the bottom of Safari.'}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 bg-slate-900 rounded-lg text-amber-400 shrink-0 mt-0.5">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-white block">{lang === 'ar' ? 'الخطوة الثانية:' : 'Step 2:'}</span>
                      <span>
                        {lang === 'ar'
                          ? 'اسحب للقائمة واختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen).'
                          : 'Scroll down and tap "Add to Home Screen".'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Try Install Button if Prompt exists */}
            {deferredPrompt && (
              <button
                onClick={() => {
                  setShowGuideModal(false);
                  handleInstallClick();
                }}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
              >
                <Download className="w-4 h-4 text-slate-950" />
                <span>{lang === 'ar' ? 'اضغط هنا لتفعيل التثبيت المباشر 📲' : 'Click here for Direct Install 📲'}</span>
              </button>
            )}

            {/* Modal Footer Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleOpenInNewTab}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'فتح في متصفح خارجي' : 'Open in Browser'}</span>
              </button>

              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'فهمت ذلك' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
