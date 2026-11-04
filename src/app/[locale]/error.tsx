"use client";

import { ErrorView } from "@/components/layout/system-views";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} />;
}
