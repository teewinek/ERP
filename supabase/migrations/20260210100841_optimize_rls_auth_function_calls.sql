/*
  # Optimize RLS Auth Function Calls for Performance

  ## Issue
  Multiple RLS policies re-evaluate auth.uid() for each row, causing performance degradation at scale.
  
  ## Solution
  Replace `auth.uid()` with `(select auth.uid())` to evaluate the function once per query instead of once per row.
  This significantly improves performance on large datasets.

  ## Tables and Policies Updated
  
  1. **roles** (3 policies)
     - Only admins can insert roles
     - Only admins can update roles
     - Only admins can delete roles

  2. **user_roles** (4 policies)
     - Users can view own roles
     - Admins can insert user roles
     - Admins can update user roles
     - Admins can delete user roles

  3. **activity_logs** (1 policy)
     - Users can view activity logs

  4. **warehouses** (3 policies)
     - Admins and stock managers can insert warehouses
     - Admins and stock managers can update warehouses
     - Admins and stock managers can delete warehouses

  5. **numbering_sequences** (4 policies)
     - Users can view own numbering sequences
     - Users can insert own numbering sequences
     - Users can update own numbering sequences
     - Users can delete own numbering sequences

  6. **proforma_items** (4 policies)
     - Users can view own proforma items
     - Users can insert own proforma items
     - Users can update own proforma items
     - Users can delete own proforma items

  ## Performance Impact
  This optimization reduces database CPU usage and improves query response times, especially for queries that process many rows.
*/

-- ==================== ROLES TABLE ====================

DROP POLICY IF EXISTS "Only admins can insert roles" ON roles;
CREATE POLICY "Only admins can insert roles"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can update roles" ON roles;
CREATE POLICY "Only admins can update roles"
  ON roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admins can delete roles" ON roles;
CREATE POLICY "Only admins can delete roles"
  ON roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

-- ==================== USER_ROLES TABLE ====================

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;
CREATE POLICY "Admins can insert user roles"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;
CREATE POLICY "Admins can update user roles"
  ON user_roles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete user roles" ON user_roles;
CREATE POLICY "Admins can delete user roles"
  ON user_roles FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

-- ==================== ACTIVITY_LOGS TABLE ====================

DROP POLICY IF EXISTS "Users can view activity logs" ON activity_logs;
CREATE POLICY "Users can view activity logs"
  ON activity_logs FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name = 'admin'
    )
  );

-- ==================== WAREHOUSES TABLE ====================

DROP POLICY IF EXISTS "Admins and stock managers can insert warehouses" ON warehouses;
CREATE POLICY "Admins and stock managers can insert warehouses"
  ON warehouses FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('admin', 'stock')
    )
  );

DROP POLICY IF EXISTS "Admins and stock managers can update warehouses" ON warehouses;
CREATE POLICY "Admins and stock managers can update warehouses"
  ON warehouses FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('admin', 'stock')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('admin', 'stock')
    )
  );

DROP POLICY IF EXISTS "Admins and stock managers can delete warehouses" ON warehouses;
CREATE POLICY "Admins and stock managers can delete warehouses"
  ON warehouses FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = (select auth.uid())
      AND r.name IN ('admin', 'stock')
    )
  );

-- ==================== NUMBERING_SEQUENCES TABLE ====================

DROP POLICY IF EXISTS "Users can view own numbering sequences" ON numbering_sequences;
CREATE POLICY "Users can view own numbering sequences"
  ON numbering_sequences FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own numbering sequences" ON numbering_sequences;
CREATE POLICY "Users can insert own numbering sequences"
  ON numbering_sequences FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own numbering sequences" ON numbering_sequences;
CREATE POLICY "Users can update own numbering sequences"
  ON numbering_sequences FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own numbering sequences" ON numbering_sequences;
CREATE POLICY "Users can delete own numbering sequences"
  ON numbering_sequences FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- ==================== PROFORMA_ITEMS TABLE ====================

DROP POLICY IF EXISTS "Users can view own proforma items" ON proforma_items;
CREATE POLICY "Users can view own proforma items"
  ON proforma_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert own proforma items" ON proforma_items;
CREATE POLICY "Users can insert own proforma items"
  ON proforma_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own proforma items" ON proforma_items;
CREATE POLICY "Users can update own proforma items"
  ON proforma_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own proforma items" ON proforma_items;
CREATE POLICY "Users can delete own proforma items"
  ON proforma_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM proformas
      WHERE proformas.id = proforma_items.proforma_id
      AND proformas.user_id = (select auth.uid())
    )
  );