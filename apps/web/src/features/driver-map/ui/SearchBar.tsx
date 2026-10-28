"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MagnifyingGlass, X, MapPin, Lightning } from "@phosphor-icons/react";
import { usePinStore } from "../stores/pin-store";
import { useMapUiStore } from "../stores/map-ui-store";
import { useMap } from "@vis.gl/react-google-maps";

interface Suggestion {
  id: string;
  type: "station" | "place";
  title: string;
  subtitle: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

export function SearchBar() {
  const map = useMap();
  const pins = usePinStore((s) => s.pins);
  const setSelectedId = useMapUiStore((s) => s.setSelectedId);

  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const placesServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesLibraryLoadedRef = useRef(false);

  // Lazy load Google Places library only when user focuses the search box
  const handleFocus = useCallback(async () => {
    setIsOpen(true);
    if (!placesLibraryLoadedRef.current && typeof window !== "undefined" && (window as any).google?.maps?.importLibrary) {
      try {
        await google.maps.importLibrary("places");
        placesLibraryLoadedRef.current = true;
        placesServiceRef.current = new google.maps.places.AutocompleteService();
      } catch (err) {
        console.warn("Could not load Google Places library:", err);
      }
    }
  }, []);

  // Update suggestions on query input
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      return;
    }

    const results: Suggestion[] = [];

    // 1. Local Pin Store search (instant, no network)
    pins.forEach((pin) => {
      if (pin.id.toLowerCase().includes(q)) {
        results.push({
          id: pin.id,
          type: "station",
          title: `EV Charging Station`,
          subtitle: `${pin.free}/${pin.total} available · ${pin.maxKw}kW`,
          lat: pin.lat,
          lng: pin.lng,
        });
      }
    });

    // 2. Google Places Autocomplete if library is loaded
    if (placesServiceRef.current && q.length >= 2) {
      placesServiceRef.current.getPlacePredictions(
        {
          input: q,
          componentRestrictions: { country: "in" },
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            const placeItems: Suggestion[] = predictions.slice(0, 4).map((p) => ({
              id: p.place_id,
              type: "place",
              title: p.structured_formatting.main_text,
              subtitle: p.structured_formatting.secondary_text || "",
              placeId: p.place_id,
            }));
            setSuggestions([...results.slice(0, 3), ...placeItems]);
          } else {
            setSuggestions(results.slice(0, 5));
          }
        }
      );
    } else {
      setSuggestions(results.slice(0, 5));
    }
  }, [query, pins]);

  const handleSelect = (item: Suggestion) => {
    setIsOpen(false);
    setQuery(item.title);

    if (item.type === "station" && item.lat && item.lng) {
      map?.panTo({ lat: item.lat, lng: item.lng });
      map?.setZoom(16);
      setSelectedId(item.id);
    } else if (item.placeId && map) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ placeId: item.placeId }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results?.[0]?.geometry?.location) {
          const loc = results[0].geometry.location;
          map.panTo({ lat: loc.lat(), lng: loc.lng() });
          map.setZoom(14);
        }
      });
    }
  };

  return (
    <div className="relative w-full max-w-[360px] pointer-events-auto">
      {/* Search Bar Input (Google Elevation 2) */}
      <div className="flex items-center h-12 w-full px-4 rounded-full bg-white border border-[#DADCE0] shadow-[0_2px_6px_rgba(60,64,67,0.15)] text-[#202124] transition-shadow focus-within:shadow-[0_2px_8px_rgba(60,64,67,0.25)]">
        <MagnifyingGlass size={20} className="text-[#5F6368] shrink-0 mr-3" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Search chargers, cities, addresses..."
          className="w-full h-full bg-transparent border-none outline-none text-[14px] font-medium text-[#202124] placeholder:text-[#5F6368]"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
            }}
            className="p-1 rounded-full text-[#5F6368] hover:bg-[#F1F3F4] transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-14 left-0 right-0 bg-white rounded-2xl border border-[#DADCE0] shadow-xl overflow-hidden z-50 divide-y divide-[#DADCE0]">
          {suggestions.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#F8F9FA] transition-colors"
            >
              <div className="p-2 rounded-full bg-[#F1F3F4] text-[#5F6368] shrink-0">
                {item.type === "station" ? (
                  <Lightning size={16} weight="fill" className="text-[#1E8E3E]" />
                ) : (
                  <MapPin size={16} weight="fill" className="text-[#1A73E8]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#202124] truncate">{item.title}</p>
                <p className="text-[11px] text-[#5F6368] truncate">{item.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
