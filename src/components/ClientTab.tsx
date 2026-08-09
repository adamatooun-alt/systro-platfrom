import React, { useState } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { 
  MapPin, 
  AlertTriangle, 
  User, 
  Compass, 
  ShieldCheck, 
  Radio, 
  PlusCircle, 
  Send, 
  Wrench, 
  Sparkles, 
  Share2, 
  Layers 
} from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { PublicGroupMessage } from '../types';
import PublicGroupChat from './PublicGroupChat';

interface ClientTabProps {
  lang: 'ar' | 'en' | 'he';
  pinnedLocation: { lat: number; lng: number } | null;
  setPinnedLocation: (loc: { lat: number; lng: number }) => void;
  detectCurrentLocation: (silent?: boolean) => void;
  hasValidKey: boolean;
  isMapAuthFailed: boolean;
  mapsKey: string;
  mapPctToLatLng: (latPct: number, lngPct: number) => { lat: number; lng: number };
  latLngToMapPct: (lat: number, lng: number) => { lat: number; lng: number };
  simStatus: string;
  selectedBid: any;
  technicians: any[];
  techCoordinates: any;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  userRole: 'client' | 'technician';
  loggedInUserEmail?: string;
  loggedInUserName?: string;
  userAvatar?: string;
  t: any;
}

