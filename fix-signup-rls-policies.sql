-- Fix for "Database error saving new user" - Missing INSERT RLS Policies
-- 
-- PROBLEM: The handle_new_user() trigger cannot insert into user_profiles and user_settings
-- because there are no INSERT policies defined for these tables.
--
-- SOLUTION: Add INSERT policies that allow the trigger to create records during user signup.

-- Add INSERT policy for user_profiles table
-- This allows the trigger to create a profile record when a new user signs up
CREATE POLICY "Allow INSERT during user creation" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Add INSERT policy for user_settings table  
-- This allows the trigger to create a settings record when a new user signs up
CREATE POLICY "Allow INSERT during user creation" ON public.user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Verify the policies were created correctly
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'user_settings')
AND cmd = 'INSERT'
ORDER BY tablename, policyname;