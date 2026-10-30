"use client";
import { useState } from "react";
import { SignUp } from "@clerk/nextjs";
import { Car, Buildings } from "@phosphor-icons/react";
import { AuthShell } from "@/components/torque/AuthShell";
import { clerkAppearance } from "@/components/torque/clerkAppearance";
import { Segmented } from "@/components/torque/primitives";

export default function Page() {
  const [role, setRole] = useState<"DRIVER" | "OPERATOR">("DRIVER");
  return (
    <AuthShell mode="signup">
      <div style={{ display: "grid", gap: 18, justifyItems: "center" }}>
        <div className="eyebrow">I am a</div>
        <Segmented
          value={role}
          onChange={setRole}
          options={[
            { value: "DRIVER", label: "Driver", icon: <Car size={16} /> },
            { value: "OPERATOR", label: "Station operator", icon: <Buildings size={16} /> },
          ]}
        />
        <SignUp
          routing="path"
          path="/signup"
          signInUrl="/login"
          unsafeMetadata={{ role }}
          appearance={clerkAppearance}
        />
      </div>
    </AuthShell>
  );
}

