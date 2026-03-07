-- Donations table for storing payment records
-- Run this migration in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gateway VARCHAR(50) NOT NULL DEFAULT 'razorpay',
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    order_id VARCHAR(100),
    payment_id VARCHAR(100),
    donor_email VARCHAR(255),
    donor_name VARCHAR(255),
    donor_phone VARCHAR(20),
    receipt_number VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read access to donations" 
ON public.donations FOR SELECT 
USING (auth.role() IN ('admin', 'super_admin'));

CREATE POLICY "Allow insert access to donations" 
ON public.donations FOR INSERT 
WITH CHECK (auth.role() IN ('admin', 'super_admin', 'service_role'));

CREATE POLICY "Allow update access to donations" 
ON public.donations FOR UPDATE 
USING (auth.role() IN ('admin', 'super_admin'));

-- Create index for faster queries
CREATE INDEX idx_donations_order_id ON public.donations(order_id);
CREATE INDEX idx_donations_status ON public.donations(status);
CREATE INDEX idx_donations_created_at ON public.donations(created_at DESC);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_donations_updated_at 
BEFORE UPDATE ON public.donations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add to schema cache (for Supabase to recognize the table)
NOTIFY pgrst, 'reload';
