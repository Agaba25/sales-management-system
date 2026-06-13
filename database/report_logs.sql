-- Create table to store report generation logs
CREATE TABLE IF NOT EXISTS report_logs (
  id SERIAL PRIMARY KEY,
  report_type TEXT NOT NULL,
  generated_by INTEGER NULL,
  params JSONB NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
