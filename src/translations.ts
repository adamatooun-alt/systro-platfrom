export interface Dictionary {
  // Navigation & General
  logoTitle: string;
  logoRescue: string;
  logoSub: string;
  home: string;
  services: string;
  simulator: string;
  adminPortal: string;
  adminGateway: string;
  languageToggle: string;
  live: string;

  // Hero Section
  heroPre: string;
  heroTitle1: string;
  heroTitleHighlighted: string;
  heroTitle2: string;
  heroDesc: string;
  bulletEscrow: string;
  bulletEta: string;
  bulletVerified: string;
  heroBtnSimulator: string;
  heroBtnServices: string;

  // Stats Grid
  statActiveTechs: string;
  statCompletedRescues: string;
  statSatisfaction: string;
  statActiveEmergencies: string;

  // Services
  servicesHeader: string;
  servicesTitle: string;
  servicesSub: string;
  fuelName: string;
  fuelDesc: string;
  locksmithName: string;
  locksmithDesc: string;
  mechanicName: string;
  mechanicDesc: string;
  towingName: string;
  towingDesc: string;
  batteryName: string;
  batteryDesc: string;

  // Financial Innovation / Escrow
  finPre: string;
  finTitle: string;
  finDesc: string;
  custProtectionTitle: string;
  custProtectionDesc: string;
  techRightTitle: string;
  techRightDesc: string;

  // Escrow Vault Card
  vaultTitle: string;
  vaultSecureBadge: string;
  vaultSub: string;
  vaultResValue: string;
  vaultReservedBadge: string;
  vaultAwaiting: string;
  vaultPartnerTech: string;
  vaultCommission: string;
  vaultNetEarnings: string;
  vaultMechanismTitle: string;
  vaultMechanismDesc: string;

  // Portal Security Gate
  portalClientTab: string;
  portalTechTab: string;
  portalClientAppTag: string;
  portalTechAppTag: string;
  portalGateTitle: string;
  portalGateDesc: string;
  portalOtpTab: string;
  portalGoogleTab: string;
  portalGoogleBtn: string;
  portalSafariNote: string;
  portalDemoBtn: string;

  // Simulator Screen
  simTitle: string;
  simDesc: string;
  simMapTitle: string;
  simSelectLocation: string;
  simFormService: string;
  simFormDesc: string;
  simFormDescPlaceholder: string;
  simSubmitRequest: string;
  simBidsTitle: string;
  simAwaitingBids: string;
  simBidPrice: string;
  simBidEta: string;
  simAcceptBid: string;
  simEscrowActionTitle: string;
  simEscrowActionDesc: string;
  simDepositBtn: string;
  simDepositSuccessToast: string;
  simTechEnRoute: string;
  simTechArrived: string;
  simTechWorking: string;
  simReleaseFundsBtn: string;
  simDisputeBtn: string;
  simRatingTitle: string;
  simSubmitRating: string;
  simDisputeOpened: string;
  simDisputeReasonPlaceholder: string;
  simSubmitDispute: string;

  // Admin Dashboard
  adminTitle: string;
  adminActiveEscrows: string;
  adminActiveDisputes: string;
  adminReleaseAction: string;
  adminRefundAction: string;
  adminNoEscrows: string;
}

