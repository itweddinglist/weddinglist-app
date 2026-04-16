// =============================================================================
// lib/server-context/types.ts
// ServerAppContext union — single source of truth for auth state in API routes.
// =============================================================================

export type WeddingInfo = {
  id: string;
  title: string;
  role: string;
};

type BaseContext = {
  request_id: string;
};

export type UnauthenticatedContext = BaseContext & {
  status: "unauthenticated";
};

export type WpUnavailableContext = BaseContext & {
  status: "wp_unavailable";
  reason: "timeout" | "error";
};

export type ProvisioningPendingContext = BaseContext & {
  status: "provisioning_pending";
  app_user_id: string;
  wp_user_id: number;
  email: string;
  display_name: string;
};

export type ProvisioningFailedContext = BaseContext & {
  status: "provisioning_failed";
  app_user_id: string;
  wp_user_id: number;
  email: string;
  display_name: string;
};

export type AuthenticatedContext = BaseContext & {
  status: "authenticated";
  app_user_id: string;
  wp_user_id: number;
  email: string;
  display_name: string;
  plan_tier: string | null;
  active_wedding_id: string | null;
  active_event_id: string | null;
  weddings: WeddingInfo[];
};

export type ServerAppContext =
  | UnauthenticatedContext
  | WpUnavailableContext
  | ProvisioningPendingContext
  | ProvisioningFailedContext
  | AuthenticatedContext;

export type WeddingAccess = {
  wedding_id: string;
  role: string;
};

/** Role hierarchy: owner > partner > planner > editor > viewer */
export const ROLE_HIERARCHY: Readonly<Record<string, number>> = {
  owner: 5,
  partner: 4,
  planner: 3,
  editor: 2,
  viewer: 1,
};
