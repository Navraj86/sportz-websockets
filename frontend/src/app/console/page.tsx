import { Suspense } from "react";
import type { Metadata } from "next";
import { OperatorConsole, OperatorConsoleSkeleton } from "@/components/console/operator-console";

export const metadata: Metadata = {
  title: "Operator console",
};

export default function ConsolePage() {
  return (
    <Suspense fallback={<OperatorConsoleSkeleton />}>
      <OperatorConsole />
    </Suspense>
  );
}
