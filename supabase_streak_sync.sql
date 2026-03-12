
-- ARCHITECTURE FIX: Streak Synchronization
-- Run this in your Supabase SQL Editor

-- 1. Ensure columns exist in profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_streak_start TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- 2. Function to update streak on every session
CREATE OR REPLACE FUNCTION public.handle_session_streak_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profile in a single atomic operation
    UPDATE public.profiles
    SET 
        -- Reset streak start if regret_score > 0 (any session is a break in streak)
        current_streak_start = CASE 
            WHEN NEW.regret_score > 0 THEN COALESCE(NEW.created_at, NOW())
            ELSE current_streak_start 
        END,
        -- Recalculate current_streak (days) immediately
        current_streak = floor(extract(epoch from (NOW() - (
            CASE 
                WHEN NEW.regret_score > 0 THEN COALESCE(NEW.created_at, NOW())
                ELSE current_streak_start 
            END
        ))) / 86400),
        updated_at = NOW()
    WHERE id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger on sessions table
DROP TRIGGER IF EXISTS on_session_created_sync_streak ON public.sessions;
CREATE TRIGGER on_session_created_sync_streak
AFTER INSERT ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.handle_session_streak_sync();

-- 4. Backfill existing streaks (optional but recommended)
UPDATE public.profiles p
SET current_streak_start = COALESCE(
    (SELECT created_at FROM public.sessions s 
     WHERE s.user_id = p.id AND s.regret_score > 0 
     ORDER BY created_at DESC LIMIT 1),
    p.current_streak_start,
    NOW()
);

UPDATE public.profiles
SET current_streak = floor(extract(epoch from (now() - current_streak_start)) / 86400);
