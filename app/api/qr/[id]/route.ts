import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { resolveFolderId } from "@/lib/folders";
import { firstValidationMessage, qrUpdateSchema } from "@/lib/schemas";
import { isRedirectLoopTarget } from "@/lib/url";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = qrUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstValidationMessage(parsed.error), details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {};
  const input = parsed.data;
  if (
    input.destination_url !== undefined &&
    isRedirectLoopTarget(input.destination_url, publicEnv.siteUrl)
  ) {
    return NextResponse.json(
      { error: "Destination URL cannot point to this app's QR redirect path" },
      { status: 400 },
    );
  }

  if (input.name !== undefined) update.name = input.name;
  if (input.destination_url !== undefined) update.destination_url = input.destination_url;
  if (input.campaign !== undefined) update.campaign = input.campaign ?? null;
  if (input.notes !== undefined) update.notes = input.notes ?? null;
  if (input.is_active !== undefined) update.is_active = input.is_active;
  if (input.slug !== undefined && input.slug) {
    update.slug = input.slug;
  }
  if (input.folder_name !== undefined) {
    try {
      update.folder_id = await resolveFolderId({
        supabase,
        ownerId: user.id,
        folderName: input.folder_name,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not resolve folder" },
        { status: 400 },
      );
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("qr_codes")
    .update(update)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .single();

  if (error) {
    const status = error.code === "23505" ? 409 : 400;
    return NextResponse.json(
      { error: error.code === "23505" ? "Slug already taken" : error.message },
      { status },
    );
  }
  return NextResponse.json({ qr: data });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("qr_codes")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
