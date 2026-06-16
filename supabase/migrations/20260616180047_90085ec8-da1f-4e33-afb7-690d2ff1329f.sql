DROP POLICY IF EXISTS "Anyone can view material images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own material images" ON storage.objects;

CREATE POLICY "Users can view own material images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'material-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);