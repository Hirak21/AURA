import { z } from "zod";

/**
 * Shared validation schemas.
 *
 * These live OUTSIDE "use server" modules on purpose: a "use server" file may
 * only export async functions, so exporting a zod schema from an actions file
 * is a runtime error ("A 'use server' file can only export async functions").
 * Client forms and server actions both import from here, so the rules are
 * literally the same object on both sides.
 */

export const publicRequestSchema = z.object({
  schoolName: z.string().min(2, "Enter the school name.").max(140),
  location: z.string().min(2, "Enter the city or district.").max(140),
  contactName: z.string().min(2, "Enter a contact name.").max(120),
  contactEmail: z.string().email("Enter a valid email address."),
  activityType: z.string().min(2, "Describe the activity.").max(140),
  gradeRange: z.string().min(1, "Specify the grade range.").max(60),
  expectedParticipants: z.number().int().min(1, "At least one participant.").max(500),
  preferredDates: z.string().min(2, "Give an approximate date range.").max(140),
  facilities: z.string().max(300).default(""),
  message: z.string().max(1000).default(""),
});

export type PublicRequestInput = z.infer<typeof publicRequestSchema>;

export const projectDraftSchema = z.object({
  projectId: z.string().optional(),
  challengeId: z.string().min(1),
  title: z.string().min(3, "Title must be at least 3 characters.").max(120),
  draft: z.string().min(20, "Write at least a short explanation (20+ characters).").max(4000),
  evidenceUrl: z.union([z.string().url("Enter a valid URL or leave blank."), z.literal("")]).optional(),
  submit: z.boolean().default(false),
  consentToShowcase: z.boolean().default(false),
});

/**
 * Parse with a readable, human-facing error message.
 * Raw zod JSON never reaches the UI — it arrives as one plain sentence.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const issues = result.error.issues
    .map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message))
    .slice(0, 3);
  throw new Error(issues.join(" · "));
}
