-- Database Schemas for StudyFlow Security System
-- Creates tables for quarantined files and security logging

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for security system
CREATE TYPE security_event_type AS ENUM (
  'file_scan_started',
  'file_scan_completed',
  'file_scan_failed',
  'threat_detected',
  'file_blocked',
  'file_quarantined',
  'file_restored',
  'file_permanently_deleted',
  'bulk_delete_performed',
  'upload_started',
  'upload_completed',
  'upload_failed',
  'upload_rejected',
  'security_level_changed',
  'security_rules_updated',
  'quarantine_cleaned',
  'security_dashboard_accessed',
  'quarantine_list_viewed',
  'security_report_generated',
  'background_scan_started',
  'background_scan_completed',
  'security_alert_triggered',
  'suspicious_activity_detected'
);

CREATE TYPE security_event_severity AS ENUM (
  'info',
  'warning',
  'error',
  'critical'
);

CREATE TYPE threat_type AS ENUM (
  'dangerous_extension',
  'disguised_executable',
  'zip_bomb',
  'directory_traversal',
  'nested_archive_limit',
  'script_injection',
  'html_injection',
  'malicious_polyglot',
  'corrupted_file',
  'suspicious_header',
  'oversized_file',
  'compression_ratio_attack',
  'suspicious_pattern',
  'potential_virus'
);

CREATE TYPE threat_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

-- Quarantined Files Table
CREATE TABLE IF NOT EXISTS quarantined_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  quarantine_filename TEXT NOT NULL UNIQUE,
  file_size BIGINT NOT NULL CHECK (file_size >= 0),
  mime_type TEXT NOT NULL,
  quarantine_reason TEXT NOT NULL,
  threats JSONB NOT NULL DEFAULT '[]',
  quarantined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  can_restore BOOLEAN NOT NULL DEFAULT true,
  auto_delete_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Logs Table
CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type security_event_type NOT NULL,
  severity security_event_severity NOT NULL,
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT,
  file_info JSONB,
  threat_info JSONB,
  metadata JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Settings Table (extends user settings)
CREATE TABLE IF NOT EXISTS user_security_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  security_level TEXT NOT NULL DEFAULT 'balanced' CHECK (security_level IN ('strict', 'balanced', 'permissive')),
  max_file_size BIGINT NOT NULL DEFAULT 52428800, -- 50MB
  max_archive_depth INTEGER NOT NULL DEFAULT 3,
  max_compression_ratio INTEGER NOT NULL DEFAULT 1000,
  allowed_extensions JSONB NOT NULL DEFAULT '["jpg","jpeg","png","gif","webp","svg","pdf","txt","md","docx","xlsx","pptx","zip","rar","7z","json","xml","csv"]',
  blocked_extensions JSONB NOT NULL DEFAULT '["exe","bat","cmd","com","pif","scr","jar","js","vbs","ps1","reg","msi"]',
  allowed_mime_types JSONB NOT NULL DEFAULT '["image/jpeg","image/png","image/gif","image/webp","image/svg+xml","application/pdf","text/plain","text/markdown","application/zip","application/json"]',
  enable_heuristic_scanning BOOLEAN NOT NULL DEFAULT true,
  enable_archive_scanning BOOLEAN NOT NULL DEFAULT true,
  enable_image_validation BOOLEAN NOT NULL DEFAULT true,
  quarantine_retention_days INTEGER NOT NULL DEFAULT 30,
  auto_quarantine_suspicious BOOLEAN NOT NULL DEFAULT true,
  notify_on_threats BOOLEAN NOT NULL DEFAULT true,
  log_retention_days INTEGER NOT NULL DEFAULT 90,
  custom_patterns JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- File Security Scan Results (for tracking scan history)
