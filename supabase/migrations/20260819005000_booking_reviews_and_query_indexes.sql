-- Reviews belong to a completed booking. Legacy rows may keep NULL booking_id.
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS unique_service_user_review;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS unique_booking_review;
ALTER TABLE public.reviews ADD CONSTRAINT unique_booking_review UNIQUE (booking_id);

DROP POLICY IF EXISTS "Customers create verified reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers update verified reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.reviews;
CREATE POLICY "Customers create completed booking reviews" ON public.reviews FOR INSERT TO authenticated
WITH CHECK (customer_id = auth.uid() AND booking_id IS NOT NULL AND service_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND b.customer_id::TEXT = auth.uid()::TEXT AND b.service_id::TEXT = service_id::TEXT AND b.status = 'COMPLETED'
));
CREATE POLICY "Customers update completed booking reviews" ON public.reviews FOR UPDATE TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid() AND booking_id IS NOT NULL AND service_id IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.bookings b WHERE b.id = booking_id
    AND b.customer_id::TEXT = auth.uid()::TEXT AND b.service_id::TEXT = service_id::TEXT AND b.status = 'COMPLETED'
));

-- Indexes correspond to paginated listings and provider conflict checks in code.
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON public.bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_created ON public.bookings(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_created ON public.bookings(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_schedule_conflict
  ON public.bookings(provider_id, booking_date, start_time, end_time)
  WHERE status IN ('ASSIGNED', 'IN_PROGRESS');
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON public.services(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_applied_at ON public.provider_profiles(applied_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_service_created ON public.reviews(service_id, created_at DESC);
