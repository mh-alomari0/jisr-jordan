import type {
  MarketplaceCategory,
  ServiceTypeDefinition,
} from "@/lib/marketplace";

type CategoryRow = Omit<MarketplaceCategory, "children">;

export type TaxonomyServiceRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  category_id: string | null;
};

const ROOT_IDS = {
  home: "20000000-0000-4000-8000-000000000001",
  technology: "20000000-0000-4000-8000-000000000002",
  education: "20000000-0000-4000-8000-000000000003",
  design: "20000000-0000-4000-8000-000000000004",
  business: "20000000-0000-4000-8000-000000000005",
  events: "20000000-0000-4000-8000-000000000006",
  maintenance: "20000000-0000-4000-8000-000000000007",
  other: "20000000-0000-4000-8000-000000000008",
  beauty: "20000000-0000-4000-8000-000000000009",
} as const;

const canonicalRoots: CategoryRow[] = [
  {
    id: ROOT_IDS.home,
    parent_id: null,
    slug: "home-services",
    name_ar: "الخدمات المنزلية",
    description_ar: "خدمات المنزل اليومية والتنظيف والتجهيزات.",
    icon: "house",
    display_order: 10,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: ROOT_IDS.technology,
    parent_id: null,
    slug: "technology-programming",
    name_ar: "التقنية والبرمجة",
    description_ar: "حلول رقمية وبرمجية ودعم تقني عن بُعد أو كمشاريع.",
    icon: "code-2",
    display_order: 20,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: ROOT_IDS.education,
    parent_id: null,
    slug: "education-training",
    name_ar: "التعليم والتدريب",
    description_ar: "دروس وجلسات تدريب فردية ومهنية.",
    icon: "graduation-cap",
    display_order: 30,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: ROOT_IDS.beauty,
    parent_id: null,
    slug: "beauty-care",
    name_ar: "جمال وعناية للسيدات",
    description_ar: "خدمات العناية بالشعر والبشرة والأظافر والتجميل.",
    icon: "sparkles",
    display_order: 35,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: ROOT_IDS.design,
    parent_id: null,
    slug: "design-creative",
    name_ar: "التصميم والإبداع",
    description_ar: "تصميم بصري ومحتوى إبداعي وخدمات إنتاج.",
    icon: "palette",
    display_order: 40,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: ROOT_IDS.business,
    parent_id: null,
    slug: "business-consulting",
    name_ar: "الأعمال والاستشارات",
    description_ar: "خدمات أعمال مهنية ضمن نطاق التخصص والسياسة المعتمدة.",
    icon: "briefcase-business",
    display_order: 50,
    is_active: true,
    requires_moderation: true,
  },
  {
    id: ROOT_IDS.events,
    parent_id: null,
    slug: "events",
    name_ar: "المناسبات",
    description_ar: "تنظيم وتصوير وتجهيز المناسبات.",
    icon: "party-popper",
    display_order: 60,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: ROOT_IDS.maintenance,
    parent_id: null,
    slug: "maintenance-repair",
    name_ar: "الصيانة والإصلاح",
    description_ar: "إصلاح الأجهزة والأثاث والأعمال المتخصصة.",
    icon: "wrench",
    display_order: 70,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: ROOT_IDS.other,
    parent_id: null,
    slug: "other-services",
    name_ar: "خدمات أخرى",
    description_ar: "خدمات متنوعة بعد المراجعة والتأكد من ملاءمتها.",
    icon: "shapes",
    display_order: 80,
    is_active: true,
    requires_moderation: true,
  },
];

