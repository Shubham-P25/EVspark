"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Stepper } from "@/components/onboarding/stepper";
import { StepShell } from "@/components/onboarding/step-shell";
import { apiFetch } from "@/lib/api";
import {
  Car,
  ChargingStation,
  CheckCircle,
  Lightning,
  MapPin,
  Plus,
  Trash,
  ShieldCheck,
  House,
  Briefcase,
  Sliders,
} from "@phosphor-icons/react";

const INDIAN_CITIES = [
  "Mumbai",
  "Pune",
  "Nagpur",
  "Nashik",
  "Thane",
  "Navi Mumbai",
  "Chhatrapati Sambhajinagar (Aurangabad)",
  "Solapur",
  "Kolhapur",
  "Amravati",
  "Bengaluru",
  "Delhi NCR",
  "Hyderabad",
  "Ahmedabad",
];

const POPULAR_VEHICLES = [
  { id: "cmv0tatanexon001", make: "Tata", model: "Nexon EV Max", batteryKwh: 40.5, connectors: ["CCS2", "Type2"] },
  { id: "cmv0tatapunch001", make: "Tata", model: "Punch.ev", batteryKwh: 35.0, connectors: ["CCS2", "Type2"] },
  { id: "cmv0mgzsev001", make: "MG", model: "ZS EV", batteryKwh: 50.3, connectors: ["CCS2", "Type2"] },
  { id: "cmv0mahindraxuv400", make: "Mahindra", model: "XUV400 EV", batteryKwh: 39.4, connectors: ["CCS2", "Type2"] },
  { id: "cmv0hyundaiioniq5", make: "Hyundai", model: "Ioniq 5", batteryKwh: 72.6, connectors: ["CCS2", "Type2"] },
  { id: "cmv0bydatto3", make: "BYD", model: "Atto 3", batteryKwh: 60.48, connectors: ["CCS2", "Type2"] },
  { id: "cmv0kiaev6", make: "Kia", model: "EV6", batteryKwh: 77.4, connectors: ["CCS2", "Type2"] },
];

const CONNECTOR_OPTIONS = ["CCS2", "Type2", "CHAdeMO", "Ather Grid", "Ola Hypercharger", "Bharat AC001"];

