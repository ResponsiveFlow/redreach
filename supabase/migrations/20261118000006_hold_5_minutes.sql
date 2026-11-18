-- Lo slot resta bloccato 5 minuti (prima 10) mentre l'utente si registra.
update public.app_config set value = 5, updated_at = now() where key = 'hold_minutes';
