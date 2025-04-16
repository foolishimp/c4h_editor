-- Database schema for the Preferences Shell Service

-- Create tables if they don't exist

-- Create a table for available app definitions
CREATE TABLE IF NOT EXISTS available_apps (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    module TEXT NOT NULL,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a table for user frames
CREATE TABLE IF NOT EXISTS frames (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    assigned_apps JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a unique index on user_id and order to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS frames_user_id_order_idx ON frames(user_id, "order");

-- Create a table for service endpoints
CREATE TABLE IF NOT EXISTS service_endpoints (
    id TEXT PRIMARY KEY,
    job_config_service_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_available_apps_updated_at
    BEFORE UPDATE ON available_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_frames_updated_at
    BEFORE UPDATE ON frames
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_endpoints_updated_at
    BEFORE UPDATE ON service_endpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();