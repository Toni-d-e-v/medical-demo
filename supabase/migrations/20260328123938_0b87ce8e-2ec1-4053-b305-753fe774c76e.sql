
CREATE TABLE public.user_display_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_display_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage display order"
  ON public.user_display_order
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'master_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read display order"
  ON public.user_display_order
  FOR SELECT
  TO authenticated
  USING (true);
