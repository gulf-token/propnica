-- ===========================================
-- Propnica Local Database Initialization
-- ===========================================
-- This script runs on first Docker container startup
-- It creates the auth schema required for compatibility
-- with Supabase Auth references in the codebase

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===========================================
-- Auth Schema (Supabase-compatible)
-- ===========================================
CREATE SCHEMA IF NOT EXISTS auth;

-- Minimal auth.users table for local development
-- This mirrors Supabase's auth.users structure
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email varchar(255) UNIQUE,
    encrypted_password varchar(255),
    email_confirmed_at timestamptz,
    raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ===========================================
-- Development Test User
-- ===========================================
-- Email: dev@propnica.local
-- Password: password123 (bcrypt hash)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
) VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'dev@propnica.local',
    '$2a$10$PXBwTK5HcVHgk6S.cWqvGOv1E3pHJI0aEFxY5TYVqTz5sGEJ5R3.G',
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Dev User"}'
) ON CONFLICT (email) DO NOTHING;

-- ===========================================
-- Success Message
-- ===========================================
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Propnica database initialized successfully!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Development user created:';
    RAISE NOTICE '  Email:    dev@propnica.local';
    RAISE NOTICE '  User ID:  a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run: npx prisma db push';
    RAISE NOTICE '  2. Run: npm run dev';
    RAISE NOTICE '';
END $$;
