// =============================================================================
// lib/server-context/index.ts
// Public surface of the Server App Context layer.
// =============================================================================

export type {
  WeddingInfo,
  UnauthenticatedContext,
  WpUnavailableContext,
  ProvisioningPendingContext,
  ProvisioningFailedContext,
  AuthenticatedContext,
  ServerAppContext,
  WeddingAccess,
} from "./types";

export { ROLE_HIERARCHY } from "./types";

export { getServerAppContext } from "./get-server-app-context";

export {
  requireAuthenticatedContext,
  type RequireAuthenticatedResult,
} from "./require-authenticated";

export {
  requireWeddingAccess,
  type RequireWeddingAccessResult,
} from "./require-wedding-access";
