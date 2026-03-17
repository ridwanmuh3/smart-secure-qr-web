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
2. Server retrieves the cryptographic payload from Supabase
3. Checks temporal validity (not-yet-valid / expired)
4. Verifies outer ECDSA P-256 signature
5. Decrypts time-locked inner payload via Drand
6. Verifies inner ECDSA P-256 signature
7. Compares document hash — returns authentic / tampered / expired status

### Anti-Cloning

Every scan is logged with timestamp and source IP. Documents scanned more than 5 times trigger a cloning warning to the verifier.

## Performance Benchmark

Benchmarks measured at the integration level — each cryptographic primitive invoked in isolation. **N=100 iterations** against a **1 MB document** using ECDSA P-256 + SHA-256 + Drand tlock.

| Metric                          | N   | Min       | Max      | Avg           |
| ------------------------------- | --- | --------- | -------- | ------------- |
| Document Hashing (SHA-256, 1MB) | 100 | 3.56 ms   | 16.00 ms | 5.38 ms       |
| ECDSA P-256 Key Generation      | 100 | 0.02 ms   | 0.06 ms  | 0.02 ms       |
| ECDSA P-256 Sign (inner)        | 100 | 0.05 ms   | 0.13 ms  | 0.06 ms       |
| ECDSA P-256 Sign (outer)        | 100 | 0.05 ms   | 0.17 ms  | 0.08 ms       |
| ECDSA P-256 Verify (inner)      | 100 | 0.10 ms   | 0.22 ms  | 0.12 ms       |
| ECDSA P-256 Verify (outer)      | 100 | 0.10 ms   | 0.52 ms  | 0.13 ms       |
| QR Code Generation              | 100 | 15.16 ms  | 65.47 ms | 19.79 ms      |
| Time-Lock Encrypt (Drand)       | 100 | 759.49 ms | 1.944 s  | 827.56 ms     |
| Time-Lock Decrypt (Drand)       | 100 | 945.40 ms | 1.192 s  | 1.012 s       |
| **Full QR Generation**          | 100 | 778.95 ms | 1.063 s  | **850.00 ms** |
| **Full Verification**           | 100 | 952.34 ms | 1.251 s  | **1.010 s**   |

### Evaluation Summary

| Metric              | Value                                             |
| ------------------- | ------------------------------------------------- |
| QR generation time  | 850.00 ms                                         |
| Signature time      | 0.06 ms (inner) / 0.08 ms (outer)                 |
| Verification time   | 1.010 s                                           |
| Encryption overhead | 827.56 ms                                         |
| Memory usage        | 544.97 MB (total allocated across all iterations) |

> **Key observation:** Local crypto operations (sign, verify, hash) are sub-millisecond. The Drand network round-trip dominates both generation (~828ms) and verification (~1.01s), accounting for >97% of end-to-end time.

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
