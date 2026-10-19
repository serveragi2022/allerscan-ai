"use client";

import { useCallback, useEffect, useState } from "react";
import { defaultProfile, loadProfile, saveProfile } from "./storage";

// Reads the allergy profile from localStorage after mount (so server and
// client render the same HTML), and keeps tabs/components in sync.
export function useProfile() {
  const [profile, setProfile] = useState(defaultProfile);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setProfile(loadProfile());
    sync();
    setReady(true);
    window.addEventListener("allerscan:profile", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("allerscan:profile", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((next) => {
    setProfile(next);
    return saveProfile(next);
  }, []);

  return { profile, ready, update };
}
