import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, buttonClassName, Card, CardBody, Stat } from "@/components/ui";
import { QrPreview } from "@/components/qr-preview";
import { formatDate, formatRelative } from "@/lib/format";
import { publicEnv } from "@/lib/env";
import type { QrCode, QrFolder, QrScan } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: qr, error: qrError } = await supabase
    .from("qr_codes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (qrError || !qr) notFound();
  const code = qr as QrCode;

  const [
    { data: scans, error: scansError },
    { count: totalScans },
    { data: folder, error: folderError },
  ] = await Promise.all([
    supabase
      .from("qr_scans")
      .select("*")
      .eq("qr_code_id", code.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("qr_scans")
      .select("id", { count: "exact", head: true })
      .eq("qr_code_id", code.id),
    code.folder_id
      ? supabase
          .from("qr_folders")
          .select("*")
          .eq("id", code.folder_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (scansError) throw new Error(`Could not load scans: ${scansError.message}`);
  if (folderError) throw new Error(`Could not load folder: ${folderError.message}`);

  const recent = (scans as QrScan[] | null) ?? [];
  const qrFolder = folder as QrFolder | null;
  const redirectUrl = `${publicEnv.siteUrl}/r/${code.slug}`;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-xs text-neutral-500 hover:underline">
            Back to dashboard
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">{code.name}</h1>
            {code.is_active ? (
              <Badge tone="green">Active</Badge>
            ) : (
              <Badge tone="red">Disabled</Badge>
            )}
          </div>
          {code.campaign ? (
            <p className="mt-1 text-sm text-neutral-500">{code.campaign}</p>
          ) : null}
        </div>
        <Link
          href={`/qr/${code.id}/edit`}
          className={buttonClassName({ variant: "secondary", size: "sm" })}
        >
          Edit
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center">
            <QrPreview url={redirectUrl} />
            <div className="mt-3 w-full break-all text-center text-xs text-neutral-500">
              {redirectUrl}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Total scans" value={totalScans ?? 0} />
            <Stat
              label="Last scan"
              value={recent[0] ? formatRelative(recent[0].created_at) : "-"}
            />
          </div>

          <Card>
            <CardBody className="space-y-3 text-sm">
              <DetailRow label="Redirect URL">
                <code className="break-all text-neutral-800">{redirectUrl}</code>
              </DetailRow>
              <DetailRow label="Destination">
                <a
                  href={code.destination_url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-neutral-800 underline"
                >
                  {code.destination_url}
                </a>
              </DetailRow>
              <DetailRow label="Slug">
                <code>{code.slug}</code>
              </DetailRow>
              <DetailRow label="Folder">{qrFolder?.name ?? "Uncategorized"}</DetailRow>
              <DetailRow label="Created">{formatDate(code.created_at)}</DetailRow>
              {code.notes ? (
                <DetailRow label="Notes">
                  <span className="whitespace-pre-line text-neutral-700">
                    {code.notes}
                  </span>
                </DetailRow>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="text-sm font-semibold">Recent scans</h2>
          <span className="text-xs text-neutral-500">
            Showing last {recent.length}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">When</th>
                <th className="px-5 py-2.5 font-medium">Device</th>
                <th className="px-5 py-2.5 font-medium">Browser</th>
                <th className="px-5 py-2.5 font-medium">OS</th>
                <th className="px-5 py-2.5 font-medium">Referrer</th>
                <th className="px-5 py-2.5 font-medium">Location</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-neutral-500">
                    No scans yet.
                  </td>
                </tr>
              ) : (
                recent.map((scan) => (
                  <tr key={scan.id} className="border-t border-neutral-100">
                    <td className="px-5 py-2.5 text-neutral-700">
                      {formatDate(scan.created_at)}
                    </td>
                    <td className="px-5 py-2.5">{scan.device ?? "-"}</td>
                    <td className="px-5 py-2.5">{scan.browser ?? "-"}</td>
                    <td className="px-5 py-2.5">{scan.os ?? "-"}</td>
                    <td className="max-w-[200px] truncate px-5 py-2.5">
                      {scan.referrer ?? "-"}
                    </td>
                    <td className="px-5 py-2.5">
                      {[scan.city, scan.country].filter(Boolean).join(", ") || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-start gap-3">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}
