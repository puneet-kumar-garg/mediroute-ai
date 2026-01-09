-- Add emergency type and medical keyword columns to emergency_tokens table
ALTER TABLE public.emergency_tokens 
ADD COLUMN emergency_type text,
ADD COLUMN medical_keyword text;

-- Create index for faster filtering by emergency type
CREATE INDEX idx_emergency_tokens_type ON public.emergency_tokens(emergency_type);
CREATE INDEX idx_emergency_tokens_keyword ON public.emergency_tokens(medical_keyword);