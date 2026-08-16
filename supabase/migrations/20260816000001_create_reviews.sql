-- ====================================================================
-- JISR JORDAN - REVIEWS SCHEMA MIGRATION
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_booking_review UNIQUE (booking_id)
);

-- تفعيل سياسات الأمان RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- العميل يقرأ ويكتب تقييماته الخاصة فقط
CREATE POLICY "Users can read all reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = customer_id);