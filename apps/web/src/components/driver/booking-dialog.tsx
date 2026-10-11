"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import {
  bookingFormSchema,
  icsFile,
  slots,
  toRange,
  type BookingForm,
} from "@/lib/booking";
import { inr } from "@/lib/format";
import type { LiveCharger } from "@/lib/live";

const fieldCls =
  "h-10 w-full rounded-lg border border-[#DADCE0] bg-white px-3 text-sm outline-none focus:border-[#1A73E8] focus:ring-2 focus:ring-[#1A73E8]/20 transition";

export function BookingDialog({
  open,
  onOpenChange,
  station,
  defaultPhone,
  vehicleLabel,
  vehicleConnectors = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  station: {
    id: string;
    name: string;
    address?: string | null;
    pricePerKwh: number;
    chargers: LiveCharger[];
  };
  defaultPhone?: string;
  vehicleLabel?: string;
  vehicleConnectors?: string[];
}) {
  const qc = useQueryClient();
  const [done, setDone] = useState<{
    id: string;
    startTs: string;
    endTs: string;
    chargerLabel: string;
  } | null>(null);

  const compatible = useMemo(
    () =>
      station.chargers.filter(
        (c) =>
          (c.status === "FREE" || c.status === "BUSY") &&
          (vehicleConnectors.length === 0 ||
            vehicleConnectors.some(
              (vc) => vc.toLowerCase() === c.connectorType.toLowerCase()
            ))
      ),
    [station.chargers, vehicleConnectors]
  );

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      chargerId: compatible[0]?.id ?? "",
      date: "today",
      durationMin: 45,
      phone: defaultPhone ?? "",
      start: "",
    },
  });

  const date = watch("date");
  const dur = Number(watch("durationMin") || 45);
  const chargerId = watch("chargerId");
  const kw = compatible.find((c) => c.id === chargerId)?.powerKw ?? 0;
  const estimate = kw * 0.7 * (dur / 60) * station.pricePerKwh; // 0.7 = average power factor

  const m = useMutation<{ b: { id: string }; f: BookingForm }, unknown, BookingForm>({
    mutationFn: async (f: BookingForm) => {
      const b = await api.post<{ id: string }>("/api/bookings", {
        stationId: station.id,
        chargerId: f.chargerId,
        ...toRange(f),
      });
      return { b, f };
    },
    onSuccess: ({ b, f }) => {
      const r = toRange(f);
      setDone({
        id: b.id,
        ...r,
        chargerLabel: compatible.find((c) => c.id === f.chargerId)?.label ?? "Charger",
      });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const serverError =
    m.error instanceof ApiError
      ? m.error.status === 409
        ? "That charger is already booked at this time. Pick another time or charger."
        : m.error.message
      : m.error
      ? "Something went wrong. Try again."
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white border border-[#DADCE0] text-[#202124]">
        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle weight="fill" size={56} className="text-[#1E8E3E]" />
            <DialogTitle className="text-xl font-bold">Booking confirmed</DialogTitle>
            <DialogDescription className="text-sm text-[#5F6368]">
              {station.name} · {done.chargerLabel}
              <br />
              {new Date(done.startTs).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </DialogDescription>
            <p className="font-mono text-xs text-[#5F6368] bg-[#F8F9FA] px-3 py-1 rounded-full border border-[#DADCE0]">
              Booking ID {done.id}
            </p>
            <div className="flex w-full gap-2 mt-3">
              <Button
                variant="outline"
                className="flex-1 border-[#DADCE0]"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(
                    icsFile(
                      `Charging at ${station.name}`,
                      station.address ?? station.name,
                      done.startTs,
                      done.endTs
                    )
                  );
                  a.download = "evspark-booking.ics";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                Add to calendar
              </Button>
              <Button
                className="flex-1 bg-[#1A73E8] hover:bg-blue-600 text-white"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit((f) => m.mutate(f))} className="space-y-3.5" noValidate>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Book a charger</DialogTitle>
              <DialogDescription className="text-sm text-[#5F6368]">
                {station.name}
              </DialogDescription>
            </DialogHeader>

            {vehicleLabel && (
              <p className="rounded-lg bg-[#F8F9FA] border border-[#DADCE0] px-3 py-2 text-xs text-[#5F6368]">
                Vehicle: <b className="text-[#202124]">{vehicleLabel}</b>
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1">
                Charger
              </label>
              <select className={fieldCls} {...register("chargerId")}>
                {compatible.length === 0 && (
                  <option value="">No compatible charger</option>
                )}
                {compatible.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label ?? "Charger"} · {c.connectorType} · {c.powerKw} kW
                  </option>
                ))}
              </select>
              {errors.chargerId && (
                <span className="text-xs text-[#D93025] mt-1 block">
                  {errors.chargerId.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1">
                  Date
                </label>
                <select className={fieldCls} {...register("date")}>
                  <option value="today">Today</option>
                  <option value="tomorrow">Tomorrow</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1">
                  Start time
                </label>
                <select className={fieldCls} {...register("start")}>
                  <option value="">Select time</option>
                  {slots(date).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {errors.start && (
                  <span className="text-xs text-[#D93025] mt-1 block">
                    {errors.start.message}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1">
                Duration
              </label>
              <select className={fieldCls} {...register("durationMin", { valueAsNumber: true })}>
                {[30, 45, 60, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1">
                Mobile number
              </label>
              <input
                className={fieldCls}
                inputMode="numeric"
                maxLength={10}
                placeholder="9876543210"
                {...register("phone")}
              />
              {errors.phone && (
                <span className="text-xs text-[#D93025] mt-1 block">
                  {errors.phone.message}
                </span>
              )}
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#DADCE0] flex items-center justify-between">
              <span className="text-xs text-[#5F6368]">Estimated cost</span>
              <span className="text-sm font-bold text-[#202124] font-mono">
                {inr(estimate)}{" "}
                <span className="text-[11px] font-normal text-[#5F6368]">(estimate)</span>
              </span>
            </div>

            {serverError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-[#D93025]"
              >
                {serverError}
              </p>
            )}

            <Button
              type="submit"
              className="w-full bg-[#1A73E8] hover:bg-blue-600 text-white font-medium py-2 rounded-xl transition cursor-pointer"
              disabled={m.isPending || compatible.length === 0}
            >
              {m.isPending ? "Booking…" : "Confirm booking"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
