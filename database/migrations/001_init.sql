-- ============================================================
-- Smart Secure QR-Code — Supabase Migration
-- ============================================================

-- Key pairs table
CREATE TABLE IF NOT EXISTS key_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  private_key TEXT,
  fingerprint TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- QR payloads table (stores signed + encrypted document data)
CREATE TABLE IF NOT EXISTS qr_payloads (
  secure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_hash TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  encrypted_payload TEXT NOT NULL,
  outer_signature TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  key_pair_id UUID NOT NULL REFERENCES key_pairs(id) ON DELETE RESTRICT,
  issuer_id TEXT DEFAULT '',
  metadata TEXT DEFAULT '',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scan logs for anti-cloning detection
CREATE TABLE IF NOT EXISTS scan_logs (
  id BIGSERIAL PRIMARY KEY,
  secure_id UUID NOT NULL REFERENCES qr_payloads(secure_id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_ip TEXT DEFAULT ''
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_logs_secure_id ON scan_logs(secure_id);
CREATE INDEX IF NOT EXISTS idx_key_pairs_default ON key_pairs(is_default) WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_qr_payloads_key_pair ON qr_payloads(key_pair_id);
CREATE INDEX IF NOT EXISTS idx_qr_payloads_valid ON qr_payloads(valid_from, valid_until);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE key_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- Allow service-role (backend) full access to all tables
-- These policies use the service_role key which bypasses RLS by default,
-- but we add explicit policies for the anon key used by the Nuxt server.

-- key_pairs: allow all operations via anon/authenticated (server-side only)
CREATE POLICY "key_pairs_select" ON key_pairs FOR SELECT USING (true);
CREATE POLICY "key_pairs_insert" ON key_pairs FOR INSERT WITH CHECK (true);
CREATE POLICY "key_pairs_update" ON key_pairs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "key_pairs_delete" ON key_pairs FOR DELETE USING (true);

-- qr_payloads: allow all operations
CREATE POLICY "qr_payloads_select" ON qr_payloads FOR SELECT USING (true);
CREATE POLICY "qr_payloads_insert" ON qr_payloads FOR INSERT WITH CHECK (true);
CREATE POLICY "qr_payloads_update" ON qr_payloads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "qr_payloads_delete" ON qr_payloads FOR DELETE USING (true);

-- scan_logs: allow insert (logging) and select (reading)
CREATE POLICY "scan_logs_select" ON scan_logs FOR SELECT USING (true);
CREATE POLICY "scan_logs_insert" ON scan_logs FOR INSERT WITH CHECK (true);
