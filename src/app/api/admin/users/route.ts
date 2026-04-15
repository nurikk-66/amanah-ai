import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function serviceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}

async function getUser() {
  const cookieStore = await cookies();
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// GET — list all users with their roles
export async function GET() {
  const user = await getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sb = serviceClient();

  // Fetch all auth users
  const { data: authData, error: authErr } = await sb.auth.admin.listUsers({ perPage: 500 });
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 });

  // Fetch all profiles
  const { data: profiles } = await sb.from("user_profiles").select("id, role, company_name");
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const users = authData.users.map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
      role: (profile?.role ?? "auditor") as "auditor" | "manager",
      company_name: profile?.company_name ?? null,
    };
  });

  return NextResponse.json({ users });
}

// PATCH — update a user's role
export async function PATCH(req: NextRequest) {
  const user = await getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId, role } = await req.json() as { userId: string; role: "auditor" | "manager" };
  if (!userId || !["auditor", "manager"].includes(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sb = serviceClient();
  const { error } = await sb
    .from("user_profiles")
    .upsert({ id: userId, role, updated_at: new Date().toISOString() }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
