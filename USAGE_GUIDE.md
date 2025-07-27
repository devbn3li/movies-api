# 🎬 دليل الاستخدام السريع

## 🚀 كيفية الاستخدام

### 1. تشغيل السيرفر
```bash
node server.js
# أو السيرفر الاختباري
node test-server.js
```

### 2. اختبار الفلاتر
```bash
node test-filters.js
```

---

## 📡 أمثلة عملية للاستخدام

### 🎬 الأفلام - `/api/movies-only`

#### أساسيات:
```bash
# جميع الأفلام (أول 10)
curl "http://localhost:5000/api/movies-only"

# صفحة 2 مع 20 نتيجة
curl "http://localhost:5000/api/movies-only?page=2&limit=20"
```

#### فلترة حسب النوع:
```bash
# أفلام الأكشن
curl "http://localhost:5000/api/movies-only?genre=Action"

# أفلام الكوميديا
curl "http://localhost:5000/api/movies-only?genre=Comedy"

# أفلام الرعب
curl "http://localhost:5000/api/movies-only?genre=Horror"
```

#### فلترة حسب التقييم:
```bash
# أفلام بتقييم 8 أو أعلى
curl "http://localhost:5000/api/movies-only?min_rating=8"

# أفلام بتقييم بين 7 و 9
curl "http://localhost:5000/api/movies-only?min_rating=7&max_rating=9"
```

#### فلترة حسب السنة:
```bash
# أفلام 2024
curl "http://localhost:5000/api/movies-only?year=2024"

# أفلام 2023
curl "http://localhost:5000/api/movies-only?year=2023"
```

#### البحث:
```bash
# البحث عن "Batman"
curl "http://localhost:5000/api/movies-only?search=Batman"

# البحث عن "Marvel"
curl "http://localhost:5000/api/movies-only?search=Marvel"
```

#### الترتيب:
```bash
# ترتيب بالتقييم (الأعلى أولاً)
curl "http://localhost:5000/api/movies-only?sort_by=rating"

# ترتيب بالشعبية
curl "http://localhost:5000/api/movies-only?sort_by=popularity"

# ترتيب بتاريخ الإصدار (الأحدث أولاً)
curl "http://localhost:5000/api/movies-only?sort_by=release_date"
```

#### فلاتر خاصة:
```bash
# الأفلام الأعلى تقييماً
curl "http://localhost:5000/api/movies-only?filter=top_rated"

# الأفلام الأكثر شعبية
curl "http://localhost:5000/api/movies-only?filter=popular"

# الأفلام الحديثة
curl "http://localhost:5000/api/movies-only?filter=recent"

# الأفلام الكلاسيكية
curl "http://localhost:5000/api/movies-only?filter=classic"
```

#### دمج الفلاتر:
```bash
# أفلام الأكشن الإنجليزية بتقييم عالي من 2024
curl "http://localhost:5000/api/movies-only?genre=Action&original_language=en&min_rating=7&year=2024"

# أفلام الكوميديا مرتبة بالتقييم
curl "http://localhost:5000/api/movies-only?genre=Comedy&sort_by=rating&limit=5"
```

---

### 📺 المسلسلات - `/api/tvshows-only`

#### أساسيات:
```bash
# جميع المسلسلات
curl "http://localhost:5000/api/tvshows-only"

# مع تحديد العدد
curl "http://localhost:5000/api/tvshows-only?limit=15"
```

#### فلترة حسب البلد:
```bash
# مسلسلات أمريكية
curl "http://localhost:5000/api/tvshows-only?country=US"

# مسلسلات كورية
curl "http://localhost:5000/api/tvshows-only?country=KR"

# مسلسلات بريطانية
curl "http://localhost:5000/api/tvshows-only?country=GB"

# مسلسلات يابانية
curl "http://localhost:5000/api/tvshows-only?country=JP"
```

