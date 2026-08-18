export interface Service {
  id: string;
  title: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  startingPrice: number;
  iconName: string;
  includes: string[];
  notes?: string;
}

export const SERVICES: Service[] = [
  {
    id: "plumbing",
    title: "خدمات السباكة والمديدات",
    category: "صيانة منزلية",
    shortDescription: "إصلاح التسريبات، تركيب الأدوات الصحية، وصيانة المضخات والخزانات.",
    fullDescription: "نقدم حلولاً متكاملة لكافة مشاكل السباكة المنزلية والأدوات الصحية بأعلى معايير الجودة مع ضمان على جميع قطع الغيار والصيانة.",
    startingPrice: 15,
    iconName: "Wrench",
    includes: [
      "فحص وكشف التسريبات بأحدث الأجهزة",
      "صيانة وتركيب خلاطات المياه والمغاسل",
      "صيانة المضخات والسخانات الشمسية والكهربائية",
      "تسليك المناهل والمجاري"
    ],
    notes: "السعر النهائي يحدد بعد المعاينة الميدانية إن تطلب الأمر."
  },
  {
    id: "electrical",
    title: "الكهرباء والتمديدات",
    category: "صيانة منزلية",
    shortDescription: "فحص الأعطال الكهربائية، تركيب الإضاءة، وتأسيس لوحات التوزيع.",
    fullDescription: "فنيون مختصون لمعالجة كافة مشكلات الكهرباء وشورتات الأمان وإعادة توزيع الأحمال وتأسيس الإضاءة الحديثة.",
    startingPrice: 15,
    iconName: "Zap",
    includes: [
      "إصلاح الشورتات والأعطال الكهربائية",
      "تركيب وإصلاح الثريات وحدات الإضاءة LED",
      "تركيب القواطع والقوابس الجدارية",
      "فحص وتأريض شبكة الكهرباء المنزلية"
    ],
    notes: "تشمل الخدمة الفحص والسلامة العامة قبل المغادرة."
  },
  {
    id: "hvac",
    title: "التكييف والتبريد",
    category: "تكييف وتبريد",
    shortDescription: "تنظيف المكيفات، تعبئة الغاز، وصيانة الأعطال الميكانيكية.",
    fullDescription: "خدمات غسيل وتعقيم المكيفات بصواني الصرف وتعبئة غاز الفريون وإصلاح الأعطال الميكانيكية واللوحات الإلكترونية.",
    startingPrice: 20,
    iconName: "Wind",
    includes: [
      "غسيل وتنظيف الفلاتر والمبخر بضغط المياه",
      "فحص وتعبئة غاز الفريون (R410A / R22)",
      "إصلاح تسريبات المياه من المكيف الداخلي",
      "فك وتركيب ونقل أجهزة التكييف"
    ],
    notes: "يُفضّل حجز موعد التنظيف الدوري قبل بداية فصل الصيف."
  },
  {
    id: "carpentry",
    title: "النجارة وصيانة الأثاث",
    category: "نجارة وديكور",
    shortDescription: "تصليح الأبواب، تجميع وتفكيك الأثاث، وصيانة الخزائن.",
    fullDescription: "نجارون محترفون لتركيب وصيانة جميع أنواع الأثاث والمطابخ والأبواب الخشبية واستبدال الإكسسوارات والمفصلات.",
    startingPrice: 15,
    iconName: "Hammer",
    includes: [
      "تركيب وتفكيك غرف النوم والأثاث (IKEA وغيرها)",
      "إصلاح وتعديل الأبواب والأقفال الخشبية",
      "صيانة مفصلات وسحابات الخزائن والمطابخ",
      "تفصيل وتعديل أرفف خشبية"
    ]
  },
  {
    id: "painting",
    title: "الدهان والديكور",
    category: "دهان وديكور",
    shortDescription: "دهان جدران، معالجة الرطوبة، وتركيب ديكورات فوم وبروفايل.",
    fullDescription: "أعمال دهانات داخلية وخارجية بجميع أنواعها مع معالجة حتمية لمشاكل الرطوبة والتقشير باستخدام أفضل المواد.",
    startingPrice: 30,
    iconName: "Paintbrush",
    includes: [
      "دهان جدران وأسقف (مات، جليسي، إيبوكسي)",
      "معالجة الرطوبة والشروخ مع المعجون",
      "تركيب فوم وبديل الرخام وبديل الخشب",
      "حماية وتغطية الأثاث والأرضيات أثناء العمل"
    ]
  },
  {
    id: "cleaning",
    title: "النظافة الشاملة",
    category: "تنظيف",
    shortDescription: "تنظيف منازل، شقق حديثة البناء، وتنظيف الكنب والسجاد.",
    fullDescription: "فرق تنظيف متخصصة ومجهزة بأحدث المواد والأجهزة لتنظيف الشقق والمنازل بعد البناء أو التنظيف الدوري الشامل.",
    startingPrice: 25,
    iconName: "Sparkles",
    includes: [
      "تنظيف شامل للشقق والفيلا",
      "جلي وتنظيف الأرضيات والسراميك",
      "تنظيف الشبابيك والألومنيوم والواجهات",
      "غسيل وسحب أتربة الكنب والسجاد بالبخار"
    ]
  }
];

export const JORDAN_CITIES = [
  "عمّان",
  "الزرقاء",
  "إربد",
  "السلط",
  "مادبا",
  "العقبة",
  "جرش",
  "عجلون",
  "الكرك"
];

// مواعيد مرنة كل 30 دقيقة من 08:00 صباحاً حتى 08:00 مساءً
export const TIME_SLOTS = [
  "08:00 صباحًا", "08:30 صباحًا",
  "09:00 صباحًا", "09:30 صباحًا",
  "10:00 صباحًا", "10:30 صباحًا",
  "11:00 صباحًا", "11:30 صباحًا",
  "12:00 ظهرًا",  "12:30 ظهرًا",
  "01:00 مساءً", "01:30 مساءً",
  "02:00 مساءً", "02:30 مساءً",
  "03:00 مساءً", "03:30 مساءً",
  "04:00 مساءً", "04:30 مساءً",
  "05:00 مساءً", "05:30 مساءً",
  "06:00 مساءً", "06:30 مساءً",
  "07:00 مساءً", "07:30 مساءً",
  "08:00 مساءً"
];

export function getBookingStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: "قيد الانتظار",
    CONFIRMED: "مؤكد",
    ASSIGNED: "تم تعيين الفني",
    IN_PROGRESS: "قيد التنفيذ",
    COMPLETED: "مكتمل",
    CANCELLED: "ملغى",
    REFUNDED: "مسترد"
  };
  return statusMap[status] || status;
}

export function getBookingStatusStyle(status: string): string {
  const styleMap: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-300",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-300",
    ASSIGNED: "bg-indigo-100 text-indigo-800 border-indigo-300",
    IN_PROGRESS: "bg-sky-100 text-sky-800 border-sky-300",
    COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-300",
    CANCELLED: "bg-rose-100 text-rose-800 border-rose-300",
    REFUNDED: "bg-purple-100 text-purple-800 border-purple-300"
  };
  return styleMap[status] || "bg-gray-100 text-gray-800 border-gray-300";
}