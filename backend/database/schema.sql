-- ============================================================
-- E-POLIX Crime Record Management System
-- Complete PostgreSQL Schema for Supabase
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. CRIME CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS crime_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    severity_level INTEGER DEFAULT 1 CHECK (severity_level BETWEEN 1 AND 5),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed crime categories
INSERT INTO crime_categories (name, description, severity_level) VALUES
    ('Theft', 'Property theft including burglary, robbery, and pickpocketing', 3),
    ('Assault', 'Physical assault and battery cases', 4),
    ('Fraud', 'Financial fraud, cybercrime, and identity theft', 3),
    ('Domestic Violence', 'Domestic abuse and violence cases', 4),
    ('Vandalism', 'Property damage and vandalism', 2),
    ('Drug Offense', 'Drug possession, trafficking, and distribution', 4),
    ('Murder', 'Homicide and manslaughter cases', 5),
    ('Kidnapping', 'Abduction and kidnapping cases', 5),
    ('Cybercrime', 'Online fraud, hacking, and digital crimes', 3),
    ('Traffic Violation', 'Major traffic offenses and hit-and-run', 2),
    ('Sexual Offense', 'Sexual harassment and assault cases', 5),
    ('Corruption', 'Public official corruption and bribery', 4),
    ('Missing Person', 'Missing person reports', 3),
    ('Other', 'Miscellaneous criminal activities', 1)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(15),
    aadhaar VARCHAR(12) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'police', 'staff', 'admin')),
    department_id VARCHAR(50) UNIQUE,
    badge_number VARCHAR(50),
    rank VARCHAR(100),
    station VARCHAR(200),
    district VARCHAR(100),
    state VARCHAR(100),
    profile_photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_aadhaar ON users(aadhaar);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);

-- ============================================================
-- 3. OTP TOKENS
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(30) DEFAULT 'login' CHECK (purpose IN ('login', 'register', 'reset_password')),
    is_used BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_identifier ON otp_tokens(identifier);

-- ============================================================
-- 4. SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

-- ============================================================
-- 5. COMPLAINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_number VARCHAR(30) NOT NULL UNIQUE,
    complainant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    complainant_name VARCHAR(150),
    complainant_phone VARCHAR(15),
    complainant_email VARCHAR(255),
    complainant_address TEXT,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    category_id UUID REFERENCES crime_categories(id),
    category_name VARCHAR(100),
    subcategory VARCHAR(100),
    incident_date TIMESTAMPTZ,
    incident_time VARCHAR(20),
    location TEXT,
    landmark VARCHAR(200),
    district VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Maharashtra',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(30) DEFAULT 'submitted' CHECK (status IN (
        'submitted', 'under_review', 'verified', 'investigation',
        'resolved', 'closed', 'rejected', 'escalated'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_anonymous BOOLEAN DEFAULT false,
    is_fir_filed BOOLEAN DEFAULT false,
    fir_number VARCHAR(50),
    reviewed_by UUID REFERENCES users(id),
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_complainant ON complaints(complainant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_number ON complaints(complaint_number);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category_id);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);

-- ============================================================
-- 6. CASES
-- ============================================================
CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_number VARCHAR(30) NOT NULL UNIQUE,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES crime_categories(id),
    category_name VARCHAR(100),
    status VARCHAR(30) DEFAULT 'open' CHECK (status IN (
        'open', 'assigned', 'under_investigation', 'evidence_collection',
        'chargesheet_filed', 'court_proceedings', 'convicted', 'acquitted',
        'closed', 'reopened', 'transferred'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    assigned_officer_id UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    investigating_officer VARCHAR(200),
    court_name VARCHAR(200),
    court_case_number VARCHAR(100),
    hearing_date TIMESTAMPTZ,
    judgment TEXT,
    location TEXT,
    district VARCHAR(100),
    state VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_officer ON cases(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_cases_number ON cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_complaint ON cases(complaint_id);

-- ============================================================
-- 7. CASE ASSIGNMENTS (History)
-- ============================================================
CREATE TABLE IF NOT EXISTS case_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id),
    assignment_notes TEXT,
    is_current BOOLEAN DEFAULT true,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    relieved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assignments_case ON case_assignments(case_id);
CREATE INDEX IF NOT EXISTS idx_assignments_officer ON case_assignments(officer_id);

-- ============================================================
-- 8. CASE UPDATES (Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS case_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id),
    update_type VARCHAR(50) DEFAULT 'status_change',
    old_status VARCHAR(30),
    new_status VARCHAR(30),
    title VARCHAR(200),
    notes TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_updates_case ON case_updates(case_id);

-- ============================================================
-- 9. INVESTIGATION NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS investigation_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id),
    author_name VARCHAR(150),
    title VARCHAR(200),
    content TEXT NOT NULL,
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inv_notes_case ON investigation_notes(case_id);

-- ============================================================
-- 10. EVIDENCE
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES users(id),
    file_name VARCHAR(300) NOT NULL,
    original_name VARCHAR(300),
    file_type VARCHAR(50),
    mime_type VARCHAR(100),
    file_size BIGINT,
    storage_path TEXT NOT NULL,
    storage_url TEXT,
    description TEXT,
    evidence_type VARCHAR(50) DEFAULT 'document' CHECK (evidence_type IN (
        'image', 'video', 'document', 'audio', 'forensic', 'other'
    )),
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES users(id),
    chain_of_custody TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_complaint ON evidence(complaint_id);

-- ============================================================
-- 11. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK (type IN (
        'info', 'warning', 'success', 'error', 'case_update',
        'complaint_update', 'assignment', 'system'
    )),
    reference_id UUID,
    reference_type VARCHAR(50),
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- ============================================================
-- 12. SYSTEM LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_user ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to relevant tables
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_complaints_updated_at') THEN
        CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_cases_updated_at') THEN
        CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- NOTE: Since we use the service_role key server-side,
-- RLS is bypassed. These policies are for direct Supabase
-- client access from the frontend if needed in the future.

-- Users can read their own profile
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own profile' AND tablename = 'users') THEN
        CREATE POLICY "Users can view own profile"
            ON users FOR SELECT
            USING (auth.uid()::text = id::text);
    END IF;
END $$;

-- Citizens can view their own complaints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Citizens view own complaints' AND tablename = 'complaints') THEN
        CREATE POLICY "Citizens view own complaints"
            ON complaints FOR SELECT
            USING (auth.uid()::text = complainant_id::text);
    END IF;
END $$;

-- Users see their own notifications
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users view own notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Users view own notifications"
            ON notifications FOR SELECT
            USING (auth.uid()::text = user_id::text);
    END IF;
END $$;
