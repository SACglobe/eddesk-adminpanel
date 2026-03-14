-- Trigger function to automatically confirm admin users when their auth record is updated
-- (e.g., when they set their password during invite activation)
create or replace function public.handle_admin_activation()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
    -- Only update if the user exists in adminusers and is still pending
    update public.adminusers
    set 
        status = 'confirmed',
        updatedat = now()
    where 
        authuserid = new.id 
        and status = 'pending';
        
    return new;
end;
$$;

-- Trigger on auth.users table
-- NOTE: In a managed Supabase environment, you might need to apply this 
-- via the SQL Editor as 'auth' schema triggers require elevated permissions.
drop trigger if exists on_auth_user_activated on auth.users;
create trigger on_auth_user_activated
    after update of encrypted_password on auth.users
    for each row
    execute function public.handle_admin_activation();
