"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

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

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    QRCode.toDataURL(url, {
      margin: 1,
      width: size,
      errorCorrectionLevel: "M",
      color: { dark: "#0a0a0a", light: "#ffffff" },
    })
      .then((v) => {
        if (!cancelled) setDataUrl(v);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

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
      {dataUrl ? (
        <a
          href={dataUrl}
          download="qr.png"
          className="mt-2 inline-block text-xs text-neutral-600 underline hover:text-neutral-900"
        >
          Download PNG
        </a>
      ) : null}
    </div>
  );
}
