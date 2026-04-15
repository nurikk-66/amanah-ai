"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "auditor" | "manager";

export interface UserProfile {
  role: UserRole;
  company_name: string | null;
}

const DEFAULT_PROFILE: UserProfile = { role: "auditor", company_name: null };

export function useUserRole() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = createClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      const { data } = await sb
        .from("user_profiles")
        .select("role, company_name")
        .eq("id", user.id)
        .single();
      if (data) setProfile({ role: data.role as UserRole, company_name: data.company_name });
      setLoading(false);
    });
  }, []);

  const updateRole = async (newRole: UserRole) => {
    const sb = createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;
    await sb.from("user_profiles").upsert({ id: user.id, role: newRole }, { onConflict: "id" });
    setProfile((p) => ({ ...p, role: newRole }));
  };

  return { profile, loading, updateRole };
}
