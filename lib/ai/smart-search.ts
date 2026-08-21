import "server-only";

import { z } from "zod";

const ResultSchema = z.object({
  normalized_query: z.string().trim().min(1).max(100),
  category_id: z.string().uuid().nullable(),
  service_id: z.string().uuid().nullable(),
  confidence: z.number().min(0).max(1),
});

export type SmartSearchResult = z.infer<typeof ResultSchema>;

export type SmartSearchCatalog = {
  categories: Array<{ id: string; name_ar: string }>;
  services: Array<{
    id: string;
    title: string;
    description: string | null;
    category_id: string | null;
  }>;
};

const RULES = [
  {
    words: ["مي", "مياه", "ماء", "ماسورة", "ماسوره", "مواسير", "حنفية", "حنفيه", "تسريب", "مجلى", "مغسلة", "مغسله", "سيفون"],
    terms: ["سباكة", "تسريب مياه", "مواسير"],
  },
  {
    words: ["كهربا", "كهرباء", "قاطع", "فيش", "ابريز", "إبريز", "لمبة", "لمبه", "انارة", "إنارة"],
    terms: ["كهرباء", "أعطال كهربائية", "إنارة"],
  },
  {
    words: ["مكيف", "مكيفات", "تكييف", "فريون", "تبريد"],
    terms: ["تكييف", "مكيف", "صيانة مكيفات"],
  },
  {
    words: ["لابتوب", "لاب توب", "كمبيوتر", "حاسوب", "ويندوز", "بعلق", "يعلق"],
    terms: ["صيانة كمبيوتر", "دعم تقني", "تقنية"],
  },
  {
    words: ["دهان", "بويه", "بوية", "طلاء", "حيطان", "حائط"],
    terms: ["دهان", "تشطيب", "طلاء"],
  },
  {
    words: ["تنظيف", "نظافة", "نظافه", "كنس", "جلي"],
    terms: ["تنظيف منزل", "تنظيف", "نظافة"],
  },
] as const;

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function localIntent(
  query: string,
  catalog: SmartSearchCatalog,
): SmartSearchResult | null {
  const q = normalize(query);

  const rule = RULES.find((item) =>
    item.words.some((word) => q.includes(normalize(word))),
  );

  if (!rule) return null;

  const terms = rule.terms.map(normalize);

  const service = catalog.services.find((item) => {
    const text = normalize(`${item.title} ${item.description || ""}`);
    return terms.some((term) => text.includes(term));
  });

  if (service) {
    return {
      normalized_query: rule.terms.join(" "),
      category_id: service.category_id,
      service_id: service.id,
      confidence: 0.95,
    };
  }

  const category = catalog.categories.find((item) => {
    const text = normalize(item.name_ar);
    return terms.some((term) => text.includes(term));
  });

  return {
    normalized_query: rule.terms.join(" "),
    category_id: category?.id || null,
    service_id: null,
    confidence: category ? 0.88 : 0.74,
  };
}

function extractOutputText(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];

    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }

  return null;
}

export async function resolveSmartSearchIntent(
  query: string,
  catalog: SmartSearchCatalog,
): Promise<SmartSearchResult | null> {
  const local = localIntent(query, catalog);
  if (local) return local;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_SEARCH_MODEL || "gpt-5.4-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "أنت محرك فهم بحث لمنصة خدمات أردنية. افهم اللهجة الأردنية والأخطاء البسيطة. لا تخترع خدمات. اختر فقط IDs موجودة في الكتالوج. أعد JSON فقط.",
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            catalog: {
              categories: catalog.categories.slice(0, 50),
              services: catalog.services.slice(0, 200),
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "jisr_search_intent",
          strict: true,
          schema: {
            type: "object",
            properties: {
              normalized_query: { type: "string" },
              category_id: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              service_id: {
                anyOf: [{ type: "string" }, { type: "null" }],
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
            },
            required: [
              "normalized_query",
              "category_id",
              "service_id",
              "confidence",
            ],
            additionalProperties: false,
          },
        },
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });

  if (!response.ok) {
    console.error("JISR smart search OpenAI error", response.status, await response.text());
    return null;
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const outputText = extractOutputText(payload);
  if (!outputText) return null;

  try {
    const parsed = ResultSchema.safeParse(JSON.parse(outputText));
    if (!parsed.success || parsed.data.confidence < 0.58) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
