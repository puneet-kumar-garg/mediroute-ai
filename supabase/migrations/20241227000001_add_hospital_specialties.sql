-- Add hospital specialties and capabilities tracking
ALTER TABLE public.profiles 
ADD COLUMN specialties text[] DEFAULT '{}',
ADD COLUMN capabilities jsonb DEFAULT '{}',
ADD COLUMN last_updated_specialties timestamp with time zone DEFAULT now();

-- Create hospital updates table for tracking changes
CREATE TABLE public.hospital_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  update_type text NOT NULL CHECK (update_type IN ('department', 'equipment', 'specialist', 'capacity', 'accreditation')),
  update_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hospital_updates ENABLE ROW LEVEL SECURITY;

-- Hospital users can view and insert their own updates
CREATE POLICY "Hospital users can manage own updates"
ON public.hospital_updates
FOR ALL
USING (hospital_id = auth.uid());

-- Create indexes for performance
CREATE INDEX idx_hospital_updates_hospital ON public.hospital_updates(hospital_id);
CREATE INDEX idx_hospital_updates_type ON public.hospital_updates(update_type);
CREATE INDEX idx_profiles_specialties ON public.profiles USING GIN(specialties);

-- Enable realtime for hospital updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.hospital_updates;