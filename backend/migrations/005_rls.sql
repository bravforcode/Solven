-- 005: Row-Level Security (defense-in-depth tenant isolation)
-- App-level scoping (WHERE org_id = ...) remains the primary control; RLS
-- makes a missing/buggy org filter fail CLOSED (0 rows) instead of leaking.
--
-- Scope contract:
--   * Every tenant-scoped query opens its connection via Store._c(org_id=...)
--     which runs `SET app.current_org_id = '<org>'` on that session.
--   * Platform operations (retention purge, rollup jobs, super-admin tasks)
--     open via Store._c(platform=True) which sets 'platform'.
--   * Rows with NULL org_id are legacy/demo rows (dev mode has no tenant);
--     they remain visible to unscoped sessions so demo mode keeps working.
--   * An unscoped session sees ONLY NULL-org rows: real tenant rows are
--     invisible without an explicit scope (fail closed).
CREATE POLICY tenant_isolation_drafts ON drafts
  USING (org_id IS NULL OR org_id = NULLIF(current_setting('app.current_org_id', true), '') OR current_setting('app.current_org_id', true) = 'platform')
  WITH CHECK (org_id IS NULL OR org_id = NULLIF(current_setting('app.current_org_id', true), '') OR current_setting('app.current_org_id', true) = 'platform');
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tasks ON tasks
  USING (org_id IS NULL OR org_id = NULLIF(current_setting('app.current_org_id', true), '') OR current_setting('app.current_org_id', true) = 'platform')
  WITH CHECK (org_id IS NULL OR org_id = NULLIF(current_setting('app.current_org_id', true), '') OR current_setting('app.current_org_id', true) = 'platform');
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_agent_runs ON agent_runs
  USING (org_id IS NULL OR org_id = NULLIF(current_setting('app.current_org_id', true), '') OR current_setting('app.current_org_id', true) = 'platform')
  WITH CHECK (org_id IS NULL OR org_id = NULLIF(current_setting('app.current_org_id', true), '') OR current_setting('app.current_org_id', true) = 'platform');
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs FORCE ROW LEVEL SECURITY;

-- RLS is bypassed for SUPERUSER and table owners without FORCE. The compose
-- user (solven) IS a superuser (official postgres image POSTGRES_USER), so
-- RLS is dormant in local compose — it BINDS only for non-superuser roles.
-- Production (Neon) app users are non-superuser by default → RLS active.
-- This migration creates the non-superuser app role so tests and hardened
-- deployments connect as solven_app and RLS is actually enforced.
CREATE ROLE solven_app LOGIN PASSWORD 'solven_app';
GRANT USAGE ON SCHEMA public TO solven_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks, drafts, agent_runs, orgs, org_members, subscriptions, usage_counters, stripe_events TO solven_app;
-- future tables created by the migration owner (solven) are granted automatically
ALTER DEFAULT PRIVILEGES FOR ROLE solven IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO solven_app;
