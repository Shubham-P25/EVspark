"use client";
import { useCallback, useEffect, useReducer, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "@clerk/nextjs";
import { API_URL, useApi } from "@/lib/api";
import type { ActivityDTO, ChargerDTO, SessionDTO, StationSnapshot, StatsDTO } from "./types";

type Action =
  | { t: "snapshot"; snap: StationSnapshot } | { t: "session"; s: SessionDTO } | { t: "charger"; c: ChargerDTO }
  | { t: "stats"; stats: StatsDTO } | { t: "activity"; a: ActivityDTO };

function reducer(state: StationSnapshot | null, a: Action): StationSnapshot | null {
  if (a.t === "snapshot") return a.snap;
  if (!state) return state;
  switch (a.t) {
    case "session": {
      const has = state.sessions.some((x) => x.id === a.s.id);
      return { ...state, sessions: has ? state.sessions.map((x) => (x.id === a.s.id ? a.s : x)) : [a.s, ...state.sessions] };
    }
    case "charger": return { ...state, chargers: state.chargers.map((c) => (c.id === a.c.id ? a.c : c)) };
    case "stats": return { ...state, stats: a.stats };
    case "activity": return { ...state, activity: [a.a, ...state.activity.filter((x) => x.id !== a.a.id)].slice(0, 40) };
  }
}

export function useStationLive() {
  const api = useApi();
  const { getToken, isSignedIn } = useAuth();
  const [snap, dispatch] = useReducer(reducer, null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api<StationSnapshot>("/api/operator/station");
      setOffset(Date.parse(s.serverTime) - Date.now());
      dispatch({ t: "snapshot", snap: s });
      setError(null);
    } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { if (isSignedIn) void load(); }, [isSignedIn, load]);
  useEffect(() => { const id = setInterval(() => void load(), 20000); return () => clearInterval(id); }, [load]);

  useEffect(() => {
    if (!isSignedIn) return;
    const sock = io(`${API_URL}/operator`, {
      transports: ["websocket"],
      auth: (cb) => { void getToken().then((token) => cb({ token })); }, // fresh Clerk token on every (re)connect
    });
    sock.on("connect", () => setLive(true));
    sock.on("disconnect", () => setLive(false));
    sock.on("session:upsert", (s: SessionDTO) => dispatch({ t: "session", s }));
    sock.on("charger:upsert", (c: ChargerDTO) => dispatch({ t: "charger", c }));
    sock.on("stats:update", (stats: StatsDTO) => dispatch({ t: "stats", stats }));
    sock.on("activity:new", (a: ActivityDTO) => dispatch({ t: "activity", a }));
    sock.on("snapshot:invalidate", () => void load());
    return () => { sock.disconnect(); };
  }, [isSignedIn, getToken, load]);

  return { snap, loading, error, offset, live, reload: load };
}