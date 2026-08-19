import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactSignal } from "@/lib/anti-circumvention";

export async function recordBlockedContactAttempt(
  supabase: SupabaseClient,
  surface: "LISTING" | "PROFILE" | "POST" | "QUOTE",
  targetId: string | null,
  signals: ContactSignal[],
) {
  if (!signals.length) return;
  await supabase.rpc("record_marketplace_contact_block", {
    p_surface: surface,
    p_target_id: targetId,
    p_signals: signals,
  });
}
