"use client";
import { useState, useCallback } from "react";
import { getTableDims } from "../utils/geometry.ts";

export function useGuestLocator({ tables, getGuestTableId, focusPoint }) {
  const [highlightGuestId, setHighlightGuestId] = useState(null);

  const locateGuest = useCallback(
    (guestId) => {
      const tableId = getGuestTableId(guestId);
      if (!tableId) return;

      const table = tables.find((t) => t.id === tableId);
      if (!table) return;

      const d = getTableDims(table);
      const cx = table.x + d.w / 2;
      const cy = table.y + d.h / 2;

      focusPoint(cx, cy, 1.3);
      setHighlightGuestId(guestId);
    },
    [tables, getGuestTableId, focusPoint]
  );

  const clearHighlight = useCallback(() => {
    setHighlightGuestId(null);
  }, []);

  return { highlightGuestId, locateGuest, clearHighlight };
}