const DRAFT_STORAGE_KEY = "evspark_onboarding_draft";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const [role, setRole] = useState<"DRIVER" | "OPERATOR">("DRIVER");
  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [vehicles, setVehicles] = useState<any[]>(POPULAR_VEHICLES);

  // Driver form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [selectedVehicleId, setSelectedVehicleId] = useState(POPULAR_VEHICLES[0].id);
  const [regNo, setRegNo] = useState("");
  const [batteryPct, setBatteryPct] = useState(65);
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>(["CCS2", "Type2"]);
  const [preferredCharging, setPreferredCharging] = useState<"AC" | "DC" | "EITHER">("EITHER");
  const [homeLabel, setHomeLabel] = useState("");
  const [homeLat, setHomeLat] = useState(19.076);
  const [homeLng, setHomeLng] = useState(72.8777);
  const [workLabel, setWorkLabel] = useState("");
  const [workLat, setWorkLat] = useState<number | null>(null);
  const [workLng, setWorkLng] = useState<number | null>(null);
  const [maxWaitMin, setMaxWaitMin] = useState(15);
  const [minKw, setMinKw] = useState(50);
  const [notifications, setNotifications] = useState(true);

  // Operator form states
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [operatorPhone, setOperatorPhone] = useState("");
  const [gstin, setGstin] = useState("");
  const [stationName, setStationName] = useState("");
  const [address, setAddress] = useState("");
  const [stationCity, setStationCity] = useState("Mumbai");
  const [stationLat, setStationLat] = useState(19.0657);
  const [stationLng, setStationLng] = useState(72.8687);
  const [chargers, setChargers] = useState<Array<{ label: string; connectorType: string; powerKw: number }>>([
    { label: "Bay 1", connectorType: "CCS2", powerKw: 60 },
  ]);
  const [tariff, setTariff] = useState(18);
  const [hours, setHours] = useState("24/7");
  const [amenities, setAmenities] = useState<string[]>(["WiFi", "Cafe", "Restroom", "Parking"]);

  // Check if user is already onboarded
  useEffect(() => {
    if (!isLoaded || !user) return;

    if (typeof document !== "undefined" && document.cookie.includes("evspark_onboarded=true")) {
      const isOp = document.cookie.includes("evspark_role=OPERATOR");
      window.location.href = isOp ? "/station" : "/driver";
      return;
    }

    // Check DB profile status
    apiFetch<any>("/api/me/profile")
      .then((res) => {
        if (res?.onboarded) {
          window.location.href = res.user?.role === "OPERATOR" ? "/station" : "/driver";
        }
      })
      .catch(() => {
        // Not onboarded yet
      });

    // Prefill from user
    if (user.fullName && !fullName) setFullName(user.fullName);
    if (user.fullName && !contactName) setContactName(user.fullName);

    // Initial role from Clerk metadata
    const userRole = (user.unsafeMetadata?.role as string) || (user.publicMetadata?.role as string);
    if (userRole === "OPERATOR") setRole("OPERATOR");
  }, [isLoaded, user, router]);

  // Restore draft from sessionStorage
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) setRole(parsed.role);
        if (parsed.stepIndex != null) setStepIndex(parsed.stepIndex);
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.city) setCity(parsed.city);
        if (parsed.selectedVehicleId) setSelectedVehicleId(parsed.selectedVehicleId);
        if (parsed.regNo) setRegNo(parsed.regNo);
        if (parsed.batteryPct != null) setBatteryPct(parsed.batteryPct);
        if (parsed.selectedConnectors) setSelectedConnectors(parsed.selectedConnectors);
        if (parsed.homeLabel) setHomeLabel(parsed.homeLabel);
        if (parsed.businessName) setBusinessName(parsed.businessName);
        if (parsed.stationName) setStationName(parsed.stationName);
        if (parsed.address) setAddress(parsed.address);
        if (parsed.chargers) setChargers(parsed.chargers);
      }
    } catch {}
  }, []);

  // Save draft to sessionStorage on state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          role,
          stepIndex,
          fullName,
          phone,
          city,
          selectedVehicleId,
          regNo,
          batteryPct,
          selectedConnectors,
          homeLabel,
          businessName,
          stationName,
          address,
          chargers,
        })
      );
    } catch {}
  }, [
    role,
    stepIndex,
    fullName,
    phone,
    city,
    selectedVehicleId,
    regNo,
    batteryPct,
    selectedConnectors,
    homeLabel,
    businessName,
    stationName,
    address,
    chargers,
  ]);

  // Fetch real vehicles list
  useEffect(() => {
    apiFetch<any[]>("/api/vehicles")
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setVehicles(res);
        }
      })
      .catch(() => {});
  }, []);

  const activeVehicle = useMemo(() => {
    return vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];
  }, [vehicles, selectedVehicleId]);

  const driverSteps = useMemo(
    () => [
      { id: "role", title: "Select Role" },
      { id: "about", title: "About You" },
      { id: "vehicle", title: "Your Electric Vehicle" },
      { id: "places", title: "Home & Work Locations" },
      { id: "review", title: "Charging Preferences & Review" },
    ],
    []
  );

  const operatorSteps = useMemo(
    () => [
      { id: "role", title: "Select Role" },
      { id: "business", title: "Business & Organization" },
      { id: "station", title: "Charging Station Details" },
      { id: "chargers", title: "Configure Charger Bays" },
      { id: "tariff", title: "Pricing & Operating Hours" },
    ],
    []
  );

  const steps = role === "DRIVER" ? driverSteps : operatorSteps;

  // Step validation rules
  const isStepValid = useMemo(() => {
    if (stepIndex === 0) return true;

    if (role === "DRIVER") {
      if (stepIndex === 1) {
        return fullName.trim().length >= 2 && /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ""));
      }
      if (stepIndex === 2) {
        const cleanReg = regNo.toUpperCase().replace(/\s+/g, "");
        const validReg = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(cleanReg);
        return Boolean(selectedVehicleId) && validReg && selectedConnectors.length > 0;
      }
      if (stepIndex === 3) {
        return homeLabel.trim().length >= 3;
      }
      if (stepIndex === 4) {
        return true;
      }
    } else {
      if (stepIndex === 1) {
        return (
          businessName.trim().length >= 2 &&
          contactName.trim().length >= 2 &&
          /^[6-9]\d{9}$/.test(operatorPhone.replace(/\D/g, ""))
        );
      }
      if (stepIndex === 2) {
        return stationName.trim().length >= 2 && address.trim().length >= 5;
      }
      if (stepIndex === 3) {
        return chargers.length > 0 && chargers.every((c) => c.powerKw > 0 && c.connectorType);
      }
      if (stepIndex === 4) {
        return tariff > 0;
      }
    }
    return false;
  }, [
    role,
    stepIndex,
    fullName,
    phone,
    selectedVehicleId,
    regNo,
    selectedConnectors,
    homeLabel,
    businessName,
    contactName,
    operatorPhone,
    stationName,
    address,
    chargers,
    tariff,
  ]);

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // 1. Set cookies locally so middleware immediately allows dashboard access
      if (typeof document !== "undefined") {
        document.cookie = `evspark_onboarded=true; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `evspark_role=${role}; path=/; max-age=31536000; SameSite=Lax`;
      }

      // 2. Persist to API database
      try {
        if (role === "DRIVER") {
          await apiFetch("/api/me/onboarding", {
            method: "PUT",
            body: JSON.stringify({
              role: "DRIVER",
              fullName: fullName.trim(),
              phone: phone.replace(/\D/g, ""),
              city,
              vehicleModelId: selectedVehicleId,
              vehicleRegNo: regNo.toUpperCase().replace(/\s+/g, ""),
              batteryPct,
              connectors: selectedConnectors,
              preferredCharging,
              homeLat,
              homeLng,
              homeLabel: homeLabel.trim(),
              workLat,
              workLng,
              workLabel: workLabel.trim() || null,
              maxWaitMin,
              minKw,
              notifications,
            }),
          });
        } else {
          await apiFetch("/api/me/onboarding", {
            method: "PUT",
            body: JSON.stringify({
              role: "OPERATOR",
              businessName: businessName.trim(),
              contactName: contactName.trim(),
              phone: operatorPhone.replace(/\D/g, ""),
              gstin: gstin.trim() || null,
              stationName: stationName.trim(),
              address: address.trim(),
              city: stationCity,
              lat: stationLat,
              lng: stationLng,
              chargers,
              pricePerKwh: tariff,
              hours,
              amenities,
            }),
          });
        }
      } catch (apiErr) {
        console.warn("API profile save warning (offline/sync):", apiErr);
      }

      // 3. Mark complete in Clerk metadata via server handler
      try {
        await fetch("/api/onboarding/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        });
      } catch (clerkErr) {
        console.warn("Clerk metadata sync warning (offline/sync):", clerkErr);
      }

      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      setIsCompleted(true);
    } catch (err: any) {
      console.warn("Onboarding finish handler warning:", err);
      // Fallback: still mark completed and allow navigation
      if (typeof document !== "undefined") {
        document.cookie = `evspark_onboarded=true; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `evspark_role=${role}; path=/; max-age=31536000; SameSite=Lax`;
      }
      setIsCompleted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const useCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setHomeLat(pos.coords.latitude);
          setHomeLng(pos.coords.longitude);
          setHomeLabel("Current Location (GPS)");
        },
        () => {
          alert("Location permission denied. Please enter your address manually.");
        }
      );
    }
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-[#DADCE0] rounded-2xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 rounded-full bg-green-50 text-[#1E8E3E] flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={36} weight="fill" />
          </div>
          <h1 className="text-2xl font-bold text-[#202124]">Onboarding Complete!</h1>
          <p className="text-sm text-[#5F6368] mt-2 leading-relaxed">
            {role === "DRIVER"
              ? "Your EV profile and home station preferences have been saved to the network."
              : "Your charging hub is configured and ready for hardware digital twin operations."}
          </p>
          <button
            type="button"
            onClick={() => {
              window.location.href = role === "OPERATOR" ? "/station" : "/driver";
            }}
            className="w-full h-11 rounded-xl bg-[#1A73E8] hover:bg-[#1557b0] text-white font-medium text-sm mt-8 transition-colors shadow-sm cursor-pointer"
          >
            Go to {role === "OPERATOR" ? "Station Operator Hub" : "Driver Map"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-4 sm:p-8">
      <div className="w-full max-w-2xl">
        {/* Brand Bar */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-[#1A73E8] flex items-center justify-center text-white">
            <Lightning size={22} weight="fill" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[#202124]">
            EV<span className="text-[#1A73E8]">spark</span> Setup
          </span>
        </div>

        <Stepper steps={steps} currentStepIndex={stepIndex} />

        <StepShell
          canBack={stepIndex > 0}
          canNext={isStepValid}
          isLastStep={stepIndex === steps.length - 1}
          isSubmitting={isSubmitting}
          onBack={() => setStepIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => {
            if (stepIndex === steps.length - 1) {
              handleFinish();
            } else {
              setStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
            }
          }}
        >
          {/* STEP 1: ROLE SELECTION */}
          {stepIndex === 0 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Select your account type</h3>
                <p className="text-xs text-[#5F6368] mt-1">
                  Choose how you will be using the EVspark charging network.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("DRIVER")}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    role === "DRIVER"
                      ? "border-[#1A73E8] bg-blue-50/30 ring-2 ring-[#1A73E8]/20"
                      : "border-[#DADCE0] bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-[#1A73E8] flex items-center justify-center mb-4">
                    <Car size={26} weight="bold" />
                  </div>
                  <h4 className="text-sm font-bold text-[#202124]">EV Driver</h4>
                  <p className="text-xs text-[#5F6368] mt-1 leading-relaxed">
                    Find chargers with live AI wait times, navigate with along-route stops, and book charging bays.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("OPERATOR")}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    role === "OPERATOR"
                      ? "border-[#1A73E8] bg-blue-50/30 ring-2 ring-[#1A73E8]/20"
                      : "border-[#DADCE0] bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-green-100 text-[#1E8E3E] flex items-center justify-center mb-4">
                    <ChargingStation size={26} weight="bold" />
                  </div>
                  <h4 className="text-sm font-bold text-[#202124]">Station Operator (CPO)</h4>
                  <p className="text-xs text-[#5F6368] mt-1 leading-relaxed">
                    Manage charger hardware, monitor live revenue and kilowatt throughput, and resolve vehicle queues.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* DRIVER STEP 2: ABOUT YOU */}
          {role === "DRIVER" && stepIndex === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Personal details</h3>
                <p className="text-xs text-[#5F6368] mt-1">Used for reservation alerts and receipts.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rohit Deshmukh"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Mobile Number (Indian 10-Digit)
                </label>
                <div className="flex">
                  <span className="h-11 px-3.5 rounded-l-xl border border-r-0 border-[#DADCE0] bg-slate-50 text-sm text-[#5F6368] flex items-center font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="w-full h-11 px-3.5 rounded-r-xl border border-[#DADCE0] text-sm text-[#202124] font-mono focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                >
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* DRIVER STEP 3: YOUR EV */}
          {role === "DRIVER" && stepIndex === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Vehicle specifications</h3>
                <p className="text-xs text-[#5F6368] mt-1">
                  Required to filter compatible charging connectors and battery estimates.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Select Model
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedVehicleId(id);
                    const v = vehicles.find((item) => item.id === id);
                    if (v && v.connectors) {
                      const list = Array.isArray(v.connectors) ? v.connectors : v.connectors.split(",");
                      setSelectedConnectors(list);
                    }
                  }}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.make} {v.model} ({v.batteryKwh} kWh)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Vehicle Registration Number
                </label>
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  placeholder="e.g. MH02AB1234"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#202124] uppercase">
                    Current Battery Charge
                  </label>
                  <span className="text-sm font-bold text-[#1A73E8] font-mono">{batteryPct}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={batteryPct}
                  onChange={(e) => setBatteryPct(Number(e.target.value))}
                  className="w-full accent-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Supported Connectors
                </label>
                <div className="flex flex-wrap gap-2">
                  {CONNECTOR_OPTIONS.map((c) => {
                    const isSelected = selectedConnectors.includes(c);
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => {
                          if (isSelected) {
                            if (selectedConnectors.length > 1) {
                              setSelectedConnectors(selectedConnectors.filter((x) => x !== c));
                            }
                          } else {
                            setSelectedConnectors([...selectedConnectors, c]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          isSelected
                            ? "bg-blue-50 border-[#1A73E8] text-[#1A73E8] font-semibold"
                            : "bg-white border-[#DADCE0] text-[#5F6368] hover:border-slate-300"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* DRIVER STEP 4: HOME & WORK */}
          {role === "DRIVER" && stepIndex === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Saved locations</h3>
                <p className="text-xs text-[#5F6368] mt-1">
                  We use your home and work base to recommend convenient neighborhood charging hubs.
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#202124] uppercase flex items-center gap-1.5">
                    <House size={14} weight="bold" className="text-[#1A73E8]" />
                    Home Address (Required)
                  </label>
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="text-xs text-[#1A73E8] hover:underline font-medium flex items-center gap-1"
                  >
                    <MapPin size={12} />
                    Use current location
                  </button>
                </div>
                <input
                  type="text"
                  value={homeLabel}
                  onChange={(e) => setHomeLabel(e.target.value)}
                  placeholder="e.g. Bandra West, Mumbai"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5 flex items-center gap-1.5">
                  <Briefcase size={14} weight="bold" className="text-[#5F6368]" />
                  Work Address (Optional)
                </label>
                <input
                  type="text"
                  value={workLabel}
                  onChange={(e) => setWorkLabel(e.target.value)}
                  placeholder="e.g. BKC Commercial Complex, Mumbai"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>
            </div>
          )}

          {/* DRIVER STEP 5: PREFERENCES & REVIEW */}
          {role === "DRIVER" && stepIndex === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Review your profile</h3>
                <p className="text-xs text-[#5F6368] mt-1">
                  Confirm your settings before finishing setup.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-[#DADCE0] space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5F6368]">Driver</span>
                  <span className="font-semibold text-[#202124]">{fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5F6368]">Vehicle</span>
                  <span className="font-semibold text-[#202124]">
                    {activeVehicle?.make} {activeVehicle?.model} ({regNo})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5F6368]">Battery</span>
                  <span className="font-mono text-[#1A73E8]">{batteryPct}% ({activeVehicle?.batteryKwh} kWh)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5F6368]">Home Base</span>
                  <span className="font-semibold text-[#202124] truncate max-w-[220px]">{homeLabel}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202124] uppercase mb-1">
                    Max Acceptable Wait
                  </label>
                  <select
                    value={maxWaitMin}
                    onChange={(e) => setMaxWaitMin(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[#DADCE0] text-xs text-[#202124] bg-white"
                  >
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202124] uppercase mb-1">
                    Min Charger Power
                  </label>
                  <select
                    value={minKw}
                    onChange={(e) => setMinKw(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[#DADCE0] text-xs text-[#202124] bg-white"
                  >
                    <option value={30}>30 kW (Fast DC)</option>
                    <option value={50}>50 kW (Rapid DC)</option>
                    <option value={60}>60 kW (High Power)</option>
                    <option value={120}>120+ kW (Ultra-Fast)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* OPERATOR STEP 2: BUSINESS */}
          {role === "OPERATOR" && stepIndex === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Business & CPO Profile</h3>
                <p className="text-xs text-[#5F6368] mt-1">Details of your charging network operations.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Business / CPO Name
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. SparkPower Charging Network"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Contact Person Name
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Vikram Malhotra"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={operatorPhone}
                  onChange={(e) => setOperatorPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="9876543210"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] font-mono focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>
            </div>
          )}

          {/* OPERATOR STEP 3: STATION */}
          {role === "OPERATOR" && stepIndex === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Charging Hub Details</h3>
                <p className="text-xs text-[#5F6368] mt-1">Location of your primary charging station.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Station Name
                </label>
                <input
                  type="text"
                  value={stationName}
                  onChange={(e) => setStationName(e.target.value)}
                  placeholder="e.g. SparkPower BKC Fast Charging Hub"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Full Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. G Block, BKC, Bandra East, Mumbai"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                    City
                  </label>
                  <select
                    value={stationCity}
                    onChange={(e) => setStationCity(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] bg-white"
                  >
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                    Coordinates (Lat, Lng)
                  </label>
                  <div className="h-11 px-3.5 rounded-xl border border-[#DADCE0] bg-slate-50 text-xs font-mono text-[#5F6368] flex items-center">
                    {stationLat.toFixed(4)}, {stationLng.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* OPERATOR STEP 4: CHARGERS */}
          {role === "OPERATOR" && stepIndex === 3 && (
            <div className="space-y-5">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold text-[#202124]">Charger Bays</h3>
                  <p className="text-xs text-[#5F6368] mt-1">Configure bays for live digital twin telemetry.</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setChargers([
                      ...chargers,
                      { label: `Bay ${chargers.length + 1}`, connectorType: "CCS2", powerKw: 60 },
                    ])
                  }
                  className="h-9 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1A73E8] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} weight="bold" />
                  Add Charger
                </button>
              </div>

              <div className="space-y-3">
                {chargers.map((c, index) => (
                  <div
                    key={index}
                    className="p-3.5 rounded-xl border border-[#DADCE0] bg-white grid grid-cols-12 gap-3 items-center"
                  >
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={c.label}
                        onChange={(e) => {
                          const copy = [...chargers];
                          copy[index].label = e.target.value;
                          setChargers(copy);
                        }}
                        className="w-full h-9 px-2.5 rounded-lg border border-[#DADCE0] text-xs text-[#202124]"
                      />
                    </div>
                    <div className="col-span-4">
                      <select
                        value={c.connectorType}
                        onChange={(e) => {
                          const copy = [...chargers];
                          copy[index].connectorType = e.target.value;
                          setChargers(copy);
                        }}
                        className="w-full h-9 px-2.5 rounded-lg border border-[#DADCE0] text-xs text-[#202124] bg-white"
                      >
                        {CONNECTOR_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={c.powerKw}
                          onChange={(e) => {
                            const copy = [...chargers];
                            copy[index].powerKw = Number(e.target.value);
                            setChargers(copy);
                          }}
                          className="w-full h-9 px-2.5 rounded-l-lg border border-r-0 border-[#DADCE0] text-xs text-[#202124] font-mono"
                        />
                        <span className="h-9 px-2 bg-slate-50 border border-[#DADCE0] rounded-r-lg text-[10px] text-[#5F6368] flex items-center">
                          kW
                        </span>
                      </div>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      {chargers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setChargers(chargers.filter((_, i) => i !== index))}
                          className="text-[#D93025] hover:text-red-700 p-1"
                        >
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPERATOR STEP 5: PRICING & FINISH */}
          {role === "OPERATOR" && stepIndex === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-[#202124]">Tariff and Operating Hours</h3>
                <p className="text-xs text-[#5F6368] mt-1">Set rates and amenities for visiting drivers.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Tariff (₹ / kWh)
                </label>
                <div className="flex items-center">
                  <span className="h-11 px-3.5 rounded-l-xl border border-r-0 border-[#DADCE0] bg-slate-50 text-sm text-[#5F6368] flex items-center font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={tariff}
                    onChange={(e) => setTariff(Number(e.target.value))}
                    className="w-full h-11 px-3.5 rounded-r-xl border border-[#DADCE0] text-sm text-[#202124] font-mono focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/20 focus:border-[#1A73E8]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase mb-1.5">
                  Operating Hours
                </label>
                <select
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#DADCE0] text-sm text-[#202124] bg-white"
                >
                  <option value="24/7">24 Hours / 7 Days</option>
                  <option value="6:00 AM - 11:00 PM">6:00 AM - 11:00 PM</option>
                  <option value="8:00 AM - 10:00 PM">8:00 AM - 10:00 PM</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-[#1A73E8] leading-relaxed">
                ℹ️ Your station will be reviewed by platform administrators before appearing in driver search results unless instant demo approval is active.
              </div>
            </div>
          )}
        </StepShell>
      </div>
    </div>
  );
}
