import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import ProviderProfileClient from "./_components/provider-profile-client";

export const metadata = {
  title: "ملفي المهني | مساحة مقدم الخدمة",
};

export default async function ProviderProfilePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=%2Fprovider%2Fprofile");

  const [{ data: profile }, { data: offered }, { data: services }] =
    await Promise.all([
      supabase
        .from("provider_profiles")
        .select(
          "bio, service_areas, experience, application_status, is_verified, headline, skills, remote_available, public_slug, experience_start_year, experience_verified_at, avatar_path, cover_path",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("provider_services")
        .select("service_id")
        .eq("provider_id", user.id)
        .eq("is_active", true),
      supabase
        .from("services")
        .select("id, title, category")
        .eq("is_active", true)
        .order("title")
        .limit(300),
    ]);

  if (!profile?.is_verified || profile.application_status !== "APPROVED") {
    redirect("/provider/apply");
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 border-b border-theme pb-6">
        <Link
          href="/provider"
          className="inline-flex items-center gap-1 text-xs font-bold text-muted transition hover:text-brand"
        >
          <ArrowRight size={14} />
          مساحة الشغل
        </Link>

        <div className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-black tracking-[-.05em] sm:text-4xl">
            ملفك المهني
          </h1>
          <p className="mt-2 text-sm leading-7 text-muted">
            هاي الصفحة اللي الزبون بشوفها قبل ما يحكي معك. خلي الصورة، النبذة، خبرتك وخدماتك يحكوا عن شغلك بوضوح.
          </p>
        </div>
      </header>

      <ProviderProfileClient
        initialProfile={{
          bio: profile.bio || "",
          serviceAreas: profile.service_areas || [],
          experience: profile.experience || "",
          serviceIds: (offered || []).map((item) => item.service_id),
          headline: profile.headline || "",
          skills: profile.skills || [],
          remoteAvailable: profile.remote_available || false,
          publicSlug: profile.public_slug || "",
          experienceStartYear: profile.experience_start_year || null,
          experienceVerified: Boolean(profile.experience_verified_at),
          avatarUrl: profile.avatar_path
            ? supabase.storage
                .from("marketplace-public")
                .getPublicUrl(profile.avatar_path).data.publicUrl
            : null,
          coverUrl: profile.cover_path
            ? supabase.storage
                .from("marketplace-public")
                .getPublicUrl(profile.cover_path).data.publicUrl
            : null,
        }}
        availableServices={services || []}
      />
    </main>
  );
}
