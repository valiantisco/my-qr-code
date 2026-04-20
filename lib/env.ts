function requireValue(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeSiteUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL must be a valid URL: ${value}`);
  }
}

export const publicEnv = {
  siteUrl: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  supabaseUrl: requireValue(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: requireValue(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
};

export function getServiceRoleKey(): string {
  return requireValue("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getReportEnv() {
  return {
    resendApiKey: requireValue("RESEND_API_KEY", process.env.RESEND_API_KEY),
    fromEmail: requireValue("REPORT_FROM_EMAIL", process.env.REPORT_FROM_EMAIL),
    toEmail: requireValue("REPORT_TO_EMAIL", process.env.REPORT_TO_EMAIL),
  };
}

export function getCronSecret(): string | null {
  return process.env.CRON_SECRET || null;
}
