-- Add email column to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN email VARCHAR(255);

-- Create index for email lookups
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);