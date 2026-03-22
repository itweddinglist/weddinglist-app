"use client";
import { useState, useCallback, useRef } from "react";
import { getTableDims } from "../utils/geometry.js";

export function useGuestLocator({ tables, getGuestTableId, focusPoint }) {
  const [highlightTableId, setHighlightTableId] = useState(null);
  const [highlightGuestId, setHighlightGuestId] = useState(null);
  const timeoutRef = useRef(null);

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

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setHighlightTableId(tableId);
      setHighlightGuestId(guestId);
      timeoutRef.current = setTimeout(() => {
        setHighlightTableId(null);
        setHighlightGuestId(null);
        timeoutRef.current = null;
      }, 1500);
    },
    [tables, getGuestTableId, focusPoint]
  );

  return { highlightTableId, highlightGuestId, locateGuest };
}
