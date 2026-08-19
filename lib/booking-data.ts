import type { SupabaseClient } from "@supabase/supabase-js";

type BookingWithServiceKey = {
  service_id?: string | null;
  service_title?: string | null;
  agreed_amount?: number | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The live project still has a legacy TEXT bookings.service_id without a
 * PostgREST relationship. Enrich booking rows explicitly until that column can
 * be migrated safely after production data is reviewed.
 */
export async function enrichBookingsWithServices<T extends BookingWithServiceKey>(
  supabase: SupabaseClient,
  bookings: T[]
) {
  const ids = [...new Set(
    bookings
      .map((booking) => booking.service_id)
      .filter((id): id is string => !!id && UUID_PATTERN.test(id))
  )];

  const { data } = ids.length
    ? await supabase
        .from("services")
        .select("id, title, price, category")
        .in("id", ids)
    : { data: [] };

  const services = new Map(
    (data || []).map((service) => [service.id, service] as const)
  );

  return bookings.map((booking) => ({
    ...booking,
    services: services.get(booking.service_id || "") || {
      title: booking.service_title || "خدمة منزلية",
      price: booking.agreed_amount ?? null,
      category: null,
    },
  }));
}
