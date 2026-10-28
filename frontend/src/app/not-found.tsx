import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Page not found"
      description="The page you're looking for doesn't exist or has moved."
      action={
        <Link href="/" className={buttonClass("secondary")}>
          Back to matches
        </Link>
      }
    />
  );
}
