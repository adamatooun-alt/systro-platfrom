import React, { useState } from 'react';
import { 
  MessageSquare, 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Send, 
  ShieldAlert, 
  Info,
  Check
} from 'lucide-react';

interface WhatsAppStatus {
  configured: boolean;
  instanceId: string;
  token: string;
  apiUrl: string;
}

interface WhatsAppConfigPanelProps {
  lang: 'ar' | 'en' | 'he';
  status: WhatsAppStatus | null;
  onRefresh: () => Promise<void>;
  triggerToast: (text: string, type: 'success' | 'warning' | 'info' | 'error') => void;
}

export default function WhatsAppConfigPanel({
  lang,
  status,
  onRefresh,
  triggerToast
}: WhatsAppConfigPanelProps) {
  const [testPhone, setTestPhone] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      triggerToast(
        lang === 'ar' 
          ? 'الرجاء إدخال رقم هاتف صحيح لإجراء الاختبار!' 
          : 'Please enter a valid phone number to run test!', 
        'warning'
      );
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPhone: testPhone.trim() })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || (
            lang === 'ar' 
              ? 'تم إرسال رسالة الواتس اب بنجاح! يرجى التحقق من هاتفك.' 
              : 'WhatsApp test message sent successfully! Please check your phone.'
          )
        });
        triggerToast(
          lang === 'ar' 
            ? 'نجح الاتصال ببوابة الواتس اب وتم إرسال الرسالة!' 
            : 'WhatsApp gateway connection succeeded!', 
          'success'
        );
      } else {
        setTestResult({
          success: false,
          message: data.error || (
            lang === 'ar' 
              ? 'فشل الاتصال بـ WhatsApp API. يرجى مراجعة Instance ID و Token.' 
              : 'Failed to connect to WhatsApp API. Check Instance ID and Token.'
          )
        });
        triggerToast(
          lang === 'ar' 
            ? 'خطأ في المصادقة أو التوصيل ببوابة الواتساب!' 
            : 'Authentication or connection error to WhatsApp Gateway!', 
          'error'
        );
      }
    } catch (err: any) {
      console.error("Test WhatsApp error:", err);
      setTestResult({
        success: false,
        message: err.message || 'Connection timeout or gateway offline.'
      });
      triggerToast(
        lang === 'ar' ? 'خطأ في الاتصال بالخادم!' : 'Server connection error!', 
        'error'
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div id="whatsapp-config-control-panel" className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {lang === 'ar' ? 'بوابة إرسال إشعارات الواتساب الحقيقية (WhatsApp API) 📱' : 'Official WhatsApp Notification Gateway 📱'}
            </h3>
            <p className="text-[11px] text-slate-500 font-bold">
              {lang === 'ar' ? 'تفعيل وتأكيد إرسال نداءات الاستغاثة الطارئة حقيقياً لهواتف الفنيين المسجلين.' : 'Configure and monitor real-time WhatsApp emergency alerts dispatched directly to technicians.'}
            </p>
          </div>
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 p-4 rounded-2xl border flex flex-col justify-between space-y-3 bg-slate-50 border-slate-200/80">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              {lang === 'ar' ? 'حالة التوصيل الفعلي:' : 'Connection Status:'}
            </span>
            {status?.configured ? (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-emerald-600 uppercase">
                  {lang === 'ar' ? 'بوابة الواتساب نشطة' : 'WhatsApp Gateway Live'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-amber-600 uppercase">
                  {lang === 'ar' ? 'وضع التجربة والمحاكاة' : 'Simulator Mode'}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
            {status?.configured 
              ? (lang === 'ar' ? 'يقوم النظام حالياً بإرسال رسائل WhatsApp حقيقية للفنيين بمجرد نشر أي بلاغ.' : 'System is currently dispatching live WhatsApp notification alerts directly to the tech list.')
              : (lang === 'ar' ? 'وضع المحاكاة نشط. يتم طباعة الإشعار وتفاصيله على شاشة المتصفح كـ Toast.' : 'Local sandbox simulation active. Dispatch triggers are flashed on screen as browser toasts.')
            }
          </p>
        </div>

        {/* Configurations status lists */}
        <div className="md:col-span-2 p-4 rounded-2xl border border-slate-200/80 bg-white space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            {lang === 'ar' ? 'بيانات الاعتماد المسجلة في الـ Environment:' : 'Environment Gateway Credentials:'}
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              {status?.instanceId ? (
                <span className="text-xs font-mono font-black text-slate-800">{status.instanceId}</span>
              ) : (
                <span className="text-xs font-bold text-red-500">WHATSAPP_INSTANCE_ID {lang === 'ar' ? 'مفقود' : 'Missing'}</span>
              )}
              <span className="text-[10px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'معرّف الخدمة (Instance ID):' : 'Instance ID:'}</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
              {status?.apiUrl ? (
                <span className="text-xs font-mono font-black text-slate-800 truncate max-w-[150px]">{status.apiUrl}</span>
              ) : (
                <span className="text-xs font-bold text-slate-400">api.ultramsg.com</span>
              )}
              <span className="text-[10px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'عنوان الـ API (URL):' : 'API URL:'}</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between sm:col-span-2">
              {status?.token ? (
                <div className="flex items-center gap-1 text-emerald-600">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono font-black text-slate-800 truncate max-w-[200px]">••••••••{status.token.substring(status.token.length - 4)}</span>
                </div>
              ) : (
                <span className="text-xs font-bold text-red-500">WHATSAPP_TOKEN {lang === 'ar' ? 'مفقود' : 'Missing'}</span>
              )}
              <span className="text-[10px] font-black text-slate-400 uppercase">{lang === 'ar' ? 'رمز المصادقة (Token):' : 'API Token:'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Interactive Tester */}
      <div className="p-5 bg-emerald-50/40 border border-emerald-200/60 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-emerald-600" />
          <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
            {lang === 'ar' ? 'مختبر إرسال رسالة WhatsApp تجريبية حقيقية 💬' : 'Instant WhatsApp Dispatch Tester'}
          </h4>
        </div>

        <form onSubmit={handleTestWhatsApp} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            required
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder={lang === 'ar' ? 'رقم الهاتف مع رمز الدولة (مثال: 97259xxxxxxx)' : 'Phone with country code (e.g. 972591234567)'}
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-bold text-left"
          />
          <button
            type="submit"
            disabled={isTesting}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
          >
            {isTesting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{lang === 'ar' ? 'جاري الإرسال...' : 'Sending...'}</span>
              </>
            ) : (
              <>
                <span>{lang === 'ar' ? 'إرسال رسالة تجريبية 💬' : 'Send Test WhatsApp 💬'}</span>
              </>
            )}
          </button>
        </form>

        {testResult && (
          <div className={`p-4 rounded-xl text-xs space-y-1 text-right ${
            testResult.success 
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <p className="font-extrabold flex items-center gap-1.5 justify-end">
              <span>{testResult.success ? (lang === 'ar' ? 'نجاح الإرسال بنجاح 🎉' : 'Test Succeeded! 🎉') : (lang === 'ar' ? 'فشل إرسال الرسالة ❌' : 'Test Failed ❌')}</span>
            </p>
            <p className="text-[11px] leading-relaxed font-semibold">{testResult.message}</p>
          </div>
        )}
      </div>

      {/* Comprehensive WhatsApp Setup Guide */}
      <div className="p-5 bg-slate-50 border border-slate-200/60 rounded-2xl space-y-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-slate-500" />
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
            {lang === 'ar' ? 'دليل تفعيل بوابة إرسال رسائل الواتس اب خطوة بخطوة' : 'Step-by-Step WhatsApp API Activation Guide'}
          </h4>
        </div>

        <div className="space-y-3 text-right">
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed font-bold">
            <p className="text-slate-800 font-black text-[11px]">
              {lang === 'ar' ? 'ربط وإرسال الإشعارات عبر منصة UltraMsg:' : 'Integrating with UltraMsg (Instant WhatsApp Sender):'}
            </p>
            <ul className="list-disc pr-4 space-y-1 text-[11px]">
              <li>{lang === 'ar' ? 'قم بالتسجيل مجاناً في موقع UltraMsg.com.' : 'Sign up free at UltraMsg.com.'}</li>
              <li>{lang === 'ar' ? 'امسح الـ QR Code الخاص بحساب الواتس اب لربط هاتفك وبدء الإرسال منه.' : 'Scan the QR code with your WhatsApp app on your phone to link your instance.'}</li>
              <li>{lang === 'ar' ? 'احصل على Instance ID و Token الخاصين بك واكتبهم في ملف البيئة (Environment variables) أدناه:' : 'Get your custom Instance ID and Token, then add them to your environment variables:'}</li>
            </ul>
            
            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[10px] space-y-1 text-left select-all">
              <div>WHATSAPP_INSTANCE_ID="instanceXXXXX"</div>
              <div>WHATSAPP_TOKEN="your_ultramsg_secret_token_here"</div>
              <div>WHATSAPP_API_URL="https://api.ultramsg.com"</div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/60 text-[10px] text-slate-500 font-bold flex items-center justify-end gap-1">
            <span>{lang === 'ar' ? 'أدخل هذه المتغيرات في الإعدادات أو ملف .env لتثبيت البوابة.' : 'Specify these variables in the Settings menu or .env configuration.'}</span>
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
