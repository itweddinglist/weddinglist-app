"use client";

import { useEffect, useState } from "react";
import {
  fetchWordPressBootstrap,
  type BootstrapResponse,
} from "./fetch-wordpress-bootstrap";

type BootstrapState =
  | { status: "loading" }
  | { status: "authenticated"; data: BootstrapResponse }
  | { status: "guest"; data: BootstrapResponse }
  | { status: "error"; message: string };

export function useWordPressBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function run() {
      try {
        const data = await fetchWordPressBootstrap();

        if (!isMounted) return;

        if (data.authenticated) {
          setState({ status: "authenticated", data });
          return;
        }

        setState({ status: "guest", data });
      } catch (error) {
        if (!isMounted) return;

        const message =
          error instanceof Error ? error.message : "Unknown bootstrap error";

        setState({ status: "error", message });
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}