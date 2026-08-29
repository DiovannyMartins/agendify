import { z } from "zod";

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

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  priceCents: z.number().int().min(0),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

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
