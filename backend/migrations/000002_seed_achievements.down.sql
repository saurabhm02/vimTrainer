DELETE FROM achievements WHERE slug IN (
    'first_session','ten_sessions','fifty_sessions',
    'first_mastery','ten_mastered','speed_demon','accuracy_king',
    'three_day_streak','seven_day_streak','thirty_day_streak',
    'first_import','github_import'
);
