-- ============================================
-- SwipePredict Demo Mode Setup
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Trigger: Give new users 20 DEMO USDC on registration
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, nickname, balance_usdc)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nickname', 'Player_' || LEFT(NEW.id::text, 8)),
    20.00  -- 20 DEMO USDC for new users
  );
  
  -- Record the demo deposit transaction
  INSERT INTO public.transactions (user_id, type, amount_usdc)
  VALUES (NEW.id, 'deposit', 20.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Seed Demo Cards (Liga MX matches)
-- ============================================

-- Clear existing demo cards (optional, remove if you want to keep them)
-- DELETE FROM public.cards WHERE match_id >= 1001 AND match_id <= 1010;

-- Insert demo Liga MX cards
INSERT INTO public.cards (match_id, sport, event_type, question_text, match_info, team_home, team_away, match_start_at, odds_yes, odds_no, pool_yes, pool_no, count_yes, count_no, status)
VALUES
  -- Club América vs Guadalajara (El Clásico)
  (1001, 'football', 'goal_first_half', '¿Habrá gol en la primera mitad?', 'Liga MX - Jornada 15', 'Club América', 'Guadalajara', NOW() + INTERVAL '2 hours', 1.85, 2.05, 125.50, 98.20, 45, 32, 'open'),
  (1001, 'football', 'goal_both_teams', '¿Ambos equipos anotarán?', 'Liga MX - Jornada 15', 'Club América', 'Guadalajara', NOW() + INTERVAL '2 hours', 1.75, 2.15, 200.00, 150.00, 78, 55, 'open'),
  (1001, 'football', 'over_2_5_goals', '¿Más de 2.5 goles en el partido?', 'Liga MX - Jornada 15', 'Club América', 'Guadalajara', NOW() + INTERVAL '2 hours', 2.10, 1.80, 88.00, 112.00, 30, 42, 'open'),
  
  -- Cruz Azul vs UNAM Pumas
  (1002, 'football', 'first_goal_home', '¿Cruz Azul anotará primero?', 'Liga MX - Jornada 15', 'Cruz Azul', 'UNAM Pumas', NOW() + INTERVAL '5 hours', 1.90, 2.00, 95.00, 105.00, 38, 40, 'open'),
  (1002, 'football', 'card_before_30', '¿Tarjeta antes del minuto 30?', 'Liga MX - Jornada 15', 'Cruz Azul', 'UNAM Pumas', NOW() + INTERVAL '5 hours', 1.65, 2.35, 180.00, 80.00, 65, 28, 'open'),
  
  -- Tigres UANL vs Monterrey (Clásico Regio)
  (1003, 'football', 'goal_first_half', '¿Gol en los primeros 45 minutos?', 'Liga MX - Jornada 16', 'Tigres UANL', 'Monterrey', NOW() + INTERVAL '24 hours', 1.80, 2.10, 220.00, 180.00, 88, 65, 'open'),
  (1003, 'football', 'penalty', '¿Habrá penal en el partido?', 'Liga MX - Jornada 16', 'Tigres UANL', 'Monterrey', NOW() + INTERVAL '24 hours', 3.50, 1.30, 40.00, 160.00, 15, 60, 'open'),
  
  -- Toluca vs Santos Laguna
  (1004, 'football', 'clean_sheet_home', '¿Toluca dejará su portería en cero?', 'Liga MX - Jornada 16', 'Toluca', 'Santos Laguna', NOW() + INTERVAL '26 hours', 2.40, 1.60, 55.00, 95.00, 20, 38, 'open'),
  (1004, 'football', 'over_2_5_goals', '¿Más de 2.5 goles?', 'Liga MX - Jornada 16', 'Toluca', 'Santos Laguna', NOW() + INTERVAL '26 hours', 2.00, 1.90, 100.00, 110.00, 42, 45, 'open'),
  
  -- León vs Club América
  (1005, 'football', 'first_goal_away', '¿Club América anotará primero?', 'Liga MX - Jornada 17', 'León', 'Club América', NOW() + INTERVAL '48 hours', 2.20, 1.70, 70.00, 130.00, 28, 52, 'open'),
  (1005, 'football', 'goal_both_teams', '¿Ambos equipos marcarán?', 'Liga MX - Jornada 17', 'León', 'Club América', NOW() + INTERVAL '48 hours', 1.70, 2.20, 150.00, 100.00, 60, 38, 'open'),
  
  -- Guadalajara vs Tigres UANL
  (1006, 'football', 'card_before_30', '¿Tarjeta amarilla antes del min 30?', 'Liga MX - Jornada 17', 'Guadalajara', 'Tigres UANL', NOW() + INTERVAL '72 hours', 1.55, 2.50, 200.00, 85.00, 75, 30, 'open')
ON CONFLICT (id) DO NOTHING;

-- 3. Verify setup
-- ============================================
SELECT 'Demo setup complete!' as status;
SELECT COUNT(*) as total_demo_cards FROM public.cards WHERE match_id >= 1001 AND match_id <= 1010;
