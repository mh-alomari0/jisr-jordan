-- Phase 2: Database Performance Indexes
-- Adds missing indexes on the most queried columns across the application.
-- All use IF NOT EXISTS for idempotency.

-- ====================================================================
-- bookings: most queried table (customer view, provider view, admin view)
-- ====================================================================

-- Customer bookings listing: WHERE customer_id = $1
CREATE INDEX IF NOT EXISTS idx_bookings_customer
  ON public.bookings(customer_id);

-- Provider bookings listing: WHERE provider_id = $1
CREATE INDEX IF NOT EXISTS idx_bookings_provider
  ON public.bookings(provider_id);

-- Admin dashboard stats & public metrics: WHERE status = 'COMPLETED' etc.
CREATE INDEX IF NOT EXISTS idx_bookings_status
  ON public.bookings(status);

-- Review eligibility check: WHERE service_id = $1 AND customer_id = $1
CREATE INDEX IF NOT EXISTS idx_bookings_service_customer
  ON public.bookings(service_id, customer_id);

-- Idempotency check in create_booking_atomic RPC
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_idempotency_key
  ON public.bookings(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Schedule conflict check: WHERE booking_date = $1 AND provider_id = $1
CREATE INDEX IF NOT EXISTS idx_bookings_date_provider
  ON public.bookings(booking_date, provider_id);

-- ====================================================================
-- users: role-based filtering in proxy, metrics, admin views
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users(role);

-- ====================================================================
-- audit_logs: already indexed via created_at ordering in get-audit-logs
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);
