-- 002: drafts carry the owning teacher (identity/tenant slice, AUD-H-01, ARCH-03)
-- SQLite: ADD COLUMN is only safe once per tracked migration; ALTER wrapped so
-- rerun on an already-migrated DB is a no-op instead of an error.
ALTER TABLE drafts ADD COLUMN teacher_id TEXT;
