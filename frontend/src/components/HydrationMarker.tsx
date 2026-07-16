"use client";

import { useEffect } from "react";

// Sets a marker attribute on <html> once this client component has mounted
// (i.e. React hydration has completed). The E2E suite waits on this before
// interacting with any form: clicking a button before hydration finishes
// attaches no onClick/onSubmit handler yet, so the click falls through to
// the browser's native GET form submission — a real bug this project hit
// that corrupted the Next.js dev server's chunk serving until the container
// was restarted. A fixed-time wait guess was not reliable enough to avoid
// the race under this environment's variable dev-server latency.
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
