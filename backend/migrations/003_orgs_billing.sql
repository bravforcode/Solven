-- 003: orgs, org_members, subscriptions, usage_counters, stripe_events + org_id columns
CREATE TABLE IF NOT EXISTS orgs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'trial',
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS org_members (
    user_id TEXT NOT NULL,
    org_id TEXT NOT NULL REFERENCES orgs(id),
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, org_id)
);
CREATE TABLE IF NOT EXISTS subscriptions (
    org_id TEXT NOT NULL REFERENCES orgs(id),
    stripe_sub_id TEXT NOT NULL,
    status TEXT NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (org_id)
);
CREATE TABLE IF NOT EXISTS usage_counters (
    org_id TEXT NOT NULL REFERENCES orgs(id),
    period TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    quota INTEGER NOT NULL,
    PRIMARY KEY (org_id, period)
);
CREATE TABLE IF NOT EXISTS stripe_events (
    event_id TEXT PRIMARY KEY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE tasks ADD COLUMN org_id TEXT;
ALTER TABLE drafts ADD COLUMN org_id TEXT;
ALTER TABLE agent_runs ADD COLUMN org_id TEXT;