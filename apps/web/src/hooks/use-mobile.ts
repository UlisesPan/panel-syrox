import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;
const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

function subscribe(callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/** Suscripción a un media query sin setState en efectos (sin renders en cascada). */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
