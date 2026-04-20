"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import {
  createQrPreviewDataUrl,
  defaultQrDownloadOptions,
  downloadQrCode,
  type QrDownloadFormat,
} from "@/components/qr-download";

export function QrPreview({
  url,
  size = 240,
  className,
}: {
  url: string;
  size?: number;
  className?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<QrDownloadFormat>(
    defaultQrDownloadOptions.format,
  );
  const [darkColor, setDarkColor] = useState(defaultQrDownloadOptions.darkColor);
  const [lightColor, setLightColor] = useState(defaultQrDownloadOptions.lightColor);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    createQrPreviewDataUrl({ url, size, darkColor, lightColor })
      .then((v) => {
        if (!cancelled) setDataUrl(v);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size, darkColor, lightColor]);

  async function onDownload() {
    setDownloading(true);
    setError(null);
    try {
      await downloadQrCode({
        url,
        filename: "qr",
        options: { format, darkColor, lightColor },
      });
    } catch {
      setError("Could not generate download.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={className}>
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="QR preview"
          width={size}
          height={size}
          className="rounded-md border border-neutral-200 bg-white p-2"
        />
      ) : (
        <div
          className="animate-pulse rounded-md border border-neutral-200 bg-neutral-100"
          style={{ width: size, height: size }}
        />
      )}
      <div className="mt-3 w-full space-y-3">
        <div className="grid grid-cols-2 gap-2 text-left">
          <label className="space-y-1 text-xs text-neutral-600">
            <span>Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as QrDownloadFormat)}
              className="h-9 w-full rounded-md border border-neutral-200 bg-white px-2 text-sm text-neutral-900"
            >
              <option value="png">PNG</option>
              <option value="svg">SVG</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-neutral-600">
              <span>QR</span>
              <input
                type="color"
                value={darkColor}
                onChange={(e) => setDarkColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-md border border-neutral-200 bg-white p-1"
              />
            </label>
            <label className="space-y-1 text-xs text-neutral-600">
              <span>Base</span>
              <input
                type="color"
                value={lightColor}
                onChange={(e) => setLightColor(e.target.value)}
                className="h-9 w-full cursor-pointer rounded-md border border-neutral-200 bg-white p-1"
              />
            </label>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!dataUrl || downloading}
          onClick={onDownload}
          className="w-full"
        >
          {downloading ? "Preparing..." : `Download ${format.toUpperCase()}`}
        </Button>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
