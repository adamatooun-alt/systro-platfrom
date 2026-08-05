import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Wrench, 
  Search, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  ShieldCheck, 
  UserCheck, 
  Radio, 
  Filter, 
  ExternalLink,
  Car,
  Fuel,
  Key,
  Zap,
  Truck,
  Sparkles,
  ArrowLeft,
  Crown
} from 'lucide-react';

interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'client' | 'technician' | null;
  isOnline?: boolean;
  lastActive?: number;
  createdAt?: string;
  avatar?: string;
}

interface TechnicianRecord {
  id: string;
  name: string;
  arName?: string;
  phone: string;
  email?: string;
  rating: number;
  reviewsCount: number;
  isOnline: boolean;
  isAvailable?: boolean;
  avatar?: string;
  carModel?: string;
  arCarModel?: string;
  plateNumber?: string;
  specialties?: string[];
  serviceId?: string;
  lat?: number;
  lng?: number;
}

interface DirectoryTabProps {
  lang: 'ar' | 'en' | 'he';
  registeredUsers: UserRecord[];
  dbTechnicians: TechnicianRecord[];
  isLoggedIn: boolean;
  loggedInUserEmail: string;
  loggedInUserName: string;
  userRole: 'client' | 'technician' | null;
  handleToggleTechMode: () => Promise<void>;
  activeTechDoc: any;
  triggerToast: (msg: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  setActiveTab: (tab: string) => void;
  handleRealGoogleSignIn?: () => void;
}

export const DirectoryTab: React.FC<DirectoryTabProps> = ({
  lang,
  registeredUsers,
  dbTechnicians,
  isLoggedIn,
  loggedInUserEmail,
  loggedInUserName,
  userRole,
  handleToggleTechMode,
  activeTechDoc,
  triggerToast,
  setActiveTab,
  handleRealGoogleSignIn
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'technicians' | 'users'>('technicians');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'client' | 'technician' | 'guest'>('all');
  
  const [techSearchQuery, setTechSearchQuery] = useState('');
  const [techSpecialtyFilter, setTechSpecialtyFilter] = useState<string>('all');
  const [onlyOnlineTechs, setOnlyOnlineTechs] = useState<boolean>(false);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return registeredUsers.filter(user => {
      const q = userSearchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        (user.name && user.name.toLowerCase().includes(q)) ||
        (user.email && user.email.toLowerCase().includes(q)) ||
        (user.phone && user.phone.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (userRoleFilter === 'client') return user.role === 'client';
      if (userRoleFilter === 'technician') return user.role === 'technician';
      if (userRoleFilter === 'guest') return !user.role || user.role === null;
      return true;
    });
  }, [registeredUsers, userSearchQuery, userRoleFilter]);

  // Filtered Technicians List
  const filteredTechnicians = useMemo(() => {
    return dbTechnicians.filter(tech => {
      const q = techSearchQuery.trim().toLowerCase();
      const name = (tech.name || tech.arName || '').toLowerCase();
      const car = (tech.carModel || tech.arCarModel || '').toLowerCase();
      const phone = (tech.phone || '').toLowerCase();
      
      const matchesSearch = !q || name.includes(q) || car.includes(q) || phone.includes(q);
      if (!matchesSearch) return false;

      if (onlyOnlineTechs && !tech.isOnline) return false;

      if (techSpecialtyFilter !== 'all') {
        const specs = tech.specialties || [];
        const matchesSpec = specs.includes(techSpecialtyFilter) || tech.serviceId === techSpecialtyFilter;
        if (!matchesSpec) return false;
      }

      return true;
    });
  }, [dbTechnicians, techSearchQuery, techSpecialtyFilter, onlyOnlineTechs]);

  // Helper for specialty tags
  const getSpecialtyLabel = (spec: string) => {
    switch (spec) {
      case 'towing': return lang === 'ar' ? 'سحب وونش' : 'Towing & Recovery';
      case 'mechanic': return lang === 'ar' ? 'صيانة ميكانيكية' : 'Mechanic Service';
      case 'battery': return lang === 'ar' ? 'كهرباء وبطاريات' : 'Battery & Electrical';
      case 'lock':
      case 'locksmith': return lang === 'ar' ? 'فتح أقفال' : 'Locksmith Service';
      case 'fuel': return lang === 'ar' ? 'تزويد وقود' : 'Fuel Delivery';
      case 'taxi': return lang === 'ar' ? 'خدمة تاكسي' : 'Taxi Service';
      default: return spec;
    }
  };

  const getSpecialtyIcon = (spec: string) => {
    switch (spec) {
      case 'towing': return Truck;
      case 'mechanic': return Wrench;
      case 'battery': return Zap;
      case 'lock':
      case 'locksmith': return Key;
      case 'fuel': return Fuel;
      case 'taxi': return Car;
      default: return Wrench;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in text-right" dir={lang === 'ar' || lang === 'he' ? 'rtl' : 'ltr'}>
      
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-400 text-xs font-black">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>{lang === 'ar' ? 'دليل الشبكة والزوار العام (متاح للجميع)' : 'Public Platform Directory (Open to All)'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
              {lang === 'ar' ? 'قوائم مستخدمي الموقع والفنيين المفعلين 📋' : 'Site Users & Verified Technicians Registry 📋'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 font-semibold max-w-2xl leading-relaxed">
              {lang === 'ar' 
                ? 'استعراض فوري لجميع الزوار والمستخدمين المسجلين في المنصة، بالإضافة إلى قائمة الفنيين المفعلين والمعتمدين لتقديم خدمات الطرق والسحب والإنقاذ.' 
                : 'Real-time directory of all platform users and activated service provider technicians available for roadside assistance.'}
            </p>
          </div>

          {/* Quick Action Box */}
          <div className="shrink-0 bg-slate-950/80 border border-amber-500/25 p-4 rounded-2xl space-y-3 min-w-[260px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-amber-300">
                {lang === 'ar' ? 'حالة حسابك الحالي:' : 'Your Account Status:'}
              </span>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                activeTechDoc?.isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {activeTechDoc?.isOnline ? (lang === 'ar' ? '⚡ فني مفعل ومتاح' : '⚡ Active Provider') : (lang === 'ar' ? '👤 عميل / زائر' : '👤 Client / Visitor')}
              </span>
            </div>

            <button
              onClick={handleToggleTechMode}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
                activeTechDoc?.isOnline 
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20' 
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <Radio className={`w-4 h-4 ${activeTechDoc?.isOnline ? 'animate-pulse' : ''}`} />
              <span>
                {activeTechDoc?.isOnline 
                  ? (lang === 'ar' ? 'إيقاف وضع الفني (غير متاح)' : 'Disable Tech Duty') 
                  : (lang === 'ar' ? 'تفعيل حسابي كفني مفعل بالشبكة ⚡' : 'Activate My Tech Profile ⚡')}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Sub-Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('technicians')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'technicians'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-gray-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{lang === 'ar' ? 'الفنيين المفعلين والمعتمدين ⚡' : 'Verified Technicians ⚡'}</span>
            <span className="bg-slate-950/60 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {dbTechnicians.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeSubTab === 'users'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-gray-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{lang === 'ar' ? 'مستخدمي وزوار المنصة 👥' : 'Site Users & Visitors 👥'}</span>
            <span className="bg-slate-950/60 text-cyan-300 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
              {registeredUsers.length}
            </span>
          </button>
        </div>

        {/* Dynamic Counter Display */}
        <div className="flex items-center gap-3 text-xs font-bold text-gray-400">
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-gray-200">
              {lang === 'ar' ? `فني متاح الآن: ${dbTechnicians.filter(t => t.isOnline).length}` : `Online Techs: ${dbTechnicians.filter(t => t.isOnline).length}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-gray-200">
              {lang === 'ar' ? `إجمالي الحسابات المسجلة: ${registeredUsers.length}` : `Total Accounts: ${registeredUsers.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================
          SUB-TAB 1: VERIFIED TECHNICIANS DIRECTORY
         ========================================= */}
      {activeSubTab === 'technicians' && (
        <div className="space-y-6">
          
          {/* Search & Filter Bar */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute top-3.5 right-3.5" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث باسم الفني، نوع الشاحنة، أو التخصص...' : 'Search tech name, vehicle, or specialty...'}
                value={techSearchQuery}
                onChange={(e) => setTechSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-gray-500 outline-none focus:border-amber-500/60 transition-all"
              />
            </div>

            {/* Specialty Selector */}
            <select
              value={techSpecialtyFilter}
              onChange={(e) => setTechSpecialtyFilter(e.target.value)}
              className="w-full md:w-56 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-gray-200 outline-none focus:border-amber-500/60 cursor-pointer"
            >
              <option value="all">{lang === 'ar' ? 'جميع التخصصات (الكل)' : 'All Specialties'}</option>
              <option value="towing">{lang === 'ar' ? 'سحب وونش 🚚' : 'Towing & Recovery'}</option>
              <option value="mechanic">{lang === 'ar' ? 'صيانة ميكانيكية 🛠️' : 'Mechanic Service'}</option>
              <option value="battery">{lang === 'ar' ? 'كهرباء وبطاريات ⚡' : 'Battery & Electrical'}</option>
              <option value="lock">{lang === 'ar' ? 'فتح أقفال ومفاتيح 🔑' : 'Locksmith Service'}</option>
              <option value="fuel">{lang === 'ar' ? 'تزويد وقود طارئ ⛽' : 'Fuel Delivery'}</option>
              <option value="taxi">{lang === 'ar' ? 'خدمة تاكسي 🚕' : 'Taxi Service'}</option>
            </select>

            {/* Toggle Online Only */}
            <button
              onClick={() => setOnlyOnlineTechs(!onlyOnlineTechs)}
              className={`w-full md:w-auto px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
                onlyOnlineTechs
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-950 text-gray-400 border-slate-800 hover:text-white'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${onlyOnlineTechs ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`}></span>
              <span>{lang === 'ar' ? 'المتاحين للعمل الآن فقط 🟢' : 'Available Techs Only 🟢'}</span>
            </button>
          </div>

          {/* Technicians Grid */}
          {filteredTechnicians.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
              <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto" />
              <h3 className="text-base font-black text-white">
                {lang === 'ar' ? 'لم يتم العثور على فنيين يطابقون خيارات البحث' : 'No technicians found matching criteria'}
              </h3>
              <p className="text-xs text-gray-400 font-semibold max-w-md mx-auto">
                {lang === 'ar' ? 'جرب البحث بكلمات أخرى أو إعادة ضبط الفلترة لعرض كافة الفنيين المسجلين بالمنصة.' : 'Try adjusting search terms or clear filters to view all registered technicians.'}
              </p>
              <button
                onClick={() => {
                  setTechSearchQuery('');
                  setTechSpecialtyFilter('all');
                  setOnlyOnlineTechs(false);
                }}
                className="mt-2 px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-black hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إعادة ضبط الفلتر 🔄' : 'Reset Filters 🔄'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredTechnicians.map((tech) => {
                const isMe = loggedInUserEmail && tech.email && tech.email.toLowerCase() === loggedInUserEmail.toLowerCase();
                const specList = tech.specialties && tech.specialties.length > 0 ? tech.specialties : [tech.serviceId || 'towing'];

                return (
                  <div 
                    key={tech.id} 
                    className={`relative bg-gradient-to-b from-[#0F172A] to-[#090D16] border rounded-3xl p-5 space-y-4 transition-all duration-300 hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 ${
                      isMe ? 'border-amber-500/60 ring-2 ring-amber-500/20' : 'border-slate-800'
                    }`}
                  >
                    {/* Badge for Current User */}
                    {isMe && (
                      <span className="absolute -top-3 left-4 bg-amber-500 text-slate-950 font-black text-[9px] px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Crown className="w-3 h-3 text-slate-950" />
                        <span>{lang === 'ar' ? 'حسابك الشخصي 👤' : 'Your Profile 👤'}</span>
                      </span>
                    )}

                    {/* Tech Profile Header */}
                    <div className="flex items-start gap-3.5 border-b border-slate-800/80 pb-4">
                      <div className="relative shrink-0">
                        <img 
                          src={tech.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'} 
                          alt={tech.name} 
                          className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500/40 shadow"
                          referrerPolicy="no-referrer"
                        />
                        <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                          tech.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'
                        }`} title={tech.isOnline ? 'متصل ومتاح للعمل' : 'غير متصل'}></span>
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-black text-white truncate">
                            {lang === 'ar' ? (tech.arName || tech.name) : tech.name}
                          </h3>
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-black rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-amber-400" />
                            <span>{lang === 'ar' ? 'فني مفعل ⚡' : 'Verified ⚡'}</span>
                          </span>
                        </div>

                        {/* Vehicle & Plate Info */}
                        {(tech.carModel || tech.arCarModel) && (
                          <p className="text-[11px] text-gray-300 font-bold flex items-center gap-1 truncate">
                            <Car className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{lang === 'ar' ? (tech.arCarModel || tech.carModel) : tech.carModel}</span>
                            {tech.plateNumber && (
                              <span className="bg-slate-800 text-amber-300 px-1.5 py-0.2 text-[9px] font-mono rounded">
                                {tech.plateNumber}
                              </span>
                            )}
                          </p>
                        )}

                        {/* Rating */}
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
                          <span className="text-amber-400 font-black">⭐ {tech.rating || 5.0}</span>
                          <span>({tech.reviewsCount || 12} {lang === 'ar' ? 'تقييم' : 'reviews'})</span>
                        </div>
                      </div>
                    </div>

                    {/* Specialties List Tags */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-gray-400 font-black block">
                        {lang === 'ar' ? 'التخصصات والخدمات المعتمدة:' : 'Approved Services:'}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {specList.map((spec, idx) => {
                          const SpecIcon = getSpecialtyIcon(spec);
                          return (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-700/60 rounded-xl text-[10px] font-bold text-gray-200"
                            >
                              <SpecIcon className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{getSpecialtyLabel(spec)}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <a
                        href={`tel:${tech.phone}`}
                        className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Phone className="w-3.5 h-3.5 text-slate-950" />
                        <span>{lang === 'ar' ? 'اتصال مباشر' : 'Call'}</span>
                      </a>

                      <a
                        href={`https://wa.me/${tech.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        <span>WhatsApp</span>
                      </a>

                      <button
                        onClick={() => {
                          setActiveTab('services');
                          triggerToast(lang === 'ar' ? `تم اختيار الفني [${tech.name}]! اطلب خدمة الآن.` : `Selected technician [${tech.name}]!`, 'info');
                        }}
                        className="py-2 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer"
                        title={lang === 'ar' ? 'طلب إنقاذ من هذا الفني' : 'Request service'}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* =========================================
          SUB-TAB 2: SITE VISITORS & REGISTERED USERS
         ========================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">

          {/* Search & Role Filter Bar */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-gray-400 absolute top-3.5 right-3.5" />
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث باسم المستخدم، البريد الإلكتروني أو الهاتف...' : 'Search by name, email, or phone...'}
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-gray-500 outline-none focus:border-cyan-500/60 transition-all"
              />
            </div>

            {/* Role Filter Selector */}
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value as any)}
              className="w-full md:w-56 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-gray-200 outline-none focus:border-cyan-500/60 cursor-pointer"
            >
              <option value="all">{lang === 'ar' ? 'جميع الحسابات (الكل)' : 'All Accounts'}</option>
              <option value="client">{lang === 'ar' ? 'العملاء والزبائن 👤' : 'Clients'}</option>
              <option value="technician">{lang === 'ar' ? 'الفنيين المفعلين 🛠️' : 'Technicians'}</option>
              <option value="guest">{lang === 'ar' ? 'الزوار المسجلين 🌐' : 'Registered Guests'}</option>
            </select>
          </div>

          {/* Users Grid */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 bg-slate-900/40 border border-slate-800/80 rounded-3xl space-y-3">
              <Users className="w-12 h-12 text-gray-600 mx-auto" />
              <h3 className="text-base font-black text-white">
                {lang === 'ar' ? 'لم يتم العثور على مستخدمين يطابقون البحث' : 'No users found matching criteria'}
              </h3>
              <p className="text-xs text-gray-400 font-semibold max-w-md mx-auto">
                {lang === 'ar' ? 'تأكد من كتابة الاسم أو الإيميل بصورة صحيحة.' : 'Check spelling or adjust role filter settings.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => {
                const isCurrentLoggedIn = loggedInUserEmail && u.email && u.email.toLowerCase() === loggedInUserEmail.toLowerCase();
                const roleName = u.role === 'client'
                  ? (lang === 'ar' ? 'عميل للمنصة 👤' : 'Client 👤')
                  : u.role === 'technician'
                  ? (lang === 'ar' ? 'فني مفعل 🛠️' : 'Verified Tech 🛠️')
                  : (lang === 'ar' ? 'زائر مسجل 🌐' : 'Registered Guest 🌐');

                return (
                  <div
                    key={u.id}
                    className={`bg-slate-900/80 border rounded-2xl p-4 space-y-3 transition-all ${
                      isCurrentLoggedIn ? 'border-cyan-500/60 ring-2 ring-cyan-500/20 bg-slate-900' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-black shrink-0">
                          {u.avatar ? (
                            <img src={u.avatar} alt="Avatar" className="w-full h-full rounded-xl object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{(u.name || u.email || 'U').charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5">
                            <span>{u.name || 'Anonymous User'}</span>
                            {isCurrentLoggedIn && (
                              <span className="bg-cyan-500/20 text-cyan-400 text-[8px] font-black px-2 py-0.2 rounded-full border border-cyan-500/30">
                                {lang === 'ar' ? 'أنت' : 'You'}
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] font-mono text-gray-400 truncate">{u.email || u.id}</p>
                        </div>
                      </div>

                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full shrink-0 ${
                        u.role === 'client' 
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' 
                          : u.role === 'technician'
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-gray-400 border border-slate-700'
                      }`}>
                        {roleName}
                      </span>
                    </div>

                    {/* Details section */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2 text-[10px] font-semibold text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${u.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`}></span>
                        <span>{u.isOnline ? (lang === 'ar' ? 'نشط بالشبكة الان' : 'Online Now') : (lang === 'ar' ? 'غير متصل' : 'Offline')}</span>
                      </div>

                      {u.phone && (
                        <span className="font-mono text-gray-300">📞 {u.phone}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* Footer Banner for Visitors to Login or Join */}
      {!isLoggedIn && (
        <div className="p-6 bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 border border-amber-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-white">
              {lang === 'ar' ? 'هل تود الانضمام والظهور في قائمة المستخدمين والفنيين؟ 🚀' : 'Want to join and appear in the users & technicians registry? 🚀'}
            </h4>
            <p className="text-xs text-gray-400 font-bold">
              {lang === 'ar' ? 'سجل دخولك الآن عبر Google للبدء بتقديم طلبات الإنقاذ أو تفعيل وضع الفني فوراً.' : 'Sign in with Google to create rescue requests or activate your technician status instantly.'}
            </p>
          </div>
          <button
            onClick={() => handleRealGoogleSignIn && handleRealGoogleSignIn()}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer shrink-0 active:scale-95"
          >
            {lang === 'ar' ? 'تسجيل الدخول الفوري بحساب Google 🔐' : 'Sign in with Google 🔐'}
          </button>
        </div>
      )}

    </div>
  );
};
