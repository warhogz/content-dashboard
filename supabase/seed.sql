insert into statuses (title, slug, color, sort_order, is_active, show_on_public)
values
  ('Готово', 'done', '#16a34a', 1, true, true),
  ('Ждет обратной связи', 'waiting-feedback', '#d97706', 2, true, true),
  ('На правках', 'revisions', '#dc2626', 3, true, true),
  ('В работе', 'in-progress', '#2563eb', 4, true, true)
on conflict (slug) do nothing;

insert into card_types (title, slug, default_aspect_ratio, default_height_px, default_crop_mode, is_active, sort_order)
values
  ('Reels', 'reels', '9:16', 420, 'cover', true, 1),
  ('YouTube', 'youtube', '16:9', 300, 'cover', true, 2),
  ('Carousel', 'carousel', '4:5', 360, 'cover', true, 3),
  ('Post', 'post', '1:1', 340, 'contain', true, 4),
  ('Story', 'story', '9:16', 380, 'cover', true, 5),
  ('Custom', 'custom', 'custom', 320, 'crop', true, 6)
on conflict (slug) do nothing;
