CREATE POLICY "Public can read event images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'event-images');

CREATE POLICY "Authenticated can upload event images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-images' AND owner = auth.uid());

CREATE POLICY "Owner can update own event images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-images' AND owner = auth.uid());

CREATE POLICY "Owner can delete own event images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-images' AND owner = auth.uid());