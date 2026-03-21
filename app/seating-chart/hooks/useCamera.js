'use client';
import { useState, useEffect, useRef, useCallback, useMemo, useReducer } from 'react';
import { camReducer, getInitialCam, ZOOM_DEFAULT, ZOOM_MIN, ZOOM_MAX } from '../utils/camera.js';
import { loadStorageState } from '../utils/storage.js';
import { PLAN_CX, PLAN_CY, getTableDims } from '../utils/geometry.js';

export function useCamera() {
  const [cam, dispatchCam] = useReducer(camReducer, null, () => getInitialCam(1200, 700));
  const [canvasW, setCanvasW] = useState(1200);
  const [canvasH, setCanvasH] = useState(700);
  const [hydrated, setHydrated] = useState(false);

  const canvasRef  = useRef(null);
  const svgRef     = useRef(null);
  const camRef     = useRef(cam);
  const canvasWRef = useRef(canvasW);
  const canvasHRef = useRef(canvasH);
  const wheelAccRef = useRef({ sumZoomExp: 0, lastNx: 0.5, lastNy: 0.5, lastCW: 1200, lastCH: 700, rafId: null });

  useEffect(() => { camRef.current = cam; }, [cam]);
  useEffect(() => { canvasWRef.current = canvasW; }, [canvasW]);
  useEffect(() => { canvasHRef.current = canvasH; }, [canvasH]);

  // ResizeObserver
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const updateSize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setCanvasW(w);
        setCanvasH(h);
        canvasWRef.current = w;
        canvasHRef.current = h;
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // hydration
  useEffect(() => {
    const cw = canvasWRef.current;
    const ch = canvasHRef.current;
    const result = loadStorageState(cw, ch);
    if (result.data.cam) {
      dispatchCam({ type: 'CAM_SET', vx: result.data.cam.vx, vy: result.data.cam.vy, z: result.data.cam.z, canvasW: cw, canvasH: ch });
    }
    setHydrated(true);
  }, []);

  // Wheel listener pe document
  useEffect(() => {
    const acc = wheelAccRef.current;

    const onWheel = (e) => {
      const el = canvasRef.current;
      if (!el || !el.contains(e.target)) return;
      e.preventDefault();

      const rect = svgRef.current ? svgRef.current.getBoundingClientRect() : null;
      if (!rect || rect.width === 0 || rect.height === 0) return;

      const base = e.deltaMode === 1 ? 16 : 1;

      if (e.ctrlKey) {
        // Ctrl+Scroll = zoom ancorat pe cursor
        acc.lastNx = (e.clientX - rect.left) / rect.width;
        acc.lastNy = (e.clientY - rect.top)  / rect.height;
        acc.lastCW = rect.width;
        acc.lastCH = rect.height;
        acc.sumZoomExp += -e.deltaY * base * 0.0018;

        if (acc.rafId !== null) return;
        acc.rafId = requestAnimationFrame(() => {
          const factor = Math.exp(acc.sumZoomExp);
          acc.sumZoomExp = 0;
          acc.rafId = null;
          if (Math.abs(acc.lastCW - canvasWRef.current) > 1 || Math.abs(acc.lastCH - canvasHRef.current) > 1) {
            setCanvasW(acc.lastCW);
            setCanvasH(acc.lastCH);
            canvasWRef.current = acc.lastCW;
            canvasHRef.current = acc.lastCH;
          }
          dispatchCam({
            type: 'CAM_ZOOM_AT_NORM',
            nx: acc.lastNx,
            ny: acc.lastNy,
            factor,
            canvasW: acc.lastCW,
            canvasH: acc.lastCH,
          });
        });
      } else {
        // Scroll normal = pan
        const cw = canvasWRef.current;
        const ch = canvasHRef.current;
        const z = camRef.current.z;
        dispatchCam({
          type: 'CAM_PAN_BY',
          dxWorld: (e.deltaX * base) / z,
          dyWorld: (e.deltaY * base) / z,
          canvasW: cw,
          canvasH: ch,
        });
      }
    };

    document.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('wheel', onWheel);
      if (acc.rafId !== null) { cancelAnimationFrame(acc.rafId); acc.rafId = null; }
    };
  }, []);

  const viewBox = useMemo(
    () => `${cam.vx} ${cam.vy} ${canvasW / cam.z} ${canvasH / cam.z}`,
    [cam, canvasW, canvasH]
  );

  const screenToSVG = useCallback((clientX, clientY) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const nx = (clientX - rect.left)  / rect.width;
    const ny = (clientY - rect.top)   / rect.height;
    const vw = canvasWRef.current / camRef.current.z;
    const vh = canvasHRef.current / camRef.current.z;
    const x  = camRef.current.vx + nx * vw;
    const y  = camRef.current.vy + ny * vh;
    return { x, y };
  }, []);

  const fitToScreen = useCallback((tables) => {
    if (!tables || tables.length === 0) {
      const cw = canvasWRef.current;
      const ch = canvasHRef.current;
      dispatchCam({ type: 'CAM_SET', vx: PLAN_CX - cw / ZOOM_DEFAULT / 2, vy: PLAN_CY - ch / ZOOM_DEFAULT / 2, z: ZOOM_DEFAULT, canvasW: cw, canvasH: ch });
      return;
    }
    const bounds = tables.map(t => {
      const d = getTableDims(t);
      return { minX: t.x, minY: t.y, maxX: t.x + d.w, maxY: t.y + d.h };
    });
    const minX = Math.min(...bounds.map(b => b.minX)) - 80;
    const minY = Math.min(...bounds.map(b => b.minY)) - 80;
    const maxX = Math.max(...bounds.map(b => b.maxX)) + 80;
    const maxY = Math.max(...bounds.map(b => b.maxY)) + 80;
    const fw = maxX - minX;
    const fh = maxY - minY;
    const cw = canvasWRef.current;
    const ch = canvasHRef.current;
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(cw / fw, ch / fh) * 0.9));
    dispatchCam({ type: 'CAM_SET', vx: minX - (cw / zoom - fw) / 2, vy: minY - (ch / zoom - fh) / 2, z: zoom, canvasW: cw, canvasH: ch });
  }, []);

  const resetCamera = useCallback(() => {
    const cw = canvasWRef.current;
    const ch = canvasHRef.current;
    dispatchCam({ type: 'CAM_SET', vx: PLAN_CX - cw / ZOOM_DEFAULT / 2, vy: PLAN_CY - ch / ZOOM_DEFAULT / 2, z: ZOOM_DEFAULT, canvasW: cw, canvasH: ch });
  }, []);
  const focusPoint = useCallback((x, y, zoom = 1.5) => {
  const cw = canvasWRef.current;
  const ch = canvasHRef.current;
  dispatchCam({
    type: 'CAM_SET',
    vx: x - cw / zoom / 2,
    vy: y - ch / zoom / 2,
    z: zoom,
    canvasW: cw,
    canvasH: ch,
  });
}, [dispatchCam]);

  const zoomBy = useCallback((d) => {
    const cW = canvasWRef.current;
    const cH = canvasHRef.current;
    const prevZ = camRef.current.z;
    const nextZ = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prevZ + d));
    dispatchCam({ type: 'CAM_ZOOM_AT_NORM', nx: 0.5, ny: 0.5, factor: nextZ / prevZ, canvasW: cW, canvasH: cH });
  }, [dispatchCam]);

  return {
    cam, dispatchCam, camRef,
    canvasRef, svgRef,
    canvasW, canvasH, canvasWRef, canvasHRef,
    viewBox, screenToSVG, zoomBy, fitToScreen, resetCamera, focusPoint,
    hydrated,
  };
}
