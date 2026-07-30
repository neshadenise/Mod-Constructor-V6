
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  version text NOT NULL DEFAULT '0.1.0',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects" ON public.projects FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind text NOT NULL,
  name text NOT NULL,
  parent_id uuid REFERENCES public.resources ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resources_project_idx ON public.resources (project_id, kind);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own resources" ON public.resources FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER resources_touch BEFORE UPDATE ON public.resources FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.resource_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  from_resource uuid NOT NULL REFERENCES public.resources ON DELETE CASCADE,
  to_resource uuid NOT NULL REFERENCES public.resources ON DELETE CASCADE,
  relation text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resource_links TO authenticated;
GRANT ALL ON public.resource_links TO service_role;
ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own links" ON public.resource_links FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.chatgpt_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  client_id text,
  client_name text NOT NULL DEFAULT 'ChatGPT',
  permissions text[] NOT NULL DEFAULT ARRAY['projects.read','resources.create','resources.update','projects.validate','builds.request','builds.read'],
  active_project_id uuid REFERENCES public.projects ON DELETE SET NULL,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chatgpt_connections TO authenticated;
GRANT ALL ON public.chatgpt_connections TO service_role;
ALTER TABLE public.chatgpt_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own connections" ON public.chatgpt_connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.change_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects ON DELETE CASCADE,
  connection_id uuid REFERENCES public.chatgpt_connections ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'chatgpt',
  tool_name text NOT NULL,
  tool_args jsonb NOT NULL DEFAULT '{}'::jsonb,
  previous_state jsonb,
  new_state jsonb,
  undo_payload jsonb,
  result text NOT NULL DEFAULT 'ok',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  undone_at timestamptz
);
CREATE INDEX change_sets_project_idx ON public.change_sets (project_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_sets TO authenticated;
GRANT ALL ON public.change_sets TO service_role;
ALTER TABLE public.change_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own change sets" ON public.change_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.builds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'requested',
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  message text,
  artifact_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.builds TO authenticated;
GRANT ALL ON public.builds TO service_role;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own builds" ON public.builds FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
