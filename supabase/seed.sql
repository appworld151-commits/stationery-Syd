-- Optional starter data. Safe to re-run. Run in the Supabase SQL editor.
insert into public.categories (slug, name) values
  ('fiction',    '{"en":"Fiction","ar":"قصص وروايات","ckb":"چیرۆک","ja":"フィクション"}'),
  ('non-fiction','{"en":"Non-fiction","ar":"غير روائي","ckb":"ناچیرۆکی","ja":"ノンフィクション"}'),
  ('education',  '{"en":"Education","ar":"تعليم","ckb":"پەروەردە","ja":"教育"}'),
  ('children',   '{"en":"Children","ar":"أطفال","ckb":"منداڵان","ja":"子ども"}')
on conflict (slug) do nothing;
