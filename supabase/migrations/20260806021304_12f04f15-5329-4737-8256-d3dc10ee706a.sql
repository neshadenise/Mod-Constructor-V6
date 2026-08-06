CREATE TABLE public.workspace_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_state TO authenticated;
GRANT ALL ON public.workspace_state TO service_role;
ALTER TABLE public.workspace_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own workspace" ON public.workspace_state
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER workspace_state_touch BEFORE UPDATE ON public.workspace_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();