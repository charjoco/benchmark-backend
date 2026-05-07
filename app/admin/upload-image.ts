"use server";

// @deprecated — use POST /api/admin/upload-image instead.
// Passing base64 image data through a Server Action exceeds Next.js's internal
// serialization limit ("Maximum array nesting exceeded"). Kept here until the
// API route replacement is verified working in production.

import { createClient } from "@supabase/supabase-js";

// Diagnostic: log env var presence at module load time (not the values).
console.log("[upload-image] NEXT_PUBLIC_SUPABASE_URL defined:", !!process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log("[upload-image] SUPABASE_SERVICE_ROLE_KEY defined:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Upload an image to Supabase Storage using the service role key.
// The service role key bypasses RLS entirely — no browser session required.
// Called from client components; the file is serialized to base64 in the
// browser and decoded back to a Buffer here on the server.
// Requires SUPABASE_SERVICE_ROLE_KEY in Railway environment variables.
export async function uploadImageToStorage(
  base64: string,
  mimeType: string,
  storagePath: string
): Promise<{ url?: string; error?: string }> {
  let supabase;
  try {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  } catch (err) {
    console.error("[upload-image] createClient threw:", err);
    return { error: "Failed to initialize storage client." };
  }

  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabase.storage
    .from("article-images")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error("[upload-image] storage upload error:", error.message);
    return { error: error.message };
  }

  const { data } = supabase.storage
    .from("article-images")
    .getPublicUrl(storagePath);

  return { url: data.publicUrl };
}

