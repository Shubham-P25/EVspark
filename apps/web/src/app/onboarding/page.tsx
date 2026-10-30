"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/torque/primitives";
import { Wizard } from "@/components/torque/onboarding/Wizard";
import { useMe } from "@/lib/api";

export default function OnboardingPage() {
  const { me, loading, refresh } = useMe();
  const router = useRouter();
  useEffect(() => {
    if (me?.onboarded) {
      router.replace(me.role === "DRIVER" ? "/driver" : "/station");
    }
  }, [me, router]);

  if (loading || !me) {
    return (
      <div style={{ padding: 40, display: "grid", gap: 14, maxWidth: 720, margin: "0 auto" }}>
        <Skeleton h={40} w={260} />
        <Skeleton h={10} />
        <Skeleton h={320} />
      </div>
    );
  }

  return <Wizard key={me.role} me={me} onRoleChanged={refresh} />;
}
