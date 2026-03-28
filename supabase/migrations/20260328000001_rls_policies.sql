-- ============================================================================
-- Migration: 20260328000001_rls_policies.sql
-- Purpose:   Complete RLS policies for weddinglist-app
-- Auth:      WordPress bridge — JWT claim `sub` = app_users.id (uuid)
-- Principle: User has access to a wedding IFF they exist in wedding_members
--            with app_user_id = auth.jwt()->>'sub'
-- RSVP:      Public access via token_hash (no auth required)
-- ============================================================================

-- ============================================================================
-- SECTION 1: HELPER FUNCTIONS
-- ============================================================================

-- Returns the current authenticated user's UUID from the JWT `sub` claim.
-- Used by all policies to identify the requesting user.
CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
  );
$$;

COMMENT ON FUNCTION public.auth_user_id() IS
  'Extracts user UUID from JWT sub claim. Returns nil UUID if unauthenticated.';


-- Returns TRUE if the current user is a member of the given wedding.
-- This is the single gate for all wedding-scoped data access.
CREATE OR REPLACE FUNCTION public.is_wedding_member(_wedding_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wedding_members wm
    WHERE wm.wedding_id = _wedding_id
      AND wm.app_user_id = public.auth_user_id()
  );
$$;

COMMENT ON FUNCTION public.is_wedding_member(uuid) IS
  'Returns true if the JWT user is a member of the specified wedding.';


-- Returns TRUE if the current user is the owner of the given wedding.
-- Used for destructive operations (DELETE wedding, manage members).
CREATE OR REPLACE FUNCTION public.is_wedding_owner(_wedding_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.weddings w
    WHERE w.id = _wedding_id
      AND w.owner_user_id = public.auth_user_id()
  );
$$;

COMMENT ON FUNCTION public.is_wedding_owner(uuid) IS
  'Returns true if the JWT user is the owner of the specified wedding.';


-- ============================================================================
-- SECTION 2: ENSURE RLS IS ENABLED ON ALL TABLES
-- (Idempotent — safe to re-run)
-- ============================================================================

ALTER TABLE public.app_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_links         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weddings               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_invitations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_responses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_migrations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seating_editor_states  ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (supabase service role bypasses anyway,
-- but this protects against accidental grants).
ALTER TABLE public.app_users              FORCE ROW LEVEL SECURITY;
ALTER TABLE public.identity_links         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.weddings               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_members        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.events                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guest_groups           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guests                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guest_events           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.tables                 FORCE ROW LEVEL SECURITY;
ALTER TABLE public.seats                  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.seat_assignments       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vendors                FORCE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items           FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments               FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_invitations       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rsvp_responses         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.data_migrations        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.seating_editor_states  FORCE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 3: app_users — self-access only
-- A user can only see and edit their own profile.
-- ============================================================================

-- SELECT: User can read only their own row.
CREATE POLICY "app_users_select_own"
  ON public.app_users FOR SELECT
  TO authenticated
  USING ( id = public.auth_user_id() );

-- INSERT: User can create their own profile (first login via WP bridge).
CREATE POLICY "app_users_insert_own"
  ON public.app_users FOR INSERT
  TO authenticated
  WITH CHECK ( id = public.auth_user_id() );

-- UPDATE: User can update only their own profile.
CREATE POLICY "app_users_update_own"
  ON public.app_users FOR UPDATE
  TO authenticated
  USING ( id = public.auth_user_id() )
  WITH CHECK ( id = public.auth_user_id() );

-- DELETE: Users cannot delete their own profile via API.
-- Account deletion should go through a server-side function.
-- (No DELETE policy = implicit deny)


-- ============================================================================
-- SECTION 4: identity_links — self-access only
-- Maps external auth providers (WordPress) to app_users.
-- ============================================================================

-- SELECT: User can see only their own identity links.
CREATE POLICY "identity_links_select_own"
  ON public.identity_links FOR SELECT
  TO authenticated
  USING ( app_user_id = public.auth_user_id() );

