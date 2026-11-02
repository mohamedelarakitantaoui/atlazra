import { z } from 'zod';
import { t } from '../../i18n/content';
import { locales, type Locale } from '../../i18n/routing';
export const projectTypes = ['villa', 'riad', 'terrasse', 'pro', '3d'] as const;
export const fields = [
  'name',
  'phone',
  'email',
  'project_type',
  'surface_m2',
  'city',
  'message',
  'locale',
] as const;
export type ContactField = (typeof fields)[number];
export type ContactErrors = Record<string, string>;
/** Moroccan national mobile/fixed numbers; formatting is removed, never guessed. */
export function normalizePhone(input: string): string | undefined {
  if (input.length < 6 || input.length > 30 || !/^[+0-9 ()\-.]+$/.test(input))
    return undefined;
  let number = input.replace(/[ ()\-.]/g, '');
  if (/^0[567]\d{8}$/.test(number)) number = '+212' + number.slice(1);
  else if (number.startsWith('00212')) number = '+' + number.slice(2);
  return /^\+212[567]\d{8}$/.test(number) ? number : undefined;
}
export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .refine((value) => !/[\r\n]/.test(value)),
  phone: z
    .string()
    .trim()
    .min(6)
    .max(30)
    .transform((value, context) => {
      const normalized = normalizePhone(value);
      if (!normalized) {
        context.addIssue({ code: z.ZodIssueCode.custom });
        return z.NEVER;
      }
      return normalized;
    }),
  email: z
    .union([z.string().trim().max(254).email(), z.literal('')])
    .optional()
    .transform((value) => value || undefined),
  project_type: z.enum(projectTypes),
  surface_m2: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z
      .union([
        z
          .string()
          .trim()
          .regex(/^\d+(?:[.,]\d+)?$/)
          .transform((value) => Number(value.replace(',', '.'))),
        z.number(),
      ])
      .pipe(z.number().finite().positive())
      .optional(),
  ),
  city: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((value) => value || undefined),
  message: z.string().trim().min(4).max(4000),
  locale: z.enum(locales),
});
export type Contact = z.infer<typeof contactSchema>;
export function fieldErrors(error: z.ZodError, locale: Locale): ContactErrors {
  return Object.fromEntries(
    error.issues.map((issue) => {
      const field = fields.find((field) => field === issue.path[0]);
      return [
        field ?? 'form',
        t(locale, `contact.form.errors.${field ?? 'form'}`),
      ];
    }),
  );
}
