import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | EVspark",
  description: "EVspark Privacy Policy and Location Data Transparency",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <header className="border-b border-[#DADCE0] bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[#5F6368] hover:text-[#202124] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <span className="font-semibold text-lg tracking-tight text-[#1A73E8]">EVspark</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm font-medium">
          DRAFT - must be reviewed by a lawyer before launch (India DPDP Act 2023 applies to location data)
        </div>

        <h1 className="text-3xl font-bold mb-4 tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-[#5F6368] mb-10">Last updated: October 2026</p>

        <section className="space-y-8 text-sm leading-relaxed text-[#3C4043]">
          <div>
            <h2 className="text-xl font-semibold text-[#202124] mb-3">1. What we collect</h2>
            <p className="mb-2">We collect the minimum information required to deliver charging and queue management services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account information:</strong> Name, email address, phone number, and authentication identifiers.</li>
              <li><strong>Vehicle information:</strong> Vehicle make, model, connector types, and battery capacity.</li>
              <li><strong>Location:</strong> Real-time geolocation coordinates collected only while the application is active and foregrounded, with explicit consent.</li>
              <li><strong>Bookings and Sessions:</strong> Charging station reservations, charging sessions, queue positions, and transaction details.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#202124] mb-3">2. Why we collect it</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To display charging stations nearest to your current location.</li>
              <li>To provide accurate wait-time estimation and queue blending as vehicles approach stations.</li>
              <li>To navigate drivers to compatible charging connectors.</li>
              <li>To manage operator stations and real-time charging telemetry.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#202124] mb-3">3. Retention</h2>
            <p>
              Temporary telemetry and vehicle location pings are retained for a maximum of <strong>7 days</strong> before automated purge. Charger event logs are purged after 90 days. Aggregated station analytics and completed billing records are maintained for accounting and operational insights.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#202124] mb-3">4. Sharing</h2>
            <p className="mb-2">We do not sell personal data. Information is shared only with trusted infrastructure providers necessary to operate the service:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Map provider:</strong> Google Maps Platform (for tiles, geocoding, and directions routing).</li>
              <li><strong>Authentication provider:</strong> Clerk (for secure session authentication).</li>
              <li><strong>Hosting & database:</strong> Cloud hosting infrastructure (Neon PostgreSQL, Upstash Redis).</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#202124] mb-3">5. Your rights</h2>
            <p>
              Under applicable data protection laws, including the India Digital Personal Data Protection Act (DPDP Act 2023), you have the right to access your personal data, request corrections, revoke location consent, or request complete deletion of your account and associated records by contacting us.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[#202124] mb-3">6. Contact</h2>
            <p>
              For privacy inquiries, data access requests, or deletion notices, contact our data protection team at{" "}
              <a href="mailto:privacy@evspark.in" className="text-[#1A73E8] hover:underline font-medium">
                privacy@evspark.in
              </a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
