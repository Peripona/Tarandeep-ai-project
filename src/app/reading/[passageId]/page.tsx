"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { getPassageById } from "@/content/catalog";
import { PassageView } from "@/components/reading/PassageView";

export default function PassagePage({ params }: { params: Promise<{ passageId: string }> }) {
  const { passageId } = use(params);
  const passage = getPassageById(passageId);
  if (!passage) notFound();
  return (
    <div className="p-4 md:p-6">
      <PassageView passage={passage} />
    </div>
  );
}
