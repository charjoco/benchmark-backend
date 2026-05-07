import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_CONTEXTS = new Set(["collection", "article"]);
const UUID_RE = /^[0-9a-f-]{36}$/i;
const MAX_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  const context = formData.get("context");
  const entityId = formData.get("entityId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  if (typeof context !== "string" || !ALLOWED_CONTEXTS.has(context)) {
    return NextResponse.json({ error: "Invalid context." }, { status: 400 });
  }

  if (typeof entityId !== "string" || !UUID_RE.test(entityId)) {
    return NextResponse.json({ error: "Invalid entityId." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP images are accepted." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB." }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  const storagePath = `${context}s/${entityId}/${Date.now()}.${ext}`;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("article-images")
    .upload(storagePath, buffer, { contentType: file.type, upsert: true });

  if (error) {
    console.error("[api/admin/upload-image] storage upload error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("article-images").getPublicUrl(storagePath);

  return NextResponse.json({ url: data.publicUrl });
}
