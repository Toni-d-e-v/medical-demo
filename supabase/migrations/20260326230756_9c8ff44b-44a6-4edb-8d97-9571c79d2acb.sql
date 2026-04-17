
CREATE TABLE public.category_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read category order"
  ON public.category_order FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage category order"
  ON public.category_order FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'admin'));

-- Seed existing categories
INSERT INTO public.category_order (category_name, sort_order) VALUES
  ('Administration', 0),
  ('Untersuchungen', 1),
  ('Prozesse SOP', 2),
  ('IT/EDV', 3);
