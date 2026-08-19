import { redirect } from "next/navigation";

export default async function LegacyServiceDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/service-types/${(await params).id}`);
}
