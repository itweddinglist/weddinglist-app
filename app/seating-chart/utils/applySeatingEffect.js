/**
 * applySeatingEffect
 *
 * Interpretează un SeatingEffect și aplică acțiunea UI corespunzătoare.
 * Singurul loc din aplicație unde effects sunt traduse în UI calls.
 *
 * @param {SeatingEffect} effect
 * @param {object} ui - instanța returnată de useSeatingUI
 *
 * Effects suportate:
 * @typedef {
 *   | { type: 'CLEAR_CLICKED_SEAT' }
 *   | { type: 'CLOSE_EDIT_PANEL' }
 *   | { type: 'CLOSE_MODAL' }
 *   | { type: 'SELECT_TABLE'; payload: { tableId: number } }
 *   | { type: 'SHOW_TOAST'; payload: { message: string; toastType: 'green' | 'red' | 'yellow' | 'rose' } }
 * } SeatingEffect
 *
 * Nu adăuga effects noi fără nevoie reală.
 */
export function applySeatingEffect(effect, ui) {
  switch (effect.type) {
    case "CLEAR_CLICKED_SEAT":
      ui.setClickedSeat(null);
      break;

    case "CLOSE_EDIT_PANEL":
      ui.setEditPanel(null);
      break;

    case "CLOSE_MODAL":
      ui.setModal(null);
      break;

    case "SELECT_TABLE":
      ui.setSelectedTableId(effect.payload?.tableId ?? null);
      break;

    case "SHOW_TOAST":
      ui.showToast(
        effect.payload?.message ?? "",
        effect.payload?.toastType ?? "rose"
      );
      break;

    default:
      console.warn("[applySeatingEffect] Unknown effect type:", effect.type, effect);
  }
}
