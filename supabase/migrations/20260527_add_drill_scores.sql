-- Store per-drill score history for sparklines on the Pathway page.
-- Each key is a lesson ID; value is an ordered array of integer scores (0–100).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS drill_scores jsonb DEFAULT '{}'::jsonb;
