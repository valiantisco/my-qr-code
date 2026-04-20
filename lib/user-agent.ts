import { UAParser } from "ua-parser-js";

export type ParsedUA = {
  device: string | null;
  browser: string | null;
  os: string | null;
};

export function parseUserAgent(ua: string | null | undefined): ParsedUA {
  if (!ua) return { device: null, browser: null, os: null };
  const parser = new UAParser(ua);
  const { device, browser, os } = parser.getResult();
  return {
    device: device.type ?? (device.model ? device.model : "desktop"),
    browser: [browser.name, browser.version].filter(Boolean).join(" ") || null,
    os: [os.name, os.version].filter(Boolean).join(" ") || null,
  };
}
