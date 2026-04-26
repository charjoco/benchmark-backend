"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signIn(
  _prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Invalid email or password." };
  }

  // Return success — the client will redirect after this resolves so that
  // the Set-Cookie headers from signInWithPassword are included in the
  // response before any navigation happens (avoids the redirect() race
  // where cookies might not be written before the redirect fires).
  return {};
}
