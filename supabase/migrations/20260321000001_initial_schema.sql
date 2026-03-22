-- ============================================================
-- Weddinglist — Initial Schema
-- Migration: 20260321000001_initial_schema.sql
-- ============================================================

-- ============================================================
-- CORE — Identitate & Access
-- ============================================================

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_user_id)
);

CREATE TABLE weddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_users(id),
  title text NOT NULL,
  event_date date NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  plan_tier text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE wedding_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('owner', 'partner', 'planner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, app_user_id)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name text NOT NULL,
  event_type text NOT NULL
    CHECK (event_type IN ('ceremony', 'reception', 'party', 'other')),
  starts_at timestamptz NULL,
  location_name text NULL,
  is_seating_enabled boolean NOT NULL DEFAULT false,
  is_rsvp_enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- GUESTS
-- ============================================================

CREATE TABLE guest_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_type text NULL
    CHECK (group_type IN ('family', 'couple', 'friends', 'custom')),
  sort_order integer NOT NULL DEFAULT 0
    CHECK (sort_order >= 0),
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guest_group_id uuid NULL REFERENCES guest_groups(id) ON DELETE SET NULL,
  first_name text NOT NULL,
  last_name text NULL,
  display_name text NOT NULL,
  side text NULL
    CHECK (side IN ('bride', 'groom', 'both', 'other')),
  notes text NULL,
  is_vip boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE guest_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  attendance_status text NOT NULL DEFAULT 'pending'
    CHECK (attendance_status IN ('pending', 'invited', 'attending', 'declined', 'maybe')),
  meal_choice text NULL,
  plus_one_label text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, guest_id)
);

-- ============================================================
-- SEATING
-- ============================================================

CREATE TABLE tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name text NOT NULL,
  table_type text NOT NULL
    CHECK (table_type IN ('round', 'rect', 'square', 'custom')),
  x numeric(10,2) NOT NULL,
  y numeric(10,2) NOT NULL,
  rotation numeric(6,2) NOT NULL DEFAULT 0
    CHECK (rotation >= 0 AND rotation < 360),
  seat_count integer NOT NULL
    CHECK (seat_count > 0),
  shape_config jsonb NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  seat_index integer NOT NULL,
  label text NULL,
  x_offset numeric(10,2) NULL,
  y_offset numeric(10,2) NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_id, seat_index)
);

CREATE TABLE seat_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
  guest_event_id uuid NOT NULL REFERENCES guest_events(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (seat_id),
  UNIQUE (guest_event_id)
);

-- ============================================================
-- VENDORS
-- ============================================================

CREATE TABLE vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NULL,
  contact_name text NULL,
  email text NULL,
  phone text NULL,
  website text NULL,
  status text NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'contacted', 'meeting', 'booked', 'declined')),
  notes text NULL,
  external_vendor_id text NULL,
  source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'wordpress')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- BUDGET
-- ============================================================

CREATE TABLE budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  vendor_id uuid NULL REFERENCES vendors(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NULL,
  estimated_amount numeric(12,2) NOT NULL DEFAULT 0
    CHECK (estimated_amount >= 0),
  actual_amount numeric(12,2) NULL
    CHECK (actual_amount IS NULL OR actual_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'planned'
    CHECK (status IN ('planned', 'confirmed', 'paid', 'cancelled')),
  due_date date NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  budget_item_id uuid NOT NULL REFERENCES budget_items(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL
    CHECK (amount > 0),
  currency char(3) NOT NULL DEFAULT 'EUR',
  paid_at date NULL,
  payment_method text NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- RSVP
-- ============================================================

CREATE TABLE rsvp_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'opened', 'responded', 'expired')),
  sent_at timestamptz NULL,
  responded_at timestamptz NULL,
  max_guests integer NULL
    CHECK (max_guests IS NULL OR max_guests >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (token_hash)
);

CREATE TABLE rsvp_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES rsvp_invitations(id) ON DELETE CASCADE,
  guest_event_id uuid NOT NULL REFERENCES guest_events(id) ON DELETE CASCADE,
  status text NOT NULL
    CHECK (status IN ('attending', 'declined', 'maybe')),
  meal_choice text NULL,
  note text NULL,
  responded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guest_event_id)
);

-- ============================================================
-- OPS
-- ============================================================

CREATE TABLE data_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  migration_key text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_id, migration_key)
);

-- ============================================================
-- INDEXURI
-- ============================================================

-- wedding_members
CREATE INDEX idx_wedding_members_user ON wedding_members (app_user_id);

-- events
CREATE INDEX idx_events_wedding_sort ON events (wedding_id, sort_order);

-- guest_groups
CREATE INDEX idx_guest_groups_wedding_sort ON guest_groups (wedding_id, sort_order);

-- guests
CREATE INDEX idx_guests_wedding ON guests (wedding_id);
CREATE INDEX idx_guests_wedding_name ON guests (wedding_id, display_name);
CREATE INDEX idx_guests_group ON guests (guest_group_id);

-- guest_events
CREATE INDEX idx_guest_events_wedding_event ON guest_events (wedding_id, event_id);
CREATE INDEX idx_guest_events_guest ON guest_events (guest_id);
CREATE INDEX idx_guest_events_status ON guest_events (wedding_id, attendance_status);

-- tables
CREATE INDEX idx_tables_event_sort ON tables (event_id, sort_order);
CREATE INDEX idx_tables_wedding_event ON tables (wedding_id, event_id);

-- seats
CREATE INDEX idx_seats_event_table ON seats (event_id, table_id);

-- seat_assignments
CREATE INDEX idx_seat_assignments_wedding_event ON seat_assignments (wedding_id, event_id);

-- budget_items
CREATE INDEX idx_budget_items_status ON budget_items (wedding_id, status);
CREATE INDEX idx_budget_items_due ON budget_items (wedding_id, due_date);

-- payments
CREATE INDEX idx_payments_budget_item ON payments (budget_item_id);
CREATE INDEX idx_payments_wedding_paid ON payments (wedding_id, paid_at);

-- vendors
CREATE INDEX idx_vendors_status ON vendors (wedding_id, status);
CREATE INDEX idx_vendors_category ON vendors (wedding_id, category);

-- rsvp_invitations
CREATE INDEX idx_rsvp_invitations_wedding_event ON rsvp_invitations (wedding_id, event_id);
CREATE INDEX idx_rsvp_invitations_status ON rsvp_invitations (status);

-- rsvp_responses
CREATE INDEX idx_rsvp_responses_invitation ON rsvp_responses (invitation_id);
CREATE INDEX idx_rsvp_responses_wedding_event ON rsvp_responses (wedding_id, event_id);

-- data_migrations
CREATE INDEX idx_data_migrations_status ON data_migrations (status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE identity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wedding_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_migrations ENABLE ROW LEVEL SECURITY;