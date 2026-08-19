"use client";
import { useState } from "react";
import { Camera } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";
import { confirmProfileMediaUploadAction, prepareProfileMediaUploadAction } from "@/lib/actions/profile-media";

export default function ProfileMediaEditor({ audience, initialAvatar, initialCover, name }: { audience: "CUSTOMER" | "PROVIDER"; initialAvatar?: string | null; initialCover?: string | null; name: string }) {
  const [avatar, setAvatar] = useState(initialAvatar || null); const [cover, setCover] = useState(initialCover || null); const [message, setMessage] = useState("");
  async function upload(kind: "AVATAR" | "COVER", file?: File) {
    if (!file) return; setMessage("");
    const prepared = await prepareProfileMediaUploadAction({ kind, audience, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", sizeBytes: file.size });
    if (!prepared.success) { setMessage(prepared.error || "تعذر تجهيز الصورة"); return; }
    const { error } = await supabase.storage.from(prepared.bucket).uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
    if (error) { setMessage("تعذر رفع الصورة"); return; }
    const confirmed = await confirmProfileMediaUploadAction({ kind, audience, path: prepared.path, mimeType: file.type as "image/jpeg" | "image/png" | "image/webp", sizeBytes: file.size });
    if (!confirmed.success) { setMessage(confirmed.error || "تعذر اعتماد الصورة"); return; }
    const local = URL.createObjectURL(file);
    if (kind === "AVATAR") setAvatar(local); else setCover(local);
    setMessage("تم تحديث الصورة.");
  }
  return <section aria-label="صور الملف" className="overflow-hidden border-b border-theme">
    <div className="relative h-32 bg-[rgb(var(--surface-muted))] sm:h-44">{cover && <Image src={cover} alt="صورة الغلاف" fill unoptimized sizes="768px" className="object-cover" />}<label className="absolute bottom-3 end-3 cursor-pointer bg-[rgb(var(--surface)/0.92)] px-3 py-2 text-xs font-black shadow"><Camera className="me-1 inline h-4 w-4" /> الغلاف<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void upload("COVER", event.target.files?.[0])} /></label></div>
    <div className="relative -mt-10 ms-5 h-20 w-20 overflow-hidden rounded-full border-4 border-[rgb(var(--surface))] bg-[rgb(var(--primary-soft))] text-center text-2xl font-black leading-[4rem] text-brand sm:h-24 sm:w-24 sm:leading-[5rem]">{avatar ? <Image src={avatar} alt={`صورة ${name}`} fill unoptimized sizes="96px" className="object-cover" /> : name.slice(0, 1)}<label className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/0 text-transparent hover:bg-black/50 hover:text-white"><Camera className="h-5 w-5" /><span className="sr-only">تغيير الصورة الشخصية</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void upload("AVATAR", event.target.files?.[0])} /></label></div>
    {message && <p role="status" className="px-5 pb-3 text-xs text-muted">{message}</p>}
  </section>;
}
