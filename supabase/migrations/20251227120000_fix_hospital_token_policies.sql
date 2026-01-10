-- Fix RLS policies for emergency_tokens to allow hospital users to update any token

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Hospital users can view pending and assigned tokens" ON public.emergency_tokens;
DROP POLICY IF EXISTS "Hospital users can update assigned tokens" ON public.emergency_tokens;

-- Create new permissive policies for hospital users
CREATE POLICY "Hospital users can view all tokens"
ON public.emergency_tokens
FOR SELECT
USING (has_role(auth.uid(), 'hospital'::user_role));

CREATE POLICY "Hospital users can update all tokens"
ON public.emergency_tokens
FOR UPDATE
USING (has_role(auth.uid(), 'hospital'::user_role));

CREATE POLICY "Hospital users can create tokens"
ON public.emergency_tokens
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'hospital'::user_role));