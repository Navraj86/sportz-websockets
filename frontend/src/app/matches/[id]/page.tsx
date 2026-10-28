import { Suspense } from "react";
import type { Metadata } from "next";
import { MatchCenter, MatchCenterSkeleton } from "@/components/match-center/match-center";

export const metadata: Metadata = {
  title: "Match centre",
};

export default function MatchPage({ params }: PageProps<"/matches/[id]">) {
  return (
    <Suspense fallback={<MatchCenterSkeleton />}>
      <MatchCenter params={params} />
    </Suspense>
  );
}
