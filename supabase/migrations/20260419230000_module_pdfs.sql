
-- Add pdf_url column to modules
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS pdf_url text;

-- Create storage bucket for module PDFs
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-pdfs', 'module-pdfs', true)
ON CONFLICT (id) DO NOTHING;

-- Admins can upload PDFs
CREATE POLICY "Admins can upload module pdfs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'module-pdfs'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Admins can update PDFs
CREATE POLICY "Admins can update module pdfs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'module-pdfs'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Admins can delete PDFs
CREATE POLICY "Admins can delete module pdfs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'module-pdfs'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Anyone can read PDFs (public bucket)
CREATE POLICY "Anyone can read module pdfs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'module-pdfs');
