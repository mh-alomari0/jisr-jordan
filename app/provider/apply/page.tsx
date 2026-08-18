import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ProviderApplyClient from "./_components/provider-apply-client";

export const metadata = {
  title: "انضم كمقدم خدمة | جسر الأردن",
};

export default async function ProviderApplyPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if already applied
  const { data: profile } = await supabase
    .from("provider_profiles")
    .select("application_status, is_verified")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fetch available services for the form
  const { data: services } = await supabase
    .from("services")
    .select("id, title, category")
    .eq("is_active", true)
    .order("title");

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <ProviderApplyClient
        existingProfile={profile || null}
        availableServices={services || []}
      />
    </div>
  );
}
