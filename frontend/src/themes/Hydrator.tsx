import { useEffect } from "react";
import { hydrateThemeFromDocument } from "./active";

export function ThemeHydrator() {
  useEffect(() => {
    hydrateThemeFromDocument();
  }, []);
  return null;
}
