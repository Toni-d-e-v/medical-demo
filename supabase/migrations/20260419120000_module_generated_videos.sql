
-- Create storage bucket for generated stick-figure videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-generated-videos', 'module-generated-videos', true);

-- Allow authenticated admins to upload generated videos
CREATE POLICY "Admins can upload generated videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'module-generated-videos'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Allow authenticated admins to update/delete generated videos
CREATE POLICY "Admins can update generated videos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'module-generated-videos'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

CREATE POLICY "Admins can delete generated videos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'module-generated-videos'
  AND (public.has_role(auth.uid(), 'master_admin'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))
);

-- Allow anyone to read generated videos (public bucket)
CREATE POLICY "Anyone can read generated videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'module-generated-videos');
