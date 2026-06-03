CREATE POLICY "company-logos read members"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'company-logos' AND public.is_company_member(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "company-logos write admins"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos' AND public.has_company_role(((storage.foldername(name))[1])::uuid, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));

CREATE POLICY "company-logos update admins"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos' AND public.has_company_role(((storage.foldername(name))[1])::uuid, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role,'manager'::app_role]));

CREATE POLICY "company-logos delete admins"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos' AND public.has_company_role(((storage.foldername(name))[1])::uuid, auth.uid(), VARIADIC ARRAY['owner'::app_role,'admin'::app_role]));
