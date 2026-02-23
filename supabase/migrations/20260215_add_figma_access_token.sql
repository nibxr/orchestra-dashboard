-- Add figma_access_token column to team table
-- This allows each team member to securely store their Figma personal access token

ALTER TABLE public.team
ADD COLUMN IF NOT EXISTS figma_access_token TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.team.figma_access_token IS 'Personal Figma access token for importing frames from Figma files';
