import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, 
  MapPin, 
  Navigation, 
  User, 
  Star, 
  MessageSquare, 
  Send, 
  CreditCard, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  Phone, 
  AlertTriangle, 
  Search,
  Check,
  Map as MapIcon,
  HelpCircle,
  TrendingUp,
  Sliders,
  DollarSign,
  Lock
} from 'lucide-react';
import { APIProvider, Map as GoogleMap, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  getDocs,
  deleteDoc,
  getDoc
} from 'firebase/firestore';

// Translate utility helper
const translations = {
  ar: {
    taxiPortalTitle: "بوابة سيسترو تكسي والـ VIP 🚕",
    taxiPortalDesc: "خدمة حجز سيارات الأجرة الفاخرة والعائلية بنظام الضمان المالي الموقوف والدفع المؤمن لحماية مشوارك بالكامل.",
    backToHome: "العودة للرئيسية",
    pickupLoc: "نقطة الانطلاق (موقعي الحالي) 📍",
    dropoffLoc: "وجهة الوصول المطلوبة 🏁",
    selectPickup: "حدد موقع الانطلاق الحالي",
    selectDropoff: "حدد وجهة الوصول والمشوار",
    selectCarType: "اختر فئة سيارة الأجرة الملائمة:",
    eta: "زمن الوصول:",
    fare: "التعريفة التقديرية للرحلة:",
    bookNow: "تأكيد حجز التكسي والتحويل للضمان 🔒",
    searchingDriver: "جاري البحث عن أقرب سائق تكسي معتمد...",
    searchingSubtitle: "نقوم ببث طلبك المالي الفوري لشبكة السائقين المرخصين من حولك",
    driverFound: "تم العثور على سائق متاح وتأكيد طلبك!",
    driverDetails: "بيانات السائق المعتمد",
    plateNumber: "رقم اللوحة:",
    driverRating: "تقييم السائق:",
    escrowLocked: "قيمة الرحلة محجوزة بأمان بالضمان المالي لسيسترو",
    escrowLockedDesc: "لن يتم تحرير الأجرة للسائق إلا بعد وصولك بسلام للوجهة وتأكيدك التام عبر التطبيق.",
    chatHeader: "المحادثة الفورية مع الكابتن",
    chatPlaceholder: "اكتب رسالة للكابتن هنا...",
    driverArrived: "وصل الكابتن إلى موقعك الحالي وهو بانتظارك! 🚕",
    driverArrivedDesc: "يرجى البحث عن سيارة Skoda Octavia الفضية لوحة رقم 41-789-32.",
    tripStarted: "الرحلة نشطة حالياً - في الطريق لوجهتك 🛣️",
    tripStartedDesc: "نتمنى لك رحلة ممتعة وآمنة. تتبع مسار الرحلة على الخريطة بالأسفل.",
    tripCompleted: "الحمد لله على السلامة! وصلت لوجهتك بنجاح 🎉",
    tripCompletedDesc: "تم إتمام الرحلة بنجاح. يرجى تأكيد رضاك لتحرير الدفعة وتقييم السائق.",
    releaseFare: "تأكيد الوصول وتحرير الأجرة للكابتن 🔓💸",
    rateTrip: "قيم تجربتك مع الكابتن:",
    feedbackPlaceholder: "أضف تعليقاً حول الرحلة أو السائق (اختياري)...",
    submitRating: "إرسال التقييم وإنهاء الرحلة ⭐",
    tripEnded: "تم إنهاء الرحلة وتسوية المستحقات بنجاح! شكراً لاستخدامك سيسترو.",
    cancelOrder: "إلغاء الطلب والعودة ❌",
    popularDestinations: "وجهات شائعة وسريعة الاختيار:",
    luggageCount: "عدد الحقائب والأمتعة:",
    petFriendly: "صديق للحيوانات الأليفة",
    silentRide: "رحلة صامتة وهادئة",
    rideOptions: "تخصيص خيارات وميزات الرحلة:",
    statusLabel: "حالة المشوار الحالي:",
    distanceLabel: "المسافة الكلية للرحلة:",
    durationLabel: "الوقت المتوقع للوصول:"
  },
  en: {
    taxiPortalTitle: "Systro Taxi & VIP Ride Portal 🚕",
    taxiPortalDesc: "Secure, escrow-backed professional taxi and luxury sedan booking. Your fare is held safely in our vault until you arrive.",
    backToHome: "Back to Home",
    pickupLoc: "Pickup Point (My Current Location) 📍",
    dropoffLoc: "Drop-off Destination 🏁",
    selectPickup: "Select current pickup point",
    selectDropoff: "Select destination point",
    selectCarType: "Select your preferred ride category:",
    eta: "Estimated ETA:",
    fare: "Estimated Fare:",
    bookNow: "Securely Book Taxi & Lock Fare 🔒",
    searchingDriver: "Broadcasting request to nearby certified drivers...",
    searchingSubtitle: "Sourcing verified, rated professional drivers around your exact location",
    driverFound: "Certified driver dispatched and en route!",
    driverDetails: "Driver Information",
    plateNumber: "License Plate:",
    driverRating: "Driver Rating:",
    escrowLocked: "Fare locked securely in Systro Escrow Vault",
    escrowLockedDesc: "The driver cannot withdraw funds until you safely arrive and authorize the release via your app.",
    chatHeader: "Instant Chat with Captain",
    chatPlaceholder: "Type a message to the captain...",
    driverArrived: "Captain has arrived at your pickup point! 🚕",
    driverArrivedDesc: "Please look for the Silver Skoda Octavia, Plate: 41-789-32.",
    tripStarted: "Trip in progress - Heading to destination 🛣️",
    tripStartedDesc: "We wish you a pleasant and safe ride. Track your dynamic coordinates below.",
    tripCompleted: "You have arrived safely at your destination! 🎉",
    tripCompletedDesc: "Trip successfully completed. Please confirm to release the escrow payment and rate your driver.",
    releaseFare: "Confirm Arrival & Release Fare to Captain 🔓💸",
    rateTrip: "Rate your ride experience:",
    feedbackPlaceholder: "Write a short feedback about the ride or driver (optional)...",
    submitRating: "Submit Rating & Close Ride ⭐",
    tripEnded: "Ride finalized and payment safely completed! Thank you for choosing Systro.",
    cancelOrder: "Cancel Order & Go Back ❌",
    popularDestinations: "Popular & Quick Destinations:",
    luggageCount: "Number of bags/luggage:",
    petFriendly: "Pet-friendly vehicle",
    silentRide: "Silent & quiet ride",
    rideOptions: "Customize Your Ride Options:",
    statusLabel: "Current Ride Status:",
    distanceLabel: "Total Trip Distance:",
    durationLabel: "Estimated Trip Duration:"
  },
  he: {
    taxiPortalTitle: "פורטל מוניות פרימיום ונסיעות VIP 🚕",
    taxiPortalDesc: "שירות הזמנת מוניות שירות ומנהלים מוסמכות עם הבטחה פיננסית (Escrow). כספך מוגן לחלוטין עד הגעתך ליעד.",
    backToHome: "חזרה לדף הבית",
    pickupLoc: "נקודת איסוף (מיקום נוכחי) 📍",
    dropoffLoc: "יעד נסיעה מבוקש 🏁",
    selectPickup: "בחר מיקום איסוף נוכחי",
    selectDropoff: "בחר יעד לנסיעה",
    selectCarType: "בחר את קטגוריית המונית המתאימה:",
    eta: "זמן הגעה מוערך:",
    fare: "מחיר נסיעה מוערך:",
    bookNow: "הזמן מונית ונעול תשלום מאובטח 🔒",
    searchingDriver: "מחפש נהג מונית פנוי בסביבתך...",
    searchingSubtitle: "משדרים את בקשתך המאובטחת לנהגים מורשים בסביבה",
    driverFound: "נהג מוסמך נמצא והוא בדרך אליך!",
    driverDetails: "פרטי הנהג השותף",
    plateNumber: "מספר רכב:",
    driverRating: "דירוג נהג:",
    escrowLocked: "מחיר הנסיעה נעול בבטחה בנאמנות סיסטרו",
    escrowLockedDesc: "הנהג אינו יכול למשוך את כספי הנסיעה עד שתגיע בבטחה ליעד ותאשר זאת באפליקציה.",
    chatHeader: "צ'אט מהיר עם הקפטן",
    chatPlaceholder: "כתוב הודעה לקפטן...",
    driverArrived: "הקפטן הגיע לנקודת האיסוף וממתין לך! 🚕",
    driverArrivedDesc: "אנא חפש סקודה אוקטביה כסופה, מספר רישוי: 41-789-32.",
    tripStarted: "הנסיעה פעילה - בדרך ליעד שלך 🛣️",
    tripStartedDesc: "מאחלים לך נסיעה נעימה ובטוחה. עקוב אחר מסלול הנסיעה במפה.",
    tripCompleted: "ברוך הבא! הגעת ליעד בבטחה 🎉",
    tripCompletedDesc: "הנסיעה הושלמה בהצלחה. אנא אשר את קבלת השירות כדי לשחרר את התשלום ולדרג את הנהג.",
    releaseFare: "אשר הגעה ליעד ושחרר תשלום לקפטן 🔓💸",
    rateTrip: "דרג את חוויית הנסיעה שלך:",
    feedbackPlaceholder: "כתוב משוב קצר על הנסיעה או הנהג (אופציונלי)...",
    submitRating: "שלח דירוג וסגור נסיעה ⭐",
    tripEnded: "הנסיעה הסתיימה בהצלחה והתשלום הועבר! תודה שבחרת בסיסטרו.",
    cancelOrder: "ביטול הזמנה וחזרה ❌",
    popularDestinations: "יעדים פופולריים לבחירה מהירה:",
    luggageCount: "מספר מזוודות ותיקים:",
    petFriendly: "נסיעה עם חיות מחמד",
    silentRide: "נסיעה שקטה ורגועה",
    rideOptions: "התאמה אישית של תכונות הנסיעה:",
    statusLabel: "מצב נסיעה נוכחי:",
    distanceLabel: "מרחק נסיעה כולל:",
    durationLabel: "זמן נסיעה משוער:"
  }
};

