param(
  [string]$Path = ".\lib\actions\marketplace-discovery.ts"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Path)) {
  throw "File not found: $Path"
}

$text = Get-Content -Raw -Encoding UTF8 $Path

if ($text -notmatch 'resolveSmartSearchIntent') {
  $needle = 'import \{ buildServiceTaxonomy, excludeEventCategories, normalizeServiceCategories \} from "@/lib/service-taxonomy";'
  $replacement = '$0' + "`r`n" + 'import { resolveSmartSearchIntent } from "@/lib/ai/smart-search";'
  $text = [regex]::Replace($text, $needle, $replacement, 1)
}

$pattern = 'export async function searchMarketplaceAction\([\s\S]*?\r?\n\}\r?\n\r?\nexport async function getListingBySlugAction'

$replacement = @'
export async function searchMarketplaceAction(input: Partial<z.input<typeof SearchSchema>> = {}) {
  const parsed = SearchSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false as const,
      error: "خيارات البحث غير صالحة",
      results: [] as MarketplaceSearchResult[],
    };
  }

  try {
    const supabase = await createServerSupabaseClient();

    const runSearch = (query: string, categoryId?: string | null) =>
      supabase.rpc("search_marketplace", {
        p_query: query,
        p_scope: parsed.data.scope,
        p_category_id: categoryId ?? parsed.data.categoryId ?? null,
        p_delivery_type: parsed.data.deliveryType || null,
        p_pricing_model: parsed.data.pricingModel || null,
        p_limit: parsed.data.pageSize,
        p_offset: (parsed.data.page - 1) * parsed.data.pageSize,
      });

    const first = await runSearch(parsed.data.query);

    if (first.error) {
      return {
        success: false as const,
        error: "تعذر تنفيذ البحث حالياً",
        results: [] as MarketplaceSearchResult[],
      };
    }

    let rows = (first.data || []) as MarketplaceSearchResult[];
    let smartSearchUsed = false;
    let normalizedQuery: string | null = null;

    if (
      rows.length === 0 &&
      parsed.data.query.trim().length >= 3 &&
      parsed.data.page === 1
    ) {
      const [{ data: categories }, { data: services }] = await Promise.all([
        supabase
          .from("service_categories")
          .select("id, name_ar")
          .eq("is_active", true)
          .limit(50),
        supabase
          .from("services")
          .select("id, title, description, category_id")
          .eq("is_active", true)
          .limit(200),
      ]);

      const intent = await resolveSmartSearchIntent(parsed.data.query, {
        categories: categories || [],
        services: services || [],
      }).catch((error) => {
        console.error("Smart search failed:", error);
        return null;
      });

      if (intent) {
        const second = await runSearch(
          intent.normalized_query,
          parsed.data.categoryId || intent.category_id,
        );

        if (!second.error) {
          rows = (second.data || []) as MarketplaceSearchResult[];
          smartSearchUsed = true;
          normalizedQuery = intent.normalized_query;
        }
      }
    }

    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

    const results = rows.map((result) => ({
      ...result,
      image_path: mediaUrl(origin, result.image_path),
    }));

    return {
      success: true as const,
      results,
      page: parsed.data.page,
      hasMore: results.length === parsed.data.pageSize,
      smartSearch: {
        used: smartSearchUsed,
        normalizedQuery,
      },
    };
  } catch (error) {
    console.error("Marketplace search failed:", error);

    return {
      success: false as const,
      error: "تعذر تنفيذ البحث حالياً",
      results: [] as MarketplaceSearchResult[],
    };
  }
}

export async function getListingBySlugAction
'@

if ($text -notmatch $pattern) {
  throw "Could not find searchMarketplaceAction block. Stop without changing the file."
}

$text = [regex]::Replace($text, $pattern, $replacement, 1)
Set-Content -Path $Path -Value $text -Encoding UTF8

Write-Host "Smart search patched successfully: $Path"
Write-Host "Now run: npx tsc --noEmit"
