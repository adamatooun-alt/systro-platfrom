import React from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, AlertTriangle, User, Compass, ShieldCheck, Radio } from 'lucide-react';
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
            <span>{lang === 'ar' ? 'صفحة عميل ورادار الخريطة 📍' : 'Client Page & Location Radar'}</span>
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
      <div className="bg-[#0F1424] border border-gray-800 p-6 rounded-3xl space-y-4 shadow-2xl">
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

    </div>
  );
}
