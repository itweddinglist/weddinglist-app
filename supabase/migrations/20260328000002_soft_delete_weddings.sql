-- ============================================================
-- Soft Delete pentru weddings
-- Migration: 20260328000002_soft_delete_weddings.sql
-- Must Now #27
--
-- Adaugă coloana deleted_at pe weddings.
-- Recovery window: 30 zile.
-- Toate query-urile SELECT trebuie să filtreze deleted_at IS NULL.
-- ============================================================

-- 1. Adaugă coloana deleted_at
ALTER TABLE public.weddings
  ADD COLUMN deleted_at timestamptz NULL;

-- 2. Index pentru filtrare eficientă (cele mai multe query-uri vor filtra IS NULL)
CREATE INDEX idx_weddings_deleted_at
  ON public.weddings (deleted_at)
  WHERE deleted_at IS NULL;

-- 3. VIEW care expune doar wedding-urile active (neșterse)
--    Toate query-urile din app trebuie să folosească acest view
--    în loc de tabelul direct, sau să adauge WHERE deleted_at IS NULL explicit.
CREATE VIEW public.active_weddings AS
  SELECT * FROM public.weddings
  WHERE deleted_at IS NULL;

-- 4. Actualizează RLS policy pentru SELECT pe weddings
--    să excludă automat wedding-urile șterse
--    (policies existente nu au filtru pe deleted_at)
DROP POLICY IF EXISTS "weddings_select_member" ON public.weddings;

CREATE POLICY "weddings_select_member"
  ON public.weddings FOR SELECT
  TO authenticated
  USING (
    public.is_wedding_member(id)
    AND deleted_at IS NULL
  );

-- 5. Funcție de soft delete — de apelat din API route, nu direct din client
CREATE OR REPLACE FUNCTION public.soft_delete_wedding(p_wedding_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Verifică că userul curent e owner-ul wedding-ului
  IF NOT public.is_wedding_owner(p_wedding_id) THEN
    RAISE EXCEPTION 'Access denied: only the wedding owner can delete a wedding';
  END IF;

  -- Verifică că nu e deja șters
  IF EXISTS (
    SELECT 1 FROM public.weddings
    WHERE id = p_wedding_id AND deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Wedding is already deleted';
  END IF;

  -- Soft delete
  UPDATE public.weddings
  SET
    deleted_at = now(),
    updated_at = now()
  WHERE id = p_wedding_id;
END;
$$;

-- 6. Funcție de recovery (admin only — via service role)
--    Recovery window: 30 zile de la deleted_at
COMMENT ON COLUMN public.weddings.deleted_at IS
  'Soft delete timestamp. NULL = activ. Recovery posibil 30 zile după ștergere.';

-- ============================================================
-- NOTE PENTRU IMPLEMENTARE:
--
-- Toate SELECT-urile din app pe tabela weddings TREBUIE să aibă:
--   WHERE deleted_at IS NULL
-- SAU să folosească view-ul active_weddings.
--
-- RLS policy de SELECT a fost actualizată să excludă automat
-- wedding-urile șterse pentru userul autentificat.
--
-- Recovery se face DOAR prin service role (admin tool):
--   UPDATE weddings SET deleted_at = NULL WHERE id = '<uuid>'
--   AND deleted_at > now() - interval '30 days';
--
-- Purge automat după 30 zile — de implementat via pg_cron sau Edge Function:
--   DELETE FROM weddings
--   WHERE deleted_at IS NOT NULL
--   AND deleted_at < now() - interval '30 days';
-- ============================================================