export default function ClientTab({
  lang,
  pinnedLocation,
  setPinnedLocation,
  detectCurrentLocation,
  hasValidKey,
  isMapAuthFailed,
  mapsKey,
  mapPctToLatLng,
  latLngToMapPct,
  simStatus,
  selectedBid,
  technicians,
  techCoordinates,
  triggerToast,
  userRole,
  loggedInUserEmail,
  loggedInUserName,
  userAvatar,
  t
}: ClientTabProps) {
  // Form State for Adding Custom Service to the site
  const [isAddingCustomService, setIsAddingCustomService] = useState(false);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customServiceDetails, setCustomServiceDetails] = useState('');
  const [customServicePrice, setCustomServicePrice] = useState('');

  // Local state for dynamically added custom services
  const [customServicesList, setCustomServicesList] = useState<Array<{
    id: string;
    title: string;
    icon: string;
    details: string;
    price: string;
    category: string;
  }>>([]);

  const PRESET_ROAD_SERVICES = [
    {
      id: 'srv_towing',
      title: lang === 'ar' ? 'سحب ونش وقطر السيارات 🚚' : 'Vehicle Towing & Recovery 🚚',
      icon: '🚚',
      details: lang === 'ar' ? 'سحب ونقل المركبة المتعطلة إلى أقرب كراج أو وجهة محددة مع تتبع GPS.' : 'Towing broken-down vehicle to nearest garage with live GPS location.',
      price: '180 ₪',
      category: 'towing'
    },
    {
      id: 'srv_tire',
      title: lang === 'ar' ? 'تغيير وإصلاح الإطارات 🛞' : 'Tire Service & Repair 🛞',
      icon: '🛞',
      details: lang === 'ar' ? 'فك وتغيير الإطار المثقوب أو إصلاحه وتركييب الإسبير بالموقع الفعلي.' : 'Changing flat tire or repairing it on-site.',
      price: '90 ₪',
      category: 'tire'
    },
    {
      id: 'srv_battery',
      title: lang === 'ar' ? 'شحن وإنعاش البطارية 🔋' : 'Battery Jumpstart & Service 🔋',
      icon: '🔋',
      details: lang === 'ar' ? 'إمداد بطارية السيارة بكهرباء فورية أو استبدالها ببطارية جديدة.' : 'Instant battery jumpstart or on-site replacement.',
      price: '70 ₪',
      category: 'battery'
    },
    {
      id: 'srv_fuel',
      title: lang === 'ar' ? 'توصيل وتزود بالوقود ⛽' : 'Emergency Fuel Delivery ⛽',
      icon: '⛽',
      details: lang === 'ar' ? 'إحضار وقود طارئ (بنزين/ديزل) وتشغيل المحرك بموقعك الفعلي.' : 'Emergency fuel delivery to your exact location.',
      price: '60 ₪',
      category: 'fuel'
    },
    {
      id: 'srv_locksmith',
      title: lang === 'ar' ? 'فتح أقفال السيارات المغلقة 🔑' : 'Auto Locksmith Service 🔑',
      icon: '🔑',
      details: lang === 'ar' ? 'فتح باب السيارة المغلقة طارئاً بدون أي خدوش أو أضرار.' : 'Emergency car door unlocking without damage.',
      price: '120 ₪',
      category: 'locksmith'
    },
    {
      id: 'srv_mechanic',
      title: lang === 'ar' ? 'فحص وصيانة ميكانيكية سريعة 🛠️' : 'Mobile Emergency Mechanic 🛠️',
      icon: '🛠️',
      details: lang === 'ar' ? 'تشخيص سريع وتصليح الأعطال الميكانيكية والكهربائية الشائعة على الطريق.' : 'Fast diagnosis and mobile mechanic assistance on site.',
      price: '150 ₪',
      category: 'mechanic'
    }
  ];

  const allDisplayServices = [...customServicesList, ...PRESET_ROAD_SERVICES];

  const publishTaskToGroupChat = async (serviceName: string, serviceDetails: string, priceStr: string) => {
    // MANDATORY CONDITION: Exact location MUST be determined before publishing task
    if (!pinnedLocation) {
      triggerToast(
        lang === 'ar' 
          ? '🛑 عذراً! يجب تحديد موقعك الجغرافي بدقة على الخريطة أولاً قبل نشر المهمة.' 
          : '🛑 Please pin your exact location on the map first before publishing the task!', 
        'warning'
      );
      // Auto trigger GPS detection
      detectCurrentLocation(false);
      // Scroll smoothly to map container
      const mapContainer = document.getElementById('client-map-container');
      if (mapContainer) {
        mapContainer.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    const now = Date.now();
    const formattedTime = new Date(now).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    
    const latLng = mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng);
    const coordsStr = `Lat: ${latLng.lat.toFixed(5)}°N, Lng: ${latLng.lng.toFixed(5)}°E (${lang === 'ar' ? 'موقع دقيق' : 'Exact Coordinates'})`;

    const clientDisplayName = loggedInUserName?.trim() || (lang === 'ar' ? 'زبون (صاحب البلاغ)' : 'Client Requester');
    const numericPrice = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 100;

    const taskMsgObj: PublicGroupMessage = {
      id: `task_${now}_${Math.random().toString(36).substring(2, 9)}`,
      senderName: clientDisplayName,
      senderEmail: loggedInUserEmail || '',
      senderRole: 'client',
      senderAvatar: userAvatar || '',
      text: `🚨 [بلاغ خدمة جديد للموقع]
📌 نوع الخدمة: ${serviceName}
📍 موقع العميل الجغرافي: ${coordsStr}
📝 تفاصيل المهمة: ${serviceDetails}
💰 التكلفة المقدرة: ${priceStr}
⏰ الوقت: ${formattedTime}`,
      timestamp: formattedTime,
      createdTime: now,
      isTaskAlert: true,
      taskId: `task_${now}`,
      serviceName: serviceName,
      locationName: coordsStr,
      price: numericPrice,
      taskStatus: 'pending'
    };

    // 1. LocalStorage update
    try {
      const saved = localStorage.getItem('systro_public_group_chat_v2');
      let msgs: PublicGroupMessage[] = saved ? JSON.parse(saved) : [];
      msgs.push(taskMsgObj);
      localStorage.setItem('systro_public_group_chat_v2', JSON.stringify(msgs.slice(-150)));
    } catch (e) {}

    // 2. Custom Window Event Dispatch
    try {
      window.dispatchEvent(new CustomEvent('systro_chat_update', { detail: taskMsgObj }));
    } catch (e) {}

    // 3. BroadcastChannel Dispatch
    try {
      const bc = new BroadcastChannel('systro_chat_channel_v2');
      bc.postMessage({ type: 'NEW_MESSAGE', message: taskMsgObj });
      setTimeout(() => bc.close(), 1000);
    } catch (e) {}

    // 4. API Backend Proxy
    try {
      fetch('/api/public-group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: taskMsgObj })
      }).catch(() => {});
    } catch (e) {}

    // 5. Firestore Write
    try {
      setDoc(doc(db, 'public_group_chat', taskMsgObj.id), {
        ...taskMsgObj,
        createdAtServer: serverTimestamp()
      }).catch(() => {});
    } catch (e) {}

    triggerToast(
      lang === 'ar' 
        ? '🚀 تم نشر البلاغ والمهمة بنجاح في المحادثة الجماعية العامة!' 
        : '🚀 Task published successfully to public group chat!', 
      'success'
    );

    // Scroll smoothly to public group chat
    setTimeout(() => {
      const chatElem = document.getElementById('live-public-group-chat-container');
      if (chatElem) {
        chatElem.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleCreateAndPublishCustomService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customServiceName.trim()) {
      triggerToast(lang === 'ar' ? 'يرجى إدخال اسم الخدمة الجديدة!' : 'Please enter service name!', 'warning');
      return;
    }

    const formattedPrice = customServicePrice.trim() 
      ? (customServicePrice.trim().includes('₪') ? customServicePrice.trim() : `${customServicePrice.trim()} ₪`) 
      : '150 ₪';

    const newSrv = {
      id: `custom_srv_${Date.now()}`,
      title: customServiceName.trim(),
      icon: '✨',
      details: customServiceDetails.trim() || (lang === 'ar' ? 'طلب خدمة مخصصة للموقع من العميل' : 'Custom service requested by client'),
      price: formattedPrice,
      category: 'custom'
    };

    setCustomServicesList(prev => [newSrv, ...prev]);

    // Automatically publish to public group chat
    publishTaskToGroupChat(newSrv.title, newSrv.details, newSrv.price);

    // Reset inputs
    setCustomServiceName('');
    setCustomServiceDetails('');
    setCustomServicePrice('');
    setIsAddingCustomService(false);
  };
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0F1424]/80 border border-amber-500/30 p-6 rounded-3xl shadow-xl">
        <div className="text-right rtl:text-right ltr:text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-0.5 rounded-full text-xs font-bold">
              {lang === 'ar' ? '👤 صفحة العميل الرسمية' : '👤 Official Client Page'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <User className="w-6 h-6 text-amber-500" />
            <span>{lang === 'ar' ? 'صفحة عميل وخريطة الموقع 📍' : 'Client Page & Location Map'}</span>
          </h2>
          <p className="text-xs md:text-sm text-gray-300 font-semibold">
            {lang === 'ar'
              ? 'تابع موقعك الجغرافي الفعلي على الخريطة المباشرة وتواصل مباشرة عبر المحادثة الجماعية العامة.'
              : 'Track your live GPS location on the map and communicate directly via the public group chat.'}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-[#050814] px-4 py-2.5 rounded-2xl border border-gray-800 shrink-0">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs font-black text-emerald-400">
            {lang === 'ar' ? 'GPS متصل حي 📡' : 'Live GPS Connected 📡'}
          </span>
        </div>
      </div>

      {/* CUSTOMER INTERACTIVE MAP */}
      <div id="client-map-container" className="bg-[#0F1424] border border-gray-800 p-6 rounded-3xl space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-900 pb-4">
          <h3 className="text-sm md:text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-500" />
            <span>{lang === 'ar' ? 'خارطة موقع العميل والتغطية الحية 📍' : 'Client Live Location & Coverage Map'}</span>
          </h3>
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-xs font-bold px-3 py-1 rounded-full uppercase font-mono tracking-widest select-none self-start">
            {lang === 'ar' ? 'خرائط جوجل لايف 📡' : 'GOOGLE MAPS LIVE 📡'}
          </span>
        </div>

        {/* GPS Location Detector Button */}
        <button
          onClick={() => detectCurrentLocation(false)}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs md:text-sm rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer border border-blue-500/30 group active:scale-[0.98]"
        >
          <Compass className="w-5 h-5 text-amber-400 animate-spin-slow group-hover:scale-110 transition-transform" />
          <span>
            {lang === 'ar' ? 'تحديد موقعي الحالي بدقة تلقائياً (GPS) 📍' : 'Auto-Detect My Location (GPS) 📍'}
          </span>
        </button>

        {/* DYNAMIC LOCATION STATUS BANNER */}
        {pinnedLocation ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-emerald-400 shadow-inner">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 animate-bounce shrink-0" />
              <span>
                {lang === 'ar' 
                  ? `📍 تم تحديد موقعك الجغرافي بنجاح (احداثيات: ${mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lat.toFixed(5)}°, ${mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lng.toFixed(5)}°)`
                  : `📍 Exact location pinned (${mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lat.toFixed(5)}°, ${mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lng.toFixed(5)}°)`}
              </span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-xl text-[11px] font-black shrink-0">
              {lang === 'ar' ? 'جاهز لنشر المهمات ✅' : 'Ready to Publish Tasks ✅'}
            </span>
          </div>
        ) : (
          <div className="bg-amber-500/15 border-2 border-amber-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-amber-300 shadow-xl animate-pulse">
            <div className="flex items-center gap-2 text-right rtl:text-right ltr:text-left">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                {lang === 'ar' 
                  ? '🛑 شرط أساسي قبل النشر: لم يتم تحديد موقعك الجغرافي بعد! انقر على الخريطة أدناه أو زر GPS لتحديد موقعك قبل نشر أي مهمة.'
                  : '🛑 Mandatory condition: Location not pinned yet! Click on the map below or the GPS button to set your location.'}
              </span>
            </div>
            <button
              onClick={() => detectCurrentLocation(false)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-4 py-2 rounded-xl text-xs shrink-0 cursor-pointer transition-all border border-amber-300 shadow-md"
            >
              {lang === 'ar' ? 'تحديد الموقع الآن 🎯' : 'Pin Location Now 🎯'}
            </button>
          </div>
        )}

        {/* Map Container */}
        <div className="relative aspect-[16/9] md:aspect-[21/9] min-h-[380px] w-full bg-[#050814] border border-gray-900 rounded-2xl overflow-hidden shadow-inner">
          {!hasValidKey ? (
            <div className="absolute inset-0 bg-[#0B0E17] p-5 flex flex-col justify-center items-center text-center space-y-4 font-sans select-none">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-500 uppercase">
                  {lang === 'ar' ? 'مفتاح Google Maps مطلوب لتشغيل الخريطة' : 'Google Maps API Key Required'}
                </h4>
                <p className="text-[10px] text-gray-400 mt-1 max-w-xs">
                  {lang === 'ar' 
                    ? 'يرجى إضافة مفتاح GOOGLE_MAPS_PLATFORM_KEY لتتبع الموقع بالدقة الحقيقية.' 
                    : 'Please add GOOGLE_MAPS_PLATFORM_KEY to enable live location map.'}
                </p>
              </div>
            </div>
          ) : isMapAuthFailed ? (
            <div className="absolute inset-0 bg-[#0B0E17] p-5 flex flex-col justify-center items-center text-center space-y-4 font-sans select-none">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-black text-red-500 uppercase">
                  {lang === 'ar' ? 'فشل تحميل خريطة جوجل' : 'Google Maps Auth Error'}
                </h4>
              </div>
            </div>
          ) : (
            <APIProvider apiKey={mapsKey} version="weekly">
              <GoogleMap
                defaultCenter={pinnedLocation ? mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng) : { lat: 31.7683, lng: 35.2137 }}
                defaultZoom={pinnedLocation ? 13 : 11}
                mapId="DEMO_MAP_ID"
                onClick={(e: any) => {
                  if (!e.detail.latLng) return;
                  const { lat, lng } = e.detail.latLng;
                  const { lat: latPct, lng: lngPct } = latLngToMapPct(lat, lng);

                  if (simStatus !== 'idle') {
                    triggerToast(lang === 'ar' ? 'لا يمكن تعديل الموقع أثناء طلب نشط!' : 'Cannot change location during active request!', 'warning');
                    return;
                  }
                  setPinnedLocation({ lat: latPct, lng: lngPct });
                  triggerToast(lang === 'ar' ? 'تم تحديد موقعك بنجاح!' : 'Location pinned successfully!', 'success');
                }}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
              >
                {pinnedLocation && (
                  <AdvancedMarker 
                    position={mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng)} 
                    title={lang === 'ar' ? 'موقعي 📌' : 'My Location 📌'}
                  >
                    <Pin background="#EF4444" borderColor="#B91C1C" glyphColor="#FFFFFF" />
                  </AdvancedMarker>
                )}

                {technicians.map(tech => {
                  if (simStatus !== 'idle' && selectedBid?.technicianId === tech.id) return null;
                  return (
                    <AdvancedMarker 
                      key={tech.id} 
                      position={mapPctToLatLng(tech.lat, tech.lng)} 
                      title={lang === 'ar' ? tech.arName : tech.name}
                    >
                      <Pin background="#3B82F6" borderColor="#1D4ED8" glyphColor="#FFFFFF" />
                    </AdvancedMarker>
                  );
                })}

                {techCoordinates && selectedBid && (
                  <AdvancedMarker 
                    position={mapPctToLatLng(techCoordinates.lat, techCoordinates.lng)} 
                    title={lang === 'ar' ? `ونش ${selectedBid.technicianArName} 🚚` : `${selectedBid.technicianName} 🚚`}
                  >
                    <Pin background="#F59E0B" borderColor="#D97706" glyphColor="#FFFFFF" />
                  </AdvancedMarker>
                )}
              </GoogleMap>
            </APIProvider>
          )}
        </div>

        {/* Coordinates Bar */}
        <div className="bg-[#0A0B10] p-4 rounded-2xl border border-gray-900/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold select-none">
          <span className="text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{lang === 'ar' ? 'إحداثيات موقع العميل الفعلي:' : 'Client GPS Coordinates:'}</span>
          </span>
          {pinnedLocation ? (
            <span className="text-[#10B981] font-mono font-bold text-sm bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
              Lat: {mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lat.toFixed(5)}°N , Lng: {mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lng.toFixed(5)}°E
            </span>
          ) : (
            <span className="text-red-400 font-bold bg-red-500/10 px-3 py-1 rounded-lg border border-red-500/20">
              {lang === 'ar' ? 'غير محدد - انقر على الخريطة للتحديد 📌' : 'Unspecified - Click map to pin 📌'}
            </span>
          )}
        </div>
      </div>

      {/* Public Group Chat section at bottom of Client Page */}
      <div id="live-public-group-chat-container" className="pt-8 border-t border-gray-900 space-y-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
          <h3 className="text-lg font-black text-white">
            {lang === 'ar' ? 'المحادثة الجماعية العامة للزبائن والفنيين 💬' : 'Public Group Chat 💬'}
          </h3>
        </div>
        <PublicGroupChat 
          lang={lang} 
          currentUserRole={userRole || 'client'}
          currentUserName={loggedInUserName || (lang === 'ar' ? 'زبون' : 'Client')}
          currentUserEmail={loggedInUserEmail}
          currentUserAvatar={userAvatar}
        />
      </div>

      {/* ADD NEW SERVICE & PUBLISH ROAD TASK TO GROUP CHAT SECTION */}
      <div className="bg-[#0F1424] border-2 border-amber-500/40 p-6 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
          <div className="space-y-1 text-right rtl:text-right ltr:text-left">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></span>
              <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-0.5 rounded-full text-[11px] font-black">
                {lang === 'ar' ? '🛠️ إدارة خدمات الموقع والبلاغات' : '🛠️ Site Services & Dispatch'}
              </span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <Wrench className="w-6 h-6 text-amber-500" />
              <span>{lang === 'ar' ? 'إضافة خدمة جديدة ونشر بلاغات للمحادثة الجماعية 🚀' : 'Add New Service & Publish Tasks 🚀'}</span>
            </h3>
            <p className="text-xs md:text-sm text-gray-300 font-semibold leading-relaxed">
              {lang === 'ar'
                ? 'يمكنك إضافة خدمة جديدة مخصصة للموقع أو اختيار إحدى خدمات الطريق التالية ونشر البلاغ مباشرة كبطاقة مهمة في المحادثة الجماعية مع تحديد موقعك الجغرافي 📍'
                : 'Add a new custom service or publish a road service task directly to the public group chat with your GPS location.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingCustomService(!isAddingCustomService)}
            className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs md:text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 border border-amber-300"
          >
            <PlusCircle className="w-5 h-5 text-slate-950" />
            <span>
              {isAddingCustomService 
                ? (lang === 'ar' ? 'إغلاق نموذج الإضافة ✖️' : 'Close Form ✖️')
                : (lang === 'ar' ? '➕ إضافة خدمة جديدة مخصصة للموقع' : '➕ Add Custom Service')}
            </span>
          </button>
        </div>

        {/* CUSTOM SERVICE ADDITION FORM */}
        {isAddingCustomService && (
          <form 
            onSubmit={handleCreateAndPublishCustomService}
            className="bg-[#050814] border-2 border-amber-400/50 p-5 rounded-2xl space-y-4 shadow-inner animate-fade-in"
          >
            <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-black text-amber-300">
                {lang === 'ar' ? 'نموذج إضافة خدمة جديدة ونشرها فوراً للمحادثة الجماعية' : 'Add Custom Service & Publish Form'}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-right rtl:text-right ltr:text-left">
                <label className="text-xs font-bold text-gray-300 block">
                  {lang === 'ar' ? 'اسم / نوع الخدمة الجديدة *' : 'Service Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={lang === 'ar' ? 'مثال: تبديل زيت وفلتر متنقل، غسيل سيارة بالموقع...' : 'e.g. Mobile Oil Change, Car Wash...'}
                  value={customServiceName}
                  onChange={(e) => setCustomServiceName(e.target.value)}
                  className="w-full bg-[#0F1424] border border-gray-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none transition-all placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-1.5 text-right rtl:text-right ltr:text-left">
                <label className="text-xs font-bold text-gray-300 block">
                  {lang === 'ar' ? 'التكلفة المقدرة (بالشيقل ₪)' : 'Estimated Price (₪)'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'مثال: 150 ₪' : 'e.g. 150 ₪'}
                  value={customServicePrice}
                  onChange={(e) => setCustomServicePrice(e.target.value)}
                  className="w-full bg-[#0F1424] border border-gray-700 focus:border-amber-400 rounded-xl px-4 py-2.5 text-xs text-white font-bold outline-none transition-all placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-1.5 text-right rtl:text-right ltr:text-left">
              <label className="text-xs font-bold text-gray-300 block">
                {lang === 'ar' ? 'تفاصيل البلاغ والخدمة المطلوبة' : 'Task & Service Details'}
              </label>
              <textarea
                rows={2}
                placeholder={lang === 'ar' ? 'اكتب أي تفاصيل إضافية عن حالة المركبة أو الموقع ليتم تضمينها في البطاقة...' : 'Write any additional details for the task card...'}
                value={customServiceDetails}
                onChange={(e) => setCustomServiceDetails(e.target.value)}
                className="w-full bg-[#0F1424] border border-gray-700 focus:border-amber-400 rounded-xl p-3 text-xs text-white font-bold outline-none transition-all placeholder:text-gray-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs md:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-emerald-400"
            >
              <Send className="w-4 h-4 text-white animate-pulse" />
              <span>{lang === 'ar' ? 'إضافة ونشر هذه الخدمة الجديدة في المحادثة العامة ➕🚀' : 'Add & Publish Service to Group Chat ➕🚀'}</span>
            </button>
          </form>
        )}

        {/* SERVICES GRID WITH DIRECT PUBLISH BUTTON NEXT TO EACH SERVICE */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span>{lang === 'ar' ? 'خدمات الموقع المتاحة للنشر بنقرة واحدة:' : 'Available Site Services:'}</span>
            </h4>
            <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              {allDisplayServices.length} {lang === 'ar' ? 'خدمة جاهزة' : 'Services Ready'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allDisplayServices.map((srv) => (
              <div 
                key={srv.id}
                className="bg-[#050814] border-2 border-gray-800 hover:border-amber-500/60 p-4 rounded-2xl flex flex-col justify-between gap-3 shadow-lg transition-all group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
                      {srv.icon}
                    </div>
                    <div className="text-right rtl:text-right ltr:text-left space-y-1">
                      <h5 className="text-sm font-black text-white group-hover:text-amber-400 transition-colors">
                        {srv.title}
                      </h5>
                      <p className="text-[11px] text-gray-400 font-semibold leading-snug">
                        {srv.details}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl shrink-0">
                    {srv.price}
                  </span>
                </div>

                {/* PUBLISH ACTION BUTTON FOR THIS INDIVIDUAL SERVICE */}
                <button
                  type="button"
                  onClick={() => publishTaskToGroupChat(srv.title, srv.details, srv.price)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 border border-amber-300"
                >
                  <Share2 className="w-4 h-4 text-slate-950" />
                  <span>{lang === 'ar' ? 'نشر هذا البلاغ في المحادثة الجماعية 🚀' : 'Publish Task to Group Chat 🚀'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
