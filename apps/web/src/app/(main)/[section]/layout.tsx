"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/torque/AppShell";
import { Skeleton } from "@/components/torque/primitives";
import { useMe } from "@/lib/api";

export default function OperatorSectionLayout({ children }: { children: React.ReactNode }) {
  const { me, loading } = useMe();
  const router = useRouter();

  useEffect(() => {
    if (loading || !me) return;
    if (!me.onboarded) {
      router.replace("/onboarding");
    } else if (me.role === "DRIVER") {
      router.replace("/driver");
    }
  }, [me, loading, router]);

  if (loading || !me || !me.onboarded || me.role === "DRIVER") {
    return (
      <div style={{ padding: 40, display: "grid", gap: 14, maxWidth: 900 }}>
        <Skeleton h={56} w={320} />
        <Skeleton h={120} />
        <Skeleton h={260} />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}

