import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Informe seu nome."),
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres."),
});
export type SignupInput = z.infer<typeof signupSchema>;

export const businessSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido: apenas letras minúsculas, números e hífen."),
  phone: z.string().trim().min(8).max(20),
  timezone: z.string().min(1),
  slotIntervalMinutes: z.union([z.literal(15), z.literal(30), z.literal(60)], { error: "Intervalo deve ser 15, 30 ou 60." }),
  minNoticeMinutes: z.number().int().min(0).max(10080),
  bookingWindowDays: z.number().int().min(1).max(180),
  description: z.string().trim().max(500).optional(),
});
export type BusinessInput = z.infer<typeof businessSchema>;

// Client-side form schema for the business setup form (React Hook Form).
// Mirrors businessSchema but with string-typed fields to match native inputs.
export const businessFormSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido: apenas letras minúsculas, números e hífen."),
  phone: z.string().trim().min(8).max(20),
  timezone: z.string().min(1),
  slotIntervalMinutes: z.string().regex(/^(15|30|60)$/, "Intervalo deve ser 15, 30 ou 60."),
  minNoticeMinutes: z.number().int().min(0).max(10080),
  bookingWindowDays: z.number().int().min(1).max(180),
  description: z.string().trim().max(500).optional(),
});
export type BusinessFormValues = z.infer<typeof businessFormSchema>;

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

// Client-side form schema for services (React Hook Form). priceCents is entered
// in reais (e.g. "49.90") and converted to cents in the server action.
export const serviceFormSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Informe um preço válido."),
});
export type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export const availabilitySchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});
export type AvailabilityInput = z.infer<typeof availabilitySchema>;

export const blockSchema = z.object({
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().trim().max(120).optional(),
});
export type BlockInput = z.infer<typeof blockSchema>;

export const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  startAt: z.string().datetime(),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().min(8).max(20),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  customerNote: z.string().trim().max(500).optional(),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const bookingStatusSchema = z.enum(["confirmed", "completed", "cancelled", "no_show"]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;
