import React, { useState } from 'react';
import { 
  Smartphone, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Send, 
  ShieldAlert, 
  Key,
  Check,
  Save
} from 'lucide-react';

interface SmsStatus {
  configured: boolean;
  accountSid: string;
  fromPhone: string;
}

interface SmsConfigPanelProps {
  lang: 'ar' | 'en' | 'he';
  status: SmsStatus | null;
  onRefresh: () => Promise<void>;
  triggerToast: (text: string, type: 'success' | 'warning' | 'info' | 'error') => void;
}

export default function SmsConfigPanel({
  lang,
  status,
  onRefresh,
  triggerToast
}: SmsConfigPanelProps) {
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromPhone, setFromPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [testPhone, setTestPhone] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountSid.trim() || !authToken.trim() || !fromPhone.trim()) {
      triggerToast(
        lang === 'ar' 
          ? 'يرجى إدخال جميع بيانات Twilio (Account SID, Auth Token, Sender Phone)!' 
          : 'Please enter all Twilio parameters!', 
        'warning'
      );
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/save-sms-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountSid, authToken, fromPhone })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(
          lang === 'ar' ? 'تم حفظ إعدادات بوابة SMS (Twilio) بنجاح!' : 'SMS Gateway configuration saved!', 
          'success'
        );
        await onRefresh();
      } else {
        triggerToast(data.error || 'Failed to save SMS config', 'error');
      }
    } catch (err: any) {
      triggerToast(lang === 'ar' ? 'خطأ في حفظ الإعدادات!' : 'Failed to save config!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      triggerToast(
        lang === 'ar' 
          ? 'الرجاء إدخال رقم هاتف صحيح لإجراء الاختبار!' 
          : 'Please enter a valid phone number for SMS test!', 
        'warning'
      );
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/test-sms', {
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
              ? 'تم إرسال رسالة SMS حقيقية بنجاح! يرجى التحقق من هاتفك.' 
              : 'SMS test message dispatched successfully! Please check your mobile phone.'
          )
        });
        triggerToast(
          lang === 'ar' 
            ? 'نجح إرسال SMS المباشر وتم التوصيل!' 
            : 'Live SMS successfully dispatched!', 
          'success'
        );
      } else {
        setTestResult({
          success: false,
          message: data.error || (
            lang === 'ar' 
              ? 'فشل الاتصال بـ Twilio SMS Gateway. يرجى مراجعة Account SID, Auth Token و Sender Phone.' 
              : 'Failed to connect to Twilio SMS API.'
          )
        });
        triggerToast(
          lang === 'ar' 
            ? 'خطأ في المصادقة أو التوصيل بـ Twilio SMS!' 
            : 'Twilio SMS connection error!', 
          'error'
        );
      }
    } catch (err: any) {
      console.error("Test SMS error:", err);
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
    <div id="sms-config-control-panel" className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {lang === 'ar' ? 'بوابة إرسال رسائل SMS المباشرة (Twilio SMS Gateway) 📲' : 'Live SMS Verification Gateway (Twilio) 📲'}
            </h3>
            <p className="text-[11px] text-slate-500 font-bold">
              {lang === 'ar' ? 'ربط وتأكيد إرسال رموز التحقق الحقيقية لجميع أرقام الهواتف المحمولة.' : 'Configure Twilio SMS for real-time phone verification OTP dispatches.'}
            </p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{lang === 'ar' ? 'تحديث الحالة' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* Connection Status Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 p-4 rounded-2xl border flex flex-col justify-between space-y-3 bg-slate-50 border-slate-200/80">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              {lang === 'ar' ? 'حالة البوابة الفعالية:' : 'Live Status:'}
            </span>
            {status?.configured ? (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-emerald-600 uppercase">
                  {lang === 'ar' ? 'بوابة SMS نشطة ومفعلة' : 'SMS Gateway Active'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-black text-amber-600 uppercase">
                  {lang === 'ar' ? 'تحتاج إلى إدخال مفاتيح Twilio' : 'Twilio Keys Required'}
                </span>
              </div>
            )}
          </div>
          
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
            {status?.configured 
              ? (lang === 'ar' ? 'البوابة متصلة بحساب Twilio وسيتم إرسال كل رمز OTP كرسالة SMS حقيقية إلى هاتف العميل.' : 'Gateway is linked to Twilio account. Real SMS codes dispatched directly to user phones.')
              : (lang === 'ar' ? 'أدخل بيانات حساب Twilio الخاص بك لإرسال رسائل SMS فعلية مباشرة للهواتف دون وضع المحاكاة.' : 'Enter your Twilio credentials below to send real SMS directly to user mobile phones.')
            }
          </p>
        </div>

        {/* Credentials Form */}
        <div className="md:col-span-2 p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-4">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            {lang === 'ar' ? 'إعدادات حساب Twilio SMS:' : 'Twilio Account Credentials:'}
          </span>

          <form onSubmit={handleSaveConfig} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">
                  {lang === 'ar' ? 'Account SID (معرف الحساب):' : 'Account SID:'}
                </label>
                <input
                  type="text"
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={accountSid}
                  onChange={(e) => setAccountSid(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-600 mb-1">
                  {lang === 'ar' ? 'Auth Token (رمز التوثيق):' : 'Auth Token:'}
                </label>
                <input
                  type="password"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-600 mb-1">
                {lang === 'ar' ? 'Twilio Phone Number (رقم المرسل):' : 'Twilio Phone Number:'}
              </label>
              <input
                type="text"
                placeholder="+14155552671"
                value={fromPhone}
                onChange={(e) => setFromPhone(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>{isSaving ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ مفاتيح Twilio SMS' : 'Save Twilio SMS Config')}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Test Real SMS Form */}
      <div className="pt-4 border-t border-slate-100">
        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Send className="w-4 h-4 text-emerald-600" />
          <span>{lang === 'ar' ? 'إجراء اختبار إرسال رسالة SMS فعلية للهاتف' : 'Run Live SMS Test to Phone'}</span>
        </h4>

        <form onSubmit={handleTestSms} className="flex flex-col sm:flex-row gap-2">
          <input
            type="tel"
            placeholder={lang === 'ar' ? 'أدخل رقم هاتف لاختباره (مثال: +966501234567)' : 'Enter phone (+966501234567)'}
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            disabled={isTesting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isTesting ? (
              <span>{lang === 'ar' ? 'جاري إرسال SMS...' : 'Sending...'}</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'إرسال SMS تجريبي مباشر 📱' : 'Send Test SMS 📱'}</span>
              </>
            )}
          </button>
        </form>

        {testResult && (
          <div className={`mt-3 p-3.5 rounded-xl border text-xs font-bold ${
            testResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="flex items-center gap-2">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
              <span>{testResult.message}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
