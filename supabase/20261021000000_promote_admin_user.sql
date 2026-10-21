-- Promove o usuário admin e garante role de administrador
-- Executado no Supabase para conceder acesso total ao painel /admin

-- 1. Promove ou insere a role 'admin' para o usuário admin@transferticketbrasil.com.br
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@transferticketbrasil.com.br' OR email ILIKE '%admin%'
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Atualiza a role caso já exista como 'user'
UPDATE public.user_roles
SET role = 'admin'::public.app_role
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@transferticketbrasil.com.br' OR email ILIKE '%admin%'
);

-- 3. Atualiza a trigger para que qualquer novo usuário com email contendo 'admin' já receba a role 'admin' automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email ILIKE '%admin%' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
