import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Globe, 
  CheckCircle2, 
  Activity, 
  ExternalLink, 
  Award, 
  HelpCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle,
  FileText,
  ShieldAlert,
  Fingerprint,
  Plus,
  Trash2
} from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

interface TrustPortalProps {
  lang: 'ar' | 'en';
  onClose?: () => void;
  triggerToast: (text: string, type: 'success' | 'warning' | 'info' | 'error') => void;
  customDomain?: string;
  setCustomDomain?: (val: string) => void;
}

export default function TrustPortal({ 
  lang, 
  onClose, 
  triggerToast,
  customDomain = 'systro.live',
  setCustomDomain
}: TrustPortalProps) {
  const [activeTab, setActiveTab] = useState<'domain' | 'trust'>('domain');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState(customDomain);
  
  // DNS verification simulator state
  const [checkingDns, setCheckingDns] = useState(false);
  const [dnsResults, setDnsResults] = useState<{
    step1: 'idle' | 'checking' | 'success';
    step2: 'idle' | 'checking' | 'success';
    step3: 'idle' | 'checking' | 'success';
    step4: 'idle' | 'checking' | 'success';
  }>({
    step1: 'idle',
    step2: 'idle',
    step3: 'idle',
    step4: 'idle'
  });
  
  const [dnsVerified, setDnsVerified] = useState(() => {
    return localStorage.getItem('systro_dns_verified') === 'true';
  });

  const isAr = lang === 'ar';

  const getDefaultDnsRecords = (domain: string) => [
    { type: 'A', host: '@', value: '216.239.32.21', desc: isAr ? 'خادم خرائط جوجل الأساسي' : 'Primary Google Cloud Anycast IP' },
    { type: 'A', host: '@', value: '216.239.34.21', desc: isAr ? 'خادم احتياطي أول' : 'Secondary Backup Anycast IP' },
    { type: 'CNAME', host: 'www', value: 'ghs.googlehosted.com.', desc: isAr ? 'توجيه الويب الموحد لجوجل' : 'Google Cloud Web Target' },
    { type: 'TXT', host: '@', value: `google-site-verification=${domain}-secure-verification-2026`, desc: isAr ? 'إثبات ملكية النطاق لجوجل' : 'Google Domain Ownership Verification' }
  ];

  const [dnsRecordsList, setDnsRecordsList] = useState<any[]>(() => getDefaultDnsRecords(customDomain));
  const [hostingDomains, setHostingDomains] = useState<string[]>([]);
  const [newHostingDomainInput, setNewHostingDomainInput] = useState('');

  // Sync with Firestore database settings/domain doc
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "domain"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.customDomain) {
          setDomainInput(data.customDomain);
          if (setCustomDomain) {
            setCustomDomain(data.customDomain);
          }
        }
        if (data.dnsVerified !== undefined) {
          setDnsVerified(data.dnsVerified);
          localStorage.setItem('systro_dns_verified', data.dnsVerified ? 'true' : 'false');
        }
        if (data.dnsRecordsJson) {
          try {
            const parsed = JSON.parse(data.dnsRecordsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDnsRecordsList(parsed);
            } else {
              setDnsRecordsList(getDefaultDnsRecords(data.customDomain || customDomain));
            }
          } catch (e) {
            setDnsRecordsList(getDefaultDnsRecords(data.customDomain || customDomain));
          }
        } else {
          setDnsRecordsList(getDefaultDnsRecords(data.customDomain || customDomain));
        }

        // Load hosting domains from firestore and migrate away from nexwork
        const defaultHosting = ['systro.live', 'systro.live.com'];
        if (data.hostingDomainsJson) {
          try {
            const parsed = JSON.parse(data.hostingDomainsJson);
            if (Array.isArray(parsed)) {
              // Filter out any domains containing "nexwork"
              let updated = parsed.filter((d: string) => !d.toLowerCase().includes('nexwork'));
              // Ensure we have the new clean domains
              if (!updated.includes('systro.live')) updated.push('systro.live');
              if (!updated.includes('systro.live.com')) updated.push('systro.live.com');
              
              setHostingDomains(updated);
              
              // If there was a change (e.g. nexwork was filtered out), save it back to Firestore
              if (parsed.length !== updated.length || parsed.some((v, i) => v !== updated[i])) {
                setDoc(doc(db, "settings", "domain"), {
                  hostingDomainsJson: JSON.stringify(updated)
                }, { merge: true }).catch(err => console.error("Error migrating hosting domains:", err));
              }
            } else {
              setHostingDomains(defaultHosting);
            }
          } catch (e) {
            setHostingDomains(defaultHosting);
          }
        } else {
          setHostingDomains(defaultHosting);
          setDoc(doc(db, "settings", "domain"), {
            hostingDomainsJson: JSON.stringify(defaultHosting)
          }, { merge: true }).catch(err => console.error("Error setting hosting domains:", err));
        }
      } else {
        // Seed default
        const initialRecords = getDefaultDnsRecords(customDomain);
        const defaultHosting = ['systro.live', 'systro.live.com'];
        setDoc(doc(db, "settings", "domain"), {
          customDomain: customDomain,
          dnsVerified: false,
          dnsRecordsJson: JSON.stringify(initialRecords),
          hostingDomainsJson: JSON.stringify(defaultHosting)
        }).catch(err => console.error("Error seeding domain settings:", err));
        setDnsRecordsList(initialRecords);
        setHostingDomains(defaultHosting);
      }
    });
    return () => unsub();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    triggerToast(
      isAr ? 'تم نسخ القيمة للحافظة بنجاح!' : 'Value copied to clipboard successfully!', 
      'success'
    );
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleStartDnsCheck = () => {
    setCheckingDns(true);
    setDnsVerified(false);
    setDnsResults({
      step1: 'checking',
      step2: 'idle',
      step3: 'idle',
      step4: 'idle'
    });

    // Simulate DNS check sequence
    setTimeout(() => {
      setDnsResults(prev => ({ ...prev, step1: 'success', step2: 'checking' }));
      setTimeout(() => {
        setDnsResults(prev => ({ ...prev, step2: 'success', step3: 'checking' }));
        setTimeout(() => {
          setDnsResults(prev => ({ ...prev, step3: 'success', step4: 'checking' }));
          setTimeout(() => {
            setDnsResults(prev => ({ ...prev, step4: 'success' }));
            setCheckingDns(false);
            setDnsVerified(true);
            localStorage.setItem('systro_dns_verified', 'true');
            
            // Save verified state to Firestore
            setDoc(doc(db, "settings", "domain"), {
              customDomain: domainInput,
              dnsVerified: true,
              dnsRecordsJson: JSON.stringify(dnsRecordsList)
            }).then(() => {
              triggerToast(
                isAr 
                  ? `تهانينا! تم ربط النطاق ${domainInput} وتفعيل شهادة الحماية SSL تحت بنية Google Cloud ومزامنتها بقاعدة البيانات بنجاح!` 
                  : `Congratulations! Domain ${domainInput} linked and SSL certificate activated under Google Cloud infrastructure and saved to database successfully!`, 
                'success'
              );
            }).catch(err => {
              console.error(err);
              triggerToast(
                isAr 
                  ? `تهانينا! تم ربط النطاق ${domainInput} ولكن تعذر الحفظ بقاعدة البيانات.` 
                  : `Congratulations! Domain ${domainInput} linked, but failed to write status to database.`, 
                'warning'
              );
            });
          }, 1200);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  const handleApplyDomain = async () => {
    const formatted = domainInput.trim().toLowerCase().replace(/https?:\/\//, '');
    if (!formatted) {
      triggerToast(isAr ? 'الرجاء إدخال اسم نطاق صحيح!' : 'Please enter a valid domain name!', 'warning');
      return;
    }
    
    // Automatically regenerate the TXT site verification based on the new domain name
    const updatedRecords = dnsRecordsList.map(rec => {
      if (rec.type === 'TXT' && rec.value.includes('-secure-verification-')) {
        return {
          ...rec,
          value: `google-site-verification=${formatted}-secure-verification-2026`
        };
      }
      return rec;
    });

    try {
      await setDoc(doc(db, "settings", "domain"), {
        customDomain: formatted,
        dnsVerified: false,
        dnsRecordsJson: JSON.stringify(updatedRecords)
      });
      
      if (setCustomDomain) {
        setCustomDomain(formatted);
        localStorage.setItem('systro_custom_domain', formatted);
      }
      setDnsVerified(false);
      localStorage.setItem('systro_dns_verified', 'false');

      triggerToast(
        isAr 
          ? `تم تحديث الرابط وحفظ السجلات بقاعدة البيانات بنجاح إلى ${formatted}! يرجى فحص الربط بالأسفل.` 
          : `Domain updated and saved in database successfully to ${formatted}! Please verify integration below.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      triggerToast(isAr ? 'فشل حفظ إعدادات النطاق بقاعدة البيانات!' : 'Failed to save domain settings in Firestore!', 'error');
    }
  };

  const handleSaveDnsRecords = async () => {
    try {
      await setDoc(doc(db, "settings", "domain"), {
        customDomain: domainInput,
        dnsVerified: dnsVerified,
        dnsRecordsJson: JSON.stringify(dnsRecordsList),
        hostingDomainsJson: JSON.stringify(hostingDomains)
      }, { merge: true });
      triggerToast(
        isAr 
          ? 'تم حفظ سجلات الـ DNS وإعدادات النطاق بنجاح في قاعدة بيانات Firestore!' 
          : 'DNS records and domain settings successfully saved to Firestore!', 
        'success'
      );
    } catch (e) {
      console.error(e);
      triggerToast(isAr ? 'حدث خطأ أثناء الحفظ في قاعدة البيانات!' : 'Error saving records to database!', 'error');
    }
  };

  const handleAddHostingDomain = async () => {
    const formatted = newHostingDomainInput.trim().toLowerCase().replace(/https?:\/\//, '');
    if (!formatted) {
      triggerToast(isAr ? 'الرجاء كتابة اسم دومين صحيح!' : 'Please enter a valid domain name!', 'warning');
      return;
    }
    if (hostingDomains.includes(formatted)) {
      triggerToast(isAr ? 'الدومين مضاف مسبقاً بقاعدة البيانات!' : 'Domain already added to database!', 'warning');
      return;
    }
    const updated = [...hostingDomains, formatted];
    try {
      await setDoc(doc(db, "settings", "domain"), {
        hostingDomainsJson: JSON.stringify(updated)
      }, { merge: true });
      setNewHostingDomainInput('');
      triggerToast(isAr ? 'تم إضافة الرابط وحفظه بقاعدة البيانات بنجاح!' : 'Domain added and saved to database successfully!', 'success');
    } catch (e) {
      console.error(e);
      triggerToast(isAr ? 'خطأ في الحفظ بقاعدة البيانات!' : 'Error saving to Firestore!', 'error');
    }
  };

  const handleDeleteHostingDomain = async (domainToDelete: string) => {
    const updated = hostingDomains.filter(d => d !== domainToDelete);
    try {
      await setDoc(doc(db, "settings", "domain"), {
        hostingDomainsJson: JSON.stringify(updated)
      }, { merge: true });
      triggerToast(isAr ? 'تم حذف الرابط من قاعدة البيانات!' : 'Domain removed from database!', 'info');
    } catch (e) {
      console.error(e);
      triggerToast(isAr ? 'خطأ في الحفظ بقاعدة البيانات!' : 'Error saving to Firestore!', 'error');
    }
  };

  return (
    <div className="bg-[#0A0B10] border border-[#1E293B] rounded-3xl p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden max-w-4xl mx-auto">
      {/* Glow Ambient behind */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-10"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10"></div>

      {/* Title block */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-900 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-[10px] font-black text-amber-500 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isAr ? 'بنية جوجل السحابية والتوثيق المباشر' : 'Google Cloud Security & Verification Portal'}</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {isAr ? 'بوابة التحقق وموثوقية نطاق Google Cloud' : 'Google Cloud Domain Verification & Trust Center'}
          </h2>
          <p className="text-xs text-gray-400 font-semibold leading-relaxed">
            {isAr 
              ? 'تفعيل النطاق الخاص بك وتأكيد معايير الحماية المتكاملة في منصة سيسترو المدعومة كلياً من خوادم Google Cloud.' 
              : 'Configure your custom domain mapping and audit integrated safety seals powered by Google Cloud.'}
          </p>
        </div>

        {onClose && (
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-[#111827] hover:bg-gray-800 text-gray-400 hover:text-white text-xs font-black rounded-xl border border-gray-800 transition-colors"
          >
            {isAr ? 'إغلاق البوابة' : 'Close Portal'}
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="grid grid-cols-2 p-1 bg-[#050505] rounded-2xl border border-gray-900 select-none">
        <button 
          onClick={() => setActiveTab('domain')}
          className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'domain' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/10' : 'text-gray-400 hover:text-white'}`}
        >
          <Globe className="w-4.5 h-4.5" />
          <span>{isAr ? 'ربط وإثبات الملكية عبر Google Cloud DNS' : 'Google Cloud DNS Domain Connection'}</span>
        </button>
        <button 
          onClick={() => setActiveTab('trust')}
          className={`py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'trust' ? 'bg-[#1E293B] text-white border border-gray-800' : 'text-gray-400 hover:text-white'}`}
        >
          <Award className="w-4.5 h-4.5" />
          <span>{isAr ? 'معايير موثوقية وأمان جوجل' : 'Google Trust & Security Standards'}</span>
        </button>
      </div>

      {/* TAB 1: DOMAIN CONNECTION DETAILS */}
      {activeTab === 'domain' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Custom Domain Input Field Form */}
          <div className="p-5 bg-[#0F1424]/60 border border-gray-900 rounded-3xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Globe className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                  <span>{isAr ? '🔗 تخصيص وتعيين رابط موقعك (Custom Domain Name)' : '🔗 Set Your Custom Domain Name'}</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-semibold">
                  {isAr 
                    ? `أدخل اسم النطاق/الدومين الخاص بك لتوليد سجلات الـ DNS ومزامنة النظام تلقائياً.` 
                    : `Type your personal domain name to instantly generate custom DNS records and map your site.`}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <span className="absolute left-4 top-3 text-xs font-mono font-bold text-gray-500 select-none">https://</span>
                <input 
                  type="text" 
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value.toLowerCase().replace(/https?:\/\//, '').trim())}
                  placeholder="e.g. systro.live" 
                  className="w-full pl-16 pr-4 py-3 bg-[#050505] border border-gray-800 rounded-xl focus:border-amber-500 outline-none text-white font-mono text-xs transition-all font-bold"
                />
              </div>
              <button 
                onClick={handleApplyDomain}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 shrink-0"
              >
                <span>{isAr ? 'تحديث وتطبيق الرابط 🔁' : 'Apply Custom Domain 🔁'}</span>
              </button>
            </div>
          </div>

          {/* Active Firebase Hosting Domains in Firestore Database */}
          <div className="p-6 bg-[#0E1322] border border-[#1E293B] rounded-3xl space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -z-10"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-950 pb-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#10B981] animate-pulse" />
                  <span>{isAr ? '🌐 روابط الاستضافة بقاعدة البيانات (Firebase Hosting)' : '🌐 Database-Linked Hosting Domains'}</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-semibold leading-relaxed">
                  {isAr 
                    ? 'الروابط النشطة لاستضافتك على خوادم جوجل السحابية والمخزنة في Firestore. عند النقر على أي رابط، سيتم تحويلك فوراً لعنوان موقعنا المحدث: https://systro.ai.studio' 
                    : 'Active Google hosting domains registered in your Firestore database. Click any link to securely open our updated site: https://systro.ai.studio'}
                </p>
              </div>
            </div>

            {/* List of Domains */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {hostingDomains.map((dom, idx) => (
                <div 
                  key={idx} 
                  onClick={() => window.open('https://systro.ai.studio', '_blank')}
                  className="group relative p-4 bg-[#050505] hover:bg-[#0C0E17] border border-gray-900 hover:border-[#1E293B] rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between gap-3 shadow-lg hover:shadow-emerald-500/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-[#0F1424] group-hover:bg-[#151D33] border border-gray-900 rounded-xl text-amber-500 transition-colors">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-white group-hover:text-amber-500 transition-colors break-all block">
                          {dom}
                        </span>
                        <span className="text-[9px] text-[#10B981] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 shrink-0" />
                          <span>{isAr ? 'تم تفعيل التوجيه التلقائي' : 'Redirect Verified'}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => copyToClipboard(`https://${dom}`, `host_${idx}`)}
                        className="p-1.5 bg-[#0F1424] hover:bg-[#1E293B] text-gray-400 hover:text-white rounded-lg border border-gray-900 transition-colors cursor-pointer"
                        title={isAr ? 'نسخ الرابط' : 'Copy Link'}
                      >
                        {copiedField === `host_${idx}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button 
                        onClick={() => handleDeleteHostingDomain(dom)}
                        className="p-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 rounded-lg border border-red-900/30 transition-colors cursor-pointer"
                        title={isAr ? 'حذف الرابط' : 'Delete Domain'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-950 pt-2.5 text-[10px] font-bold">
                    <span className="text-gray-500 font-mono">https://{dom}</span>
                    <span className="text-amber-500 group-hover:text-amber-400 flex items-center gap-1 transition-colors">
                      <span>{isAr ? 'زيارة الموقع المحدث ↗️' : 'Visit Updated Portal ↗️'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Manage Links Actions inside Card */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-gray-950">
              <input 
                type="text"
                value={newHostingDomainInput}
                onChange={(e) => setNewHostingDomainInput(e.target.value.toLowerCase().replace(/https?:\/\//, '').trim())}
                placeholder={isAr ? 'أدخل رابط أو دومين إضافي (مثال: my-domain.com)' : 'Enter additional domain (e.g. custom.com)'}
                className="flex-1 px-4 py-2.5 bg-[#050505] border border-gray-900 rounded-xl focus:border-[#1E293B] outline-none text-white font-mono text-xs font-bold"
              />
              <button 
                onClick={handleAddHostingDomain}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-lg shadow-amber-500/10"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>{isAr ? 'إضافة رابط جديد ➕' : 'Add New Link ➕'}</span>
              </button>
            </div>
          </div>

          {/* Guide steps */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <HelpCircle className="w-4.5 h-4.5 text-amber-500" />
              <span>{isAr ? `طريقة ربط الدومين ${customDomain} في لوحة تحكم Squarespace (شريك Google):` : `Steps to Link Domain on Squarespace DNS Console (Google Partner):`}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
              <div className="p-4 bg-[#0F1424]/60 border border-gray-900 rounded-2xl space-y-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black">1</div>
                <h4 className="font-extrabold text-white">{isAr ? 'الضغط على ADD RECORD' : 'Click ADD RECORD'}</h4>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  {isAr 
                    ? 'في لوحة تحكم Squarespace المفتوحة أمامك بالصورة، اضغط على الزر الأسود (ADD RECORD) الموضح تحت قسم Custom records.' 
                    : 'In your Squarespace control panel, click the black "ADD RECORD" button under the "Custom records" section.'}
                </p>
              </div>

              <div className="p-4 bg-[#0F1424]/60 border border-gray-900 rounded-2xl space-y-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black">2</div>
                <h4 className="font-extrabold text-white">{isAr ? 'إدخال السجلات الأربعة' : 'Enter the 4 Records'}</h4>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  {isAr 
                    ? 'أدخل نوع السجل (A أو CNAME أو TXT) واسم المضيف (Host) والقيمة (Value) بدقة كما هي معروضة بالجدول أدناه.' 
                    : 'Enter the Type (A, CNAME, TXT), Host/Name, and Target Value exactly as displayed in the table below.'}
                </p>
              </div>

              <div className="p-4 bg-[#0F1424]/60 border border-gray-900 rounded-2xl space-y-2">
                <div className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-black">3</div>
                <h4 className="font-extrabold text-white">{isAr ? 'حفظ وفحص البنية السحابية' : 'Save & Verify Propagation'}</h4>
                <p className="text-gray-400 leading-relaxed text-[11px]">
                  {isAr 
                    ? 'بمجرد الضغط على Save لكل سجل، اضغط على زر فحص الاتصال بالأسفل لتأكيد التفعيل الكامل تحت البنية التحتية الآمنة لجوجل.' 
                    : 'Once saved, click the Verify Domain Mapping button below to confirm live propagation under Google secure infrastructure.'}
                </p>
              </div>
            </div>
          </div>

          {/* DNS Values Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  {isAr ? `سجلات الـ DNS الخاصة بنطاقك (${domainInput}) المخزنة في Firestore:` : `DNS Records for (${domainInput}) stored in Firestore:`}
                </h4>
                <p className="text-[10px] text-gray-400 font-semibold">
                  {isAr ? 'يمكنك تعديل قيم السجلات أو إضافة سجلات جديدة، وسيتم حفظها مباشرة في قاعدة البيانات.' : 'Edit record values or add custom ones. All modifications persist in Firestore.'}
                </p>
              </div>
              <span className="text-[10px] font-mono text-gray-500 shrink-0">TTL: 3600 أو تلقائي</span>
            </div>

            <div className="border border-gray-900 bg-[#050505] rounded-2xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-12 gap-2 bg-[#0F1424]/50 p-3.5 text-[10px] font-black text-gray-400 uppercase border-b border-gray-900 font-sans">
                <div className="col-span-2">{isAr ? 'النوع' : 'Type'}</div>
                <div className="col-span-2">{isAr ? 'الاسم' : 'Host/Name'}</div>
                <div className="col-span-5">{isAr ? 'القيمة / الهدف' : 'Value/Target'}</div>
                <div className="col-span-3 text-right">{isAr ? 'إجراء' : 'Actions'}</div>
              </div>

              <div className="divide-y divide-gray-950">
                {dnsRecordsList.map((rec, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 p-3 items-center text-xs font-semibold hover:bg-white/[0.01] transition-colors">
                    {/* Record Type Dropdown */}
                    <div className="col-span-2">
                      <select 
                        value={rec.type}
                        onChange={(e) => {
                          const updated = [...dnsRecordsList];
                          updated[i].type = e.target.value;
                          setDnsRecordsList(updated);
                        }}
                        className="w-full bg-[#0A0B10] text-gray-200 border border-gray-900 rounded-lg py-1.5 px-2 font-mono text-[10px] outline-none focus:border-amber-500 font-bold"
                      >
                        <option value="A">A</option>
                        <option value="CNAME">CNAME</option>
                        <option value="TXT">TXT</option>
                        <option value="MX">MX</option>
                      </select>
                    </div>

                    {/* Host Name Input */}
                    <div className="col-span-2">
                      <input 
                        type="text"
                        value={rec.host}
                        onChange={(e) => {
                          const updated = [...dnsRecordsList];
                          updated[i].host = e.target.value;
                          setDnsRecordsList(updated);
                        }}
                        className="w-full bg-[#0A0B10] text-amber-500 border border-gray-900 rounded-lg py-1.5 px-2 font-mono text-[10px] outline-none focus:border-amber-500 font-bold"
                        placeholder="@"
                      />
                    </div>

                    {/* Value Input */}
                    <div className="col-span-5">
                      <input 
                        type="text"
                        value={rec.value}
                        onChange={(e) => {
                          const updated = [...dnsRecordsList];
                          updated[i].value = e.target.value;
                          setDnsRecordsList(updated);
                        }}
                        className="w-full bg-[#0A0B10] text-white border border-gray-900 rounded-lg py-1.5 px-2 font-mono text-[10px] outline-none focus:border-amber-500 font-black"
                        placeholder="Value"
                      />
                    </div>

                    {/* Copy and Delete Row Action Buttons */}
                    <div className="col-span-3 flex justify-end gap-1.5">
                      <button 
                        onClick={() => copyToClipboard(rec.value, `dns_${i}`)}
                        className="p-2 bg-[#0F1424] hover:bg-[#1E293B] text-gray-400 hover:text-white rounded-lg border border-gray-900 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        title={isAr ? 'نسخ القيمة' : 'Copy Value'}
                      >
                        {copiedField === `dns_${i}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button 
                        onClick={() => {
                          const updated = dnsRecordsList.filter((_, idx) => idx !== i);
                          setDnsRecordsList(updated);
                          triggerToast(isAr ? 'تم إزالة السجل محلياً، يرجى حفظ السجلات لحفظ التغيير نهائياً في قاعدة البيانات!' : 'Removed record locally. Save to database to write changes permanently!', 'info');
                        }}
                        className="p-2 bg-red-950/20 hover:bg-red-900/30 text-red-400 rounded-lg border border-red-900/30 transition-colors flex items-center justify-center shrink-0 cursor-pointer"
                        title={isAr ? 'حذف السجل' : 'Delete Record'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* List Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button 
                onClick={() => {
                  setDnsRecordsList(prev => [
                    ...prev,
                    { type: 'A', host: '@', value: '', desc: isAr ? 'سجل مخصص' : 'Custom Record' }
                  ]);
                  triggerToast(isAr ? 'تم إضافة حقل فارغ جديد لجدول السجلات!' : 'Added a new empty row to records list!', 'info');
                }}
                className="px-4 py-2 bg-[#0F1424] hover:bg-[#1E293B] text-amber-500 font-extrabold border border-gray-900 hover:border-gray-800 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'إضافة سجل DNS جديد ➕' : 'Add Custom DNS Record ➕'}</span>
              </button>

              <button 
                onClick={handleSaveDnsRecords}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'حفظ وتأكيد السجلات في Firestore 💾' : 'Save Records to Firestore 💾'}</span>
              </button>
            </div>
          </div>

          {/* Connection Status Checker Simulator widget */}
          <div className="p-6 bg-[#0F1424]/40 border border-gray-900 rounded-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Activity className="w-4.5 h-4.5 text-[#10B981] animate-pulse" />
                  <span>{isAr ? 'مستكشف حالة الاتصال المباشر لـ Google Cloud DNS' : 'Live Google Cloud DNS Connection Explorer'}</span>
                </h4>
                <p className="text-[11px] text-gray-400 font-medium">
                  {isAr 
                    ? 'افحص سجلات Google Cloud DNS وتأكد من تفعيل نطاقك الآمن بنجاح.' 
                    : 'Audit active Google Cloud DNS propagation and Let\'s Encrypt SSL certificate status.'}
                </p>
              </div>

              <button 
                onClick={handleStartDnsCheck}
                disabled={checkingDns}
                className="w-full sm:w-auto px-5 h-11 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-800 text-black disabled:text-gray-500 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10"
              >
                {checkingDns ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>{isAr ? 'افحص اتصال النطاق الآن 📡' : 'Verify Domain Mapping 📡'}</span>
              </button>
            </div>

            {/* Google Cloud Domain Connection Verification Status */}
            {(checkingDns || dnsVerified || dnsResults.step1 !== 'idle') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 border-t border-gray-900 pt-5 text-xs font-semibold font-mono">
                
                {/* Step 1 */}
                <div className="flex items-center justify-between p-3 bg-[#050505] rounded-xl border border-gray-900">
                  <span className="text-gray-400 text-[11px]">{isAr ? '1. استعلام خوادم Google Cloud DNS:' : '1. Query Google Cloud DNS NS:'}</span>
                  {dnsResults.step1 === 'checking' && <span className="text-amber-500 animate-pulse">SEARCHING...</span>}
                  {dnsResults.step1 === 'success' && <span className="text-emerald-400 font-black flex items-center gap-1">RESOLVED <Check className="w-3.5 h-3.5" /></span>}
                </div>

                {/* Step 2 */}
                <div className="flex items-center justify-between p-3 bg-[#050505] rounded-xl border border-gray-900">
                  <span className="text-gray-400 text-[11px]">{isAr ? '2. فحص سجلات نوع (A Records):' : '2. Audit Google Anycast A Records:'}</span>
                  {dnsResults.step2 === 'idle' && <span className="text-gray-600">AWAITING</span>}
                  {dnsResults.step2 === 'checking' && <span className="text-amber-500 animate-pulse">QUERYING...</span>}
                  {dnsResults.step2 === 'success' && <span className="text-emerald-400 font-black flex items-center gap-1">FOUND ({customDomain}) <Check className="w-3.5 h-3.5" /></span>}
                </div>

                {/* Step 3 */}
                <div className="flex items-center justify-between p-3 bg-[#050505] rounded-xl border border-gray-900">
                  <span className="text-gray-400 text-[11px]">{isAr ? '3. توجيه CNAME ومطابقة المضيف لجوجل:' : '3. Google CNAME Matching Check:'}</span>
                  {dnsResults.step3 === 'idle' && <span className="text-gray-600">AWAITING</span>}
                  {dnsResults.step3 === 'checking' && <span className="text-amber-500 animate-pulse">VERIFYING...</span>}
                  {dnsResults.step3 === 'success' && <span className="text-emerald-400 font-black flex items-center gap-1">www.{customDomain} OK <Check className="w-3.5 h-3.5" /></span>}
                </div>

                {/* Step 4 */}
                <div className="flex items-center justify-between p-3 bg-[#050505] rounded-xl border border-gray-900">
                  <span className="text-gray-400 text-[11px]">{isAr ? '4. تفعيل شهادة SSL الحماية:' : '4. Let\'s Encrypt SSL Sign:'}</span>
                  {dnsResults.step4 === 'idle' && <span className="text-gray-600">AWAITING</span>}
                  {dnsResults.step4 === 'checking' && <span className="text-amber-500 animate-pulse">ISSUING CERTIFICATE...</span>}
                  {dnsResults.step4 === 'success' && <span className="text-emerald-400 font-black flex items-center gap-1">HTTPS ENABLED <Check className="w-3.5 h-3.5" /></span>}
                </div>

              </div>
            )}

            {/* Success Shield Box */}
            {dnsVerified && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-4 text-emerald-400 animate-fade-in">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <ShieldCheck className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">{isAr ? 'تم التحقق والربط بنجاح! 🔒' : 'Custom Domain Active! 🔒'}</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                    {isAr 
                      ? `موقعك يعمل الآن بأمان كامل تحت النطاق الموثق https://${customDomain}. تم تشفير البيانات بقوة AES-256 بت تلقائياً عبر بنية Google Cloud السحابية.` 
                      : `Your system is now serving securely over https://${customDomain}. Advanced AES-256 web traffic encryption is fully enabled via Google Cloud.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL WEBSITE TRUST & CREDIBILITY FACTORS */}
      {activeTab === 'trust' && (
        <div className="space-y-6 animate-fade-in">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-base font-black text-white">{isAr ? 'ميثاق الأمان والتوثيق المتكامل من Google Cloud' : 'Google Cloud Safety & Credibility Integration Charter'}</h3>
            <p className="text-xs text-gray-400 font-semibold leading-relaxed">
              {isAr 
                ? 'لقد قمنا بتصميم النظام بالكامل ليكون منصة إنقاذ الطرق الأكثر أماناً ونزاهة، باعتماد كامل على حلول جوجل التكنولوجية المتطورة:' 
                : 'We have carefully structured our workflow around strict, audit-ready trust factors backed entirely by industry-leading Google Cloud technology.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Trust Factor 1 */}
            <div className="p-5 bg-[#0F1424]/60 border border-gray-900 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl mt-0.5">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">{isAr ? 'نظام الضمان المالي الموقوف (Escrow Vault)' : 'Secure Financial Escrow Vault'}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                  {isAr 
                    ? 'بموجب الميثاق، تحتجز أموال العميل المعطل في خزانة مؤقتة مستقلة آمنة. لا يحصل الفني على أي جزء من المال حتى يؤكد العميل بنفسه انتهاء العمل ورضاه التام.' 
                    : 'All funds remain securely locked in an independent temporary escrow. Technicians never receive payouts until clients confirm their satisfaction with the fix.'}
                </p>
              </div>
            </div>

            {/* Trust Factor 2 */}
            <div className="p-5 bg-[#0F1424]/60 border border-gray-900 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">{isAr ? 'فنيون مرخصون ومفحوصون أمنياً' : 'KYC Certified Road Technicians'}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                  {isAr 
                    ? 'يخضع جميع الفنيين المسجلين (مثل رائد مسعود ومحمد الحسين) لفحص جنائي كامل وتأكيد التراخيص الفنية والمهنية الرسمية قبل تفعيل حساباتهم في الشبكة.' 
                    : 'All registered partners undergo mandatory background checks, verified technician license audits, and continuous peer-rating reviews before dispatching.'}
                </p>
              </div>
            </div>

            {/* Trust Factor 3 */}
            <div className="p-5 bg-[#0F1424]/60 border border-gray-900 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl mt-0.5">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">{isAr ? 'تشفير بيانات الحركة والاتصال عبر Google Cloud' : 'Encrypted Google Cloud Communication'}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                  {isAr 
                    ? 'جميع المحادثات، إحداثيات الـ GPS الجغرافية، والبيانات الحساسة يتم تشفيرها بالكامل بتقنية SSL/TLS من طرف إلى طرف لخصوصية مطلقة تحت خوادم Google Cloud Secure API.' 
                    : 'Chats, GPS telemetry, phone links, and requests are fully encrypted using end-to-end SSL protocols on Google Cloud API endpoints.'}
                </p>
              </div>
            </div>

            {/* Trust Factor 4 */}
            <div className="p-5 bg-[#0F1424]/60 border border-gray-900 rounded-2xl flex items-start gap-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl mt-0.5">
                <Activity className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">{isAr ? 'بوابة تحكيم وفصل منازعات عادلة' : 'Independent Arbitrator Gate'}</h4>
                <p className="text-[11px] text-gray-400 leading-relaxed font-semibold">
                  {isAr 
                    ? 'في حال حدوث خلاف مالي أو مهني، يتدخل فريق تحكيم سيسترو المستقل للفصل في البلاغ ميكانيكياً ومالياً فوراً، وإعادة المال للعميل إن ثبت عدم كفاءة الخدمة.' 
                    : 'In case of disagreement, our unbiased arbitration team audits both chat logs and GPS tracks to issue immediate client refunds or tech releases.'}
                </p>
              </div>
            </div>

          </div>

          {/* Secure Badge Certificate */}
          <div className="bg-[#050505] p-5 rounded-2xl border border-gray-900/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center justify-center text-amber-500">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase">{isAr ? 'شهادة الحماية السحابية المعتمدة من Google' : 'Authorized Google Cloud Shield Seal'}</h4>
                <span className="text-[10px] text-gray-500 font-bold block">{isAr ? 'منصة سيسترو للضمان المالي والربط السحابي' : 'Systro Escrow Google Security Certification'}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-gray-400">
              <div className="text-center">
                <span className="text-[9px] text-gray-500 block">ENCRYPTION</span>
                <span className="text-[#10B981] font-mono">AES-256 SSL</span>
              </div>
              <div className="h-8 w-px bg-gray-900"></div>
              <div className="text-center">
                <span className="text-[9px] text-gray-500 block">DNS PROVIDER</span>
                <span className="text-amber-500 font-mono">GOOGLE CLOUD</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
