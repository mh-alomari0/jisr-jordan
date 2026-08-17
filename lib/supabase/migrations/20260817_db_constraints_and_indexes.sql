-- 1. إضافة قيود الرتب والأسعار وحالات الحجز
ALTER TABLE public.users 
  DROP CONSTRAINT IF EXISTS check_user_role,
  ADD CONSTRAINT check_user_role 
  CHECK (role IN ('CUSTOMER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'));

ALTER TABLE public.services 
  DROP CONSTRAINT IF EXISTS check_service_price,
  ADD CONSTRAINT check_service_price 
  CHECK (price >= 0);

ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS check_booking_status,
  ADD CONSTRAINT check_booking_status 
  CHECK (status IN ('PENDING', 'CONFIRMED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'));

-- 2. إضافة الفهارس لتسريع استعلامات البحث والتقارير
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_services_active ON public.services(is_active);