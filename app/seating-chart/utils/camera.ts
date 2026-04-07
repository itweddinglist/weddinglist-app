import { PLAN_W, PLAN_H, PLAN_CX, PLAN_CY } from "./geometry.ts";
import type { CameraState } from "@/types/seating";

export const ZOOM_MIN = 0.15;
export const ZOOM_MAX = 3;
export const ZOOM_DEFAULT = 0.8;
export const PAN_PAD = 1000;

type CameraAction =
  | { type: "CAM_SET"; vx: number; vy: number; z: number; canvasW?: number; canvasH?: number }
  | { type: "CAM_PAN_BY"; dxWorld: number; dyWorld: number; canvasW?: number; canvasH?: number }
  | { type: "CAM_ZOOM_AT_NORM"; factor: number; nx: number; ny: number; canvasW?: number; canvasH?: number }

export function clampCam(vx: number, vy: number, z: number, canvasW: number, canvasH: number): CameraState {
  const vw = canvasW / z;
  const vh = canvasH / z;
  return {
    vx: Math.max(-PAN_PAD, Math.min(PLAN_W + PAN_PAD - vw, vx)),
    vy: Math.max(-PAN_PAD, Math.min(PLAN_H + PAN_PAD - vh, vy)),
    z,
  };
}

export function camReducer(state: CameraState, action: CameraAction): CameraState {
  const { canvasW = 1200, canvasH = 700 } = action;
  switch (action.type) {
    case "CAM_SET": {
      return clampCam(action.vx, action.vy, action.z, canvasW, canvasH);
    }
    case "CAM_PAN_BY": {
      return clampCam(
        state.vx + action.dxWorld,
        state.vy + action.dyWorld,
        state.z,
        canvasW,
        canvasH
      );
    }
    case "CAM_ZOOM_AT_NORM": {
      const nextZ = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.z * action.factor));
      const vwPrev = canvasW / state.z;
      const vhPrev = canvasH / state.z;
      const vwNext = canvasW / nextZ;
      const vhNext = canvasH / nextZ;
      const nx = Math.max(0, Math.min(1, action.nx));
      const ny = Math.max(0, Math.min(1, action.ny));
      const wx = state.vx + nx * vwPrev;
      const wy = state.vy + ny * vhPrev;
      const vxNext = wx - nx * vwNext;
      const vyNext = wy - ny * vhNext;
      return clampCam(vxNext, vyNext, nextZ, canvasW, canvasH);
    }
    default:
      return state;
  }
}

export function getInitialCam(canvasW = 1200, canvasH = 700): CameraState {
  return {
    vx: PLAN_CX - canvasW / ZOOM_DEFAULT / 2,
    vy: PLAN_CY - canvasH / ZOOM_DEFAULT / 2,
    z: ZOOM_DEFAULT,
  };
}
