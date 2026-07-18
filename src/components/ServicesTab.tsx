import React from 'react';
import { ServiceType, Technician } from '../types';

interface ServicesTabProps {
  lang: 'ar' | 'en' | 'he';
  isLoggedIn: boolean;
  servicesList: Array<{
    id: ServiceType;
    name: string;
    desc: string;
    icon: React.ComponentType<any>;
    color: string;
    basePrice: number;
  }>;
  dbTechnicians: Technician[];
  triggerToast: (text: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setUserRole: (role: 'client' | 'technician' | 'guest' | null) => void;
  setActiveTab: (tab: string) => void;
  setSelectedService: (id: ServiceType) => void;
  setSelectedServiceIdForRecord: (id: string) => void;
  setShowAddRecordModal: (show: boolean) => void;
  setShowCustomServiceModal: (show: boolean) => void;
  t: any;
}

export default function ServicesTab({
  lang,
  isLoggedIn,
  servicesList,
  dbTechnicians,
  triggerToast,
  setIsLoggedIn,
  setUserRole,
  setActiveTab,
  setSelectedService,
  setSelectedServiceIdForRecord,
  setShowAddRecordModal,
  setShowCustomServiceModal,
  t,
}: ServicesTabProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 animate-fade-in space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0F1424]/40 border border-gray-800 p-6 rounded-3xl">
        <div className="text-right rtl:text-right ltr:text-left space-y-1">
          <h2 className="text-2xl md:text-3xl font-black text-white">{t.servicesTitle}</h2>
          <p className="text-xs md:text-sm text-gray-400 font-semibold">{t.servicesSub}</p>
        </div>
        
        <button
          onClick={() => {
            if (!isLoggedIn) {
              triggerToast(
                lang === 'ar' 
                  ? 'يرجى تسجيل الدخول بحساب Google أولاً لإنشاء خدمة مخصصة!' 
                  : lang === 'he'
                  ? 'אנא התחבר עם חשבון גוגל תחילה כדי ליצור שירות מותאם אישית!'
                  : 'Please sign in with Google account first to create custom service!', 
                'warning'
              );
              const section = document.getElementById('login-portal-section');
              if (section) section.scrollIntoView({ behavior: 'smooth' });
            } else {
              setShowCustomServiceModal(true);
            }
          }}
          className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 shrink-0 cursor-pointer"
        >
          <span>⚙️</span>
          <span>{lang === 'ar' ? 'إضافة خدمة جديدة / مخصصة' : lang === 'he' ? 'הוסף שירות מותאם אישית' : 'Add Custom Service'}</span>
        </button>
      </div>

      <div className="space-y-6">
        {servicesList.map(service => {
          const IconComponent = service.icon;
          return (
            <div key={service.id} className="p-6 bg-[#0F1424] border border-gray-800 rounded-3xl grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* Icon */}
              <div className="md:col-span-2 flex justify-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${service.color}`}>
                  <IconComponent className="w-8 h-8" />
                </div>
              </div>

              {/* Details */}
              <div className="md:col-span-7 space-y-2 text-center md:text-right rtl:md:text-right ltr:md:text-left">
                <h3 className="text-lg font-black text-white">{service.name}</h3>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-semibold whitespace-pre-line">{service.desc}</p>
              </div>

              {/* Pricing / Demo buttons */}
              <div className="md:col-span-3 text-center space-y-3">
                <div className="text-xs font-bold text-gray-400 uppercase">
                  {lang === 'ar' ? 'السعر التقديري الأساسي:' : 'Estimated Base Price:'}
                  <span className="text-lg font-black text-amber-500 font-mono block mt-1">{service.basePrice} ₪</span>
                </div>

                <button 
                  onClick={() => {
                    setSelectedService(service.id);
                    setIsLoggedIn(true);
                    setUserRole('client');
                    setActiveTab('simulator');
                    triggerToast(lang === 'ar' ? 'تم اختيار الخدمة، حدد موقعك على الخريطة للبدء!' : 'Service selected, pin your location on map to start!', 'success');
                  }}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                >
                  {lang === 'ar' ? 'اطلب الخدمة الرسمية الآن' : 'Request Official Service Now'}
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
