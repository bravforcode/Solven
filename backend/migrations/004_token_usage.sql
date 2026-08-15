-- 004: token-usage columns on agent_runs (observability: real provider usage
-- when the LLM reports it; NULL for mock/fallback runs).
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
