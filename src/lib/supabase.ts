import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Returns null if env vars are not configured yet — prevents a crash on module load
export const supabase: SupabaseClient | null =
  url && key && url.startsWith("http") ? createClient(url, key) : null;
