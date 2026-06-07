-- ============================================================================
-- Switch invoice currency to INR.
-- Run this only if you already applied 0001 with the old 'USD' default.
-- (Fresh installs already default to 'INR' from the updated 0001.)
-- ============================================================================

alter table public.invoices alter column currency set default 'INR';

-- Convert existing invoices that still carry the old default.
update public.invoices set currency = 'INR' where currency = 'USD';
