-- Function to atomically select a random prize and update its stock
CREATE OR REPLACE FUNCTION select_and_update_random_prize()
RETURNS JSON AS $$
DECLARE
  selected_prize RECORD;
  updated_prize JSON;
BEGIN
  -- Step 1: Randomly pick a prize with available stock and lock it
  SELECT *
  INTO selected_prize
  FROM prizes
  WHERE stock > 0
  ORDER BY random()
  LIMIT 1
  FOR UPDATE;

  -- Step 2: If no prize found, return error
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No prizes left in stock'
    );
  END IF;

  -- Step 3: Update the selected prize
  UPDATE prizes
  SET
    stock = stock - 1,
    claimed = COALESCE(claimed, 0) + 1,
    updated_at = now()
  WHERE id = selected_prize.id
  RETURNING to_json(prizes.*) INTO updated_prize;

  -- Step 4: Return success and prize info
  RETURN json_build_object(
    'success', true,
    'data', updated_prize
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;
