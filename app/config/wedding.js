export const WEDDING = {
  mire: "Alexandru",
  mireasa: "Andreea",
  data: new Date("2026-09-15"),
  locatie: "Grand Hotel Ballroom",
};

export function getDaysLeft() {
  const diff = WEDDING.data - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}