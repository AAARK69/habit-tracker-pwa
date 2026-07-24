-- Create Custom Question Types check constraint
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('boolean', 'number', 'text', 'scale_1_to_5')),
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    icon TEXT NOT NULL DEFAULT 'help-circle',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration query in case table already exists
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS icon TEXT NOT NULL DEFAULT 'help-circle';

-- Create Daily Logs Table (responses stored in JSONB)
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    responses JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_user_daily_log UNIQUE (user_id, date)
);

-- Create Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Goals & Life OKRs Table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Personal',
    target_value NUMERIC NOT NULL DEFAULT 100,
    current_value NUMERIC NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'days',
    target_date DATE,
    linked_question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    habit_stack TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Unique index to prevent duplicate subscription endpoints per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscription_endpoint 
ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for questions
DROP POLICY IF EXISTS "Users can manage their own questions" ON public.questions;
CREATE POLICY "Users can manage their own questions"
    ON public.questions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_logs
DROP POLICY IF EXISTS "Users can manage their own daily logs" ON public.daily_logs;
CREATE POLICY "Users can manage their own daily logs"
    ON public.daily_logs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for push_subscriptions
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage their own subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for goals
DROP POLICY IF EXISTS "Users can manage their own goals" ON public.goals;
CREATE POLICY "Users can manage their own goals"
    ON public.goals
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Seed default questions function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.questions (user_id, prompt, type, order_index, icon)
    VALUES
        (new.id, 'Did you exercise today?', 'boolean', 0, 'dumbbell'),
        (new.id, 'Hours of sleep last night', 'number', 1, 'bed'),
        (new.id, 'Overall mood today', 'scale_1_to_5', 2, 'smile'),
        (new.id, 'What was the highlight of your day?', 'text', 3, 'sparkles');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to seed questions on sign up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();
