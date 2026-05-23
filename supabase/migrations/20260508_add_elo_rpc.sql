-- Drop existing function to avoid return type conflicts
DROP FUNCTION IF EXISTS public.add_user_elo(UUID, INTEGER);

-- Function to safely update user ELO
CREATE OR REPLACE FUNCTION public.add_user_elo(user_id UUID, elo_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles
  SET elo = GREATEST(0, elo + elo_amount)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.add_user_elo(UUID, INTEGER) TO authenticated;
