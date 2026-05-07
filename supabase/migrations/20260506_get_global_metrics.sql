
-- Create an RPC function to fetch global stats bypassing RLS
-- This uses SECURITY DEFINER to run with the privileges of the function creator (admin)
CREATE OR REPLACE FUNCTION get_global_metrics()
RETURNS TABLE (
  total_drills BIGINT,
  total_feedback BIGINT,
  total_minutes BIGINT,
  total_learners BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.recordings),
    (SELECT COUNT(*) FROM public.recording_feedback),
    (SELECT COALESCE(SUM(duration_ms), 0) / 60000 FROM public.recordings),
    (SELECT COUNT(*) FROM public.profiles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function for everyone
GRANT EXECUTE ON FUNCTION get_global_metrics() TO anon, authenticated;
