import React from 'react';
import { ServiceType, Technician, RescueRequest } from '../types';
import { 
  MapPin, Wrench, Activity, CheckCircle2, Clock, Phone, MessageSquare, 
  Send, Star, X, ShieldCheck, AlertTriangle, Truck, Car, Zap, RotateCcw, 
  DollarSign, Navigation, RefreshCw, UserCheck, Maximize2, Minimize2
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { PublicGroupChat } from './PublicGroupChat';

interface ServicesTabProps {
  lang: 'ar' | 'en' | 'he';
  isLoggedIn: boolean;
  userRole?: 'client' | 'technician' | 'admin' | null;
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

  // Customer Interactive Rescue Hub props
  pinnedLocation?: { lat: number; lng: number } | null;
  setPinnedLocation?: (loc: { lat: number; lng: number } | null) => void;
  detectCurrentLocation?: (silent?: boolean) => void;
  hasValidKey?: boolean;
  isMapAuthFailed?: boolean;
  mapsKey?: string;
  triggerBidsSimulation?: (overrideService?: ServiceType, customPrice?: number, customDesc?: string) => Promise<void>;
  simStatus?: string;
  setSimStatus?: (s: any) => void;
  allRequests?: RescueRequest[];
  activeRequestId?: string | null;
  setActiveRequestId?: (id: string | null) => void;
  incomingBids?: any[];
  selectedBid?: any | null;
  setSelectedBid?: (bid: any) => void;
  chatMessages?: any[];
  chatInput?: string;
  setChatInput?: (val: string) => void;
  handleSendMessage?: () => void;
  handleCancelRequest?: () => void;
  handleCompleteRequest?: () => void;
  selectedService?: ServiceType;
  mapPctToLatLng?: (latPct: number, lngPct: number) => { lat: number; lng: number };
  latLngToMapPct?: (lat: number, lng: number) => { lat: number; lng: number };
  technicians?: any[];
  activeTechDoc?: any;
  userAvatar?: string;
  providerAvatar?: string;
  techCoordinates?: any;
  selectedRating?: number;
  setSelectedRating?: (r: number) => void;
  selectedTip?: number;
  setSelectedTip?: (t: number) => void;
  isRatingSubmitted?: boolean;
  handleRatingSubmit?: () => void;
  currentSessionId?: string;
  loggedInUserEmail?: string;
  loggedInUserName?: string;
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
  pinnedLocation,
  setPinnedLocation,
  detectCurrentLocation,
  hasValidKey,
  isMapAuthFailed,
  mapsKey,
  triggerBidsSimulation,
  simStatus,
  setSimStatus,
  allRequests,
  activeRequestId,
  setActiveRequestId,
  incomingBids,
  selectedBid,
  setSelectedBid,
  chatMessages,
  chatInput,
  setChatInput,
  handleSendMessage,
  handleCancelRequest,
  handleCompleteRequest,
  selectedService,
  mapPctToLatLng,
  latLngToMapPct,
  technicians,
  activeTechDoc,
  userAvatar,
  providerAvatar,
  techCoordinates,
  selectedRating,
  setSelectedRating,
  selectedTip,
  setSelectedTip,
  isRatingSubmitted,
  handleRatingSubmit,
  currentSessionId,
  loggedInUserEmail,
  loggedInUserName,
  userRole
}: ServicesTabProps) {

  const [isChatExpanded, setIsChatExpanded] = React.useState(false);

  // Active customer request object if any
  const myActiveRequest = allRequests.find(r => r.id === activeRequestId);

  const handleOrderServiceAndBroadcast = async (srv: any) => {
    // 1. Ensure location is pinned
    let currentLoc = pinnedLocation;
    if (!currentLoc) {
      currentLoc = { lat: 31.7683, lng: 35.2137 };
      if (setPinnedLocation) setPinnedLocation(currentLoc);
    }

    let locationCoordsText = 'القدس - موقع محدد على الخريطة 📍';
    if (mapPctToLatLng && currentLoc) {
      const realLatLng = mapPctToLatLng(currentLoc.lat, currentLoc.lng);
      locationCoordsText = `إحداثيات GPS: (${realLatLng.lat.toFixed(4)}, ${realLatLng.lng.toFixed(4)}) 📍`;
    }

    const now = Date.now();
    const formattedTime = new Date(now).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const custName = loggedInUserName || (lang === 'ar' ? 'زبون سيسترو' : 'Systro Client');
    const custEmail = loggedInUserEmail || 'client@systro.live';
    const taskId = `REQ_${now}_${Math.random().toString(36).substring(2, 6)}`;

    const broadcastText = lang === 'ar'
      ? `🚨 [بطاقة مهمة جديدة - طلب خدمة طوارئ]\n----------------------------------------\n🛠️ الخدمة: ${srv.name}\n📍 الموقع: ${locationCoordsText}\n👤 الزبون: ${custName}\n💰 السعر التقديري: ${srv.basePrice} ₪\n⏰ الوقت: ${formattedTime}\n----------------------------------------\nللتواصل الشخصي والاتفاق المباشر مع الزبون، اضغط على "🔒 محادثة خاصة مع صاحب الطلب" بالأسفل.`
      : `🚨 [NEW SERVICE TASK CARD]\n----------------------------------------\n🛠️ Service: ${srv.name}\n📍 Location: ${locationCoordsText}\n👤 Customer: ${custName}\n💰 Estimated Price: ${srv.basePrice} ₪\n⏰ Time: ${formattedTime}\n----------------------------------------\nClick "🔒 Direct Chat" below to open a private 1-on-1 chat with customer.`;

    const taskMsgObj = {
      id: `msg_task_${now}_${Math.random().toString(36).substring(2, 7)}`,
      senderName: custName,
      senderEmail: custEmail,
      senderRole: 'client' as const,
      senderAvatar: userAvatar || '',
      text: broadcastText,
      timestamp: formattedTime,
      createdTime: now,
      isTaskAlert: true,
      taskId: taskId,
      serviceName: srv.name,
      basePrice: srv.basePrice,
      locationText: locationCoordsText
    };

    // 2. Select service and set role to client
    setSelectedService(srv.id);
    setUserRole('client');

    // 3. Post message to server and local channels
    try {
      fetch('/api/public-group-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: taskMsgObj })
      }).catch(e => console.warn(e));

      import('../firebase').then(({ db }) => {
        import('firebase/firestore').then(({ doc, setDoc, serverTimestamp }) => {
          setDoc(doc(db, 'public_group_chat', taskMsgObj.id), {
            ...taskMsgObj,
            createdAtServer: serverTimestamp()
          }).catch(e => console.warn(e));
        });
      });

      window.dispatchEvent(new CustomEvent('systro_chat_update', { detail: taskMsgObj }));

      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('systro_chat_channel_v2');
        bc.postMessage({ type: 'NEW_MESSAGE', message: taskMsgObj });
        bc.close();
      }
    } catch (err) {
      console.warn("Broadcast notice:", err);
    }

    // 4. Trigger bidding simulation
    if (triggerBidsSimulation) {
      await triggerBidsSimulation(srv.id, srv.basePrice);
    }

    // 5. Toast notification
    triggerToast(
      lang === 'ar'
        ? `🚀 تم إنشاء ونشر بطاقة الخدمة (${srv.name}) بنجاح في المحادثة الجماعية! القناة حية وجاهزة للمحادثات الخاصة.`
        : `🚀 Service (${srv.name}) card created and broadcasted to public group chat!`,
      'success'
    );

    // 6. Scroll down to Public Group Chat
    setTimeout(() => {
      const chatEl = document.getElementById('live-public-group-chat-container');
      if (chatEl) {
        chatEl.scrollIntoView({ behavior: 'smooth' });
      }
    }, 300);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 animate-fade-in space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0F1424]/60 border border-gray-800 p-6 rounded-3xl">
        <div className="text-right rtl:text-right ltr:text-left space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
              {lang === 'ar' ? '👤 لوحة الزبون الرسمية' : '👤 Customer Official Hub'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">{t.servicesTitle}</h2>
          <p className="text-xs md:text-sm text-gray-400 font-semibold">{t.servicesSub}</p>
        </div>
        
        <button
          onClick={() => {
            if (!isLoggedIn) {
              triggerToast(
                lang === 'ar' 
                  ? 'يرجى تسجيل الدخول بحساب Google أولاً لإنشاء خدمة مخصصة!' 
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
          <span>{lang === 'ar' ? 'إضافة خدمة جديدة / مخصصة' : 'Add Custom Service'}</span>
        </button>
      </div>

      {/* Direct Taxi Booking Banner inside Customer Dashboard */}
      <div className="p-4 bg-gradient-to-r from-amber-500/10 via-orange-500/15 to-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1.5 justify-start">
            <Car className="w-4 h-4 text-amber-400" />
            <span>{lang === 'ar' ? '🚕 هل تريد حجز تكسي وتوصيل VIP سريع؟' : '🚕 Need a Special Taxi or VIP Ride?'}</span>
          </h4>
          <p className="text-[11px] text-gray-300 font-semibold leading-relaxed">
            {lang === 'ar'
              ? 'يمكنك الانتقال فوراً لبوابة حجز التكسي والسفريات لتحديد موقع الاستلام والوصول وحساب التكلفة الفورية.'
              : 'Switch instantly to Taxi booking portal to set pickup, dropoff, and calculate fare.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('taxi')}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
        >
          <span>{lang === 'ar' ? 'انتقال لبوابة التكسي 🚕' : 'Go to Taxi Portal 🚕'}</span>
        </button>
      </div>

      {/* CUSTOMER INTERACTIVE MAP & RESCUE REQUEST DISPATCHER HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Google Map for Location Pinning */}
        <div id="customer-map-section" className="lg:col-span-5 bg-[#0F1424] border border-gray-800 p-5 rounded-3xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-900 pb-3">
            <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>{t.simMapTitle}</span>
            </h3>
            <span className="bg-blue-500/15 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-widest select-none self-start">
              {lang === 'ar' ? 'خرائط جوجل لايف 📡' : 'GOOGLE MAPS LIVE 📡'}
            </span>
          </div>

          {/* GPS Location Detector Button */}
          <button
            onClick={() => detectCurrentLocation(false)}
            className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] md:text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer border border-blue-500/30 group active:scale-[0.98]"
          >
            <MapPin className="w-4 h-4 text-amber-400 animate-bounce group-hover:scale-110 transition-transform" />
            <span>
              {lang === 'ar' ? 'تحديد موقعي الحالي بدقة تلقائياً (GPS) 📍' : 'Auto-Detect My Location (GPS) 📍'}
            </span>
          </button>

          {/* Map Container */}
          <div className="relative aspect-square w-full bg-[#050814] border border-gray-900 rounded-2xl overflow-hidden shadow-inner">
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
                    triggerToast(lang === 'ar' ? 'تم تحديد موقع سيارتك بنجاح!' : 'Breakdown location pinned successfully!', 'success');
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
          <div className="bg-[#0A0B10] p-4 rounded-xl border border-gray-900/60 flex items-center justify-between text-xs font-semibold select-none">
            <span className="text-gray-500">
              {lang === 'ar' ? 'إحداثيات موقعي الفعلي:' : 'GPS Coordinates:'}
            </span>
            {pinnedLocation ? (
              <span className="text-[#10B981] font-mono font-bold">
                Lat: {mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lat.toFixed(5)}°N , Lng: {mapPctToLatLng(pinnedLocation.lat, pinnedLocation.lng).lng.toFixed(5)}°E
              </span>
            ) : (
              <span className="text-red-400 font-bold">{lang === 'ar' ? 'غير محدد 📌' : 'Unspecified 📌'}</span>
            )}
          </div>
        </div>

        {/* Right Column: Customer Rescue Request Dispatcher & Active Tracker */}
        <div className="lg:col-span-7 bg-[#111827]/60 border border-gray-800 p-6 rounded-3xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6 text-right rtl:text-right ltr:text-left">
            
            {/* Service Dispatch Status when Idle */}
            {simStatus === 'idle' && (
              <div className="p-5 bg-[#0A0B10] border border-amber-500/30 rounded-3xl space-y-3 shadow-xl text-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{lang === 'ar' ? 'رادار الفنيين والخدمات مباشر 📡' : 'Live Technician Radar Active 📡'}</span>
                </div>
                <p className="text-xs text-gray-300 font-medium leading-relaxed">
                  {lang === 'ar'
                    ? 'الشبكة متصلة وتعمل بنجاح. حدد الخدمة من القائمة أدناه أو اضغط زر SOS المباشر للطلب.'
                    : 'Network connected. Choose a service from the catalog below or press SOS.'}
                </p>
              </div>
            )}

            {/* ACTIVE CUSTOMER REQUEST TRACKER & BIDS CONTROL */}
            {simStatus !== 'idle' && (
              <div className="p-5 bg-[#0A0B10] border border-amber-500/30 rounded-3xl space-y-4 shadow-2xl text-right">
                <div className="flex items-center justify-between border-b border-gray-900 pb-3">
                  <span className="text-xs font-black text-amber-400 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                    <span>{lang === 'ar' ? 'حالة الطلب المباشرة' : 'Live Request Status'}</span>
                  </span>
                  
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                    simStatus === 'searching' || simStatus === 'pending_bids' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                    simStatus === 'bids_received' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    simStatus === 'accepted' || simStatus === 'en_route' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {(simStatus === 'searching' || simStatus === 'pending_bids') && (lang === 'ar' ? 'جاري بث المهمة على رادار الفنيين 📡' : 'Broadcasting Task on Radar 📡')}
                    {simStatus === 'bids_received' && (lang === 'ar' ? 'تم استقبال عروض أسعار 🛠️' : 'Bids Received 🛠️')}
                    {simStatus === 'accepted' && (lang === 'ar' ? 'تم قبول العرض 🤝' : 'Bid Accepted 🤝')}
                    {simStatus === 'en_route' && (lang === 'ar' ? 'الفني في الطريق إليك 🚚' : 'Tech En Route 🚚')}
                    {simStatus === 'arrived' && (lang === 'ar' ? 'وصل الفني لموقعك 📍' : 'Tech Arrived 📍')}
                    {simStatus === 'completed' && (lang === 'ar' ? 'تمت صيانة وإغاثة المركبة بنجاح ✅' : 'Completed ✅')}
                  </span>
                </div>

                {/* Received Bids Grid */}
                {(simStatus === 'bids_received' || simStatus === 'pending_bids' || incomingBids.length > 0) && incomingBids.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black text-white">{lang === 'ar' ? 'عروض الأسعار المقدمة لك:' : 'Quotes Provided for You:'}</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {incomingBids.map(bid => (
                        <div key={bid.id} className="p-4 bg-[#111827] border border-gray-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={bid.avatar} alt="Tech" className="w-10 h-10 rounded-full border border-amber-500/30 object-cover" />
                            <div>
                              <h5 className="text-xs font-black text-white">{bid.technicianArName || bid.technicianName}</h5>
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                <span>{bid.rating} • {bid.etaMinutes} {lang === 'ar' ? 'دقيقة وصول' : 'min ETA'}</span>
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            <span className="text-sm font-black text-emerald-400 font-mono">{bid.price} ₪</span>
                            <button
                              onClick={() => {
                                setSelectedBid(bid);
                                setSimStatus('en_route');
                                triggerToast(lang === 'ar' ? `تم قبول عرض الفني ${bid.technicianArName}!` : `Accepted bid from ${bid.technicianName}!`, 'success');
                              }}
                              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs transition-all cursor-pointer"
                            >
                              {lang === 'ar' ? 'قبول واستدعاء ⚡' : 'Accept & Call ⚡'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* En-route Details */}
                {(simStatus === 'en_route' || simStatus === 'arrived') && selectedBid && (
                  <div className="p-4 bg-[#111827] border border-emerald-500/30 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={selectedBid.avatar} alt="Tech" className="w-12 h-12 rounded-full border border-amber-500/50 object-cover" />
                        <div>
                          <h4 className="text-xs font-black text-white">{selectedBid.technicianArName || selectedBid.technicianName}</h4>
                          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span>{selectedBid.carModel || 'مركبة إنقاذ'} ({selectedBid.plateNumber || '7-4321'})</span>
                          </span>
                        </div>
                      </div>
                      <a 
                        href={`tel:${selectedBid.phone || '+972 59-999-9999'}`}
                        className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 transition-all"
                      >
                        <Phone className="w-4 h-4" />
                        <span>{lang === 'ar' ? 'اتصال مباشر' : 'Call'}</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Chat box with Technician */}
                {(simStatus === 'en_route' || simStatus === 'arrived' || simStatus === 'accepted') && (
                  <div className={isChatExpanded 
                    ? "fixed inset-0 z-[100] bg-[#07080E] p-4 sm:p-6 flex flex-col justify-between h-full w-full animate-fade-in text-right"
                    : "p-4 bg-[#05060A] border border-gray-900 rounded-2xl space-y-3"
                  }>
                    <div className="flex items-center justify-between border-b border-gray-900 pb-2">
                      <button
                        type="button"
                        onClick={() => setIsChatExpanded(!isChatExpanded)}
                        className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-amber-400 font-bold text-[11px] rounded-lg flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 shrink-0"
                        title={isChatExpanded ? (lang === 'ar' ? 'تصغير الشاشة' : 'Minimize') : (lang === 'ar' ? 'توسيع المحادثة على كامل شاشة الهاتف' : 'Expand Fullscreen')}
                      >
                        {isChatExpanded ? (
                          <>
                            <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lang === 'ar' ? 'تصغير الشاشة ↙' : 'Minimize ↙'}</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{lang === 'ar' ? 'توسيع المحادثة ⤢' : 'Expand ⤢'}</span>
                          </>
                        )}
                      </button>

                      <h5 className="text-xs font-black text-gray-300 flex items-center gap-1.5 justify-end">
                        <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                        <span>{lang === 'ar' ? 'محادثة مباشرة مع الفني المسعف:' : 'Direct Chat with Technician:'}</span>
                      </h5>
                    </div>
                    
                    <div className={isChatExpanded ? "flex-1 my-3 overflow-y-auto space-y-2 pr-1" : "max-h-36 overflow-y-auto space-y-2 pr-1"}>
                      {(!chatMessages || chatMessages.length === 0) && (
                        <p className="text-[10px] text-gray-500 text-center py-2">
                          {lang === 'ar' ? 'أرسل رسالة للفني لتزويده بملاحظات أو توجيهات...' : 'Send message to guide technician...'}
                        </p>
                      )}
                      {chatMessages && chatMessages.map(msg => (
                        <div key={msg.id} className={`p-2.5 rounded-xl text-xs max-w-[85%] ${msg.sender === 'client' ? 'bg-amber-500/20 text-amber-200 mr-auto text-left' : 'bg-gray-800 text-gray-200 ml-auto text-right'}`}>
                          <span>{msg.text}</span>
                        </div>
                      ))}
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage?.();
                      }}
                      className="flex gap-2 pt-1"
                    >
                      <input 
                        type="text" 
                        value={chatInput || ''} 
                        onChange={e => setChatInput?.(e.target.value)} 
                        placeholder={lang === 'ar' ? 'اكتب رسالتك هنا...' : 'Type message...'}
                        className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                      <button 
                        type="submit" 
                        className="px-4 py-2 bg-amber-500 text-black rounded-xl font-bold text-xs hover:bg-amber-400 cursor-pointer flex items-center justify-center gap-1 shrink-0"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{lang === 'ar' ? 'إرسال' : 'Send'}</span>
                      </button>
                    </form>
                  </div>
                )}

                {/* Cancel Request Button */}
                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => handleCancelRequest?.()}
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>🚫</span>
                    <span>{lang === 'ar' ? 'إلغاء الطلب والعودة للرئيسية' : 'Cancel Request'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>



      {/* CATALOG OF SERVICES LIST */}
      <div className="pt-8 border-t border-gray-900 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-black text-white flex items-center gap-2">
              <Wrench className="w-6 h-6 text-amber-500" />
              <span>{lang === 'ar' ? 'قائمة الخدمات المتاحة وطلب الخدمة المباشر 🛠️' : 'Available Road Services Catalog'}</span>
            </h3>
            <p className="text-xs text-gray-400 font-medium mt-1">
              {lang === 'ar'
                ? 'انقر على "اطلب الخدمة الآن ونشر البلاغ" لبث بطاقة طلبك فوراً على المحادثة الجماعية العامة وفتح قناة تواصل خاصة.'
                : 'Click "Order Service Now & Publish Alert" to broadcast your task card to the group chat and start private messaging.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {servicesList.map(srv => {
            const IconComp = srv.icon;
            return (
              <div 
                key={srv.id} 
                className="bg-[#0A0B10]/90 border-2 border-gray-800 hover:border-amber-500/60 rounded-3xl p-6 flex flex-col justify-between gap-5 transition-all hover:shadow-xl hover:shadow-amber-500/5 relative overflow-hidden group"
              >
                {/* Top Badge & Icon */}
                <div className="flex items-start justify-between gap-3">
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 group-hover:scale-110 transition-transform">
                    <IconComp className="w-7 h-7" />
                  </div>
                  <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {lang === 'ar' ? 'خدمة نشطة 24/7' : '24/7 ACTIVE'}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <h4 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors">
                    {srv.name}
                  </h4>
                  <p className="text-xs text-slate-300 font-semibold leading-relaxed line-clamp-3">
                    {srv.desc}
                  </p>
                </div>

                {/* Price & Action Button */}
                <div className="pt-3 border-t border-gray-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-bold">{lang === 'ar' ? 'السعر التقديري الأساسي:' : 'Estimated Base Price:'}</span>
                    <span className="text-base font-black text-amber-400 font-mono">{srv.basePrice} ₪</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOrderServiceAndBroadcast(srv)}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer border border-amber-400"
                  >
                    <span>اطلب الخدمة الآن ونشر البلاغ 🚀</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Public Group Chat section at bottom of Services Tab */}
      <div id="live-public-group-chat-container" className="pt-8 border-t border-gray-900">
        <PublicGroupChat 
          lang={lang} 
          currentUserRole={userRole || 'client'}
          currentUserName={loggedInUserName || (lang === 'ar' ? 'مستخدم' : 'User')}
          currentUserEmail={loggedInUserEmail}
          currentUserAvatar={userAvatar}
        />
      </div>

    </div>
  );
}
