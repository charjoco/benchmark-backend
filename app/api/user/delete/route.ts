import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// DELETE /api/user/delete
// Caller must supply: Authorization: Bearer <supabase-access-token>
// Verifies the JWT, then uses the service_role key (server-only) to delete the user's
// data rows and auth record. The service_role key never leaves this server.
export async function DELETE(req: NextRequest) {
  // 1. Extract bearer token from Authorization header
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing or malformed Authorization header" },
      { status: 401 }
    );
  }
  const jwt = auth.slice(7);

  // 2. Verify the JWT against Supabase Auth using the anon key.
  //    getUser(jwt) makes a server-side request to Supabase to validate the signature
  //    and return the associated user. An expired or tampered token returns an error.
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(jwt);
  if (authError || !user) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  // 3. Admin client — service_role key stays server-side, never shipped to the app
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 4. Delete user data rows explicitly before removing the auth user.
  //    Belt-and-suspenders: works correctly whether or not FK CASCADE is configured.
  const { error: prefsError } = await adminClient
    .from("user_preferences")
    .delete()
    .eq("user_id", user.id);

  if (prefsError) {
    console.error("[api/user/delete] user_preferences delete error:", prefsError.message);
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 });
  }

  const { error: savedError } = await adminClient
    .from("saved_products")
    .delete()
    .eq("user_id", user.id);

  if (savedError) {
    console.error("[api/user/delete] saved_products delete error:", savedError.message);
    return NextResponse.json({ error: "Failed to delete account data" }, { status: 500 });
  }

  // 5. Delete the auth user — requires service_role
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[api/user/delete] auth.admin.deleteUser error:", deleteError.message);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }

  console.log(`[api/user/delete] account deleted: ${user.id}`);
  return NextResponse.json({ success: true });
}