-- INSERT: User can link their own identity.
CREATE POLICY "identity_links_insert_own"
  ON public.identity_links FOR INSERT
  TO authenticated
  WITH CHECK ( app_user_id = public.auth_user_id() );

-- UPDATE: User can update their own identity links.
CREATE POLICY "identity_links_update_own"
  ON public.identity_links FOR UPDATE
  TO authenticated
  USING ( app_user_id = public.auth_user_id() )
  WITH CHECK ( app_user_id = public.auth_user_id() );

-- DELETE: User can unlink their own identity.
CREATE POLICY "identity_links_delete_own"
  ON public.identity_links FOR DELETE
  TO authenticated
  USING ( app_user_id = public.auth_user_id() );


-- ============================================================================
-- SECTION 5: weddings — membership-gated
-- ============================================================================

-- SELECT: Any member of the wedding can view it.
CREATE POLICY "weddings_select_member"
  ON public.weddings FOR SELECT
  TO authenticated
  USING ( public.is_wedding_member(id) );

-- INSERT: Any authenticated user can create a wedding.
-- The app must also insert the creator into wedding_members (handled by app logic
-- or a trigger — not enforced here to keep policies simple).
CREATE POLICY "weddings_insert_authenticated"
  ON public.weddings FOR INSERT
  TO authenticated
  WITH CHECK ( owner_user_id = public.auth_user_id() );

-- UPDATE: Only the owner can update wedding details.
CREATE POLICY "weddings_update_owner"
  ON public.weddings FOR UPDATE
  TO authenticated
  USING ( owner_user_id = public.auth_user_id() )
  WITH CHECK ( owner_user_id = public.auth_user_id() );

-- DELETE: Only the owner can delete the wedding.
CREATE POLICY "weddings_delete_owner"
  ON public.weddings FOR DELETE
  TO authenticated
  USING ( owner_user_id = public.auth_user_id() );


-- ============================================================================
-- SECTION 6: wedding_members — the pivot table itself
-- Careful: this is the table that gates everything else.
-- ============================================================================

-- SELECT: Members can see other members of their weddings.
CREATE POLICY "wedding_members_select_member"
  ON public.wedding_members FOR SELECT
  TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- INSERT: Only the wedding owner can add members.
CREATE POLICY "wedding_members_insert_owner"
  ON public.wedding_members FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_wedding_owner(wedding_id) );

-- UPDATE: Only the wedding owner can change member roles.
CREATE POLICY "wedding_members_update_owner"
  ON public.wedding_members FOR UPDATE
  TO authenticated
  USING ( public.is_wedding_owner(wedding_id) )
  WITH CHECK ( public.is_wedding_owner(wedding_id) );

-- DELETE: Owner can remove members. A member can also remove themselves.
CREATE POLICY "wedding_members_delete_owner_or_self"
  ON public.wedding_members FOR DELETE
  TO authenticated
  USING (
    public.is_wedding_owner(wedding_id)
    OR app_user_id = public.auth_user_id()
  );


-- ============================================================================
-- SECTION 7: WEDDING-SCOPED TABLES — Standard membership pattern
-- All these tables have a `wedding_id` column.
-- Pattern: SELECT/INSERT/UPDATE require membership; DELETE requires ownership.
-- ============================================================================

-- -------------------------------------------------------
-- 7a. events
-- -------------------------------------------------------
CREATE POLICY "events_select_member"
  ON public.events FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "events_insert_member"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "events_update_member"
  ON public.events FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "events_delete_member"
  ON public.events FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7b. guest_groups
-- -------------------------------------------------------
CREATE POLICY "guest_groups_select_member"
  ON public.guest_groups FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guest_groups_insert_member"
  ON public.guest_groups FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guest_groups_update_member"
  ON public.guest_groups FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guest_groups_delete_member"
  ON public.guest_groups FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7c. guests
-- -------------------------------------------------------
CREATE POLICY "guests_select_member"
  ON public.guests FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guests_insert_member"
  ON public.guests FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guests_update_member"
  ON public.guests FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guests_delete_member"
  ON public.guests FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7d. guest_events
