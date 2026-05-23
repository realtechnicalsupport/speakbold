-- Function to add ELO to a user with a floor of 0
CREATE OR REPLACE FUNCTION add_user_elo(user_id UUID, elo_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_elo INTEGER;
BEGIN
  UPDATE profiles
  SET elo = GREATEST(0, elo + elo_amount)
  WHERE id = user_id
  RETURNING elo INTO new_elo;

  RETURN new_elo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION add_user_elo(UUID, INTEGER) TO authenticated;
