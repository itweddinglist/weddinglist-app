// =============================================================================
// app/dev/page.tsx
// Dev-only visibility dashboard: session, flags, health, error log.
// SECURITY: notFound() în orice alt environment decât development.
// =============================================================================

import { notFound } from "next/navigation";
import DevPanel from "./DevPanel";

export default function DevPage(): React.ReactElement {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DevPanel />;
}
