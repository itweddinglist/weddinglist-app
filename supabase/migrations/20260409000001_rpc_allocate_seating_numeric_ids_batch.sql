CREATE OR REPLACE FUNCTION public.allocate_seating_numeric_ids_batch(p_wedding_id uuid, p_event_id uuid, p_entity_type text, p_entity_uuids uuid[])
 RETURNS TABLE(entity_uuid uuid, numeric_id integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_uuid uuid;
  v_counter int;
  v_idx int := 0;
BEGIN
  -- Obține sau inițializează counter-ul pentru acest wedding/event/type
  INSERT INTO seating_id_counters (wedding_id, event_id, entity_type, current_val)
  VALUES (p_wedding_id, p_event_id, p_entity_type, 0)
  ON CONFLICT (wedding_id, event_id, entity_type) DO NOTHING;

  -- Alocă IDs secvențial pentru fiecare UUID
  FOREACH v_uuid IN ARRAY p_entity_uuids LOOP
    v_idx := v_idx + 1;
    UPDATE seating_id_counters
    SET current_val = current_val + 1
    WHERE wedding_id = p_wedding_id
      AND event_id = p_event_id
      AND entity_type = p_entity_type
    RETURNING current_val INTO v_counter;

    entity_uuid := v_uuid;
    numeric_id  := v_counter;
    RETURN NEXT;
  END LOOP;
END;
$function$
