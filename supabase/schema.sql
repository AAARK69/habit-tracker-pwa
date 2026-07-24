-- Create Custom Question Types check constraint
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('boolean', 'number', 'text', 'scale_1_to_5')),
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

-- Unique index to prevent duplicate subscription endpoints per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscription_endpoint 
ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for questions
CREATE POLICY "Users can manage their own questions"
    ON public.questions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_logs
CREATE POLICY "Users can manage their own daily logs"
    ON public.daily_logs
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for push_subscriptions
CREATE POLICY "Users can manage their own subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Seed default questions function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.questions (user_id, prompt, type, order_index)
    VALUES
        (new.id, 'Did you exercise today?', 'boolean', 0),
        (new.id, 'Hours of sleep last night', 'number', 1),
        (new.id, 'Overall mood today', 'scale_1_to_5', 2),
        (new.id, 'What was the highlight of your day?', 'text', 3);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to seed questions on sign up
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();
