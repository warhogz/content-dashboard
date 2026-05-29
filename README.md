# Content Dashboard

Красивый private dashboard для карточек контента на Next.js 15 + Supabase.

## Что внутри

- публичная страница `/`
- вход `/login`
- админка `/admin`
- настройки статусов и типов `/settings`
- Supabase Auth + Postgres + Storage
- RLS-схема
- поддержка динамических статусов и типов
- aspect ratio / height / crop mode
- mobile-first UI в спокойном premium-стиле

## Быстрый старт

1. Скопируй `.env.example` в `.env.local`
2. Заполни:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. В Supabase запусти SQL из `supabase/schema.sql`
4. Затем при желании — `supabase/seed.sql`
5. Создай bucket `card-thumbnails` и сделай его public, если хочешь загрузку файлов из админки
6. Установи зависимости и запусти:
   ```bash
   npm install
   npm run dev
   ```

## Важные моменты

- Публичная страница скрывает карточки, у которых `is_hidden = true`
- Админка и настройки защищены middleware
- Если env не заполнен, проект показывает локальный fallback data preview, чтобы можно было быстро увидеть интерфейс

## Деплой

Для Vercel:
- добавь env-переменные
- проверь Supabase redirect URL на `/login`
- убедись, что bucket для превью настроен корректно

## Что можно дальше усилить

- полноценный drag-and-drop сортинг между секциями
- signed upload URLs
- audit log
- пользовательские пресеты интерфейса
- пароль для публичной страницы