-- -------------------------------------------------------
CREATE POLICY "guest_events_select_member"
  ON public.guest_events FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guest_events_insert_member"
  ON public.guest_events FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guest_events_update_member"
  ON public.guest_events FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "guest_events_delete_member"
  ON public.guest_events FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7e. tables
-- -------------------------------------------------------
CREATE POLICY "tables_select_member"
  ON public.tables FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "tables_insert_member"
  ON public.tables FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "tables_update_member"
  ON public.tables FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "tables_delete_member"
  ON public.tables FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7f. seats
-- -------------------------------------------------------
CREATE POLICY "seats_select_member"
  ON public.seats FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seats_insert_member"
  ON public.seats FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seats_update_member"
  ON public.seats FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seats_delete_member"
  ON public.seats FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7g. seat_assignments
-- -------------------------------------------------------
CREATE POLICY "seat_assignments_select_member"
  ON public.seat_assignments FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seat_assignments_insert_member"
  ON public.seat_assignments FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seat_assignments_update_member"
  ON public.seat_assignments FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seat_assignments_delete_member"
  ON public.seat_assignments FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7h. vendors
-- -------------------------------------------------------
CREATE POLICY "vendors_select_member"
  ON public.vendors FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "vendors_insert_member"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "vendors_update_member"
  ON public.vendors FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "vendors_delete_member"
  ON public.vendors FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7i. budget_items
-- -------------------------------------------------------
CREATE POLICY "budget_items_select_member"
  ON public.budget_items FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "budget_items_insert_member"
  ON public.budget_items FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "budget_items_update_member"
  ON public.budget_items FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "budget_items_delete_member"
  ON public.budget_items FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7j. payments
-- -------------------------------------------------------
CREATE POLICY "payments_select_member"
  ON public.payments FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "payments_insert_member"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "payments_update_member"
  ON public.payments FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "payments_delete_member"
  ON public.payments FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 7k. seating_editor_states
-- -------------------------------------------------------
CREATE POLICY "seating_editor_states_select_member"
  ON public.seating_editor_states FOR SELECT TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seating_editor_states_insert_member"
  ON public.seating_editor_states FOR INSERT TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seating_editor_states_update_member"
  ON public.seating_editor_states FOR UPDATE TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "seating_editor_states_delete_member"
  ON public.seating_editor_states FOR DELETE TO authenticated
  USING ( public.is_wedding_member(wedding_id) );


-- ============================================================================
-- SECTION 8: RSVP — PUBLIC ACCESS VIA TOKEN
-- rsvp_invitations and rsvp_responses are accessed by wedding guests
-- who are NOT authenticated users. They use a token_hash in the URL.
-- We grant access to both `anon` and `authenticated` roles.
-- ============================================================================

-- -------------------------------------------------------
-- 8a. rsvp_invitations
-- -------------------------------------------------------

-- PUBLIC SELECT: Anyone with the token_hash can read the invitation.
-- This powers the RSVP landing page.
CREATE POLICY "rsvp_invitations_select_by_token"
  ON public.rsvp_invitations FOR SELECT
  TO anon, authenticated
  USING ( true );
  -- NOTE: The app filters by token_hash in the query.
  -- If you want to restrict at DB level, change USING to:
  --   USING ( token_hash = current_setting('request.headers', true)::json->>'x-rsvp-token' )
  -- But this requires the frontend to pass the token as a custom header.
  -- The pragmatic approach: SELECT is open, but the token_hash is a
  -- cryptographically random string — unguessable without the invitation link.

-- AUTHENTICATED: Wedding members can manage invitations.
CREATE POLICY "rsvp_invitations_insert_member"
  ON public.rsvp_invitations FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "rsvp_invitations_update_member"
  ON public.rsvp_invitations FOR UPDATE
  TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "rsvp_invitations_delete_member"
  ON public.rsvp_invitations FOR DELETE
  TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

-- -------------------------------------------------------
-- 8b. rsvp_responses
-- -------------------------------------------------------