#### فلترة حسب النوع:
```bash
# مسلسلات الكوميديا
curl "http://localhost:5000/api/tvshows-only?genre=Comedy"

# مسلسلات الإثارة
curl "http://localhost:5000/api/tvshows-only?genre=Mystery"

# مسلسلات الدراما
curl "http://localhost:5000/api/tvshows-only?genre=Drama"
```

#### فلترة حسب التقييم:
```bash
# مسلسلات بتقييم 8.5 أو أعلى
curl "http://localhost:5000/api/tvshows-only?min_rating=8.5"

# مسلسلات بشعبية عالية
curl "http://localhost:5000/api/tvshows-only?min_popularity=500"
```

#### البحث:
```bash
# البحث عن "Game"
curl "http://localhost:5000/api/tvshows-only?search=Game"

# البحث عن "Friends"
curl "http://localhost:5000/api/tvshows-only?search=Friends"
```

#### فلاتر خاصة:
```bash
# المسلسلات الأعلى تقييماً
curl "http://localhost:5000/api/tvshows-only?filter=top_rated"

# المسلسلات الحديثة
curl "http://localhost:5000/api/tvshows-only?filter=recent"

# المسلسلات المعروضة حالياً
curl "http://localhost:5000/api/tvshows-only?filter=airing"
```

#### دمج الفلاتر:
```bash
# مسلسلات كورية كوميدية بتقييم عالي
curl "http://localhost:5000/api/tvshows-only?country=KR&genre=Comedy&min_rating=7"

# مسلسلات أمريكية حديثة مرتبة بالشعبية
curl "http://localhost:5000/api/tvshows-only?country=US&filter=recent&sort_by=popularity"
```

---

## 🌐 في المتصفح

يمكنك أيضاً استخدام الروابط مباشرة في المتصفح:

### أمثلة للأفلام:
- **جميع الأفلام**: http://localhost:5000/api/movies-only
- **أفلام الأكشن**: http://localhost:5000/api/movies-only?genre=Action
- **أفلام بتقييم عالي**: http://localhost:5000/api/movies-only?min_rating=8
- **أفلام 2024**: http://localhost:5000/api/movies-only?year=2024
- **البحث عن Batman**: http://localhost:5000/api/movies-only?search=Batman

### أمثلة للمسلسلات:
- **جميع المسلسلات**: http://localhost:5000/api/tvshows-only
- **مسلسلات كورية**: http://localhost:5000/api/tvshows-only?country=KR
- **مسلسلات الكوميديا**: http://localhost:5000/api/tvshows-only?genre=Comedy
- **مسلسلات بتقييم عالي**: http://localhost:5000/api/tvshows-only?min_rating=8.5

---

## 📋 جميع المعاملات المتاحة

### للأفلام:
- `page` - رقم الصفحة
- `limit` - عدد النتائج
- `genre` - النوع/الفئة
- `year` - سنة الإصدار
- `min_rating` / `max_rating` - حد التقييم
- `min_popularity` - حد الشعبية
- `min_votes` - حد التصويتات
- `search` - البحث النصي
- `sort_by` - الترتيب (rating, popularity, release_date, title, vote_count)
- `order` - اتجاه الترتيب (asc, desc)
- `filter` - فلاتر خاصة (top_rated, popular, recent, upcoming, classic)
- `original_language` - اللغة الأصلية
- `adult` - محتوى البالغين

### للمسلسلات:
- جميع المعاملات السابقة بالإضافة إلى:
- `country` - بلد المنشأ
- `filter` إضافي: `airing` (المعروضة حالياً)

---

## 🧪 الاختبار

### تشغيل الاختبار الشامل:
```bash
node test-filters.js
```

### اختبار سريع في Terminal:
```bash
curl "http://localhost:5000/api/movies-only?limit=3"
curl "http://localhost:5000/api/tvshows-only?limit=3"
```

🎉 **الآن يمكنك استخدام النظام بسهولة!**
