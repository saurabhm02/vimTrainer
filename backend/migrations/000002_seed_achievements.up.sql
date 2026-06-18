INSERT INTO achievements (slug, name, description, category, condition_type, condition_value) VALUES
('first_session',     'First Steps',       'Complete your first practice session',                       'practice', 'sessions_completed',     1),
('ten_sessions',      'Getting Warmed Up', 'Complete 10 practice sessions',                              'practice', 'sessions_completed',    10),
('fifty_sessions',    'Dedicated Learner', 'Complete 50 practice sessions',                              'practice', 'sessions_completed',    50),
('first_mastery',     'Mastered One',      'Achieve mastery on your first keymap',                       'mastery',  'keymaps_mastered',        1),
('ten_mastered',      'Growing Arsenal',   'Achieve mastery on 10 keymaps',                              'mastery',  'keymaps_mastered',       10),
('speed_demon',       'Speed Demon',       'Complete a session with average response time under 1000ms', 'mastery',  'avg_response_ms',      1000),
('accuracy_king',     'Accuracy King',     'Complete a session with 100%% accuracy (min 10 commands)',   'mastery',  'perfect_session',        10),
('three_day_streak',  'Three Peat',        'Maintain a 3-day practice streak',                          'streak',   'streak_days',             3),
('seven_day_streak',  'Week Warrior',      'Maintain a 7-day practice streak',                          'streak',   'streak_days',             7),
('thirty_day_streak', 'Monthly Master',    'Maintain a 30-day practice streak',                         'streak',   'streak_days',            30),
('first_import',      'Config Imported',   'Import your first Neovim configuration',                    'import',   'keymaps_imported',         1),
('github_import',     'Dotfiles Master',   'Import your configuration from a GitHub repository',        'import',   'github_import_completed',  1)
ON CONFLICT (slug) DO NOTHING;
