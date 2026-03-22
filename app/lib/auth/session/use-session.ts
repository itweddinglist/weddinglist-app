"use client";

import { useEffect, useState } from "react";
import { resolveSession, type SessionState } from "./session-bridge";

export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function run() {
      const session = await resolveSession();
      if (isMounted) setState(session);
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}