export const translations: Record<'ar' | 'en' | 'he', Dictionary> = {
  ar: {
    logoTitle: "سيسترو",
    logoRescue: "إنقاذ",
    logoSub: "SYSTRO RESCUE",
    home: "الرئيسية",
    services: "خدماتنا",
    simulator: "بوابة طلبات الطوارئ",
    adminPortal: "بوابة الإدارة",
    adminGateway: "(Admin Gateway) تسجيل دخول المشرفين",
    languageToggle: "English",
    live: "مباشر",

    // Hero
    heroPre: "المنصة الأولى والذكية لإنقاذ الطرق وربط الفنيين بالعملاء",
    heroTitle1: "تعطلت سيارتك؟",
    heroTitleHighlighted: "دقيقة واحدة",
    heroTitle2: "تفصلك عن الإنقاذ الآمن",
    heroDesc: "سواء كنت بحاجة لرافعة نقل (سحب)، شحن بطارية، تبديل إطارات، تزويد بالوقود أو ميكانيك طوارئ؛ منصة سيسترو المتقدمة ترصد موقعك بدقة وتربطك فوراً بالفنيين المتواجدين حولك بنظام عروض أسعار تنافسية ودفع معلق آمن يحمي أموالك حتى إتمام الخدمة بنجاح.",
    bulletEscrow: "دفع مؤمن: نظام Escrow",
    bulletEta: "سرعة الاستجابة: أقل من 15 دقيقة",
    bulletVerified: "فنيين معتمدين: هويات موثقة 100%",
    heroBtnSimulator: "تقديم طلب إنقاذ مباشر (رسمي)",
    heroBtnServices: "تصفح الخدمات المتوفرة",

    // Stats Grid
    statActiveTechs: "فنيين معتمدين نشطين الآن",
    statCompletedRescues: "عمليات إنقاذ تمت بالكامل",
    statSatisfaction: "معدل نجاح الدفع والرضا المالي للطرفين",
    statActiveEmergencies: "بلاغات طوارئ يتم معالجتها بالكامل حالياً",

    // Services
    servicesHeader: "الخدمات والمميزات المتوفرة",
    servicesTitle: "حلول إنقاذ متكاملة بلمسة زر",
    servicesSub: "تغطي شبكة الفنيين المسجلين في سيسترو إنقاذ كافة أعطال الطرق والخدمات الطارئة على مدار الساعة وبمستويات أمان واحترافية فائقة.",
    fuelName: "توصيل وتعبئة الوقود (Fuel Delivery)",
    fuelDesc: "نفذ منك البنزين أو الديزل على الطريق؟ سنرسل إليك أقرب فني مع كمية الوقود الكافية لإنقاذ رحلتك.",
    locksmithName: "فتح الأقفال الطارئ (Emergency Locksmith)",
    locksmithDesc: "إذا أغلقت سيارتك والمفتاح بالداخل، يتوفر لدينا فنيين معتمدين لفتح الأقفال بدون أي أضرار للمركبة.",
    mechanicName: "ميكانيك وكهرباء الطوارئ (Mechanics)",
    mechanicDesc: "تشخيص الأعطال البسيطة وإصلاحها في موقعك (مثل السلف، الفيوزات، السيور) لتعود إلى الطريق بسرعة.",
    towingName: "سحب ونقل المركبات (Car Towing)",
    towingDesc: "رافعات متخصصة لنقل سيارتك بأمان تام إلى أقرب مركز صيانة أو إلى منزلك، متوفرة على مدار الساعة.",
    batteryName: "شحن واستبدال البطارية (Battery Services)",
    batteryDesc: "تعطلت بطارية سيارتك فجأة؟ نوفر خدمة شحن البطارية السريع أو استبدالها ببطارية جديدة مكفولة في موقعك.",

    // Financial Innovation
    finPre: "ابتكار مالي رائد",
    finTitle: "وداعاً للنصب والمغالاة في الأسعار",
    finDesc: "غالباً ما يتعرض أصحاب السيارات المعطلة للاستغلال المالي أو الحصول على خدمة سيئة دون جدوى. في سيسترو قمنا بابتكار نظام الضمان المالي الموقوف (Escrow) لحماية أموالك.",
    custProtectionTitle: "حماية العميل",
    custProtectionDesc: "لا يتم تحرير الدفعة لمزود الخدمة إلا بعد حضور الفني وحل المشكلة وتأكيدك عبر التطبيق.",
    techRightTitle: "ضمان حق الفني الشريك",
    techRightDesc: "يعلم الفني أن العميل قد أودع القيمة المتفق عليها في النظام بالفعل قبل أن ينطلق بسيارته، مما يضمن جديته وحصول الفني على حقه فور انتهاء الخدمة.",

    // Escrow Vault Card
    vaultTitle: "محفظة الأمان المالي للعملاء (Escrow Vault)",
    vaultSecureBadge: "مؤمنة بالكامل",
    vaultSub: "حماية كاملة وحفظ مالي مؤقت للحقوق",
    vaultResValue: "قيمة حجز طلب الإنقاذ",
    vaultReservedBadge: "محجوز في الخزنة مؤقتاً",
    vaultAwaiting: "في انتظار اكتمال الخدمة",
    vaultPartnerTech: "الفني الشريك",
    vaultCommission: "عمولة سيسترو",
    vaultNetEarnings: "صافي أرباح الفني",
    vaultMechanismTitle: "آلية عمل الضمان",
    vaultMechanismDesc: "تودع أموالك في محفظة مؤقتة مستقلة بمجرد موافقتك على الفني. لا يحق للفني سحبها إلا بعد تأكيدك لانتهاء العمل ورضاك التام، مما يضمن كفاءة ميكانيكية مطلقة ونزاهة مالية 100%.",

    // Portal Security Gate
    portalClientTab: "بوابة العميل المتعطل",
    portalTechTab: "بوابة فني الإنقاذ",
    portalClientAppTag: "تطبيق العميل المتعطل v2.1",
    portalTechAppTag: "لوحة تحكم الفني الشريك v2.1",
    portalGateTitle: "بوابة سيسترو الأمنية",
    portalGateDesc: "سجل دخولك لمزامنة بلاغاتك، تتبع الفنيين الحقيقيين على الخريطة وإدارة ضمانك المالي وحقك القانوني.",
    portalOtpTab: "رقم الجوال (OTP)",
    portalGoogleTab: "حساب جوجل",
    portalGoogleBtn: "الدخول السريع بحساب جوجل",
    portalSafariNote: "إذا كنت تستخدم متصفح Safari/iOS وتواجه مشكلة في تسجيل الدخول، يُرجى استخدام خيار رقم الجوال (OTP) لتفادي سياسة ملفات الارتباط لطرف ثالث.",
    portalDemoBtn: "الدخول بصفة زائر معتمد (بدون حساب)",

    // Simulator Screen
    simTitle: "بوابة تتبع طلبات الإنقاذ المباشرة وضمان الحقوق",
    simDesc: "بث مباشر لإدارة ومتابعة طلبات الإنقاذ للعملاء والفنيين، مدعوم بنظام تتبع الـ GPS الذكي ومحفظة Escrow لحماية المدفوعات.",
    simMapTitle: "الخريطة التفاعلية ونظام تتبع الـ GPS",
    simSelectLocation: "انقر على الخريطة لتحديد موقع سيارتك المعطلة 📌",
    simFormService: "اختر خدمة الإنقاذ المطلوبة:",
    simFormDesc: "تفاصيل العطل أو المشكلة:",
    simFormDescPlaceholder: "مثال: السيارة لا تدور والبطارية ميتة تماماً / أحتاج ونش لنقل سيارة تويوتا...",
    simSubmitRequest: "إرسال طلب الإنقاذ والبحث عن فنيين 📡",
    simBidsTitle: "عروض الأسعار المتاحة من الفنيين القريبين",
    simAwaitingBids: "جاري رصد وتصفية عروض الفنيين القريبين...",
    simBidPrice: "السعر المعروض:",
    simBidEta: "زمن الوصول المتوقع:",
    simAcceptBid: "موافقة واختيار هذا الفني 🤝",
    simEscrowActionTitle: "تأكيد إيداع الدفعة في محفظة الأمان (Escrow Vault)",
    simEscrowActionDesc: "سيتم حجز المبلغ مؤقتاً في نظام سيسترو للضمان. لن نرسل الأموال للفني إلا بعد موافقتك وتأكيدك لحل العطل بنجاح.",
    simDepositBtn: "أودع 150 ₪ وابدأ رحلة الإنقاذ 🔒",
    simDepositSuccessToast: "تم إيداع 150 ₪ بنجاح في محفظة الأمان، والفني في طريقه إليك الآن!",
    simTechEnRoute: "الفني ينطلق الآن وهو في الطريق إليك 🚚💨",
    simTechArrived: "وصل الفني إلى موقعك ويبدأ الآن فحص المشكلة 🛠️",
    simTechWorking: "الفني يعمل حالياً على صيانة وإصلاح سيارتك 👨‍🔧",
    simReleaseFundsBtn: "تأكيد حل المشكلة وتحرير الأموال للفني 🔓💸",
    simDisputeBtn: "تقديم بلاغ خلاف مالي / شكوى 🚨",
    simRatingTitle: "تقييمك لتجربة الإنقاذ كعميل",
    simSubmitRating: "إرسال التقييم وإنهاء العملية ⭐",
    simDisputeOpened: "تم فتح بلاغ خلاف رسمي لدى الإدارة. سيتم تجميد الأموال في المحفظة حتى مراجعة المشرفين.",
    simDisputeReasonPlaceholder: "اكتب سبب الشكوى أو الخلاف الفني...",
    simSubmitDispute: "تقديم الشكوى للإدارة",

    // Admin Dashboard
    adminTitle: "بوابة التحكم والتحكيم المالي للمشرفين (Admin Portal)",
    adminActiveEscrows: "الودائع المالية المعلقة النشطة",
    adminActiveDisputes: "الخلافات وبلاغات النزاع النشطة",
    adminReleaseAction: "تحرير الأموال للفني ✅",
    adminRefundAction: "إعادة الأموال للعميل ❌",
    adminNoEscrows: "لا توجد ودائع معلقة حالياً في النظام."
  },
  en: {
    logoTitle: "SYSTRO",
    logoRescue: "Rescue",
    logoSub: "SYSTRO RESCUE",
    home: "Home",
    services: "Our Services",
    simulator: "Emergency Rescue Portal",
    adminPortal: "Admin Portal",
    adminGateway: "(Admin Gateway) Administrators Access",
    languageToggle: "עברית",
    live: "LIVE",

    // Hero
    heroPre: "The First & Smart Roadside Rescue and Technician-Client Platform",
    heroTitle1: "Car Broke Down?",
    heroTitleHighlighted: "One Minute",
    heroTitle2: "Separates You From Safe Rescue",
    heroDesc: "Whether you need a towing truck, battery jump-start, tire change, fuel delivery, or emergency mechanic; Systro's advanced platform tracks your location accurately and connects you immediately with nearby technicians under a competitive bidding and safe escrow system that protects your money until successful completion.",
    bulletEscrow: "Secure Payment: Escrow System",
    bulletEta: "Response Speed: Under 15 Minutes",
    bulletVerified: "Certified Technicians: 100% Verified IDs",
    heroBtnSimulator: "Submit Live Rescue Request (Official)",
    heroBtnServices: "Browse Available Services",

    // Stats Grid
    statActiveTechs: "Active Certified Technicians",
    statCompletedRescues: "Fully Completed Rescues",
    statSatisfaction: "Mutual Payment & Satisfaction Success Rate",
    statActiveEmergencies: "Emergency Reports Currently Processed",

    // Services
    servicesHeader: "Available Services & Features",
    servicesTitle: "Comprehensive Rescue Solutions at a Button Touch",
    servicesSub: "Our registered technician network covers all roadside breakdowns and urgent services 24/7 with extreme safety and elite professionalism.",
    fuelName: "Fuel Delivery & Refueling (Fuel Delivery)",
    fuelDesc: "Ran out of gas or diesel on the road? We will send you the nearest technician with enough fuel to rescue your trip.",
    locksmithName: "Emergency Locksmith (Emergency Locksmith)",
    locksmithDesc: "Locked your car with the key inside? Certified locksmiths are available to open your vehicle with zero damage.",
    mechanicName: "Emergency Mechanics & Electrics (Mechanics)",
    mechanicDesc: "Diagnosing and repairing minor issues on site (such as starters, fuses, belts) to get you back on the road rapidly.",
    towingName: "Car Towing & Relocation (Car Towing)",
    towingDesc: "Specialized tow trucks to transport your car safely to the nearest repair shop or your home, 24/7.",
    batteryName: "Battery Services & Replacement (Battery Services)",
    batteryDesc: "Dead battery? We provide rapid battery jump-starts or on-site replacement with guaranteed new batteries.",

    // Financial Innovation
    finPre: "Pioneering Financial Innovation",
    finTitle: "Goodbye to Fraud and Price Gouging",
    finDesc: "Stranded car owners are often subject to financial exploitation or poor service to no avail. At Systro, we pioneered the Escrow Financial Guarantee System to protect your hard-earned funds.",
    custProtectionTitle: "Customer Protection",
    custProtectionDesc: "The payment is never released to the service provider until the technician arrives, solves the problem, and you confirm via the app.",
    techRightTitle: "Partner Technician's Right Guarantee",
    techRightDesc: "The technician knows that the client has already deposited the agreed-upon amount into the system before driving off, ensuring seriousness and guaranteeing their hard-earned money.",

    // Escrow Vault Card
    vaultTitle: "Customers' Financial Escrow Vault",
    vaultSecureBadge: "Fully Secured",
    vaultSub: "Full Protection and Temporary Financial Safe-keeping",
    vaultResValue: "Rescue Request Reservation Value",
    vaultReservedBadge: "Temporarily Locked in Vault",
    vaultAwaiting: "Awaiting service completion",
    vaultPartnerTech: "Partner Technician",
    vaultCommission: "Systro Commission",
    vaultNetEarnings: "Net Technician Profit",
    vaultMechanismTitle: "How Escrow Works",
    vaultMechanismDesc: "Your funds are deposited into an independent temporary vault once you approve the technician. The technician has no right to withdraw them until you confirm work completion and express complete satisfaction.",

    // Portal Security Gate
    portalClientTab: "Client Portal",
    portalTechTab: "Technician Portal",
    portalClientAppTag: "Client App v2.1",
    portalTechAppTag: "Partner Technician Dashboard v2.1",
    portalGateTitle: "Systro Security Gate",
    portalGateDesc: "Sign in to synchronize your requests, track certified technicians on the map, and manage your escrow and legal rights.",
    portalOtpTab: "Mobile Number (OTP)",
    portalGoogleTab: "Google Account",
    portalGoogleBtn: "Fast Google Sign In",
    portalSafariNote: "If you are using Safari/iOS and encounter login issues, please select the Mobile OTP option to bypass third-party cookie restrictions.",
    portalDemoBtn: "Continue as Authorized Guest (No Account)",

    // Simulator Screen
    simTitle: "Live Rescue Requests Tracking & Escrow Portal",
    simDesc: "Real-time dispatch system for tracking active roadside rescue requests, backed by secure Escrow protection and live GPS navigation.",
    simMapTitle: "Interactive Map & GPS Tracking System",
    simSelectLocation: "Click on the map to pin your breakdown location 📌",
    simFormService: "Select Required Rescue Service:",
    simFormDesc: "Describe the breakdown issue:",
    simFormDescPlaceholder: "e.g., Car won't start, battery seems dead. Need a tow truck...",
    simSubmitRequest: "Send Rescue Request & Broadcast 📡",
    simBidsTitle: "Incoming Quotes from Nearby Technicians",
    simAwaitingBids: "Listening for quotes from nearby certified partners...",
    simBidPrice: "Price Quote:",
    simBidEta: "Estimated Arrival:",
    simAcceptBid: "Accept & Appoint This Technician 🤝",
    simEscrowActionTitle: "Confirm Escrow Deposit into Secure Vault",
    simEscrowActionDesc: "The funds will be held securely in the Escrow Vault. We will only release them to the technician after you confirm your satisfaction.",
    simDepositBtn: "Deposit 150 ₪ and Summon Technician 🔒",
    simDepositSuccessToast: "150 ₪ successfully deposited into the Escrow Vault. The technician is en route!",
    simTechEnRoute: "Technician is moving now and is on their way 🚚💨",
    simTechArrived: "Technician arrived at your location and is diagnosing 🛠️",
    simTechWorking: "Technician is repairing and servicing your vehicle 👨‍🔧",
    simReleaseFundsBtn: "Confirm Issue Resolved & Release Escrow 🔓💸",
    simDisputeBtn: "File a Financial Dispute / Complaint 🚨",
    simRatingTitle: "Rate Your Roadside Rescue Experience",
    simSubmitRating: "Submit Rating & Close Request ⭐",
    simDisputeOpened: "Dispute opened. Funds are frozen in the vault until administrators resolve the case.",
    simDisputeReasonPlaceholder: "Write the technical complaint or dispute reason...",
    simSubmitDispute: "File Dispute with Administration",

    // Admin Dashboard
    adminTitle: "Admin Oversight & Arbitration Panel",
    adminActiveEscrows: "Active Escrow Deposits",
    adminActiveDisputes: "Active Disputes & Cases",
    adminReleaseAction: "Release Funds to Technician ✅",
    adminRefundAction: "Refund Funds to Customer ❌",
    adminNoEscrows: "There are currently no active escrow holdings in the system."
  },
  he: {
    logoTitle: "סיסטרו",
    logoRescue: "הצלה",
    logoSub: "SYSTRO RESCUE",
    home: "ראשי",
    services: "השירותים שלנו",
    simulator: "פורטל קריאות חירום",
    adminPortal: "פורטל ניהול",
    adminGateway: "כניסת מנהלים (Admin Gateway)",
    languageToggle: "العربية",
    live: "בשידור חי",

    // Hero
    heroPre: "הפלטפורמה המובילה והחכמה לחילוץ בדרכים וחיבור טכנאים ללקוחות",
    heroTitle1: "הרכב נתקע?",
    heroTitleHighlighted: "דקה אחת",
    heroTitle2: "מפרידה בינך לבין חילוץ בטוח",
    heroDesc: "בין אם אתה זקוק לגרר, הטענת מצבר, החלפת גלגל, אספקת דלק או מכונאי חירום; הפלטפורמה המתקדמת של סיסטרו מאתרת את מיקומך במדויק ומחברת אותך מיידית לטכנאים סביבך במערכת הצעות מחיר תחרותיות ותשלום מאובטח שמגן על כספך עד להשלמת השירות בהצלחה.",
    bulletEscrow: "תשלום מאובטח: מערכת נאמנות (Escrow)",
    bulletEta: "מהירות תגובה: פחות מ-15 דקות",
    bulletVerified: "טכנאים מוסמכים: תעודות מאומתות ב-100%",
    heroBtnSimulator: "שליחת בקשת חילוץ ישירה (רשמית)",
    heroBtnServices: "דפדף בשירותים הזמינים",

    // Stats Grid
    statActiveTechs: "טכנאים מוסמכים פעילים כעת",
    statCompletedRescues: "חילוצים שהושלמו במלואם",
    statSatisfaction: "שיעור הצלחת התשלום ושביעות רצון הדדית",
    statActiveEmergencies: "קריאות חירום המטופלות כעת במלואן",

    // Services
    servicesHeader: "שירותים ותכונות זמינים",
    servicesTitle: "פתרונות חילוץ מקיפים בלחיצת כפתור",
    servicesSub: "רשת הטכנאים הרשומים בסיסטרו מכסה את כל תקלות הדרכים ושירותי החירום 24/7 ברמות בטיחות ומקצועיות גבוהות במיוחד.",
    fuelName: "אספקה ומילוי דלק (Fuel Delivery)",
    fuelDesc: "נתקעת בלי בנזין או סולר בדרך? נשלח אליך את הטכנאי הקרוב ביותר עם כמות הדלק הדרושה כדי להציל את נסיעתך.",
    locksmithName: "פריצת מנעולים לשעת חירום (Emergency Locksmith)",
    locksmithDesc: "נעלת את הרכב כשהמפתח בפנים? מנעולנים מוסמכים זמינים לפרוץ את רכבך ללא כל נזק.",
    mechanicName: "מכונאות וחשמלאות חירום (Mechanics)",
    mechanicDesc: "אבחון ותיקון תקלות קלות במקום (כמו סטרטר, פיוזים, רצועות) כדי להחזיר אותך לדרך במהירות.",
    towingName: "גרירה והעברת רכבים (Car Towing)",
    towingDesc: "גררים ייעודיים להובלת רכבך בבטחה למוסך הקרוב או לביתך, 24/7.",
    batteryName: "שירותי והחלפת מצבר (Battery Services)",
    batteryDesc: "המצבר מת לפתע? אנו מספקים הנעה מהירה של המצבר או החלפה במקום במצברים חדשים באחריות.",

    // Financial Innovation
    finPre: "חדשנות פיננסית מובילה",
    finTitle: "להיפרד מהונאות והפקעת מחירים",
    finDesc: "בעלי רכבים תקועים חשופים לעיתים קרובות לניצול פיננסי או לשירות גרוע ללא הועיל. בסיסטרו פיתחנו את מערכת הבטוחות הפיננסיות (Escrow) כדי להגן על כספך.",
    custProtectionTitle: "הגנת הלקוח",
    custProtectionDesc: "התשלום לעולם אינו מועבר לספק השירות עד שהטכנאי מגיע, פותר את הבעיה ואתה מאשר זאת באפליקציה.",
    techRightTitle: "הבטחת זכות הטכנאי השותף",
    techRightDesc: "הטכנאי יודע שהלקוח כבר הפקיד את הסכום המוסכם במערכת לפני שהוא יוצא לדרך, מה שמבטיח את רצינותו ומבטיח שהטכנאי יקבל את כספו עם סיום השירות.",

    // Escrow Vault Card
    vaultTitle: "ארנק ביטחון פיננסי ללקוחות (Escrow Vault)",
    vaultSecureBadge: "מאובטח לחלוטין",
    vaultSub: "הגנה מלאה ושמירה פיננסית זמנית על הזכויות",
    vaultResValue: "שווי שמירת בקשת חילוץ",
    vaultReservedBadge: "נעול זמנית בכספת",
    vaultAwaiting: "ממתין להשלמת השירות",
    vaultPartnerTech: "הטכנאי השותף",
    vaultCommission: "עמלת סיסטרו",
    vaultNetEarnings: "רווח נקי לטכנאי",
    vaultMechanismTitle: "כיצד עובדת הנאמנות",
    vaultMechanismDesc: "כספך מופקד בכספת זמנית עצמאית ברגע שאתה מאשר את הטכנאי. לטכנאי אין זכות למשוך אותו עד שתאשר את סיום העבודה ותביע שביעות רצון מלאה, דבר שמבטיח יעילות מכנית מוחלטת ויושר פיננסי של 100%.",

    // Portal Security Gate
    portalClientTab: "פורטל לקוחות",
    portalTechTab: "פורטל טכנאים",
    portalClientAppTag: "אפליקציית לקוח גרסה 2.1",
    portalTechAppTag: "לוח בקרה לטכנאי שותף גרסה 2.1",
    portalGateTitle: "שער האבטחה של סיסטרו",
    portalGateDesc: "התחבר כדי לסנכרן את הפניות שלך, לעקוב אחר טכנאים מוסמכים על המפה ולנהל את זכויותיך הפיננסיות והמשפטיות.",
    portalOtpTab: "מספר נייד (OTP)",
    portalGoogleTab: "חשבון גוגל",
    portalGoogleBtn: "התחברות מהירה באמצעות גוגל",
    portalSafariNote: "אם אתה משתמש ב-Safari/iOS ונתקל בבעיות התחברות, אנא בחר באפשרות OTP לנייד כדי לעקוף הגבלות קבצי cookie של צד שלישי.",
    portalDemoBtn: "המשך כאורח מורשה (ללא חשבון)",

    // Simulator Screen
    simTitle: "מעקב קריאות חילוץ בשידור חי ופורטל נאמנות",
    simDesc: "מערכת שיגור בזמן אמת לניהול ומעקב אחר בקשות חילוץ של לקוחות וטכנאים, מגובה במערכת הגנה פיננסית (Escrow) וניווט GPS חי.",
    simMapTitle: "מפה אינטראקטיבית ומערכת מעקב GPS",
    simSelectLocation: "לחץ על המפה כדי לסמן את מיקום התקלה שלך 📌",
    simFormService: "בחר את שירות החילוץ הדרוש:",
    simFormDesc: "פרט את תקלת הרכב:",
    simFormDescPlaceholder: "לדוגמה: הרכב אינו מניע, המצבר נראה גמור. צריך גרר...",
    simSubmitRequest: "שלח בקשת חילוץ והפץ ברשת 📡",
    simBidsTitle: "הצעות מחיר נכנסות מטכנאים קרובים",
    simAwaitingBids: "מאזין להצעות מחיר משותפים מוסמכים קרובים...",
    simBidPrice: "הצעת מחיר:",
    simBidEta: "זמן הגעה משוער:",
    simAcceptBid: "אשר וסכם עם טכנאי זה 🤝",
    simEscrowActionTitle: "אשר הפקדת נאמנות לכספת המאובטחת",
    simEscrowActionDesc: "הכספים יוחזקו בבטחה בכספת הנאמנות. אנו נשחרר אותם לטכנאי רק לאחר שתאשר את שביעות רצונך.",
    simDepositBtn: "הפקד 150 ₪ והזעק טכנאי 🔒",
    simDepositSuccessToast: "הפקדת 150 ₪ בהצלחה בכספת הנאמנות. הטכנאי בדרך אליך!",
    simTechEnRoute: "הטכנאי בדרך אליך כעת 🚚💨",
    simTechArrived: "הטכנאי הגיע למיקומך ומתחיל באבחון 🛠️",
    simTechWorking: "הטכנאי מתקן ומטפל ברכבך כעת 👨‍🔧",
    simReleaseFundsBtn: "אשר שהבעיה נפתרה ושחרר את כספי הנאמנות 🔓💸",
    simDisputeBtn: "הגש תלונה / מחלוקת כספית 🚨",
    simRatingTitle: "דרג את חוויית החילוץ שלך בדרכים",
    simSubmitRating: "שלח דירוג וסגור את הפנייה ⭐",
    simDisputeOpened: "נפתחה מחלוקת רשמית. הכספים מוקפאים בכספת עד שהמנהלים יפתרו את המקרה.",
    simDisputeReasonPlaceholder: "כתוב את סיבת המחלוקת או התלונה הטכנית...",
    simSubmitDispute: "הגש מחלוקת להנהלה",

    // Admin Dashboard
    adminTitle: "פורטל פיקוח ובוררות של מנהלים (Admin Portal)",
    adminActiveEscrows: "הפקדות נאמנות פעילות",
    adminActiveDisputes: "מחלוקות ותיקים פעילים",
    adminReleaseAction: "שחרר כספים לטכנאי ✅",
    adminRefundAction: "החזר כספים ללקוח ❌",
    adminNoEscrows: "אין כרגע כספי נאמנות פעילים במערכת."
  }
};
export type TranslationsType = Dictionary;
