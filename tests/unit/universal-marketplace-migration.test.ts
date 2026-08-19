import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatListingPrice } from "@/lib/marketplace";

const foundation = readFileSync(resolve("supabase/migrations/20260819007000_universal_marketplace_foundation.sql"), "utf8");
const transactions = readFileSync(resolve("supabase/migrations/20260819008000_marketplace_transactions_content.sql"), "utf8");

describe("universal marketplace database contract", () => {
  it("keeps legacy tables and maps services without destructive table or column drops", () => {
    expect(foundation).toContain("ADD COLUMN IF NOT EXISTS category_id");
    expect(foundation).not.toMatch(/DROP\s+TABLE/i);
    expect(foundation).not.toMatch(/DROP\s+COLUMN/i);
    expect(transactions).not.toMatch(/DROP\s+TABLE/i);
    expect(transactions).not.toMatch(/DROP\s+COLUMN/i);
  });

  it("enables RLS for every new user-owned marketplace table", () => {
    for (const table of ["service_listings", "quote_requests", "provider_quotes", "commission_ledger", "provider_posts", "provider_media", "marketplace_favorites"]) {
      expect(foundation + transactions).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    }
  });

  it("guards quote price and commission snapshots inside SECURITY DEFINER functions", () => {
    expect(transactions).toContain("CREATE OR REPLACE FUNCTION public.accept_provider_quote");
    expect(transactions).toContain("v_rate := public.resolve_marketplace_commission_rate");
    expect(transactions).toContain("commission_rate_snapshot");
    expect(transactions).toContain("commission_amount_snapshot");
    expect(transactions).toContain("SET search_path = public, pg_temp");
  });

  it("does not invent a default commission percentage", () => {
    const schemaBeforeConfigurationRpc = transactions.slice(0, transactions.indexOf("CREATE OR REPLACE FUNCTION public.configure_marketplace_commission"));
    expect(schemaBeforeConfigurationRpc).not.toMatch(/INSERT INTO public\.marketplace_commission_rules/i);
    expect(transactions).toContain("COMMISSION_NOT_CONFIGURED");
  });

  it("uses distinct pricing labels for fixed, hourly, session, and quote workflows", () => {
    expect(formatListingPrice({ pricing_model: "FIXED", base_price: 50, currency: "JOD" })).toContain("د.أ");
    expect(formatListingPrice({ pricing_model: "HOURLY", base_price: 10, currency: "JOD" })).toContain("ساعة");
    expect(formatListingPrice({ pricing_model: "PER_SESSION", base_price: 15, currency: "JOD" })).toContain("جلسة");
    expect(formatListingPrice({ pricing_model: "QUOTE_REQUIRED", base_price: null, currency: "JOD" })).toBe("اطلب عرض سعر");
  });
});
