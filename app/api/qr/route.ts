import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { resolveFolderId } from "@/lib/folders";
import { firstValidationMessage, qrCreateSchema } from "@/lib/schemas";
import { randomSlug, slugify } from "@/lib/slug";
import { isRedirectLoopTarget } from "@/lib/url";

const MAX_AUTO_SLUG_ATTEMPTS = 8;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = qrCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (isRedirectLoopTarget(input.destination_url, publicEnv.siteUrl)) {
    return NextResponse.json(
      { error: "Destination URL cannot point to this app's QR redirect path" },
      { status: 400 },
    );
  }

  let folderId: string | null = null;
  try {
    folderId = (await resolveFolderId({
      supabase,
      ownerId: user.id,
      folderName: input.folder_name,
    })) ?? null;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not resolve folder" },
      { status: 400 },
    );
  }

  const baseSlug = input.slug || slugify(input.name) || "qr";

  for (let attempt = 0; attempt < MAX_AUTO_SLUG_ATTEMPTS; attempt += 1) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSlug(5)}`;
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({
        owner_id: user.id,
        folder_id: folderId,
        name: input.name,
        slug,
        destination_url: input.destination_url,
        campaign: input.campaign ?? null,
        notes: input.notes ?? null,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (!error) return NextResponse.json({ qr: data }, { status: 201 });

    if (error.code !== "23505") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (input.slug) {
      return NextResponse.json(
        { error: "Slug already taken" },
        { status: 409 },
      );
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique slug. Try entering a custom slug." },
    { status: 409 },
  );
}
