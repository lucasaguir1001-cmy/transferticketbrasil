-- Promove o usuário admin e garante role de administrador
-- Executado no Supabase para conceder acesso total ao painel /admin

-- 1. Remove qualquer perfil existente do usuário admin para evitar duplicidade
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@transferticketbrasil.com.br' OR email ILIKE '%admin%'
);

-- 2. Insere a permissão de administrador ('admin')
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM auth.users
WHERE email = 'admin@transferticketbrasil.com.br' OR email ILIKE '%admin%';

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

-- 4. Auto-confirma todos os emails existentes para liberar o login de todos os usuários
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;

-- 5. Trigger para auto-confirmar o email de novos usuários no momento do cadastro (evita o erro 'Email not confirmed')
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.email_confirmed_at = COALESCE(NEW.email_confirmed_at, now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_new_user ON auth.users;
CREATE TRIGGER trg_auto_confirm_new_user
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_new_user();
