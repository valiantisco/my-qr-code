import { z } from "zod";
import { SLUG_REGEX } from "@/lib/slug";
import { normalizeDestinationUrl, parseHttpUrl } from "@/lib/url";

const destinationUrlSchema = z
  .string()
  .trim()
  .min(1, "Destination URL is required")
  .transform((value, ctx) => {
    const normalized = normalizeDestinationUrl(value);
    const url = parseHttpUrl(normalized);
    if (!url) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use a valid http or https URL",
      });
      return z.NEVER;
    }
    return url.toString();
  });

export const qrCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  destination_url: destinationUrlSchema,
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_REGEX, "Use lowercase letters, numbers, and single dashes only")
    .min(3)
    .max(64)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  campaign: z.string().trim().max(120).optional().or(z.literal("").transform(() => undefined)),
  notes: z.string().trim().max(2000).optional().or(z.literal("").transform(() => undefined)),
  folder_name: z.string().trim().max(80, "Folder name must be 80 characters or less").optional(),
  is_active: z.boolean().optional(),
});

export const qrUpdateSchema = qrCreateSchema.partial();

export type QrCreateInput = z.infer<typeof qrCreateSchema>;
export type QrUpdateInput = z.infer<typeof qrUpdateSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export function firstValidationMessage(error: z.ZodError): string {
  const flattened = error.flatten();
  const fieldMessage = Object.values(flattened.fieldErrors).flat().find(Boolean);
  return fieldMessage ?? flattened.formErrors[0] ?? "Invalid input";
}
