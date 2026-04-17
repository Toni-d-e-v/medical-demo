
-- Create storage bucket for module videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-videos', 'module-videos', true);

-- Allow authenticated admins to upload videos
CREATE POLICY "Admins can upload module videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'module-videos'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Allow authenticated admins to update/delete videos
CREATE POLICY "Admins can update module videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'module-videos'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Admins can delete module videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'module-videos'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Allow anyone to read videos (public bucket)
CREATE POLICY "Anyone can read module videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'module-videos');
