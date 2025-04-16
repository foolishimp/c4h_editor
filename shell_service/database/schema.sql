-- Placeholder schema for the Preferences Shell Service database
-- Actual implementation might use PostgreSQL, MongoDB, etc. and potentially an ORM.

-- Stores user-specific frame layouts
CREATE TABLE IF NOT EXISTS user_frames (
    user_id VARCHAR(255) NOT NULL, -- Identifier for the user
    frame_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    -- Add foreign key to users table if applicable
);

-- Stores the assignment of apps to frames
CREATE TABLE IF NOT EXISTS frame_app_assignments (
    frame_id VARCHAR(255) NOT NULL REFERENCES user_frames(frame_id) ON DELETE CASCADE,
    app_id VARCHAR(255) NOT NULL, -- References available_apps.app_id
    -- layout_info JSONB, -- Optional layout info if multiple apps per frame
    PRIMARY KEY (frame_id, app_id)
);

-- Stores definitions of available microfrontend applications
CREATE TABLE IF NOT EXISTS available_apps (
    app_id VARCHAR(255) PRIMARY KEY, -- e.g., 'config-selector'
    name VARCHAR(255) NOT NULL,      -- e.g., 'Configuration Manager'
    scope VARCHAR(255) NOT NULL,     -- e.g., 'configSelector'
    module VARCHAR(255) NOT NULL,    -- e.g., './ConfigManager'
    url VARCHAR(1024)                -- Optional: URL if not standard
);