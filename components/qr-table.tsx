"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import QRCode from "qrcode";
import { Badge, Button, buttonClassName, Card } from "@/components/ui";
import { formatRelative } from "@/lib/format";
import type { QrFolder } from "@/types/db";

export type DashboardQr = {
  id: string;
  name: string;
  slug: string;
  destination_url: string;
  campaign: string | null;
  is_active: boolean;
  folder_id: string | null;
  folder_name: string | null;
  total_scans: number;
  last_scan_at: string | null;
  redirect_url: string;
};

function fileSafe(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "qr-code";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function QrTable({
  codes,
  folders,
}: {
  codes: DashboardQr[];
  folders: QrFolder[];
}) {
  const [folderFilter, setFolderFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const visibleCodes = useMemo(() => {
    if (folderFilter === "all") return codes;
    if (folderFilter === "uncategorized") {
      return codes.filter((code) => !code.folder_id);
    }
    return codes.filter((code) => code.folder_id === folderFilter);
  }, [codes, folderFilter]);

  const selectedCodes = codes.filter((code) => selectedIds.includes(code.id));
  const allVisibleSelected =
    visibleCodes.length > 0 && visibleCodes.every((code) => selectedIds.includes(code.id));

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function toggleVisible() {
    setSelectedIds((current) => {
      const visibleIds = visibleCodes.map((code) => code.id);
      if (visibleIds.every((id) => current.includes(id))) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleIds]));
    });
  }

  async function downloadSelected() {
    setDownloading(true);
    setMessage(null);

    try {
      for (const code of selectedCodes) {
        const dataUrl = await QRCode.toDataURL(code.redirect_url, {
          margin: 1,
          width: 1024,
          errorCorrectionLevel: "M",
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });

        const anchor = document.createElement("a");
        anchor.href = dataUrl;
        anchor.download = `${fileSafe(code.folder_name ?? "uncategorized")}-${fileSafe(code.slug)}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        await wait(150);
      }
      setMessage(`Downloaded ${selectedCodes.length} QR code${selectedCodes.length === 1 ? "" : "s"}.`);
    } catch {
      setMessage("Could not generate one of the selected QR downloads.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <div className="space-y-3 border-b border-neutral-200 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold">All QR codes</h2>
            <p className="text-xs text-neutral-500">
              Select one or more rows to download QR PNGs together.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">
              {selectedIds.length} selected
            </span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={selectedCodes.length === 0 || downloading}
              onClick={downloadSelected}
            >
              {downloading ? "Preparing..." : "Download selected"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClassName({
              variant: folderFilter === "all" ? "primary" : "secondary",
              size: "sm",
            })}
            onClick={() => setFolderFilter("all")}
          >
            All
          </button>
          <button
            type="button"
            className={buttonClassName({
              variant: folderFilter === "uncategorized" ? "primary" : "secondary",
              size: "sm",
            })}
            onClick={() => setFolderFilter("uncategorized")}
          >
            Uncategorized
          </button>
          {folders.map((folder) => (
            <button
              type="button"
              key={folder.id}
              className={buttonClassName({
                variant: folderFilter === folder.id ? "primary" : "secondary",
                size: "sm",
              })}
              onClick={() => setFolderFilter(folder.id)}
            >
              {folder.name}
            </button>
          ))}
        </div>

        {message ? <p className="text-xs text-neutral-500">{message}</p> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="w-12 px-5 py-2.5 font-medium">
                <input
                  type="checkbox"
                  aria-label="Select visible QR codes"
                  checked={allVisibleSelected}
                  disabled={visibleCodes.length === 0}
                  onChange={toggleVisible}
                  className="h-4 w-4 rounded border-neutral-300"
                />
              </th>
              <th className="px-5 py-2.5 font-medium">Name</th>
              <th className="px-5 py-2.5 font-medium">Folder</th>
              <th className="px-5 py-2.5 font-medium">Slug</th>
              <th className="px-5 py-2.5 font-medium">Destination</th>
              <th className="px-5 py-2.5 font-medium">Status</th>
              <th className="px-5 py-2.5 font-medium text-right">Scans</th>
              <th className="px-5 py-2.5 font-medium text-right">Last scan</th>
            </tr>
          </thead>
          <tbody>
            {visibleCodes.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-neutral-500">
                  {codes.length === 0 ? (
                    <>
                      No QR codes yet.{" "}
                      <Link href="/qr/new" className="underline">
                        Create one.
                      </Link>
                    </>
                  ) : (
                    "No QR codes in this folder."
                  )}
                </td>
              </tr>
            ) : (
              visibleCodes.map((code) => (
                <tr
                  key={code.id}
                  className="border-t border-neutral-100 hover:bg-neutral-50"
                >
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${code.name}`}
                      checked={selectedIds.includes(code.id)}
                      onChange={() => toggleSelected(code.id)}
                      className="h-4 w-4 rounded border-neutral-300"
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/qr/${code.id}`} className="font-medium hover:underline">
                      {code.name}
                    </Link>
                    {code.campaign ? (
                      <div className="text-xs text-neutral-500">{code.campaign}</div>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-neutral-700">
                    {code.folder_name ?? "Uncategorized"}
                  </td>
                  <td className="px-5 py-3 font-mono text-xs text-neutral-700">
                    {code.slug}
                  </td>
                  <td className="px-5 py-3">
                    <span className="block max-w-[280px] truncate text-neutral-700">
                      {code.destination_url}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {code.is_active ? (
                      <Badge tone="green">Active</Badge>
                    ) : (
                      <Badge tone="red">Disabled</Badge>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {code.total_scans}
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-600">
                    {formatRelative(code.last_scan_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
