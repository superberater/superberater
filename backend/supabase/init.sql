-- ══════════════════════════════════════════════════════════════════════════════
-- superberater — Full Database Schema
-- Single consolidated file. Contains all 5 tables.
-- Run in Supabase SQL Editor, then run rls_supabase.sql for RLS policies.
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────
-- 1. PERSONALITIES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personalities (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid,   -- NULL = system preset; on Supabase: REFERENCES auth.users(id) ON DELETE CASCADE
    name                varchar(100) NOT NULL,
    icon                varchar(10) DEFAULT '🤖',
    description         text NOT NULL,
    system_prompt       text NOT NULL,
    default_model       varchar(100) DEFAULT 'anthropic/claude-haiku-4.5',
    default_temperature numeric(2,1) DEFAULT 0.7 CHECK (default_temperature >= 0 AND default_temperature <= 1),
    is_public           boolean DEFAULT false,
    created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalities_user   ON personalities(user_id);
CREATE INDEX IF NOT EXISTS idx_personalities_public ON personalities(is_public) WHERE is_public = true;

-- ──────────────────────────────────────────────────────────────
-- 2. DEBATES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debates (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL,  -- on Supabase: REFERENCES auth.users(id) ON DELETE CASCADE
    topic                   text NOT NULL,
    context                 text DEFAULT '',
    language                varchar(5) DEFAULT 'de',
    num_rounds              int DEFAULT 2 CHECK (num_rounds >= 1 AND num_rounds <= 5),
    style                   varchar(20) DEFAULT 'structured'
                                CHECK (style IN ('structured','socratic','confrontational','freeform')),
    parallel_mode           varchar(10) DEFAULT 'parallel'
                                CHECK (parallel_mode IN ('parallel','sequential','hybrid')),
    decision_mode           varchar(20) DEFAULT 'best_solution'
                                CHECK (decision_mode IN ('vote','consensus','logic','best_solution','ranking')),
    moderator_model         varchar(100) DEFAULT 'anthropic/claude-sonnet-4.6',
    moderator_system_prompt text DEFAULT '',
    active_moderator        boolean DEFAULT true,
    summary_length          varchar(10) DEFAULT 'medium',
    status                  varchar(20) DEFAULT 'created'
                                CHECK (status IN ('created','running','completed','failed')),
    current_round           int DEFAULT 0,
    moderator_summary       text,
    total_tokens            int DEFAULT 0,
    total_cost_cents        int DEFAULT 0,
    is_public               boolean DEFAULT false,
    share_token             varchar(64) UNIQUE,
    created_at              timestamptz DEFAULT now(),
    completed_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_debates_user   ON debates(user_id);
CREATE INDEX IF NOT EXISTS idx_debates_status ON debates(status);
CREATE INDEX IF NOT EXISTS idx_debates_share  ON debates(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_debates_public ON debates(is_public) WHERE is_public = true;

-- ──────────────────────────────────────────────────────────────
-- 3. DEBATE_AGENTS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS debate_agents (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id             uuid REFERENCES debates(id) ON DELETE CASCADE NOT NULL,
    personality_id        uuid REFERENCES personalities(id),          -- nullable for custom agents
    model                 varchar(100) NOT NULL DEFAULT 'anthropic/claude-haiku-4.5',
    temperature           numeric(2,1) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 1),
    max_tokens            int DEFAULT 300 CHECK (max_tokens >= 100 AND max_tokens <= 1000),
    sort_order            int DEFAULT 0,
    vote                  varchar(200),
    custom_name           varchar(100),      -- for custom agents (no personality_id)
    custom_icon           varchar(10),
    custom_system_prompt  text,
    created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debate_agents_debate ON debate_agents(debate_id);

-- ──────────────────────────────────────────────────────────────
-- 4. MESSAGES
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id       uuid REFERENCES debates(id) ON DELETE CASCADE NOT NULL,
    debate_agent_id uuid REFERENCES debate_agents(id) ON DELETE SET NULL,
    round_number    int NOT NULL,
    role            varchar(20) NOT NULL CHECK (role IN ('agent','moderator','system')),
    content         text NOT NULL,
    tokens_used     int DEFAULT 0,
    cost_cents      int DEFAULT 0,
    model_used      varchar(100),
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_debate ON messages(debate_id);
CREATE INDEX IF NOT EXISTS idx_messages_round  ON messages(debate_id, round_number);

-- ──────────────────────────────────────────────────────────────
-- 5. USER SETTINGS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_settings (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL UNIQUE,
    openrouter_api_key text DEFAULT '',
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