interface TaxiTabProps {
  lang: 'ar' | 'en' | 'he';
  isLoggedIn: boolean;
  loggedInUserName: string;
  loggedInUserEmail: string;
  setActiveTab: (tab: string) => void;
  triggerToast: (text: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
  mapsKey?: string;
}

export default function TaxiTab({
  lang,
  isLoggedIn,
  loggedInUserName,
  loggedInUserEmail,
  setActiveTab,
  triggerToast,
  mapsKey
}: TaxiTabProps) {
  const t = translations[lang] || translations.en;

  // Predefined destinations for easy selection
  const predefinedDestinations = [
    { 
      id: 'dest_1', 
      nameAr: "وسط القدس (باب العمود)", 
      nameEn: "Jerusalem Center (Damascus Gate)", 
      nameHe: "מרכז ירושלים (שער שכם)",
      distanceKm: 12.5,
      baseFare: 60
    },
    { 
      id: 'dest_2', 
      nameAr: "مطار بن غوريون الدولي", 
      nameEn: "Ben Gurion Intl Airport", 
      nameHe: "נמל תעופה בן גוריון (נתב\"ג)",
      distanceKm: 48.2,
      baseFare: 180
    },
    { 
      id: 'dest_3', 
      nameAr: "شاطئ تل أبيب (التاييلت)", 
      nameEn: "Tel Aviv Beach Promenade", 
      nameHe: "טיילת חוף תל אביב",
      distanceKm: 54.0,
      baseFare: 210
    },
    { 
      id: 'dest_4', 
      nameAr: "وسط مدينة رام الله (المنارة)", 
      nameEn: "Ramallah Center (Al-Manara)", 
      nameHe: "מרכז רמאללה (כיכר מנארה)",
      distanceKm: 18.7,
      baseFare: 80
    },
    { 
      id: 'dest_5', 
      nameAr: "البلدة القديمة الناصرة", 
      nameEn: "Nazareth Old City", 
      nameHe: "העיר העתיקה נצרת",
      distanceKm: 110.5,
      baseFare: 380
    }
  ];

  // Booking details states
  const [pickupInput, setPickupInput] = useState<string>('');
  const [dropoffInput, setDropoffInput] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<typeof predefinedDestinations[0] | null>(null);
  const [selectedCarCategory, setSelectedCarCategory] = useState<'standard' | 'comfort' | 'van' | 'vip'>('standard');
  
  // Custom travel options
  const [luggage, setLuggage] = useState<number>(0);
  const [isPetFriendly, setIsPetFriendly] = useState<boolean>(false);
  const [isSilentRide, setIsSilentRide] = useState<boolean>(false);

  // Simulation step: 'idle' | 'searching' | 'driver_assigned' | 'driver_arrived' | 'riding' | 'completed' | 'finished'
  const [simStep, setSimStep] = useState<'idle' | 'searching' | 'driver_assigned' | 'driver_arrived' | 'riding' | 'completed' | 'finished'>('idle');
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: 'client' | 'driver' | 'system'; text: string; time: string }>>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Rating and feedback state at completion
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState<string>('');

  // Active request and bids list from Firestore
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [selectedBid, setSelectedBid] = useState<any | null>(null);

