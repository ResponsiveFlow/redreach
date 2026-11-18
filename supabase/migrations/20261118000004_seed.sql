-- Configurazione di default (modificabile da /admin) e primo settore di ogni zona.

insert into public.app_config (key, value, description) values
  ('sector_cols',            30,  'Colonne di un nuovo settore'),
  ('sector_rows',            40,  'Righe di un nuovo settore'),
  ('sector_fill_threshold',  0.7, 'Quota di slot occupati oltre cui si apre un nuovo settore (0-1)'),
  ('hold_minutes',           10,  'Minuti di blocco di uno slot durante la registrazione'),
  ('deposits_min',           1,   'Giacimenti minimi per settore'),
  ('deposits_max',           3,   'Giacimenti massimi per settore');

insert into public.app_counters (key, value) values ('colonist', 0);

select public.create_sector('ice');
select public.create_sector('metal');
select public.create_sector('sun');
