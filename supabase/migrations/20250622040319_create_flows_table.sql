-- Create flows table for storing user automation workflows
CREATE TABLE IF NOT EXISTS public.flows (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    start_date date,
    end_date date,
    is_active boolean DEFAULT true NOT NULL,
    schema jsonb NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS flows_user_id_idx ON public.flows(user_id);
CREATE INDEX IF NOT EXISTS flows_created_at_idx ON public.flows(created_at DESC);
CREATE INDEX IF NOT EXISTS flows_is_active_idx ON public.flows(is_active);
CREATE INDEX IF NOT EXISTS flows_start_date_idx ON public.flows(start_date);
CREATE INDEX IF NOT EXISTS flows_end_date_idx ON public.flows(end_date);

-- Enable Row Level Security
ALTER TABLE public.flows ENABLE ROW LEVEL security;

-- Create RLS policies
-- Users can insert their own flows
CREATE POLICY "Users can insert their own flows" ON public.flows
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can select their own flows
CREATE POLICY "Users can select their own flows" ON public.flows
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can update their own flows
CREATE POLICY "Users can update their own flows" ON public.flows
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own flows
CREATE POLICY "Users can delete their own flows" ON public.flows
    FOR DELETE 
    USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on record update
CREATE TRIGGER handle_flows_updated_at
    BEFORE UPDATE ON public.flows
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 