CREATE TABLE IF NOT EXISTS file_security_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  file_hash TEXT, -- SHA-256 hash for deduplication
  scan_started_at TIMESTAMPTZ NOT NULL,
  scan_completed_at TIMESTAMPTZ,
  scan_duration_ms INTEGER,
  is_secure BOOLEAN NOT NULL,
  threats_detected JSONB NOT NULL DEFAULT '[]',
  quarantine_recommended BOOLEAN NOT NULL DEFAULT false,
  upload_allowed BOOLEAN NOT NULL DEFAULT false,
  security_level_used TEXT NOT NULL,
  scanner_version TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Security Alerts Table (for critical events)
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity security_event_severity NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  triggered_by_event_id UUID REFERENCES security_logs(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  auto_generated BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quarantined_files_user_id ON quarantined_files(user_id);
CREATE INDEX IF NOT EXISTS idx_quarantined_files_quarantined_at ON quarantined_files(quarantined_at);
CREATE INDEX IF NOT EXISTS idx_quarantined_files_auto_delete_at ON quarantined_files(auto_delete_at) WHERE auto_delete_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quarantined_files_can_restore ON quarantined_files(can_restore);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_timestamp ON security_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_session_id ON security_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_file_security_scans_user_id ON file_security_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_file_hash ON file_security_scans(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_security_scans_scan_completed_at ON file_security_scans(scan_completed_at);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_is_secure ON file_security_scans(is_secure);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_triggered_at ON security_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged_at ON security_alerts(acknowledged_at);

-- GIN indexes for JSONB columns for better search performance
CREATE INDEX IF NOT EXISTS idx_quarantined_files_threats_gin ON quarantined_files USING GIN (threats);
CREATE INDEX IF NOT EXISTS idx_quarantined_files_metadata_gin ON quarantined_files USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_security_logs_details_gin ON security_logs USING GIN (details);
CREATE INDEX IF NOT EXISTS idx_security_logs_threat_info_gin ON security_logs USING GIN (threat_info);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_threats_gin ON file_security_scans USING GIN (threats_detected);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at triggers
CREATE TRIGGER update_quarantined_files_updated_at 
  BEFORE UPDATE ON quarantined_files 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_security_settings_updated_at 
  BEFORE UPDATE ON user_security_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for security (assuming RLS is enabled)
ALTER TABLE quarantined_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- Users can only access their own quarantined files
CREATE POLICY quarantined_files_user_policy ON quarantined_files
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own security logs
CREATE POLICY security_logs_user_policy ON security_logs
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own security settings
CREATE POLICY user_security_settings_user_policy ON user_security_settings
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own scan results
CREATE POLICY file_security_scans_user_policy ON file_security_scans
  FOR ALL USING (auth.uid() = user_id);

-- Users can only access their own security alerts
CREATE POLICY security_alerts_user_policy ON security_alerts
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically create security settings for new users
CREATE OR REPLACE FUNCTION create_user_security_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_security_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create security settings when a new user is created
CREATE TRIGGER on_auth_user_created_security_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_security_settings();

-- Function to clean up expired quarantined files
CREATE OR REPLACE FUNCTION cleanup_expired_quarantine_files()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete expired quarantined files
  WITH deleted AS (
    DELETE FROM quarantined_files 
    WHERE auto_delete_at IS NOT NULL 
      AND auto_delete_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the cleanup operation
  IF deleted_count > 0 THEN
    INSERT INTO security_logs (
      user_id, event_type, severity, message, details
    )
    SELECT 
      '00000000-0000-0000-0000-000000000000'::uuid, -- System user
      'quarantine_cleaned',
      'info',
      format('Automatic cleanup: %s expired quarantined files deleted', deleted_count),
      jsonb_build_object('deleted_count', deleted_count, 'cleanup_type', 'automatic')
    WHERE deleted_count > 0;
  END IF;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old security logs
CREATE OR REPLACE FUNCTION cleanup_old_security_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;
  
  -- Delete old security logs
  WITH deleted AS (
    DELETE FROM security_logs 
    WHERE timestamp < cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user security statistics
CREATE OR REPLACE FUNCTION get_user_security_stats(target_user_id UUID, days_back INTEGER DEFAULT 30)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  date_from TIMESTAMPTZ;
BEGIN
  date_from := NOW() - (days_back || ' days')::INTERVAL;
  
  SELECT jsonb_build_object(
    'total_scans', COUNT(CASE WHEN s.event_type = 'file_scan_completed' THEN 1 END),
    'threats_detected', COUNT(CASE WHEN s.event_type = 'threat_detected' THEN 1 END),
    'files_quarantined', COUNT(CASE WHEN s.event_type = 'file_quarantined' THEN 1 END),
    'files_blocked', COUNT(CASE WHEN s.event_type = 'upload_rejected' THEN 1 END),
    'quarantine_count', (SELECT COUNT(*) FROM quarantined_files WHERE user_id = target_user_id),
    'quarantine_size', (SELECT COALESCE(SUM(file_size), 0) FROM quarantined_files WHERE user_id = target_user_id),
    'recent_activity', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'event_type', event_type,
          'severity', severity,
          'timestamp', timestamp,
          'message', message
        ) ORDER BY timestamp DESC
      )
      FROM (
        SELECT event_type, severity, timestamp, message
        FROM security_logs 
        WHERE user_id = target_user_id 
          AND timestamp >= date_from
        ORDER BY timestamp DESC 
        LIMIT 10
      ) recent
    ),
    'threat_breakdown', (
      SELECT jsonb_object_agg(threat_type, threat_count)
      FROM (
        SELECT 
          (threat->>'type') as threat_type,
          COUNT(*) as threat_count
        FROM security_logs s,
             jsonb_array_elements(s.threat_info) as threat
        WHERE s.user_id = target_user_id 
          AND s.timestamp >= date_from
          AND s.threat_info IS NOT NULL
        GROUP BY (threat->>'type')
      ) threats
    )
  ) INTO result
  FROM security_logs s
  WHERE s.user_id = target_user_id 
    AND s.timestamp >= date_from;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Create a view for security dashboard
CREATE OR REPLACE VIEW user_security_dashboard AS
SELECT 
  u.id as user_id,
  u.email,
  uss.security_level,
  uss.quarantine_retention_days,
  uss.auto_quarantine_suspicious,
  uss.notify_on_threats,
  (SELECT COUNT(*) FROM quarantined_files qf WHERE qf.user_id = u.id) as quarantined_files_count,
  (SELECT COALESCE(SUM(file_size), 0) FROM quarantined_files qf WHERE qf.user_id = u.id) as quarantined_files_size,
  (SELECT COUNT(*) FROM security_logs sl WHERE sl.user_id = u.id AND sl.timestamp >= NOW() - INTERVAL '7 days') as recent_logs_count,
  (SELECT COUNT(*) FROM security_alerts sa WHERE sa.user_id = u.id AND sa.acknowledged_at IS NULL) as unacknowledged_alerts_count,
  uss.updated_at as settings_updated_at
FROM auth.users u
LEFT JOIN user_security_settings uss ON u.id = uss.user_id
WHERE u.id = auth.uid();

-- Grant permissions (adjust as needed for your setup)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE quarantined_files IS 'Stores files that have been quarantined due to security threats';
COMMENT ON TABLE security_logs IS 'Comprehensive audit log of all security events';
COMMENT ON TABLE user_security_settings IS 'Per-user security configuration and preferences';
COMMENT ON TABLE file_security_scans IS 'Historical record of all file security scans performed';
COMMENT ON TABLE security_alerts IS 'Critical security alerts that require user attention';

COMMENT ON COLUMN quarantined_files.threats IS 'JSONB array of SecurityThreat objects detected in the file';
COMMENT ON COLUMN quarantined_files.metadata IS 'Additional metadata including scan results and user context';
COMMENT ON COLUMN security_logs.details IS 'Event-specific details and context information';
COMMENT ON COLUMN security_logs.threat_info IS 'JSONB array of threat information if applicable';
COMMENT ON COLUMN user_security_settings.custom_patterns IS 'JSONB array of custom regex patterns for threat detection';