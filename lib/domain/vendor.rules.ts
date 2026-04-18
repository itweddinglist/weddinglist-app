/**
 * Vendor rules — placeholder pentru V1 vendor booking/contracting.
 *
 * STARE: Blocat pe Voxel domain. Vendor-ii sunt afisati in dashboard ca
 * read-only, fara flow de booking/contracting implementat.
 *
 * Cand Voxel domain e gata (V1), aici vor fi adaugate predicate-uri tip:
 *
 *   export function isVendorBooked(vendor: VendorRow): boolean;
 *   export function isVendorContacted(vendor: VendorRow): boolean;
 *   export function isVendorAvailable(vendor: VendorRow): boolean;
 *   export function canBookVendor(vendor: VendorRow, wedding: WeddingRow): boolean;
 *
 * Pattern: consistent cu rsvp.rules.ts / budget.rules.ts / attendance.rules.ts.
 * Referinta: ROADMAP Vendors (blocat pe Voxel — afisat dar disabled).
 */

export {};
