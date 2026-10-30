'use client';

import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import type { DemoCar, AlertItem, Station } from '../types';

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socketInstance = io(socketUrl, {
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });
  }
  return socketInstance;
}

const DEFAULT_CARS: DemoCar[] = [
  { id: 'car-1', lat: 19.068, lng: 72.865, heading: 45, targetStationId: 'st-bandra-hub', mode: 'driving' },
  { id: 'car-2', lat: 19.012, lng: 72.82, heading: 180, targetStationId: null, mode: 'driving' },
  { id: 'car-3', lat: 19.115, lng: 72.839, heading: 90, targetStationId: 'st-andheri-metro', mode: 'driving' },
];

export function useLiveStatus(bounds: google.maps.LatLngBoundsLiteral | null) {
  const queryClient = useQueryClient();
  const [connection, setConnection] = useState<'live' | 'reconnecting' | 'offline'>('live');
  const [cars, setCars] = useState<DemoCar[]>(DEFAULT_CARS);
  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'al-init-1',
      type: 'charger_freed',
      stationId: 'st-bandra-hub',
      title: 'A charger is free',
      body: 'Jio World Drive EV Hub now has 4 free chargers.',
      at: new Date().toISOString(),
    },
  ]);
  const [updatedAgoSec, setUpdatedAgoSec] = useState(2);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setConnection('live');
    const onDisconnect = () => setConnection('offline');
    const onReconnectAttempt = () => setConnection('reconnecting');

    const onStationUpdate = (update: Partial<Station> & { id: string }) => {
      setUpdatedAgoSec(0);
      queryClient.setQueriesData<Station[]>({ queryKey: ['stations'] }, (old) => {
        if (!old) return old;
        return old.map((s) => (s.id === update.id ? { ...s, ...update } : s));
      });
    };

    const onCarsUpdate = (newCars: DemoCar[]) => {
      if (Array.isArray(newCars) && newCars.length > 0) {
        setCars(newCars);
      }
    };

    const onAlert = (newAlert: AlertItem) => {
      setAlerts((prev) => [newAlert, ...prev.slice(0, 2)]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('station:update', onStationUpdate);
    socket.on('cars:update', onCarsUpdate);
    socket.on('alert', onAlert);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('station:update', onStationUpdate);
      socket.off('cars:update', onCarsUpdate);
      socket.off('alert', onAlert);
    };
  }, [queryClient]);

  // Subscribe to visible bounding box area with 500ms debounce
  useEffect(() => {
    if (!bounds) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(() => {
      const socket = getSocket();
      if (socket.connected) {
        socket.emit('area:subscribe', {
          bbox: [bounds.west, bounds.south, bounds.east, bounds.north],
        });
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [bounds]);

  return { connection, cars, alerts, updatedAgoSec };
}

