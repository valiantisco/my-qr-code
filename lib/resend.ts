import "server-only";

import { Resend } from "resend";
import { getReportEnv } from "@/lib/env";

let client: Resend | null = null;
export function resend(): Resend {
  if (!client) client = new Resend(getReportEnv().resendApiKey);
  return client;
}
