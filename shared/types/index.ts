// ─── Database Row Types ───

export interface KeyPairRow {
  id: string
  name: string
  public_key: string      // base64
  private_key: string | null // base64
  fingerprint: string
  is_default: boolean
  created_at: string
}

export interface QRPayloadRow {
  secure_id: string
  document_hash: string
  file_name: string
  file_size: number
  encrypted_payload: string  // base64
  outer_signature: string    // base64
  timestamp: number
  key_pair_id: string
  issuer_id: string
  metadata: string
  valid_from: string
  valid_until: string
  created_at: string
}

export interface ScanLogRow {
  id: number
  secure_id: string
  scanned_at: string
  source_ip: string
}

// ─── API Response Types ───

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
}

export interface KeyPairInfo {
  id: string
  name: string
  fingerprint: string
  is_default: boolean
  has_private_key: boolean
  created_at: string
}

export interface GenerateResult {
  secure_id: string
  qr_code_base64: string
  signed_pdf_base64: string | null
  document_hash: string
  file_name: string
  file_size: number
  is_pdf: boolean
  public_key: string
}

export interface VerificationResult {
  status: 'authentic' | 'tampered' | 'not_yet_valid' | 'expired' | 'error'
  message: string
  document_hash?: string
  file_name?: string
  file_size?: number
  issuer_id?: string
  issued_at?: string
  valid_from?: string
  valid_until?: string
  metadata?: string
  public_key_hex?: string
  scan_count?: number
}

export interface ScanLog {
  id: number
  secure_id: string
  scanned_at: string
  source_ip: string
}

// ─── Frontend Types ───

export interface IssuerConfig {
  key_pair_id: string
  valid_from: string
  valid_until: string
  metadata: string
  issuer_id: string
  qr_position: string
  qr_page: number
  qr_size: number
}
