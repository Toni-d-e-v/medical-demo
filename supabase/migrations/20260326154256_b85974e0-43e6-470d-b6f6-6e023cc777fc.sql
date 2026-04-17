
-- Modules table
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration text NOT NULL DEFAULT '30 Min',
  day integer NOT NULL DEFAULT 1,
  category text NOT NULL DEFAULT 'Grundlagen',
  content text NOT NULL DEFAULT '',
  video_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Quiz questions table
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Modules: everyone authenticated can read
CREATE POLICY "Authenticated users can read modules"
  ON public.modules FOR SELECT TO authenticated
  USING (true);

-- Modules: admins can insert/update/delete
CREATE POLICY "Admins can manage modules"
  ON public.modules FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'admin'));

-- Quiz questions: everyone authenticated can read
CREATE POLICY "Authenticated users can read quiz questions"
  ON public.quiz_questions FOR SELECT TO authenticated
  USING (true);

-- Quiz questions: admins can manage
CREATE POLICY "Admins can manage quiz questions"
  ON public.quiz_questions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'master_admin') OR has_role(auth.uid(), 'admin'));

-- Updated_at trigger for modules
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
