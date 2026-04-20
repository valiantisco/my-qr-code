import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui";
import { QrForm } from "@/components/qr-form";
import type { QrCode, QrFolder } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function EditQrPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data, error }, foldersRes] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("qr_folders")
      .select("*")
      .order("name", { ascending: true }),
  ]);

  if (error) throw new Error(`Could not load QR code: ${error.message}`);
  if (foldersRes.error) throw new Error(`Could not load folders: ${foldersRes.error.message}`);
  if (!data) notFound();
  const folders = (foldersRes.data as QrFolder[] | null) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href={`/qr/${id}`} className="text-xs text-neutral-500 hover:underline">
          Back
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Edit QR code</h1>
      </div>
      <Card>
        <CardBody>
          <QrForm mode={{ kind: "edit", qr: data as QrCode }} folders={folders} />
        </CardBody>
      </Card>
    </div>
  );
}
