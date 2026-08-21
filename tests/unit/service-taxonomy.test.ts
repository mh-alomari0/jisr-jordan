import { describe, expect, it } from "vitest";
import {
  buildServiceTaxonomy,
  normalizeServiceCategories,
} from "@/lib/service-taxonomy";

const educationId = "20000000-0000-4000-8000-000000000003";
const beautyId = "20000000-0000-4000-8000-000000000009";

const driftedCategories = [
  {
    id: educationId,
    parent_id: null,
    slug: "education-training",
    name_ar: "جمال وعناية للسيدات",
    description_ar: "اسم منجرف",
    icon: "sparkles",
    display_order: 3,
    is_active: true,
    requires_moderation: false,
  },
  {
    id: "23000000-0000-4000-8000-000000000001",
    parent_id: educationId,
    slug: "school-tutoring",
    name_ar: "الدروس المدرسية",
    description_ar: null,
    icon: "book-open",
    display_order: 10,
    is_active: true,
    requires_moderation: false,
  },
];

describe("service taxonomy normalization", () => {
  it("restores the canonical education root and creates a separate beauty root", () => {
    const normalized = normalizeServiceCategories(driftedCategories);

    expect(normalized.find((item) => item.id === educationId)?.name_ar).toBe("التعليم والتدريب");
    expect(normalized.find((item) => item.id === beautyId)?.name_ar).toBe("جمال وعناية للسيدات");
  });

  it("keeps tutoring under education and moves legacy beauty services out", () => {
    const taxonomy = buildServiceTaxonomy(driftedCategories, [
      {
        id: "physics",
        title: "تدريس الفيزياء",
        description: null,
        category: null,
        category_id: educationId,
      },
      {
        id: "makeup",
        title: "مكياج وميك أب سهرات ومناسبات",
        description: null,
        category: "BEAUTY",
        category_id: educationId,
      },
    ]);

    expect(taxonomy.find((item) => item.id === educationId)?.serviceTypes.map((item) => item.id)).toEqual(["physics"]);
    expect(taxonomy.find((item) => item.id === beautyId)?.serviceTypes.map((item) => item.id)).toEqual(["makeup"]);
  });
});
