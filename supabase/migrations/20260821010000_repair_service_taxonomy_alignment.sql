-- Repair marketplace taxonomy drift.
--
-- The stable root ids were renamed in-place in one environment (for example,
-- the education root was renamed to beauty). Services kept their original ids,
-- so unrelated service types appeared together. Restore the canonical roots,
-- keep beauty as its own root, then align legacy/custom service types.

-- 1. Restore the meaning of the original stable root identifiers.
UPDATE public.service_categories
SET
  name_ar = CASE id
    WHEN '20000000-0000-4000-8000-000000000001'::UUID THEN 'الخدمات المنزلية'
    WHEN '20000000-0000-4000-8000-000000000002'::UUID THEN 'التقنية والبرمجة'
    WHEN '20000000-0000-4000-8000-000000000003'::UUID THEN 'التعليم والتدريب'
    WHEN '20000000-0000-4000-8000-000000000004'::UUID THEN 'التصميم والإبداع'
    WHEN '20000000-0000-4000-8000-000000000005'::UUID THEN 'الأعمال والاستشارات'
    WHEN '20000000-0000-4000-8000-000000000006'::UUID THEN 'المناسبات'
    WHEN '20000000-0000-4000-8000-000000000007'::UUID THEN 'الصيانة والإصلاح'
    WHEN '20000000-0000-4000-8000-000000000008'::UUID THEN 'خدمات أخرى'
  END,
  description_ar = CASE id
    WHEN '20000000-0000-4000-8000-000000000001'::UUID THEN 'خدمات المنزل اليومية والتنظيف والتجهيزات.'
    WHEN '20000000-0000-4000-8000-000000000002'::UUID THEN 'حلول رقمية وبرمجية ودعم تقني عن بُعد أو كمشاريع.'
    WHEN '20000000-0000-4000-8000-000000000003'::UUID THEN 'دروس وجلسات تدريب فردية ومهنية.'
    WHEN '20000000-0000-4000-8000-000000000004'::UUID THEN 'تصميم بصري ومحتوى إبداعي وخدمات إنتاج.'
    WHEN '20000000-0000-4000-8000-000000000005'::UUID THEN 'خدمات أعمال مهنية تخضع لسياسة المنصة ونطاق الترخيص.'
    WHEN '20000000-0000-4000-8000-000000000006'::UUID THEN 'تنظيم وتصوير وتجهيز المناسبات.'
    WHEN '20000000-0000-4000-8000-000000000007'::UUID THEN 'إصلاح الأجهزة والأثاث والأعمال المتخصصة.'
    WHEN '20000000-0000-4000-8000-000000000008'::UUID THEN 'خدمات متنوعة بعد مراجعة الإدارة والتأكد من ملاءمتها.'
  END,
  icon = CASE id
    WHEN '20000000-0000-4000-8000-000000000001'::UUID THEN 'house'
    WHEN '20000000-0000-4000-8000-000000000002'::UUID THEN 'code-2'
    WHEN '20000000-0000-4000-8000-000000000003'::UUID THEN 'graduation-cap'
    WHEN '20000000-0000-4000-8000-000000000004'::UUID THEN 'palette'
    WHEN '20000000-0000-4000-8000-000000000005'::UUID THEN 'briefcase-business'
    WHEN '20000000-0000-4000-8000-000000000006'::UUID THEN 'party-popper'
    WHEN '20000000-0000-4000-8000-000000000007'::UUID THEN 'wrench'
    WHEN '20000000-0000-4000-8000-000000000008'::UUID THEN 'shapes'
  END,
  display_order = CASE id
    WHEN '20000000-0000-4000-8000-000000000001'::UUID THEN 10
    WHEN '20000000-0000-4000-8000-000000000002'::UUID THEN 20
    WHEN '20000000-0000-4000-8000-000000000003'::UUID THEN 30
    WHEN '20000000-0000-4000-8000-000000000009'::UUID THEN 35
    WHEN '20000000-0000-4000-8000-000000000004'::UUID THEN 40
    WHEN '20000000-0000-4000-8000-000000000005'::UUID THEN 50
    WHEN '20000000-0000-4000-8000-000000000006'::UUID THEN 60
    WHEN '20000000-0000-4000-8000-000000000007'::UUID THEN 70
    WHEN '20000000-0000-4000-8000-000000000008'::UUID THEN 80
  END,
  is_active = TRUE
WHERE id IN (
  '20000000-0000-4000-8000-000000000001'::UUID,
  '20000000-0000-4000-8000-000000000002'::UUID,
  '20000000-0000-4000-8000-000000000003'::UUID,
  '20000000-0000-4000-8000-000000000004'::UUID,
  '20000000-0000-4000-8000-000000000005'::UUID,
  '20000000-0000-4000-8000-000000000006'::UUID,
  '20000000-0000-4000-8000-000000000007'::UUID,
  '20000000-0000-4000-8000-000000000008'::UUID
);

