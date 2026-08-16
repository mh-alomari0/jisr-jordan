import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "CRITICAL: Missing Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// تصدير كائن ثابت متوافق مع المكونات العادية
export const supabase = createClient();