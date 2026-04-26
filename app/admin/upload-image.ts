"use server";

import { createClient } from "@supabase/supabase-js";

// Upload an image to Supabase Storage using the service role key.
// The service role key bypasses RLS entirely — no browser session required.
// Called from client components; the file is serialized to base64 in the
// browser and decoded back to a Buffer here on the server.
export async function uploadImageToStorage(
  base64: string,
  mimeType: string,
  storagePath: string
): Promise<{ url?: string; error?: string }> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const buffer = Buffer.from(base64, "base64");

  const { error } = await supabase.storage
    .from("article-images")
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) return { error: error.message };

  const { data } = supabase.storage
    .from("article-images")
    .getPublicUrl(storagePath);

  return { url: data.publicUrl };
}