  // Sync state from Firestore active request
  useEffect(() => {
    if (!isLoggedIn || !loggedInUserEmail) {
      setActiveRequest(null);
      setBids([]);
      setSelectedBid(null);
      return;
    }

    const q = query(
      collection(db, "requests"),
      where("requestedBy", "==", loggedInUserEmail),
      where("serviceType", "==", "taxi")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });

      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const active = list.find(r => r.status !== 'finished');

      if (active) {
        setActiveRequest(active);
        
        if (active.status === 'pending_bids') {
          setSimStep('searching');
        } else if (active.status === 'awaiting_deposit') {
          setSimStep('driver_assigned');
        } else if (active.status === 'en_route') {
          setSimStep('driver_assigned');
        } else if (active.status === 'arrived') {
          setSimStep('driver_arrived');
        } else if (active.status === 'in_progress') {
          setSimStep('riding');
        } else if (active.status === 'completed') {
          setSimStep('completed');
        } else {
          setSimStep('finished');
        }

        if (active.pickupLocation) setPickupInput(active.pickupLocation);
        if (active.dropoffLocation) setDropoffInput(active.dropoffLocation);
        if (active.carCategory) setSelectedCarCategory(active.carCategory);
        if (active.luggageCount !== undefined) setLuggage(active.luggageCount);
        if (active.isPetFriendly !== undefined) setIsPetFriendly(active.isPetFriendly);
        if (active.isSilentRide !== undefined) setIsSilentRide(active.isSilentRide);

        if (active.selectedTechnicianId) {
          getDocs(query(collection(db, "bids"), where("requestId", "==", active.id))).then((bidsSnap) => {
            const bidsList: any[] = [];
            bidsSnap.forEach(bDoc => bidsList.push({ id: bDoc.id, ...bDoc.data() }));
            const matching = bidsList.find(b => b.technicianId === active.selectedTechnicianId);
            if (matching) {
              setSelectedBid(matching);
            } else {
              setSelectedBid({
                technicianId: active.selectedTechnicianId,
                technicianName: active.selectedTechnicianName || active.selectedTechnicianId,
                price: active.approximatePrice || 100,
                etaMinutes: active.etaMinutes || 10,
                rating: 4.9,
                carModel: active.selectedTechnicianCar || "Skoda Octavia",
                plateNumber: active.selectedTechnicianPlate || "41-789-32"
              });
            }
          });
        }
      } else {
        setActiveRequest(null);
        setBids([]);
        setSelectedBid(null);
      }
    });

    return () => unsub();
  }, [isLoggedIn, loggedInUserEmail]);

  // Listen for bids on the active request in real-time
  useEffect(() => {
    if (!activeRequest || activeRequest.status !== 'pending_bids') {
      setBids([]);
      return;
    }

    const q = query(collection(db, "bids"), where("requestId", "==", activeRequest.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const bList: any[] = [];
      snapshot.forEach(docSnap => {
        bList.push({ id: docSnap.id, ...docSnap.data() });
      });
      setBids(bList);
    });

    return () => unsub();
  }, [activeRequest]);

  // Listen for real-time chats on the active request
  useEffect(() => {
    if (!activeRequest) {
      setChatMessages([]);
      return;
    }

    const q = query(collection(db, "chats"), where("requestId", "==", activeRequest.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach(docSnap => {
        msgs.push(docSnap.data());
      });
      msgs.sort((a, b) => (a.createdTime || 0) - (b.createdTime || 0));
      setChatMessages(msgs.map(m => ({
        id: m.id,
        sender: m.sender === 'technician' ? 'driver' : m.sender,
        text: m.text,
        time: m.timestamp || 'Just now'
      })));
    });

    return () => unsub();
  }, [activeRequest]);

  // Handle preset destination pick
  const handlePickDestination = (dest: typeof predefinedDestinations[0]) => {
    setSelectedDestination(dest);
    const dropName = lang === 'ar' ? dest.nameAr : lang === 'he' ? dest.nameHe : dest.nameEn;
    setDropoffInput(dropName);
    
    // Auto-fill pickup if empty
    if (!pickupInput) {
      setPickupInput(lang === 'ar' ? "موقعي الحالي (رصد GPS نشط)" : lang === 'he' ? "מיקום נוכחי (GPS פעיל)" : "My Current Location (Active GPS)");
    }
    
    triggerToast(
      lang === 'ar' 
        ? `تم اختيار الوجهة: ${dest.nameAr}. المسافة ${dest.distanceKm} كم.` 
        : lang === 'he'
        ? `היעד נבחר: ${dest.nameHe}. מרחק ${dest.distanceKm} ק"מ.`
        : `Destination picked: ${dest.nameEn}. Distance ${dest.distanceKm} km.`,
      'success'
    );
  };

  // Calculate dynamic fare based on base price, category multiplier and extra options
  const getCalculatedFare = () => {
    const base = selectedDestination ? selectedDestination.baseFare : 45;
    let multiplier = 1.0;
    if (selectedCarCategory === 'comfort') multiplier = 1.4;
    if (selectedCarCategory === 'van') multiplier = 1.8;
    if (selectedCarCategory === 'vip') multiplier = 2.5;

    let extras = luggage * 10;
    if (isPetFriendly) extras += 15;
    
    return Math.round(base * multiplier + extras);
  };

  // Get estimated ETA and Duration
  const getTripEstimates = () => {
    const distance = selectedDestination ? selectedDestination.distanceKm : 15;
    const durationMin = Math.round(distance * 1.5);
    const driverEta = 3 + Math.floor(Math.random() * 5); // 3 to 7 mins
    return {
      distance: `${distance} km`,
      duration: `${durationMin} mins`,
      driverEta: `${driverEta} mins`
    };
  };

  // Simulation process runner / Submit real request to Firestore
  const startSimulation = async () => {
    if (!pickupInput || !dropoffInput) {
      triggerToast(
        lang === 'ar' 
          ? 'يرجى إدخال نقطة الانطلاق ووجهة الوصول أولاً!' 
          : lang === 'he'
          ? 'אנא הזן נקודת איסוף ויעד תחילה!'
          : 'Please enter pickup and drop-off points first!', 
        'warning'
      );
      return;
    }

    if (!isLoggedIn) {
      triggerToast(
        lang === 'ar'
          ? 'الرجاء تسجيل الدخول أولاً للتمكن من حجز تكسي معتمد!'
          : lang === 'he'
          ? 'אנא התחבר תחילה כדי לבצע הזמנת מונית!'
          : 'Please log in to book a certified ride!',
        'warning'
      );
      // Auto scroll to login section on home if any
      setActiveTab('home');
      setTimeout(() => {
        const element = document.getElementById('login-portal-section');
        if (element) element.scrollIntoView({ behavior: 'smooth' });
      }, 300);
      return;
    }

    try {
      const reqId = `req-taxi-${Date.now()}`;
      const approxPrice = getCalculatedFare();
      const clientName = loggedInUserName || 'Adam Atooun';

      // Submit real request to Firestore
      await setDoc(doc(db, "requests", reqId), {
        id: reqId,
        clientName,
        clientPhone: "+972 59-999-9999",
        requestedBy: loggedInUserEmail,
        locationLat: 45.0, // Default coordinates for simulation mapping
        locationLng: 45.0,
        locationName: pickupInput,
        arLocationName: pickupInput,
        pickupLocation: pickupInput,
        dropoffLocation: dropoffInput,
        serviceType: 'taxi',
        description: `طلب مشوار تكسي خاص / VIP. الفئة المطلوبة: ${selectedCarCategory}. الحقائب: ${luggage}. خيارات إضافية: ${isPetFriendly ? 'صديق للحيوانات' : ''} ${isSilentRide ? 'رحلة صامتة' : ''}`,
        status: "pending_bids",
        escrowAmount: approxPrice,
        approximatePrice: approxPrice,
        carCategory: selectedCarCategory,
        luggageCount: luggage,
        isPetFriendly,
        isSilentRide,
        selectedTechnicianId: null,
        timestamp: new Date().toISOString()
      });

      triggerToast(
        lang === 'ar' 
          ? '✅ تم إرسال طلب التكسي بنجاح! جاري بث الطلب للسائقين من حولك.' 
          : '✅ Taxi request submitted! Sourcing professional drivers near you.', 
        'success'
      );
    } catch (err) {
      console.error("Failed to submit taxi request:", err);
      triggerToast("Error booking taxi", 'error');
    }
  };

  // Send message in chat simulation or Firestore
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeRequest) return;

    const userMsgText = chatInput.trim();
    setChatInput('');

    try {
      const mId = `client-${Date.now()}`;
      await setDoc(doc(db, "chats", mId), {
        id: mId,
        requestId: activeRequest.id,
        sender: 'client',
        text: userMsgText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        createdTime: Date.now()
      });
    } catch (err) {
      console.error("Error sending chat to Firestore:", err);
    }
  };

  // Release payment and rate
  const handleReleaseAndFinish = async () => {
    if (!activeRequest) return;
    try {
      await updateDoc(doc(db, "requests", activeRequest.id), {
        status: 'finished'
      });
      triggerToast(
        lang === 'ar' 
          ? `🔐 تم تحرير الأجرة (${getCalculatedFare()} ₪) للكابتن الشريك بنجاح! شكراً لتقييمك.` 
          : `🔐 Escrow fare of ${getCalculatedFare()} ₪ has been released to the captain! Thank you for your feedback.`, 
        'success'
      );
    } catch (err) {
      console.error("Error releasing escrow:", err);
    }
  };

  // Reset simulator
  const handleReset = () => {
    setSimStep('idle');
    setPickupInput('');
    setDropoffInput('');
    setSelectedDestination(null);
    setLuggage(0);
    setIsPetFriendly(false);
    setIsSilentRide(false);
    setRating(5);
    setFeedback('');
  };

  // Cancel current order
  const handleCancelOrder = async () => {
    if (activeRequest) {
      try {
        await deleteDoc(doc(db, "requests", activeRequest.id));
        triggerToast(lang === 'ar' ? 'تم إلغاء طلب المشوار بنجاح ❌' : 'Ride request cancelled successfully ❌', 'info');
      } catch (err) {
        console.error("Error canceling ride request:", err);
      }
    }
    handleReset();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 text-white animate-fade-in pb-24" id="taxi-portal-container">
      
      {/* HEADER SECTION WITH BACK BUTTON */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={() => setActiveTab('home')}
            className="group mb-3 inline-flex items-center gap-2 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>{t.backToHome}</span>
          </button>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white leading-tight flex items-center gap-3">
            <span className="p-2.5 bg-yellow-500/10 text-yellow-500 rounded-2xl border border-yellow-500/20">
              <Car className="w-7 h-7" />
            </span>
            <span>{t.taxiPortalTitle}</span>
          </h1>
          <p className="text-gray-400 font-medium text-xs md:text-sm mt-2 max-w-2xl leading-relaxed">
            {t.taxiPortalDesc}
          </p>
        </div>

        {/* Brand Shield Badge */}
        <div className="bg-[#111827]/80 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3 shrink-0 self-start md:self-center shadow-lg backdrop-blur-md">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              {lang === 'ar' ? 'ضمان الدفع الآمن (Escrow)' : lang === 'he' ? 'אבטחת נאמנות (Escrow)' : 'SECURE ESCROW GUARANTEED'}
            </h4>
            <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">
              {lang === 'ar' ? 'مشوارك مؤمن ومحمي مالياً ١٠٠٪' : lang === 'he' ? 'הנסיעה שלך מבוטחת ומאובטחת ב-100%' : 'Your ride fare is 100% protected'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: BOOKING FORM / SIMULATOR CONTROL */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            
            {/* STEP 1: IDLE / FORM FILLING */}
            {simStep === 'idle' && (
              <motion.div 
                key="booking_form"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-[#111827]/60 border border-gray-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl backdrop-blur-md"
              >
                {/* Popular Quick Locations */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-2 select-none">
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>{t.popularDestinations}</span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {predefinedDestinations.map(dest => (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => handlePickDestination(dest)}
                        className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                          selectedDestination?.id === dest.id 
                            ? 'bg-orange-500 text-black border-orange-500 shadow-lg shadow-orange-500/20 scale-105' 
                            : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500/20 hover:text-orange-300'
                        }`}
                      >
                        <span>📍</span>
                        <span>{lang === 'ar' ? dest.nameAr : lang === 'he' ? dest.nameHe : dest.nameEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pickup & Dropoff Manual inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Pickup */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-300 select-none flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t.pickupLoc}</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={pickupInput}
                        onChange={(e) => setPickupInput(e.target.value)}
                        placeholder={t.selectPickup}
                        className="w-full h-12 bg-gray-950/80 border border-gray-800 rounded-xl px-4 text-xs font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-all focus:ring-1 focus:ring-emerald-500/30"
                      />
                    </div>
                  </div>

                  {/* Dropoff */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-300 select-none flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-red-500" />
                      <span>{t.dropoffLoc}</span>
                    </label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={dropoffInput}
                        onChange={(e) => setDropoffInput(e.target.value)}
                        placeholder={t.selectDropoff}
                        className="w-full h-12 bg-gray-950/80 border border-gray-800 rounded-xl px-4 text-xs font-bold text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-all focus:ring-1 focus:ring-red-500/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle Selection with interactive pricing card style */}
                <div className="space-y-3">
                  <label className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-2 select-none">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{t.selectCarType}</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    
                    {/* Category 1: Standard */}
                    <div 
                      onClick={() => setSelectedCarCategory('standard')}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer select-none relative ${
                        selectedCarCategory === 'standard' 
                          ? 'bg-orange-500/10 border-orange-500 text-white shadow-lg' 
                          : 'bg-orange-500/5 border-orange-500/10 text-gray-400 hover:border-orange-500/25 hover:text-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🚕</span>
                      <h4 className="text-xs font-black">{lang === 'ar' ? 'تكسي اقتصادي' : lang === 'he' ? 'מונית רגילה' : 'Standard Taxi'}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 font-bold">Base Fare</p>
                      {selectedCarCategory === 'standard' && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-black text-[9px] font-bold">✓</span>
                      )}
                    </div>

                    {/* Category 2: Comfort */}
                    <div 
                      onClick={() => setSelectedCarCategory('comfort')}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer select-none relative ${
                        selectedCarCategory === 'comfort' 
                          ? 'bg-orange-500/10 border-orange-500 text-white shadow-lg' 
                          : 'bg-orange-500/5 border-orange-500/10 text-gray-400 hover:border-orange-500/25 hover:text-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🚗</span>
                      <h4 className="text-xs font-black">{lang === 'ar' ? 'سيدان مكيفة' : lang === 'he' ? 'רכב קומפורט' : 'Comfort / Sedan'}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 font-bold">x1.4 rate</p>
                      {selectedCarCategory === 'comfort' && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-black text-[9px] font-bold">✓</span>
                      )}
                    </div>

                    {/* Category 3: Large Van */}
                    <div 
                      onClick={() => setSelectedCarCategory('van')}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer select-none relative ${
                        selectedCarCategory === 'van' 
                          ? 'bg-orange-500/10 border-orange-500 text-white shadow-lg' 
                          : 'bg-orange-500/5 border-orange-500/10 text-gray-400 hover:border-orange-500/25 hover:text-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">🚙</span>
                      <h4 className="text-xs font-black">{lang === 'ar' ? 'عائلية / فان' : lang === 'he' ? 'מונית גדולה' : 'Large Van'}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 font-bold">x1.8 rate</p>
                      {selectedCarCategory === 'van' && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-black text-[9px] font-bold">✓</span>
                      )}
                    </div>

                    {/* Category 4: VIP */}
                    <div 
                      onClick={() => setSelectedCarCategory('vip')}
                      className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer select-none relative ${
                        selectedCarCategory === 'vip' 
                          ? 'bg-orange-500/10 border-orange-500 text-white shadow-lg' 
                          : 'bg-orange-500/5 border-orange-500/10 text-gray-400 hover:border-orange-500/25 hover:text-gray-300'
                      }`}
                    >
                      <span className="text-2xl block mb-1">✨</span>
                      <h4 className="text-xs font-black">{lang === 'ar' ? 'لكزس / VIP' : lang === 'he' ? 'נסיעת מנהלים' : 'Executive VIP'}</h4>
                      <p className="text-[10px] text-gray-500 mt-1 font-bold">x2.5 rate</p>
                      {selectedCarCategory === 'vip' && (
                        <span className="absolute top-2 right-2 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center text-black text-[9px] font-bold">✓</span>
                      )}
                    </div>

                  </div>
                </div>

                {/* Travel Customization options */}
                <div className="space-y-3 bg-[#0A0B10]/40 p-4 rounded-2xl border border-gray-850/60">
                  <h4 className="text-xs font-black text-gray-300 uppercase tracking-wide">{t.rideOptions}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Luggage Input */}
                    <div className="flex items-center justify-between sm:justify-start gap-3">
                      <span className="text-xs font-bold text-gray-400">{t.luggageCount}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => setLuggage(prev => Math.max(0, prev - 1))}
                          className="w-7 h-7 bg-orange-500/10 border border-orange-500/20 rounded-lg font-black text-xs hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 flex items-center justify-center cursor-pointer select-none"
                        >
                          -
                        </button>
                        <span className="text-xs font-black w-4 text-center">{luggage}</span>
                        <button 
                          type="button"
                          onClick={() => setLuggage(prev => Math.min(5, prev + 1))}
                          className="w-7 h-7 bg-orange-500/10 border border-orange-500/20 rounded-lg font-black text-xs hover:bg-orange-500/20 text-orange-400 hover:text-orange-300 flex items-center justify-center cursor-pointer select-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Pet Friendly */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isPetFriendly}
                        onChange={(e) => setIsPetFriendly(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-400">{t.petFriendly}</span>
                    </label>

                    {/* Silent Ride */}
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isSilentRide}
                        onChange={(e) => setIsSilentRide(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                      />
                      <span className="text-xs font-bold text-gray-400">{t.silentRide}</span>
                    </label>
                  </div>
                </div>

                {/* Estimate summary and Action button */}
                <div className="pt-4 border-t border-gray-850 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shrink-0 border border-amber-500/20">
                      <CreditCard className="w-5.5 h-5.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.fare}</h4>
                      <div className="flex items-baseline gap-1.5 text-right rtl:text-right ltr:text-left">
                        <span className="text-2xl font-black text-white">{getCalculatedFare()} ₪</span>
                        <span className="text-[10px] text-gray-500 font-bold">({t.eta}: {getTripEstimates().duration})</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={startSimulation}
                    className="w-full sm:w-auto px-8 h-14 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black text-sm rounded-xl shadow-xl shadow-amber-500/10 hover:scale-[1.03] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-5 h-5 shrink-0" />
                    <span>{t.bookNow}</span>
                  </button>
                </div>
              </motion.div>
            )}

            {simStep === 'searching' && (
              <motion.div 
                key="searching_radar"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {/* Radar ripple waves (If no bids yet) */}
                {bids.length === 0 ? (
                  <div className="bg-[#111827]/60 border border-gray-850 rounded-3xl p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[420px] shadow-2xl backdrop-blur-md">
                    <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                      <span className="absolute inset-0 rounded-full bg-amber-500/5 animate-ping duration-1000"></span>
                      <span className="absolute inset-4 rounded-full bg-amber-500/10 animate-ping duration-1000 delay-200"></span>
                      <span className="absolute inset-8 rounded-full bg-amber-500/15 animate-ping duration-1000 delay-500"></span>
                      <div className="relative w-16 h-16 rounded-2xl bg-amber-500 text-black flex items-center justify-center shadow-2xl shadow-amber-500/30">
                        <Search className="w-8 h-8 animate-pulse" />
                      </div>
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-white">{t.searchingDriver}</h2>
                    <p className="text-gray-400 font-medium text-xs md:text-sm max-w-md mt-2 leading-relaxed">
                      {t.searchingSubtitle}
                    </p>

                    <div className="mt-8 bg-gray-950/60 p-4 rounded-2xl border border-gray-900 max-w-sm w-full text-right rtl:text-right ltr:text-left space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-300">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0"></span>
                        <span className="font-bold truncate">{pickupInput}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-300 border-t border-gray-900/40 pt-2">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full shrink-0"></span>
                        <span className="font-bold truncate">{dropoffInput}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCancelOrder}
                      className="mt-8 px-6 py-2.5 rounded-xl border border-orange-500/20 bg-orange-500/5 text-xs font-bold text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-all cursor-pointer"
                    >
                      {t.cancelOrder}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#111827]/60 border border-gray-850 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-850 text-right rtl:text-right ltr:text-left">
                      <div>
                        <h2 className="text-lg md:text-xl font-black text-white flex items-center gap-2 justify-start">
                          <span className="text-amber-500 animate-pulse">●</span>
                          <span>{lang === 'ar' ? 'العروض المستلمة من الكباتن المتاحة 🚖' : 'Bids Received from Available Captains 🚖'}</span>
                        </h2>
                        <p className="text-xs text-gray-400 font-bold mt-1">
                          {lang === 'ar' ? 'اختر العرض المناسب لك لبدء رحلتك الآمنة بنظام الضمان المالي' : 'Select your preferred offer to begin your safe trip protected by escrow'}
                        </p>
                      </div>
                      <button
                        onClick={handleCancelOrder}
                        className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-black text-red-400 transition-all cursor-pointer shrink-0"
                      >
                        {t.cancelOrder}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bids.map((bid) => {
                        return (
                          <div key={bid.id} className="bg-gray-950/60 border border-gray-900 hover:border-amber-500/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all">
                            <div className="flex items-start gap-3">
                              <div className="w-12 h-12 rounded-xl bg-gray-900 overflow-hidden border border-gray-800 flex items-center justify-center shrink-0">
                                <img 
                                  src={bid.avatar || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=120"} 
                                  alt="Driver avatar" 
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                              <div className="space-y-1 min-w-0 flex-1 text-right">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-black text-white truncate">{bid.technicianArName || bid.technicianName}</h4>
                                  <span className="text-[10px] text-amber-500 font-extrabold flex items-center gap-0.5">
                                    ★ {bid.rating || 4.9}
                                  </span>
                                </div>
                                <p className="text-[11px] text-gray-400 font-medium truncate">
                                  🚙 {bid.carModel || 'Skoda Octavia'}
                                </p>
                                <span className="text-[9px] bg-gray-900 border border-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-bold block w-max">
                                  {bid.plateNumber || '41-789-32'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between border-t border-gray-900/60 pt-3">
                              <div className="text-right">
                                <span className="text-[9px] text-gray-500 block font-bold">{lang === 'ar' ? 'الوقت المقدر' : 'Estimated ETA'}</span>
                                <span className="text-xs font-black text-emerald-400">{bid.etaMinutes || 8} دقائق</span>
                              </div>
                              <div className="text-right">
                                <span className="text-[9px] text-gray-500 block font-bold">{lang === 'ar' ? 'السعر الكلي للمشوار' : 'Total Fare'}</span>
                                <span className="text-base font-black text-white">{bid.price} ₪</span>
                              </div>
                            </div>

                            <button
                              onClick={async () => {
                                if (!activeRequest) return;
                                try {
                                  await updateDoc(doc(db, "requests", activeRequest.id), {
                                    status: 'awaiting_deposit',
                                    selectedTechnicianId: bid.technicianId,
                                    selectedTechnicianName: bid.technicianArName || bid.technicianName,
                                    approximatePrice: bid.price,
                                    selectedTechnicianCar: bid.carModel || 'Skoda Octavia',
                                    selectedTechnicianPlate: bid.plateNumber || '41-789-32'
                                  });
                                  
                                  // Send system chat message
                                  const systemMsgId = `sys-assign-${Date.now()}`;
                                  await setDoc(doc(db, "chats", systemMsgId), {
                                    id: systemMsgId,
                                    requestId: activeRequest.id,
                                    sender: 'system',
                                    text: lang === 'ar' ? `🚕 تم تعيين الكابتن ${bid.technicianArName || bid.technicianName} لمشوارك الخاص. يرجى إيداع الضمان لتفعيل الرحلة.` : `🚕 Captain ${bid.technicianName} assigned. Please deposit escrow to start ride.`,
                                    timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                                    createdTime: Date.now()
                                  });

                                  triggerToast(lang === 'ar' ? 'تم اختيار العرض بنجاح! يرجى إيداع الضمان 🔒' : 'Offer accepted! Please complete escrow lock 🔒', 'success');
                                } catch (err) {
                                  console.error("Error accepting bid:", err);
                                }
                              }}
                              className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1"
                            >
                              <span>{lang === 'ar' ? 'قبول العرض وحجز المشوار 🚖' : 'Accept Offer & Book Ride 🚖'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* STEPS: DRIVER ASSIGNED / ARRIVED / RIDING / COMPLETED */}
            {['driver_assigned', 'driver_arrived', 'riding', 'completed'].includes(simStep) && (
              <motion.div 
                key="active_simulation_cards"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Active Ride Banner */}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl select-none">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-500/20 text-amber-400 border border-amber-500/35 rounded-2xl flex items-center justify-center shrink-0">
                      <Car className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-wider text-amber-500 block">
                        {t.statusLabel}
                      </span>
                      <h3 className="text-base md:text-lg font-black text-white mt-0.5">
                        {simStep === 'driver_assigned' && t.driverFound}
                        {simStep === 'driver_arrived' && t.driverArrived}
                        {simStep === 'riding' && t.tripStarted}
                        {simStep === 'completed' && t.tripCompleted}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium leading-normal mt-1">
                        {simStep === 'driver_assigned' && "القصة تبدأ! السائق في الطريق لاستلامك."}
                        {simStep === 'driver_arrived' && t.driverArrivedDesc}
                        {simStep === 'riding' && t.tripStartedDesc}
                        {simStep === 'completed' && t.tripCompletedDesc}
                      </p>
                    </div>
                  </div>

                  {/* Real-time duration stats */}
                  <div className="flex items-center gap-6 border-t sm:border-t-0 sm:border-l border-gray-800 pt-4 sm:pt-0 sm:pl-6 shrink-0 text-right">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">{t.distanceLabel}</span>
                      <span className="text-sm font-black text-white">{getTripEstimates().distance}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold block">{t.durationLabel}</span>
                      <span className="text-sm font-black text-white">{getTripEstimates().duration}</span>
                    </div>
                  </div>
                </div>

                 {/* ESCROW DEPOSIT CARD */}
                {activeRequest && activeRequest.status === 'awaiting_deposit' && (
                  <div className="bg-gradient-to-br from-[#1E1B4B]/80 to-[#111827]/90 border border-indigo-500/30 p-6 rounded-3xl shadow-xl space-y-4 text-right rtl:text-right ltr:text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <Lock className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm font-black text-indigo-400 uppercase tracking-wider">
                          {lang === 'ar' ? 'تأمين المشوار في نظام الضمان سيسترو 🔐' : 'Secure Booking in Escrow Safeguard 🔐'}
                        </h3>
                        <p className="text-[11px] text-gray-400 font-bold mt-0.5">
                          {lang === 'ar' ? 'يتم تعليق الأجرة بأمان ولا يتم تحريرها للكابتن إلا بعد وصولك وجهتك بالسلامة وتأكيدك.' : 'The ride fare is held safely and will not be released to the captain until you arrive at your destination.'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-900/60 flex items-center justify-between">
                      <div className="text-right">
                        <span className="text-[10px] text-gray-500 font-bold block">{lang === 'ar' ? 'السعر المتفق عليه' : 'Agreed Ride Fare'}</span>
                        <span className="text-xl font-black text-white">{activeRequest.approximatePrice || 100} ₪</span>
                      </div>
                      <div className="text-left font-mono text-[10px] text-gray-500">
                        STATUS: ESCROW_HOLD
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, "requests", activeRequest.id), {
                            status: 'en_route',
                            escrowDeposited: true
                          });

                          // Send system message
                          const sysMsgId = `sys-dep-${Date.now()}`;
                          await setDoc(doc(db, "chats", sysMsgId), {
                            id: sysMsgId,
                            requestId: activeRequest.id,
                            sender: 'system',
                            text: lang === 'ar' ? '🔐 تم إيداع وتأمين أجرة المشوار في الضمان المالي سيسترو بنجاح! الكابتن في الطريق إليك الآن.' : '🔐 Fare deposited in escrow successfully! The captain is heading to you.',
                            timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
                            createdTime: Date.now()
                          });

                          triggerToast(lang === 'ar' ? 'تم تأمين الضمان وتأكيد الحجز بنجاح! 🎉' : 'Escrow secured & booking confirmed successfully! 🎉', 'success');
                        } catch (err) {
                          console.error("Error depositing escrow:", err);
                        }
                      }}
                      className="w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>{lang === 'ar' ? 'إيداع الأجرة وتأكيد الحجز الفوري 💳' : 'Deposit Fare & Confirm Booking 💳'}</span>
                    </button>
                  </div>
                )}

                {/* Driver information card */}
                <div className="bg-[#111827]/60 border border-gray-850 p-6 rounded-3xl shadow-xl backdrop-blur-md">
                  <h3 className="text-sm font-black text-amber-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{t.driverDetails}</span>
                  </h3>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Driver main avatar details */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                      <div className="relative w-16 h-16 rounded-2xl bg-gray-950 overflow-hidden border border-gray-800 flex items-center justify-center shrink-0">
                        <img 
                          src={selectedBid?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200"} 
                          alt="Driver" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-1 text-right sm:text-right">
                        <h4 className="text-base font-black text-white">{selectedBid?.technicianArName || selectedBid?.technicianName || "الكابتن أحمد عطون"}</h4>
                        <p className="text-xs text-gray-400 font-bold flex items-center justify-center sm:justify-start gap-1">
                          <span>{selectedBid?.carModel || "Silver Skoda Octavia 🚗"}</span>
                        </p>
                        <div className="flex items-center justify-center sm:justify-start gap-3">
                          <span className="text-[11px] bg-gray-900 border border-gray-800 px-2.5 py-1 rounded-lg font-black text-amber-400">
                            {t.plateNumber} {selectedBid?.plateNumber || "41-789-32"}
                          </span>
                          <span className="text-xs font-bold text-yellow-400 flex items-center gap-0.5">
                            <Star className="w-3.5 h-3.5 fill-yellow-400" />
                            <span>{selectedBid?.rating || 4.9} (248 reviews)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Call/SOS Button */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-center">
                      <a 
                        href="tel:+972500000000"
                        className="px-4 py-3 bg-orange-500/10 border border-orange-500/25 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <Phone className="w-4 h-4 text-emerald-500" />
                        <span>اتصال بالكابتن</span>
                      </a>
                      <button 
                        type="button"
                        onClick={() => {
                          triggerToast(lang === 'ar' ? '🚨 تم توجيه نداء استغاثة فوري لغرفة العمليات المشتركة وسلطات الأمن!' : '🚨 Panic Alert activated! High-priority distress logged.', 'error');
                        }}
                        className="px-4 py-3 bg-red-600/10 border border-red-500/20 rounded-2xl font-black text-xs text-red-400 hover:bg-red-600/20 transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <AlertTriangle className="w-4 h-4 animate-bounce" />
                        <span>SOS طوارئ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* TRIP COMPLETED RELEASE CONTROLS */}
                {simStep === 'completed' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-[#111827]/90 to-[#0C101F]/90 border border-amber-500/20 p-6 md:p-8 rounded-3xl shadow-2xl text-center space-y-6"
                  >
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto shadow-xl">
                      <CheckCircle className="w-9 h-9" />
                    </div>

                    <div>
                      <h3 className="text-xl font-black text-white">{t.tripCompleted}</h3>
                      <p className="text-xs text-gray-400 font-bold max-w-md mx-auto mt-2 leading-relaxed">
                        مشوارك الفاخر انتهى بنجاح تام. الدفعة المالية معلقة بأمان في الضمان. يرجى تحرير الدفعة لمكافأة الكابتن أحمد.
                      </p>
                    </div>

                    {/* Escrow Details */}
                    <div className="bg-gray-950/60 p-4 rounded-2xl border border-gray-900 max-w-md mx-auto flex items-center justify-between text-xs font-semibold">
                      <span className="text-gray-500">القيمة الإجمالية المحجوزة:</span>
                      <span className="text-base font-black text-amber-500">{getCalculatedFare()} ₪</span>
                    </div>

                    {/* Stars selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-amber-500 uppercase tracking-wider block">{t.rateTrip}</label>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="text-2xl text-yellow-400 focus:outline-none hover:scale-125 transition-all cursor-pointer"
                          >
                            <Star className={`w-8 h-8 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-700'}`} />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Optional feedback text */}
                    <div className="max-w-md mx-auto">
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={t.feedbackPlaceholder}
                        rows={2}
                        className="w-full bg-gray-950 border border-gray-850 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      onClick={handleReleaseAndFinish}
                      className="w-full max-w-md h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black rounded-xl shadow-xl shadow-emerald-500/10 hover:scale-105 transition-all text-sm flex items-center justify-center gap-2.5 cursor-pointer mx-auto"
                    >
                      <span>🔓💸</span>
                      <span>{t.releaseFare}</span>
                    </button>
                  </motion.div>
                )}

              </motion.div>
            )}

            {/* STEP 4: TRIP ENDED SCREEN */}
            {simStep === 'finished' && (
              <motion.div 
                key="trip_finished_feedback"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#111827]/60 border border-gray-850 rounded-3xl p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[420px] shadow-2xl backdrop-blur-md space-y-6"
              >
                <div className="w-16 h-16 bg-emerald-500 text-black rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/20">
                  <Check className="w-8 h-8" />
                </div>

                <h2 className="text-xl md:text-2xl font-black text-white">{t.tripEnded}</h2>
                <p className="text-gray-400 font-semibold text-xs md:text-sm max-w-md leading-relaxed">
                  تمت تسوية قيمة الرحلة وإيداع {getCalculatedFare()} ₪ بنجاح في المحفظة الإلكترونية للكابتن أحمد عطون. شكراً لتقييمك ومساهمتك في زيادة موثوقية المجتمع!
                </p>

                {/* Rating display summary */}
                <div className="bg-gray-950 p-4 rounded-2xl border border-gray-900 flex flex-col items-center gap-1.5 w-full max-w-sm font-bold">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-800'}`} />
                    ))}
                  </div>
                  {feedback && <span className="text-[11px] text-gray-500 italic mt-1 font-medium">"{feedback}"</span>}
                </div>

                <button
                  onClick={handleReset}
                  className="px-8 h-12 bg-amber-500 text-black font-black text-xs rounded-xl hover:bg-amber-400 transition-all cursor-pointer"
                >
                  حجز مشوار جديد 🚕
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: SIMULATED MAP OR ESCROW SECURE VIEW */}
        <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
          
          {/* SECURE ESCROW VAULT LIVE STATUS VIEW */}
          <div className="bg-[#111827]/60 border border-gray-850 p-6 rounded-3xl shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-gray-850 pb-3">
              <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 select-none">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>محفظة الأمان للرحلة (Ride Vault)</span>
              </h3>
              <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold text-emerald-400 uppercase tracking-wider">
                MEMBER FDIC
              </span>
            </div>

            <div className="flex items-center justify-between bg-gray-950/40 p-4 rounded-2xl border border-gray-900">
              <div>
                <span className="text-[10px] text-gray-500 font-bold block">مبلغ الدفعة الموقوفة:</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {simStep === 'idle' ? '--- ₪' : `${getCalculatedFare()} ₪`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 font-bold block">حالة الأمان والضمان:</span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border inline-block mt-1 ${
                  simStep === 'idle' 
                    ? 'bg-gray-900 border-gray-800 text-gray-400' 
                    : simStep === 'completed' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 animate-pulse' 
                    : simStep === 'finished' 
                    ? 'bg-gray-900 border-gray-800 text-gray-500' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                }`}>
                  {simStep === 'idle' && 'أنت بانتظار الحجز'}
                  {['searching', 'driver_assigned', 'driver_arrived', 'riding'].includes(simStep) && 'محجوز بالخزنة 🔒'}
                  {simStep === 'completed' && 'بانتظار موافقتك 🔓'}
                  {simStep === 'finished' && 'تم تحرير الدفعة ✅'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-gray-400 leading-normal font-medium">
              {t.escrowLockedDesc}
            </p>
          </div>

          {/* DYNAMIC MAP TRACKER DISPLAY */}
          <div className="bg-[#111827]/60 border border-gray-850 p-4 rounded-3xl shadow-xl h-64 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-800 text-[10px] font-black uppercase text-amber-500">
              <MapIcon className="w-3 h-3 shrink-0" />
              <span>{lang === 'ar' ? 'تتبع فوري ثنائي الأبعاد' : lang === 'he' ? 'מעקב מפה דו-מימדי' : '2D GPS NAVIGATION'}</span>
            </div>

            {/* Custom Interactive SVG simulation map */}
            <div className="w-full h-full bg-[#0A0B10] absolute inset-0 flex items-center justify-center select-none">
              
              {/* Fake coordinate grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"></div>
              
              <svg className="w-full h-full p-4 relative" viewBox="0 0 400 200">
                {/* Simulated Road route */}
                <path 
                  d="M 60 140 Q 150 50, 240 140 T 340 70" 
                  fill="none" 
                  stroke="#1E293B" 
                  strokeWidth="8" 
                  strokeLinecap="round" 
                />
                
                {/* Active route highlight path when riding */}
                <path 
                  d="M 60 140 Q 150 50, 240 140 T 340 70" 
                  fill="none" 
                  stroke="#F59E0B" 
                  strokeWidth="4" 
                  strokeLinecap="round" 
                  strokeDasharray="400"
                  strokeDashoffset={
                    simStep === 'idle' || simStep === 'searching' ? "400" :
                    simStep === 'driver_assigned' ? "350" :
                    simStep === 'driver_arrived' ? "280" :
                    simStep === 'riding' ? "150" : "0"
                  }
                  className="transition-all duration-[3000ms] ease-out"
                />

                {/* Pin A: Pickup Location */}
                <g transform="translate(60, 140)">
                  <circle r="12" fill="#10B981" fillOpacity="0.1" />
                  <circle r="5" fill="#10B981" />
                  <text y="-14" textAnchor="middle" fill="#10B981" className="text-[8px] font-black">Pickup</text>
                </g>

                {/* Pin B: Destination */}
                <g transform="translate(340, 70)">
                  <circle r="12" fill="#EF4444" fillOpacity="0.1" />
                  <circle r="5" fill="#EF4444" />
                  <text y="-14" textAnchor="middle" fill="#EF4444" className="text-[8px] font-black">Dest</text>
                </g>

                {/* Moving Cab Indicator */}
                {['driver_assigned', 'driver_arrived', 'riding', 'completed'].includes(simStep) && (
                  <g 
                    transform={
                      simStep === 'driver_assigned' ? "translate(120, 85)" :
                      simStep === 'driver_arrived' ? "translate(60, 140)" :
                      simStep === 'riding' ? "translate(220, 120)" : "translate(340, 70)"
                    }
                    className="transition-all duration-[4000ms] ease-in-out"
                  >
                    <circle r="14" fill="#F59E0B" fillOpacity="0.15" className="animate-ping" />
                    <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#F59E0B" />
                    <text x="0" y="3" textAnchor="middle" fill="#000000" className="text-[8px] font-black">🚕</text>
                  </g>
                )}
              </svg>

              {/* Live coordinates ticker footer */}
              <div className="absolute bottom-3 right-3 bg-black/80 px-3 py-1.5 rounded-xl border border-gray-900 text-[9px] font-mono font-bold text-gray-500">
                GPS: 31.7683° N, 35.2137° E
              </div>
            </div>
          </div>

          {/* ACTIVE CHAT BOX WITH DRIVER */}
          {['driver_assigned', 'driver_arrived', 'riding', 'completed'].includes(simStep) && (
            <div className="bg-[#111827]/60 border border-gray-850 rounded-3xl p-4 shadow-xl flex flex-col h-72">
              <div className="border-b border-gray-850 pb-2 mb-3 flex items-center justify-between">
                <h4 className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                  <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{t.chatHeader}</span>
                </h4>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              {/* Messages viewport */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${
                      msg.sender === 'client' 
                        ? 'items-end' 
                        : msg.sender === 'driver' 
                        ? 'items-start' 
                        : 'items-center'
                    }`}
                  >
                    {msg.sender === 'system' ? (
                      <span className="bg-gray-900/85 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full border border-gray-850 text-center">
                        {msg.text}
                      </span>
                    ) : (
                      <div className="max-w-[85%] space-y-0.5">
                        <div className={`p-2.5 rounded-2xl ${
                          msg.sender === 'client' 
                            ? 'bg-amber-500 text-black rounded-tr-none font-bold' 
                            : 'bg-gray-900 text-gray-300 rounded-tl-none font-bold'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-gray-500 block px-1 text-right">
                          {msg.time}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={t.chatPlaceholder}
                  className="flex-1 bg-gray-950 border border-gray-850 rounded-xl px-3.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                />
                <button 
                  type="submit"
                  className="w-10 h-10 bg-amber-500 hover:bg-amber-400 text-black rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4 shrink-0" />
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
