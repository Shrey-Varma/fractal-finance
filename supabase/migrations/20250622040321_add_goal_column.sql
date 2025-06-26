-- Add goal column to flows table for goal management feature
ALTER TABLE public.flows ADD COLUMN goal text;

-- Create index for better performance when filtering by goal
CREATE INDEX IF NOT EXISTS flows_goal_idx ON public.flows(goal); 