# تحديث كتالوج جو ستور

تم ربط 2,233 صنفًا بأكواد ملف الإكسل الأصلية، مع الاحتفاظ بأسعار البيع والتاجر والمخزون. الأصناف الـ32 ذات الموديل المحدد لها مصادر وصور الشركة؛ بقية الأصناف لها وصف ومواصفات تقديرية وصور توضيحية، ومعلّمة للمراجعة. ملف الإكسل يحتوي على308 أسعار بيع صفرية، وصنفين بمخزون سالب: لا تُخترع أسعار، ويُمنع شراء الأصناف غير المتاحة.

من لوحة الإدارة، افتح «المخزون والظهور» ثم «تقرير مراجعة بيانات المنتجات». يمكن تصفية البيانات التقديرية أو الأصناف بدون سعر، وتصدير التقرير. زر تعديل المنتج يسمح بتغيير الاسم والصور والوصف والمميزات والمواصفات وحالة المراجعة، وتحفظ التعديلات في قاعدة البيانات.

مصادر البحث محفوظة في `src/data/catalogEnrichment/`، والكتالوج المجهز في `src/data/allExcelProducts.json`. صور المنتجات محفوظة في `public/product-images/` بأسماء مشتقة من روابطها، لتجنب الاعتماد على الروابط الخارجية أثناء التصفح.

لإعادة تجهيز الملف، نفّذ الأوامر التالية من جذر المشروع. الأمر الأول يكتب نسخة وسيطة؛ لا يغير قاعدة البيانات.

```powershell
node scripts/prepare_excel_catalog.cjs --output .catalog-prepared.json --image-pools src/data/catalogEnrichment/official-image-pools.json --research src/data/catalogEnrichment/verified-overlays.json --brand-profiles src/data/catalogEnrichment/brand-profiles.json --report src/data/catalogEnrichment/import-report.json
node scripts/cache_catalog_images.mjs --input .catalog-prepared.json --pool src/data/catalogEnrichment/official-image-pools.json --output src/data/allExcelProducts.json --report src/data/catalogEnrichment/image-cache-report.json
node scripts/check_excel_catalog.cjs
node --test tests/*.test.mjs
npm run build
node scripts/import_prepared_catalog.mjs --input src/data/allExcelProducts.json
```

أمر الاستيراد الأخير ينفّذ معاينة على جدول مؤقت تنتهي بدون تغيير بيانات المنتجات. إضافة `--apply` تطبق تحديثًا ذريًا للأصناف ذات الأكواد `prod-pos-*`، وتترك المنتجات الأخرى كما هي. إعادة الاستيراد تعيد أسعار وتفاصيل الأصناف المستوردة إلى النسخة المجهزة، لذلك راجع تغييرات الإدارة قبل استخدامه مجددًا. لا يحتاج الاستيراد إلى تعديل بنية قاعدة البيانات.
