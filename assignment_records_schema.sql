-- Create assignment_records table for managing asset assignments and returns
CREATE TABLE assignment_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  employee_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by TEXT,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Returned', 'Lost', 'Damaged')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_assignment_asset_id ON assignment_records(asset_id);
CREATE INDEX idx_assignment_employee_id ON assignment_records(employee_id);
CREATE INDEX idx_assignment_status ON assignment_records(status);
CREATE INDEX idx_assignment_dates ON assignment_records(assigned_date, actual_return_date);

-- Add columns to assets table if they don't exist (for tracking current assignment)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS currently_assigned_to BIGINT REFERENCES employees(id);
ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_assignment_date DATE;

-- Create view for asset assignment history
CREATE OR REPLACE VIEW assignment_history AS
SELECT
  ar.id,
  ar.asset_id,
  ar.employee_id,
  ar.assigned_by,
  ar.assigned_date,
  ar.expected_return_date,
  ar.actual_return_date,
  ar.status,
  ar.notes,
  ar.created_at,
  a.asset_name,
  a.asset_tag,
  a.category,
  e.full_name,
  e.email,
  e.department
FROM assignment_records ar
JOIN assets a ON ar.asset_id = a.id
JOIN employees e ON ar.employee_id = e.id;