const syntheticChildren: CategoryRow[] = [
  {
    id: "27000000-0000-4000-8000-000000000001",
    parent_id: ROOT_IDS.beauty,
    slug: "hair-care",
    name_ar: "العناية بالشعر",
    description_ar: "قص وتصفيف وعناية بالشعر.",
    icon: "scissors",
    display_order: 10,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: "27000000-0000-4000-8000-000000000002",
    parent_id: ROOT_IDS.beauty,
    slug: "barber-grooming",
    name_ar: "حلاقة وعناية شخصية",
    description_ar: "حلاقة وتهذيب وعناية شخصية.",
    icon: "scissors",
    display_order: 20,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: "27000000-0000-4000-8000-000000000003",
    parent_id: ROOT_IDS.beauty,
    slug: "skin-care",
    name_ar: "العناية بالبشرة",
    description_ar: "تنظيف وعناية غير طبية بالبشرة.",
    icon: "sparkles",
    display_order: 30,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: "27000000-0000-4000-8000-000000000004",
    parent_id: ROOT_IDS.beauty,
    slug: "nail-care",
    name_ar: "العناية بالأظافر",
    description_ar: "ترتيب وعناية تجميلية بالأظافر.",
    icon: "hand",
    display_order: 40,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: "27000000-0000-4000-8000-000000000005",
    parent_id: ROOT_IDS.beauty,
    slug: "makeup-beauty",
    name_ar: "مكياج وتجميل",
    description_ar: "خدمات مكياج وتجميل للمناسبات.",
    icon: "palette",
    display_order: 50,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: "21000000-0000-4000-8000-000000000009",
    parent_id: ROOT_IDS.maintenance,
    slug: "moving-furniture-assembly",
    name_ar: "نقل الأثاث والتركيب",
    description_ar: "فك وتغليف ونقل وتركيب الأثاث.",
    icon: "truck",
    display_order: 40,
    is_active: true,
    requires_moderation: false,
  },
];

const categoryDestination: Record<string, string> = {
  PLUMBING: "21000000-0000-4000-8000-000000000001",
  ELECTRICITY: "21000000-0000-4000-8000-000000000002",
  CLEANING: "21000000-0000-4000-8000-000000000003",
  HVAC: "21000000-0000-4000-8000-000000000004",
  GARDENING: "21000000-0000-4000-8000-000000000005",
  CARPENTRY: "21000000-0000-4000-8000-000000000006",
  PAINTING: "21000000-0000-4000-8000-000000000007",
  APPLIANCE_REPAIR: "21000000-0000-4000-8000-000000000008",
  MOVING: "21000000-0000-4000-8000-000000000009",
};

function resolveBeautyCategory(title: string) {
  if (/(شعر|سشوار|تسريح|تصفيف)/u.test(title)) return "27000000-0000-4000-8000-000000000001";
  if (/(حلاقة|تهذيب)/u.test(title)) return "27000000-0000-4000-8000-000000000002";
  if (/بشرة/u.test(title)) return "27000000-0000-4000-8000-000000000003";
  if (/(أظافر|بدكير|مناكير)/u.test(title)) return "27000000-0000-4000-8000-000000000004";
  return "27000000-0000-4000-8000-000000000005";
}

function resolveServiceCategory(service: TaxonomyServiceRow) {
  if (service.category === "BEAUTY") return resolveBeautyCategory(service.title);
  if (service.category === "TUTORING") {
    return /^\s*تدريب/u.test(service.title)
      ? "23000000-0000-4000-8000-000000000002"
      : "23000000-0000-4000-8000-000000000001";
  }
  return (service.category && categoryDestination[service.category]) || service.category_id;
}

export function normalizeServiceCategories(rows: CategoryRow[]) {
  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const canonical of [...canonicalRoots, ...syntheticChildren]) {
    const existing = byId.get(canonical.id);
    byId.set(canonical.id, existing ? { ...existing, ...canonical } : canonical);
  }

  return [...byId.values()]
    .filter((category) => category.is_active)
    .sort((a, b) => a.display_order - b.display_order || a.name_ar.localeCompare(b.name_ar, "ar"));
}

export function buildServiceTaxonomy(
  categoryRows: CategoryRow[],
  services: TaxonomyServiceRow[],
) {
  const categories = normalizeServiceCategories(categoryRows);
  const byId = new Map(categories.map((item) => [item.id, item]));
  const serviceRows = services.map((service) => {
    const categoryId = resolveServiceCategory(service);
    const child = categoryId ? byId.get(categoryId) : null;
    const parent = child?.parent_id ? byId.get(child.parent_id) : child;

    return {
      id: service.id,
      title: service.title,
      description: service.description,
      category_id: child?.id || null,
      category_name: child?.name_ar || null,
      parent_category_id: parent?.id || null,
      parent_category_name: parent?.name_ar || null,
    } satisfies ServiceTypeDefinition;
  });

  return categories
    .filter((item) => !item.parent_id)
    .map((parent) => ({
      ...parent,
      serviceTypes: serviceRows.filter((service) => service.parent_category_id === parent.id),
    }));
}

