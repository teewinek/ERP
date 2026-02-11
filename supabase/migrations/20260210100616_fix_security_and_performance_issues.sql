/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Indexes
    - Add index on `numbering_sequences.warehouse_id` (unindexed foreign key)
    - Add index on `user_roles.assigned_by` (unindexed foreign key)

  ## 2. Fix Multiple Permissive Policies
    - Consolidate overlapping SELECT policies into single policies
    - Remove redundant policies that create security ambiguity
    - Tables affected: activity_logs, numbering_sequences, proforma_items, roles, user_roles, warehouses

  ## 3. Fix Function Security
    - Update `get_next_document_number` with immutable search_path
    - Prevents potential SQL injection via search path manipulation

  ## 4. Notes
    - Unused indexes are not removed as they will be used as the application grows
    - Auth DB connection strategy and leaked password protection require dashboard configuration
*/

-- ==================== ADD MISSING INDEXES ====================

-- Index for numbering_sequences.warehouse_id foreign key
CREATE INDEX IF NOT EXISTS idx_numbering_sequences_warehouse_id 
  ON numbering_sequences(warehouse_id);

-- Index for user_roles.assigned_by foreign key
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_by 
  ON user_roles(assigned_by);

-- ==================== FIX MULTIPLE PERMISSIVE POLICIES ====================

-- Drop and recreate activity_logs policies (consolidate SELECT policies)
DROP POLICY IF EXISTS "Admins can view all logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can view own activity" ON activity_logs;

CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Drop and recreate numbering_sequences policies (remove duplicate SELECT)
DROP POLICY IF EXISTS "Users can view own numbering sequences" ON numbering_sequences;
DROP POLICY IF EXISTS "Users can manage own numbering sequences" ON numbering_sequences;

CREATE POLICY "Users can view own numbering sequences"
  ON numbering_sequences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own numbering sequences"
  ON numbering_sequences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own numbering sequences"
  ON numbering_sequences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own numbering sequences"
  ON numbering_sequences FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Drop and recreate proforma_items policies (remove duplicate SELECT)
DROP POLICY IF EXISTS "Users can view own proforma items" ON proforma_items;
DROP POLICY IF EXISTS "Users can manage own proforma items" ON proforma_items;

CREATE POLICY "Users can view own proforma items"
  ON proforma_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own proforma items"
  ON proforma_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own proforma items"
  ON proforma_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own proforma items"
  ON proforma_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = auth.uid()
    )
  );

-- Drop and recreate roles policies (separate SELECT from management)
DROP POLICY IF EXISTS "Roles are viewable by authenticated users" ON roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON roles;

CREATE POLICY "Roles are viewable by authenticated users"
  ON roles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can insert roles"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can update roles"
  ON roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Only admins can delete roles"
  ON roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Drop and recreate user_roles policies (separate user view from admin management)
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON user_roles;

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can insert user roles"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles"
  ON user_roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

CREATE POLICY "Admins can delete user roles"
  ON user_roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name = 'admin'
    )
  );

-- Drop and recreate warehouses policies (separate view from management)
DROP POLICY IF EXISTS "Warehouses viewable by authenticated users" ON warehouses;
DROP POLICY IF EXISTS "Admins and stock managers can manage warehouses" ON warehouses;

CREATE POLICY "Warehouses viewable by authenticated users"
  ON warehouses FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins and stock managers can insert warehouses"
  ON warehouses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'stock')
    )
  );

CREATE POLICY "Admins and stock managers can update warehouses"
  ON warehouses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'stock')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'stock')
    )
  );

CREATE POLICY "Admins and stock managers can delete warehouses"
  ON warehouses FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
      AND r.name IN ('admin', 'stock')
    )
  );

-- ==================== FIX FUNCTION SECURITY ====================

-- Drop and recreate function with secure search_path
DROP FUNCTION IF EXISTS get_next_document_number(uuid, text, uuid);

CREATE OR REPLACE FUNCTION get_next_document_number(
  p_user_id uuid,
  p_document_type text,
  p_warehouse_id uuid DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_seq RECORD;
  v_current_year integer;
  v_next_number integer;
  v_formatted_seq text;
  v_result text;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
  
  SELECT * INTO v_seq
  FROM numbering_sequences
  WHERE user_id = p_user_id
    AND document_type = p_document_type
    AND (warehouse_id = p_warehouse_id OR (warehouse_id IS NULL AND p_warehouse_id IS NULL))
    AND is_active = true;
  
  IF NOT FOUND THEN
    INSERT INTO numbering_sequences (
      user_id, warehouse_id, document_type, prefix, current_year, current_sequence
    ) VALUES (
      p_user_id, p_warehouse_id, p_document_type, UPPER(SUBSTRING(p_document_type, 1, 3)), v_current_year, 0
    )
    RETURNING * INTO v_seq;
  END IF;
  
  IF v_seq.reset_annually AND v_seq.current_year < v_current_year THEN
    UPDATE numbering_sequences
    SET current_year = v_current_year,
        current_sequence = v_seq.start_number,
        updated_at = now()
    WHERE id = v_seq.id;
    
    v_next_number := v_seq.start_number;
  ELSE
    v_next_number := v_seq.current_sequence + 1;
    
    UPDATE numbering_sequences
    SET current_sequence = v_next_number,
        updated_at = now()
    WHERE id = v_seq.id;
  END IF;
  
  v_formatted_seq := LPAD(v_next_number::text, v_seq.padding, '0');
  
  v_result := v_seq.format_pattern;
  v_result := REPLACE(v_result, '{PREFIX}', v_seq.prefix);
  v_result := REPLACE(v_result, '{YEAR}', v_current_year::text);
  v_result := REPLACE(v_result, '{SEQ:' || v_seq.padding || '}', v_formatted_seq);
  
  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_next_document_number(uuid, text, uuid) TO authenticated;