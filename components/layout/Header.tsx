"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { User, AuthChangeEvent, Session } from "@supabase/supabase-js";

export default function Header() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: User | null } }) => {
      setUser(data.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center">
      <span className="font-bold text-sky-600">جسر | JISR</span>
      {user ? (
        <span className="text-sm text-slate-700">{user.email}</span>
      ) : (
        <span className="text-sm text-slate-500">زائر</span>
      )}
    </header>
  );
}