"use client";

import QRCode from "qrcode";

export type QrDownloadFormat = "png" | "svg";

export type QrDownloadOptions = {
  format: QrDownloadFormat;
  darkColor: string;
  lightColor: string;
};

export const defaultQrDownloadOptions: QrDownloadOptions = {
  format: "png",
  darkColor: "#0a0a0a",
  lightColor: "#ffffff",
};

export function fileSafe(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "qr-code";
}

export async function createQrPreviewDataUrl({
  url,
  size,
  darkColor,
  lightColor,
}: {
  url: string;
  size: number;
  darkColor: string;
  lightColor: string;
}) {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: size,
    errorCorrectionLevel: "M",
    color: { dark: darkColor, light: lightColor },
  });
}

export async function downloadQrCode({
  url,
  filename,
  options,
}: {
  url: string;
  filename: string;
  options: QrDownloadOptions;
}) {
  const safeName = fileSafe(filename);
  const anchor = document.createElement("a");

  if (options.format === "svg") {
    const svg = await QRCode.toString(url, {
      type: "svg",
      margin: 1,
      width: 1024,
      errorCorrectionLevel: "M",
      color: { dark: options.darkColor, light: options.lightColor },
    });
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    anchor.href = blobUrl;
    anchor.download = `${safeName}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
    return;
  }

  anchor.href = await QRCode.toDataURL(url, {
    margin: 1,
    width: 1024,
    errorCorrectionLevel: "M",
    color: { dark: options.darkColor, light: options.lightColor },
  });
  anchor.download = `${safeName}.png`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
