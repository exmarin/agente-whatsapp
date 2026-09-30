-- Switches the WhatsApp provider from YCloud (BSP) to direct Meta Cloud API.
-- Existing 'ycloud' rows/enum value are left in place (Postgres can't drop
-- enum values in use, and old data stays valid history) — the app simply
-- stops reading/writing that provider going forward.
alter type integration_provider add value if not exists 'meta';
