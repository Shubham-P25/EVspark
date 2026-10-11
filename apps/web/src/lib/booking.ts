import { z } from "zod";

export const bookingFormSchema = z.object({
  chargerId: z.string().min(1, "Choose a charger"),
  date: z.enum(["today", "tomorrow"]),
  start: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time"),
  durationMin: z.number().refine((n) => [30, 45, 60, 90].includes(n), "Choose a duration"),
  phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
});

export type BookingForm = z.infer<typeof bookingFormSchema>;

export function slots(date: "today" | "tomorrow", nowMs = Date.now()): string[] {
  const out: string[] = [];
  const base = new Date(nowMs);
  const start = new Date(base);
  if (date === "tomorrow") {
    start.setDate(start.getDate() + 1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setMinutes(Math.ceil((base.getMinutes() + 15) / 15) * 15, 0, 0);
  }
  const end = new Date(start);
  end.setHours(23, 45, 0, 0);
  for (let t = new Date(start); t <= end; t = new Date(t.getTime() + 15 * 60_000)) {
    out.push(`${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`);
  }
  return out;
}

export function toRange(f: BookingForm, nowMs = Date.now()) {
  const d = new Date(nowMs);
  if (f.date === "tomorrow") d.setDate(d.getDate() + 1);
  const [h, m] = f.start.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return {
    startTs: d.toISOString(),
    endTs: new Date(d.getTime() + f.durationMin * 60_000).toISOString(),
  };
}

export function icsFile(title: string, location: string, startIso: string, endIso: string) {
  const f = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EVspark//EN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@evspark`,
    `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(startIso)}`,
    `DTEND:${f(endIso)}`,
    `SUMMARY:${title}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Blob([body], { type: "text/calendar" });
}
