begin;
alter policy "Permitir subida a usuarios autenticados 1peuqw_0" on storage.objects to authenticated;
alter policy "Permitir subida a usuarios autenticados 1peuqw_1" on storage.objects to authenticated;
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']::text[]
where id = 'logos';
commit;;
