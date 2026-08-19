import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { detectContactSignals } from "@/lib/anti-circumvention";

const migration = readFileSync(resolve("supabase/migrations/20260819012000_secure_messaging_anti_circumvention.sql"), "utf8");
const cancellationGuard = readFileSync(resolve("supabase/migrations/20260819013000_commission_cancellation_guard.sql"), "utf8");

describe("secure marketplace messaging", () => {
  it("isolates conversations and messages to their participants without implicit admin access", () => {
    expect(migration).toContain("ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("customer_id = auth.uid() OR provider_id = auth.uid()");
    expect(migration).not.toMatch(/Admins (?:read|manage).*(?:conversation|message)/i);
  });

  it("prevents sender spoofing by deriving the sender in the database", () => {
    expect(migration).toContain("INSERT INTO public.conversation_messages(");
    expect(migration).toContain("p_conversation_id, auth.uid(), p_message_type");
    expect(migration).not.toContain("p_sender_id");
  });

  it("requires private message media to belong to the conversation participant path", () => {
    expect(migration).toContain("message-private");
    expect(migration).toContain("split_part(name, '/', 2) = auth.uid()::TEXT");
    expect(migration).toContain("v_expected_prefix := p_conversation_id::TEXT || '/' || auth.uid()::TEXT || '/'");
    expect(migration).toContain("v_size > 8388608");
    expect(migration).toContain("v_size > 26214400");
  });

  it("blocks contact attempts before a snapshotted transaction but allows auditable post-booking contact", () => {
    expect(migration).toContain("CONTACT_NOT_ALLOWED");
    expect(migration).toContain("conversation_contact_allowed");
    expect(migration).toContain("commission_rate_snapshot IS NOT NULL");
    expect(migration).toContain("ALLOWED_AFTER_BOOKING");
    expect(migration).toContain("marketplace_contact_events");
  });

  it("provides bounded message and inbox queries", () => {
    expect(migration).toContain("LIMIT LEAST(GREATEST(COALESCE(p_limit, 40), 1), 80)");
    expect(readFileSync(resolve("lib/actions/messaging.ts"), "utf8")).toContain(".limit(31)");
  });

  it("links a pre-booking conversation to the resulting booking", () => {
    expect(migration).toContain("CREATE TRIGGER link_conversation_after_booking");
    expect(migration).toContain("SET booking_id = NEW.id");
  });

  it("detects layered contact and external-payment signals without flagging ordinary service text", () => {
    expect(detectContactSignals("راسلني على 079 123 4567")).toContain("PHONE");
    expect(detectContactSignals("البريد name @ example.com")).toContain("EMAIL");
    expect(detectContactSignals("WhatsApp @repair_team")).toContain("SOCIAL_CONTACT");
    expect(detectContactSignals("حوّل المبلغ عبر CliQ")).toContain("EXTERNAL_PAYMENT");
    expect(detectContactSignals("أحتاج إصلاح تسريب المياه يوم الخميس")).toEqual([]);
  });

  it("preserves commission review after contact reveal and blocks cancellation after work", () => {
    expect(cancellationGuard).toContain("CANCELLATION_REQUIRES_ADMIN_REVIEW");
    expect(cancellationGuard).toContain("CANCELLATION_AFTER_WORK_NOT_ALLOWED");
    expect(cancellationGuard).toContain("commission_snapshotted");
    expect(cancellationGuard).not.toMatch(/UPDATE\s+public\.commission_ledger/i);
  });
});
