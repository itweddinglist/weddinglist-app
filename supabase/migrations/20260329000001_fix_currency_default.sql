-- Fix currency default: EUR → RON
-- Piața țintă principală este România (CONTEXT.md)
ALTER TABLE budget_items ALTER COLUMN currency SET DEFAULT 'RON';
ALTER TABLE payments ALTER COLUMN currency SET DEFAULT 'RON';