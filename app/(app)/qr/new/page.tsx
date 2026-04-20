import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody } from "@/components/ui";
import { QrForm } from "@/components/qr-form";
import type { QrFolder } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function NewQrPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qr_folders")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(`Could not load folders: ${error.message}`);
  const folders = (data as QrFolder[] | null) ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/dashboard" className="text-xs text-neutral-500 hover:underline">
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">New QR code</h1>
      </div>
      <Card>
        <CardBody>
          <QrForm mode={{ kind: "create" }} folders={folders} />
        </CardBody>
      </Card>
    </div>
  );
}
