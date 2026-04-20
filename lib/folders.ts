import type { SupabaseClient } from "@supabase/supabase-js";
import type { QrFolder } from "@/types/db";

export function normalizeFolderName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function resolveFolderId({
  supabase,
  ownerId,
  folderName,
}: {
  supabase: SupabaseClient;
  ownerId: string;
  folderName: string | undefined;
}): Promise<string | null | undefined> {
  if (folderName === undefined) return undefined;

  const name = folderName.trim().replace(/\s+/g, " ");
  if (!name) return null;

  const nameNormalized = normalizeFolderName(name);
  const { data: existing, error: existingError } = await supabase
    .from("qr_folders")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name_normalized", nameNormalized)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) return (existing as Pick<QrFolder, "id">).id;

  const { data, error } = await supabase
    .from("qr_folders")
    .insert({
      owner_id: ownerId,
      name,
      name_normalized: nameNormalized,
    })
    .select("id")
    .single();

  if (!error) return (data as Pick<QrFolder, "id">).id;

  if (error.code !== "23505") throw new Error(error.message);

  const { data: racedFolder, error: racedError } = await supabase
    .from("qr_folders")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("name_normalized", nameNormalized)
    .single();

  if (racedError) throw new Error(racedError.message);
  return (racedFolder as Pick<QrFolder, "id">).id;
}