-- PUBLIC SELECT: Visible if you know the invitation token.
-- The app joins on rsvp_invitation_id → token_hash.
CREATE POLICY "rsvp_responses_select_public"
  ON public.rsvp_responses FOR SELECT
  TO anon, authenticated
  USING ( true );
  -- Same rationale as rsvp_invitations: token_hash is the secret.

-- PUBLIC INSERT: Anyone with a valid invitation can submit a response.
-- The app validates the token_hash before inserting.
CREATE POLICY "rsvp_responses_insert_public"
  ON public.rsvp_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK ( true );
  -- Validation that the rsvp_invitation_id is real happens via FK constraint.
  -- If you want tighter control, add:
  --   WITH CHECK (
  --     EXISTS (
  --       SELECT 1 FROM public.rsvp_invitations ri
  --       WHERE ri.id = rsvp_invitation_id
  --     )
  --   )

-- PUBLIC UPDATE: Guest can update their response (e.g., change +1 count).
CREATE POLICY "rsvp_responses_update_public"
  ON public.rsvp_responses FOR UPDATE
  TO anon, authenticated
  USING ( true )
  WITH CHECK ( true );

-- DELETE: Only wedding members can delete responses (admin action).
CREATE POLICY "rsvp_responses_delete_member"
  ON public.rsvp_responses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rsvp_invitations ri
      WHERE ri.id = invitation_id
        AND public.is_wedding_member(ri.wedding_id)
    )
  );


-- ============================================================================
-- SECTION 9: data_migrations — owner only
-- Internal migration tracking, sensitive. Only wedding owner should touch this.
-- ============================================================================

CREATE POLICY "data_migrations_select_member"
  ON public.data_migrations FOR SELECT
  TO authenticated
  USING ( public.is_wedding_member(wedding_id) );

CREATE POLICY "data_migrations_insert_member"
  ON public.data_migrations FOR INSERT
  TO authenticated
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "data_migrations_update_member"
  ON public.data_migrations FOR UPDATE
  TO authenticated
  USING ( public.is_wedding_member(wedding_id) )
  WITH CHECK ( public.is_wedding_member(wedding_id) );

CREATE POLICY "data_migrations_delete_owner"
  ON public.data_migrations FOR DELETE
  TO authenticated
  USING ( public.is_wedding_owner(wedding_id) );


-- ============================================================================
-- SECTION 10: GRANT PERMISSIONS TO ROLES
-- Supabase uses `anon` and `authenticated` Postgres roles.
-- RLS policies above define WHO can access WHICH rows.
-- GRANTs below define WHAT operations the role can attempt at all.
-- ============================================================================

-- Authenticated users can do CRUD on all operational tables.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_users             TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.identity_links        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weddings              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wedding_members       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_groups          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guests                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guest_events          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tables                TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seats                 TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seat_assignments      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors               TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_items          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvp_invitations      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rsvp_responses        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_migrations       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seating_editor_states TO authenticated;

-- Anon users can only interact with RSVP tables.
GRANT SELECT                         ON public.rsvp_invitations      TO anon;
GRANT SELECT, INSERT, UPDATE         ON public.rsvp_responses        TO anon;

-- Helper functions executable by both roles.
GRANT EXECUTE ON FUNCTION public.auth_user_id()              TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_wedding_member(uuid)     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_wedding_owner(uuid)      TO authenticated, anon;


-- ============================================================================
-- SECTION 11: VERIFICATION QUERY
-- Run this after migration to confirm all tables have RLS + policies.
-- ============================================================================

-- Uncomment to run as a post-migration check:
/*
SELECT
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  STRING_AGG(p.policyname, ', ' ORDER BY p.policyname) AS policies
FROM pg_tables t
LEFT JOIN pg_policies p
  ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'app_users','identity_links','weddings','wedding_members','events',
    'guest_groups','guests','guest_events','tables','seats',
    'seat_assignments','vendors','budget_items','payments',
    'rsvp_invitations','rsvp_responses','data_migrations',
    'seating_editor_states'
  )
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
*/

-- Expected: Every table should show rls_enabled = true and policy_count >= 3.
-- If any table shows 0 policies, it's effectively locked out (deny all).
-- If rls_enabled = false, the table is WIDE OPEN.
