# Web-based Smart Secure QR Code

A research-driven web application for generating cryptographically secure, tamper-proof QR codes with multi-layer digital signatures and time-lock encryption. This project is developed collaboratively by a research team investigating advanced document authentication mechanisms that go beyond conventional static QR code systems.

The system employs a dual-signature architecture (inner + outer ECDSA P-256 signatures), SHA3-256 document hashing, and Drand-based time-lock encryption to ensure document integrity, temporal validity enforcement, and anti-cloning protection. Unlike traditional QR implementations that embed raw data directly, this system generates dynamic QR codes containing only a secure reference identifier, while the full cryptographic payload is stored server-side — mitigating data exfiltration and QR duplication attacks.

## Research Team (FAST RG)

- Ir. Randi Rizal, Ph.D
- Fauzan Alvin Mubarok
- Ridwan Muhammad Raihan

## Tech Stack

- **[Nuxt 4](https://nuxt.com/)** — Full-stack Vue framework (SSR + API routes)
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS framework
- **[Supabase](https://supabase.com/)** — PostgreSQL database with Row Level Security
- **[tlock-js](https://github.com/drand/tlock-js)** — Drand-based time-lock encryption
- **[sharp](https://sharp.pixelplumbing.com/)** — High-performance image processing for QR reading
- **[pdf-lib](https://pdf-lib.js.org/)** — PDF manipulation for QR embedding

## Prerequisites

- **Node.js** >= 18
- A **Supabase** project (free tier works)

## Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/smart-secure-qr-code.git
cd smart-secure-qr-code/nuxt-app

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
NUXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Database Setup

Run the migration SQL in your Supabase Dashboard **SQL Editor**:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**
2. Paste the contents of [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)
3. Click **Run**

This creates the `key_pairs`, `qr_payloads`, and `scan_logs` tables with RLS policies.

## Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

For deployment options, refer to the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment).

## Architecture

### Cryptographic Pipeline

1. **Document Hashing** — SHA3-256 hash of the uploaded document
2. **Inner Signature** — ECDSA P-256 signature over the document hash
3. **Time-Lock Encryption** — Drand tlock encrypts the inner payload (UUID + hash + signature + filename), unlockable only after `valid_from` time
4. **Outer Signature** — ECDSA P-256 signature over (timestamp + encrypted payload)
5. **QR Generation** — Dynamic QR code pointing to `/r/:id` redirect endpoint

### Verification Flow

1. QR code scans → redirects to `/verify/:id`
2. **Replay attack check** — rate limit per IP per QR (>10 req/min → blocked)
3. Scan logged with timestamp and source IP
4. Server retrieves the cryptographic payload from Supabase
5. **QR cloning detection** — unique IP count ≥ 3 → cloning warning
6. Checks temporal validity (not-yet-valid / expired)
7. Verifies outer ECDSA P-256 signature
8. Decrypts time-locked inner payload via Drand
9. Verifies inner ECDSA P-256 signature
10. Compares document hash — returns authentic / tampered / expired status

### Security — Attack Resistance

| Attack | Result | Mechanism |
| --- | --- | --- |
| **QR Cloning** | Detection Success | Scan logging with source IP; unique IP count ≥ 3 triggers cloning warning |
| **Replay Attack** | Blocked | Rate limiting: >10 requests/min from same IP per QR → `replay_blocked` |
| **Tampering** | Invalid Signature | Dual ECDSA P-256 signature verification (outer + inner) + SHA3-256 hash comparison |
| **Early Access** | Denied | Temporal check (`now < valid_from`) + Drand time-lock encryption prevents decryption |
| **Expired Access** | Rejected | Temporal check (`now > valid_until`) → access rejected |

## Performance Benchmark

### Cross-File Benchmark

Computed metrics across 12 test files (100KB, 500KB, 1MB, 5MB in RTF, DOCX, PDF formats).

| Filename | QR Generation | Signature Time | Verification Time | Encryption Overhead | Peak Memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| file-sample_100kB.rtf | 110.50 ms | 0.57 ms | 0.59 ms | 78.25 ms | 32.38 MB |
| file-sample_100kB.docx | 105.53 ms | 0.80 ms | 0.91 ms | 77.03 ms | 32.48 MB |
| file-sample_100kB.pdf | 113.31 ms | 1.07 ms | 1.32 ms | 76.80 ms | 33.22 MB |
| file-sample_500kB.rtf | 104.29 ms | 0.76 ms | 0.61 ms | 76.37 ms | 34.38 MB |
| file-sample_500kB.docx | 113.23 ms | 0.87 ms | 0.69 ms | 77.60 ms | 30.69 MB |
| file-sample_500kB.pdf | 193.33 ms | 0.79 ms | 2.89 ms | 80.78 ms | 30.96 MB |
| file-sample_1MB.rtf | 164.07 ms | 5.13 ms | 2.99 ms | 154.44 ms | 32.09 MB |
| file-sample_1MB.docx | 285.79 ms | 0.73 ms | 0.72 ms | 193.69 ms | 31.72 MB |
| file-sample_1MB.pdf | 165.12 ms | 0.72 ms | 1.18 ms | 105.92 ms | 29.79 MB |
| file-sample_5MB.rtf | 176.17 ms | 2.84 ms | 0.98 ms | 108.05 ms | 34.12 MB |
| file-sample_5MB.docx | 256.41 ms | 1.47 ms | 2.89 ms | 116.69 ms | 33.02 MB |
| file-sample_5MB.pdf | 183.63 ms | 1.12 ms | 1.26 ms | 103.07 ms | 31.46 MB |

#### Average by File Size

| File Size | QR Generation | Signature Time | Verification Time | Encryption Overhead | Peak Memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| 100 KB | 109.78 ms | 0.81 ms | 0.94 ms | 77.36 ms | 32.69 MB |
| 500 KB | 136.95 ms | 0.81 ms | 1.40 ms | 78.25 ms | 32.01 MB |
| 1 MB | 204.99 ms | 2.19 ms | 1.63 ms | 151.35 ms | 31.20 MB |
| 5 MB | 205.40 ms | 1.81 ms | 1.71 ms | 109.27 ms | 32.87 MB |

### Evaluation Summary

| Metric | Value |
| --- | --- |
| QR generation time | 164.28 ms (avg across all files) |
| Signature time | 1.41 ms (avg across all files) |
| Verification time | 1.42 ms (avg across all files) |
| Encryption overhead | 104.06 ms (avg across all files) |
| Peak memory usage | 32.19 MB (avg across all files) |

> **Key observations:**
> - Local crypto operations (sign, verify, hash) remain sub-5ms across all file sizes and formats.
> - QR generation scales moderately with file size: ~110ms at 100KB → ~205ms at 5MB.
> - Encryption overhead increases notably at 1MB (151ms) but stabilizes at 5MB (109ms).
> - Memory usage is consistent at ~32 MB regardless of file size or format.
> - File format (RTF/DOCX/PDF) has no significant impact on cryptographic performance.

## Future Works

- **Blockchain-Based Verification** — Anchor document hashes and signature proofs on-chain (e.g., Ethereum or a permissioned ledger) to provide an immutable, decentralized audit trail. This eliminates single-point-of-trust dependency on the issuing server and enables third-party verifiability without backend access.

- **Post-Quantum Digital Signatures** — Migrate from ECDSA P-256 to lattice-based or hash-based signature schemes (e.g., CRYSTALS-Dilithium, SPHINCS+) to ensure long-term cryptographic resilience against quantum adversaries. The dual-signature architecture is designed to accommodate algorithm-agile upgrades without breaking the verification protocol.

- **Decentralized Verification Network** — Replace the centralized database backend with a distributed verification protocol (e.g., IPFS-backed payload storage combined with smart contract-based access control) so that any participant in the network can independently verify a QR code without relying on a single server or database instance.

## License

This project is licensed under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2026 FAST Research Group

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
