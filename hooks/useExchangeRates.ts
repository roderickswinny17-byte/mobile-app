import { useEffect, useState } from "react";
import { ensureRates } from "@/lib/currency";

// Triggers the one-per-session FX rate fetch and re-renders once it
// resolves, so currency-converted totals update from the static fallback to
// live rates without the caller having to manage that itself.
export function useExchangeRates() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    ensureRates().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ready;
}
