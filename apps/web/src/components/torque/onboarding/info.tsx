import { Bell, ChartLineUp, Clock, CurrencyInr, Heart, Lightning, ListChecks, MapPinLine, PlugsConnected, ShieldCheck, Star, Wrench } from "@phosphor-icons/react";
import type { ReactNode } from "react";
export type InfoBlock = { icon: ReactNode; title: string; body: string; step: 0 | 1 | 2 };
export const INFO: Record<"DRIVER" | "OPERATOR", InfoBlock[]> = {
  DRIVER: [
    { step: 0, icon: <Clock size={20} />, title: "Live wait times", body: "See how long a station will really take — based on who is charging and who is queued right now." },
    { step: 0, icon: <MapPinLine size={20} />, title: "Queue-aware geofence", body: "When you arrive at a station you join its queue automatically. No app tapping in a car park." },
    { step: 1, icon: <PlugsConnected size={20} />, title: "Plug-matched stations", body: "We show chargers that fit your connector and your car's max charging speed." },
    { step: 1, icon: <Lightning size={20} />, title: "Smart ETA", body: "Distance, drive time and predicted wait combined into one arrival estimate." },
    { step: 2, icon: <CurrencyInr size={20} />, title: "Price you control", body: "Set a ₹/kWh ceiling and we flag stations that stay under it." },
    { step: 2, icon: <Heart size={20} />, title: "Favourites & alerts", body: "Save home and office stations and get pinged the moment a bay frees up." },
    { step: 2, icon: <Star size={20} />, title: "Honest reviews", body: "Reviews from drivers who actually charged there, not anonymous drive-bys." },
  ],
  OPERATOR: [
    { step: 0, icon: <ShieldCheck size={20} />, title: "Only your data", body: "You see your stations and nothing else. Every query is scoped to your account." },
    { step: 0, icon: <ChartLineUp size={20} />, title: "Revenue ticker", body: "Revenue and energy delivered tick up live as every vehicle charges." },
    { step: 1, icon: <MapPinLine size={20} />, title: "Be found on the map", body: "Your pin, hours and amenities show to nearby drivers the moment you finish setup." },
    { step: 1, icon: <ListChecks size={20} />, title: "Queue kanban", body: "Waiting → Charging → Done lanes with one-tap step buttons and Undo." },
    { step: 2, icon: <PlugsConnected size={20} />, title: "Live charger bays", body: "Animated bays fill to 100% while charging and show ETA and ₹ per session." },
    { step: 2, icon: <CurrencyInr size={20} />, title: "Your pricing", body: "Set ₹/kWh per charger type and change it any time from the panel." },
    { step: 2, icon: <Wrench size={20} />, title: "Maintenance mode", body: "Take a bay out of service in one click; drivers stop being routed to it." },
  ],
};

