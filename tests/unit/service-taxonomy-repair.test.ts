import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260821010000_repair_service_taxonomy_alignment.sql"),
  "utf8",
);

describe("service taxonomy repair migration", () => {
  it("restores education and keeps beauty on a separate root id", () => {
    expect(migration).toContain("'20000000-0000-4000-8000-000000000003'::UUID THEN 'التعليم والتدريب'");
    expect(migration).toContain("'20000000-0000-4000-8000-000000000009'");
    expect(migration).toContain("'جمال وعناية للسيدات'");
  });

  it("maps the legacy categories that were visibly mixed", () => {
    expect(migration).toContain("WHEN 'HVAC' THEN '21000000-0000-4000-8000-000000000004'::UUID");
    expect(migration).toContain("WHEN 'MOVING' THEN '21000000-0000-4000-8000-000000000009'::UUID");
    expect(migration).toContain("WHEN 'TUTORING' THEN CASE");
    expect(migration).toContain("WHEN 'BEAUTY' THEN CASE");
  });

  it("keeps provider listings aligned with their repaired service type", () => {
    expect(migration).toContain("UPDATE public.service_listings AS listing");
    expect(migration).toContain("listing.legacy_service_id = service.id");
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