-- 2. Beauty is a separate root; it must never reuse the education id.
INSERT INTO public.service_categories (
  id, parent_id, slug, name_ar, description_ar, icon,
  display_order, requires_moderation, is_active
)
VALUES (
  '20000000-0000-4000-8000-000000000009',
  NULL,
  'beauty-care',
  'جمال وعناية للسيدات',
  'خدمات العناية الشخصية والجمال والعناية بالشعر والبشرة والأظافر.',
  'sparkles',
  35,
  FALSE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  parent_id = NULL,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = TRUE;

INSERT INTO public.service_categories (
  id, parent_id, slug, name_ar, description_ar, icon,
  display_order, requires_moderation, is_active
)
VALUES
  ('27000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000009', 'hair-care', 'العناية بالشعر', 'قص وتصفيف وعناية بالشعر.', 'scissors', 10, FALSE, TRUE),
  ('27000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000009', 'barber-grooming', 'حلاقة وعناية شخصية', 'حلاقة وتحديد وتهذيب وعناية شخصية.', 'scissors', 20, FALSE, TRUE),
  ('27000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000009', 'skin-care', 'العناية بالبشرة', 'تنظيف وعناية غير طبية بالبشرة.', 'sparkles', 30, FALSE, TRUE),
  ('27000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000009', 'nail-care', 'العناية بالأظافر', 'ترتيب وعناية تجميلية بالأظافر.', 'hand', 40, FALSE, TRUE),
  ('27000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000009', 'makeup-beauty', 'مكياج وتجميل', 'خدمات مكياج وتجميل للمناسبات والاستخدام الشخصي.', 'palette', 50, FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = TRUE;

-- A dedicated destination for furniture moving/assembly services.
INSERT INTO public.service_categories (
  id, parent_id, slug, name_ar, description_ar, icon,
  display_order, requires_moderation, is_active
)
VALUES (
  '21000000-0000-4000-8000-000000000009',
  '20000000-0000-4000-8000-000000000007',
  'moving-furniture-assembly',
  'نقل الأثاث والتركيب',
  'فك وتغليف ونقل وتركيب الأثاث.',
  'truck',
  40,
  FALSE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = TRUE;

-- 3. Legacy enum values are authoritative for seeded/custom service types.
UPDATE public.services
SET category_id = CASE category
  WHEN 'PLUMBING' THEN '21000000-0000-4000-8000-000000000001'::UUID
  WHEN 'ELECTRICITY' THEN '21000000-0000-4000-8000-000000000002'::UUID
  WHEN 'CLEANING' THEN '21000000-0000-4000-8000-000000000003'::UUID
  WHEN 'HVAC' THEN '21000000-0000-4000-8000-000000000004'::UUID
  WHEN 'GARDENING' THEN '21000000-0000-4000-8000-000000000005'::UUID
  WHEN 'CARPENTRY' THEN '21000000-0000-4000-8000-000000000006'::UUID
  WHEN 'PAINTING' THEN '21000000-0000-4000-8000-000000000007'::UUID
  WHEN 'APPLIANCE_REPAIR' THEN '21000000-0000-4000-8000-000000000008'::UUID
  WHEN 'MOVING' THEN '21000000-0000-4000-8000-000000000009'::UUID
  WHEN 'TUTORING' THEN CASE
    WHEN title ~ '^\s*تدريب' THEN '23000000-0000-4000-8000-000000000002'::UUID
    ELSE '23000000-0000-4000-8000-000000000001'::UUID
  END
  WHEN 'BEAUTY' THEN CASE
    WHEN title ~ '(شعر|سشوار|تسريح|تصفيف)' THEN '27000000-0000-4000-8000-000000000001'::UUID
    WHEN title ~ '(حلاقة|تهذيب)' THEN '27000000-0000-4000-8000-000000000002'::UUID
    WHEN title ~ 'بشرة' THEN '27000000-0000-4000-8000-000000000003'::UUID
    WHEN title ~ '(أظافر|بدكير|مناكير)' THEN '27000000-0000-4000-8000-000000000004'::UUID
    ELSE '27000000-0000-4000-8000-000000000005'::UUID
  END
  ELSE category_id
END
WHERE category IN (
  'PLUMBING', 'ELECTRICITY', 'CLEANING', 'HVAC', 'GARDENING',
  'CARPENTRY', 'PAINTING', 'APPLIANCE_REPAIR', 'MOVING', 'TUTORING', 'BEAUTY'
);

-- Imported service types without a legacy enum were placed against the renamed
-- roots. Move the clearly identifiable education and technology rows back.
UPDATE public.services
SET category_id = CASE
  WHEN title ~ '^\s*تدريب' THEN '23000000-0000-4000-8000-000000000002'::UUID
  ELSE '23000000-0000-4000-8000-000000000001'::UUID
END
WHERE category IS NULL
  AND title ~ '^\s*(استشارات أكاديمية|تحضير امتحانات|تدريب|تدريس|تدقيق لغوي|ترجمة مستندات)';

UPDATE public.services
SET category_id = '20000000-0000-4000-8000-000000000002'::UUID
WHERE category IS NULL
  AND title ~ '^\s*(برمجة خلفية|برمجة واجهات|دعم تقني)';

-- Keep published/draft listings aligned with their selected service type.
UPDATE public.service_listings AS listing
SET
  category_id = service.category_id,
  updated_at = NOW()
FROM public.services AS service
WHERE listing.legacy_service_id = service.id
  AND service.category_id IS NOT NULL
  AND listing.category_id IS DISTINCT FROM service.category_id;

