"use client";

import { useSyncExternalStore } from "react";

function subscribe() {
  // Nothing to subscribe to — this is a one-time server/client snapshot
  // switch, not reactive data. React calls getSnapshot again on its own
  // right after hydration.
  return () => {};
}

/**
 * Renders nothing on the server and on the client's first (hydration)
 * render — so SSR and hydration always agree — then switches to the
 * locale-formatted time right after. `toLocaleTimeString()` depends on the
 * runtime's locale/TZ, which differs between the Node SSR process and the
 * browser; rendering it directly causes a hydration mismatch. This is the
 * exact use case `useSyncExternalStore`'s `getServerSnapshot` is for.
 */
export function ClientTime({ date, short = false }: { date: string | Date; short?: boolean }) {
  const formatted = useSyncExternalStore(
    subscribe,
    () =>
      new Date(date).toLocaleTimeString(
        [],
        short ? { hour: "2-digit", minute: "2-digit" } : undefined,
      ),
    () => "",
  );

  return <>{formatted}</>;
}
