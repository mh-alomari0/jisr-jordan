import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(resolve("supabase/migrations/20260819010000_product_ux_push_commission.sql"), "utf8");
const listingGuard = readFileSync(resolve("supabase/migrations/20260819011000_listing_service_type_guard.sql"), "utf8");
const homepage = readFileSync(resolve("app/page.tsx"), "utf8");
const listingActions = readFileSync(resolve("lib/actions/provider-listings.ts"), "utf8");
const authActions = readFileSync(resolve("lib/actions/auth.ts"), "utf8");

describe("provider-first product correction", () => {
  it("configures the owner-approved 10% rule without rewriting historical snapshots", () => {
    expect(migration).toContain("10.00, TRUE");
    expect(migration).toContain("'historical_snapshots_changed', FALSE");
    expect(migration).not.toMatch(/UPDATE\s+public\.bookings[\s\S]*commission_rate_snapshot/i);
    expect(migration).not.toMatch(/UPDATE\s+public\.commission_ledger[\s\S]*rate_percent/i);
  });

  it("owns push subscriptions and preferences with RLS", () => {
    for (const table of ["notification_preferences", "push_subscriptions", "push_notification_outbox"]) expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`);
    expect(migration).toContain("user_id = auth.uid()");
    expect(migration).not.toMatch(/CREATE POLICY[^;]+push_notification_outbox/i);
  });

  it("discovers service types rather than platform prices or vanity metrics on home", () => {
    expect(homepage).toContain("/service-types/");
    expect(homepage).not.toContain("getPublicMetricsAction");
    expect(homepage).not.toContain("خدمة منزلية جاهزة");
    expect(homepage).not.toContain("مقدمو خدمة جدد");
  });

  it("requires the provider listing to own price and reference a valid service type", () => {
    expect(listingActions).toContain("serviceTypeId");
    expect(listingActions).toContain("legacy_service_id: parsed.data.serviceTypeId");
    expect(listingActions).toContain("base_price: parsed.data.pricingModel");
    expect(listingGuard).toContain("LISTING_SERVICE_TYPE_REQUIRED");
    expect(listingGuard).toContain("s.category_id = NEW.category_id");
  });

  it("uses Supabase Auth OTP with enumeration-safe requests", () => {
    expect(authActions).toContain("supabase.auth.signInWithOtp");
    expect(authActions).toContain("shouldCreateUser: false");
    expect(authActions).toContain("supabase.auth.verifyOtp");
  });
});
