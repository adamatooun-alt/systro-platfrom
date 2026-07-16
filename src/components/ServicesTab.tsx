import React from 'react';
import { Users } from 'lucide-react';
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
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed font-semibold">{service.desc}</p>
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

              {/* Registered Service Providers List */}
              <div className="md:col-span-12 border-t border-gray-800/60 pt-4 mt-2">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-amber-500" />
                    <span>
                      {lang === 'ar' ? 'فنيو ومزودو الخدمة المسجلون:' : lang === 'he' ? 'ספקי שירות רשומים:' : 'Registered Service Providers:'}
                    </span>
                  </h4>
                </div>

                {/* Filter technicians */}
                {(() => {
                  const serviceTechs = dbTechnicians.filter(t => t.serviceId === service.id || t.specialties?.includes(service.id));
                  if (serviceTechs.length === 0) {
                    return (
                      <div className="p-4 bg-[#0A0B10]/40 border border-gray-900 rounded-xl text-center">
                        <span className="text-[11px] text-gray-500 font-bold block">
                          {lang === 'ar' 
                            ? 'لا يوجد فنيون مسجلون حالياً في هذا القسم. كن أول من يسجل سجلاً هنا!' 
                            : lang === 'he'
                            ? 'אין טכנאים רשומים כעת בקטגוריה זו. היה הראשון להירשם כאן!'
                            : 'No certified technicians currently registered in this category. Be the first to add your record!'}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {serviceTechs.map(tech => (
                        <div key={tech.id} className="p-3 bg-[#0A0B10] border border-gray-900 rounded-xl flex items-center gap-3 relative overflow-hidden">
                          <img 
                            src={tech.avatar || 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120'} 
                            alt={tech.name} 
                            className="w-10 h-10 rounded-full border border-gray-800 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1 text-right rtl:text-right ltr:text-left">
                            <h5 className="text-xs font-extrabold text-white truncate">
                              {lang === 'ar' ? (tech.arName || tech.name) : tech.name}
                            </h5>
                            <p className="text-[10px] text-gray-400 font-bold truncate">
                              {lang === 'ar' ? (tech.arCarModel || tech.carModel) : tech.carModel}
                            </p>
                            <p className="text-[9px] text-amber-500 font-bold font-mono mt-0.5">
                              {tech.phone}
                            </p>
                          </div>
                          {/* Rating badge */}
                          <div className="absolute top-2 left-2 flex items-center gap-0.5 bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-black">
                            <span>★</span>
                            <span className="font-mono">{tech.rating?.toFixed(1) || '5.0'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
