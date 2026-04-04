export type BootstrapUser = {
  wp_user_id: number;
  email: string;
  display_name: string;
  plan_tier: string | null;
};

export type BootstrapWedding = {
  id: string;
  title: string;
  role: string;
};

export type ProvisioningStatus = "ready" | "pending" | "failed";

export type BootstrapResponse = {
  authenticated: boolean;
  user: BootstrapUser | null;
  app_user_id: string | null;
  weddings: BootstrapWedding[];
  active_wedding_id: string | null;
  active_event_id: string | null;
  provisioning_status: ProvisioningStatus | null;
  error?: string;
};

export async function fetchWordPressBootstrap(): Promise<BootstrapResponse> {
  const wpBaseUrl = process.env.NEXT_PUBLIC_WP_BASE_URL;
  if (!wpBaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_WP_BASE_URL env variable");
  }

  const response = await fetch(
    `${wpBaseUrl}/wp-json/weddinglist/v1/bootstrap`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Bootstrap request failed with status ${response.status}`
    );
  }

  return response.json() as Promise<BootstrapResponse>;
}
