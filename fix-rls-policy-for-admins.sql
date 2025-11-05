-- Fix RLS policy to allow admins to update project_observation_options
-- This allows users with "admin" role in project_users to update observation options

-- Drop the existing policy
DROP POLICY IF EXISTS "Project creators can manage observation options" ON project_observation_options;

-- Create a new policy that allows both creators and admins
CREATE POLICY "Project creators and admins can manage observation options"
    ON project_observation_options FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_observation_options.project_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM project_users pu
                    WHERE pu.project_id = p.id 
                    AND pu.user_id = auth.uid()
                    AND pu.role = 'admin'
                )
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_observation_options.project_id AND (
                p.created_by = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM project_users pu
                    WHERE pu.project_id = p.id 
                    AND pu.user_id = auth.uid()
                    AND pu.role = 'admin'
                )
            )
        )
    );

