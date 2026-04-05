-- ══════════════════════════════════════════════════════════════════════════════
-- superberater — Supabase Row Level Security Policies
-- Run AFTER init.sql on Supabase Cloud only.
-- ══════════════════════════════════════════════════════════════════════════════

-- Add foreign key references to auth.users (Supabase-specific)
ALTER TABLE personalities ADD CONSTRAINT fk_personalities_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE debates ADD CONSTRAINT fk_debates_user
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE personalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- PERSONALITIES
CREATE POLICY "personalities_select" ON personalities FOR SELECT USING (
    user_id IS NULL OR user_id = auth.uid() OR is_public = true
);
CREATE POLICY "personalities_insert" ON personalities FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND user_id = auth.uid()
);
CREATE POLICY "personalities_update" ON personalities FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "personalities_delete" ON personalities FOR DELETE USING (user_id = auth.uid());

-- DEBATES
CREATE POLICY "debates_select" ON debates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "debates_insert" ON debates FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "debates_update" ON debates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "debates_delete" ON debates FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "debates_public_select" ON debates FOR SELECT USING (is_public = true AND status = 'completed');

-- DEBATE_AGENTS
CREATE POLICY "debate_agents_select" ON debate_agents FOR SELECT USING (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = debate_agents.debate_id AND debates.user_id = auth.uid())
);
CREATE POLICY "debate_agents_insert" ON debate_agents FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = debate_agents.debate_id AND debates.user_id = auth.uid())
);
CREATE POLICY "debate_agents_public_select" ON debate_agents FOR SELECT USING (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = debate_agents.debate_id AND debates.is_public = true AND debates.status = 'completed')
);

-- MESSAGES
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = messages.debate_id AND debates.user_id = auth.uid())
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = messages.debate_id AND debates.user_id = auth.uid())
);
CREATE POLICY "messages_public_select" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = messages.debate_id AND debates.is_public = true AND debates.status = 'completed')
);

-- Shared debate access via share_token
CREATE OR REPLACE FUNCTION public.get_share_token()
RETURNS text AS $$
BEGIN
    RETURN current_setting('request.headers', true)::json->>'x-share-token';
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "debates_shared_select" ON debates FOR SELECT USING (
    share_token IS NOT NULL AND share_token = public.get_share_token()
);
CREATE POLICY "messages_shared_select" ON messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = messages.debate_id
            AND debates.share_token IS NOT NULL AND debates.share_token = public.get_share_token())
);
CREATE POLICY "debate_agents_shared_select" ON debate_agents FOR SELECT USING (
    EXISTS (SELECT 1 FROM debates WHERE debates.id = debate_agents.debate_id
            AND debates.share_token IS NOT NULL AND debates.share_token = public.get_share_token())
);

-- USER SETTINGS: users can only access their own settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_select" ON user_settings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_settings_insert" ON user_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "user_settings_update" ON user_settings FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_settings_delete" ON user_settings FOR DELETE USING (user_id = auth.uid());
