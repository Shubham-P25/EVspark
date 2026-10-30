"use client";
import { useParams } from "next/navigation";
import { EmptyState } from "@/components/torque/primitives";
import { SplitTitle } from "@/components/torque/motion";

export default function OperatorSectionPage() {
  const params = useParams();
  const raw = typeof params?.section === "string" ? params.section : "Section";
  const title = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <div>
      <div className="page-head">
        <SplitTitle text={title} />
      </div>
      <div className="card">
        <EmptyState
          title="Coming soon"
          body="This section ships in the next phase."
        />
      </div>
    </div>
  );
}

