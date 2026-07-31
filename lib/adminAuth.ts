import { createSupabaseServerClient } from "@/lib/supabase/server";

// Admin allowlist — same source of truth as middleware.ts. Server actions must NOT rely on
// middleware for authorization: an action reachable off the /admin path (framework routing
// change, a non-admin route importing an action, a middleware edit) would otherwise execute
// for any authenticated user — and every mobile-app user holds a valid JWT for this Supabase
// project. So each action re-verifies here.
const ALLOWLIST = (process.env.ADMIN_ALLOWLIST_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/**
 * Verifies the caller is an allowlisted admin. Returns their user id, or throws "Unauthorized"
 * (which surfaces as a server-action error / 500 to the caller — never executes the action).
 * Call as the FIRST line of every admin server action.
 */
export async function assertAdmin(): Promise<string> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !ALLOWLIST.includes(user.id)) {
    throw new Error("Unauthorized");
  }
  return user.id;
}
