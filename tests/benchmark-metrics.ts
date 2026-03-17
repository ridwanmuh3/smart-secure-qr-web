import { performance } from "node:perf_hooks";
import { readFileSync, existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  hashSHA3,
  generateKeyPair,
  sign,
  verify,
} from "../server/utils/crypto.js";
import { generateQRBase64 } from "../server/utils/qr.js";
import { tlockEncrypt, tlockDecrypt } from "../server/utils/tlock.js";

// ─── Path Setup ───

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATASET_DIR = resolve(__dirname, "dataset");

// ─── Types ───

interface BenchmarkResult {
  name: string;
  n: number;
  min: number; // ms
  max: number; // ms
  avg: number; // ms
  memPeakMB: number; // peak heap used in MB
  memAvgMB: number; // avg heap used in MB
}

interface ComputedMetric {
  metric: string;
  description: string;
  value: string;
}

interface FileSummary {
  file: string;
  size: string;
  format: string;
  qrGenTime: number;
  signatureTime: number;
  verificationTime: number;
  encryptionOverhead: number;
  memoryPeakMB: number;
}

interface TestFile {
  name: string;
  label: string;
  format: string;
  data: Buffer;
}

interface PreEncrypted {
  ciphertext: string;
  innerPayload: Buffer;
  hashBytes: Buffer;
  innerSig: Buffer;
  outerData: Buffer;
  outerSig: Buffer;
}

// ─── Dataset File Mapping ───

const FILE_MAP: Array<{ label: string; files: Record<string, string> }> = [
  {
    label: "100 KB",
    files: {
      rtf: "file-sample_100kB.rtf",
      docx: "file-sample_100kB.docx",
      pdf: "file-sample_150kB.pdf",
    },
  },
  {
    label: "500 KB",
    files: {
      rtf: "file-sample_500kB.rtf",
      docx: "file-sample_500kB.docx",
      pdf: "file-example_PDF_500_kB.pdf",
    },
  },
  {
    label: "1 MB",
    files: {
      rtf: "file-sample_1MB.rtf",
      docx: "file-sample_1MB.docx",
      pdf: "file-example_PDF_1MB.pdf",
    },
  },
  {
    label: "5 MB",
    files: {
      rtf: "5mb.rtf",
      docx: "5mb.docx",
      pdf: "5-mb-example-file.pdf",
    },
  },
];

// ─── Benchmark Runner ───

async function benchmark(
  name: string,
  n: number,
  fn: () => void | Promise<void>,
): Promise<BenchmarkResult> {
  process.stdout.write(`  Running: ${name}...\r`);

  const durations: number[] = [];
  const heapSamples: number[] = [];

  // Warmup
  await fn();

  for (let i = 0; i < n; i++) {
    const start = performance.now();
    await fn();
    durations.push(performance.now() - start);
    heapSamples.push(process.memoryUsage().heapUsed);
  }

  durations.sort((a, b) => a - b);
  const total = durations.reduce((sum, d) => sum + d, 0);
  const peakHeap = Math.max(...heapSamples);
  const avgHeap = heapSamples.reduce((s, h) => s + h, 0) / n;

  process.stdout.write(
    `  Done: ${name}                                        \r`,
  );

  return {
    name,
    n,
    min: durations[0],
    max: durations[n - 1],
    avg: total / n,
    memPeakMB: peakHeap / (1024 * 1024),
    memAvgMB: avgHeap / (1024 * 1024),
  };
}

// ─── Formatting ───

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(3)} s`;
  return `${ms.toFixed(2)} ms`;
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(2)} MB`;
}

function printTable(title: string, results: BenchmarkResult[]) {
  if (results.length === 0) return;

  const maxName = Math.max(
    ...results.map((r) => r.name.length),
    "Metric".length,
  );

  console.log();
  console.log(`### ${title}`);
  console.log();
  console.log(
    `| ${"Metric".padEnd(maxName)} | N   | ${"Min".padEnd(10)} | ${"Max".padEnd(10)} | ${"Avg".padEnd(13)} |`,
  );
  console.log(
    `| ${"-".repeat(maxName)} | --- | ${"-".repeat(10)} | ${"-".repeat(10)} | ${"-".repeat(13)} |`,
  );

  for (const r of results) {
    console.log(
      `| ${r.name.padEnd(maxName)} | ${String(r.n).padEnd(3)} | ${formatDuration(r.min).padEnd(10)} | ${formatDuration(r.max).padEnd(10)} | ${formatDuration(r.avg).padEnd(13)} |`,
    );
  }
}

// ─── Computed Metrics ───

function findResult(
  results: BenchmarkResult[],
  pattern: string,
): BenchmarkResult | undefined {
  return results.find((r) => r.name.includes(pattern));
}

function computeMetrics(
  results: BenchmarkResult[],
  file: TestFile,
): { computed: ComputedMetric[]; summary: FileSummary } {
  const signInner = findResult(results, "Sign (inner)");
  const signOuter = findResult(results, "Sign (outer)");
  const verifyInner = findResult(results, "Verify (inner)");
  const verifyOuter = findResult(results, "Verify (outer)");
  const qrGen = findResult(results, "QR Code Generation");
  const tlockEnc = findResult(results, "Time-Lock Encrypt");
  const fullGen = findResult(results, "Full QR Generation");
  const fullVerify = findResult(results, "Full Verification");
  const hashing = findResult(results, "Document Hashing");

  // Signature time = inner sign + outer sign
  const signatureTime = (signInner?.avg ?? 0) + (signOuter?.avg ?? 0);

  // Verification time = inner verify + outer verify
  const verificationTime = (verifyInner?.avg ?? 0) + (verifyOuter?.avg ?? 0);

  // QR generation time = full workflow or QR-only
  const qrGenTime = fullGen?.avg ?? qrGen?.avg ?? 0;

  // Encryption overhead = time-lock encrypt time
  const encryptionOverhead = tlockEnc?.avg ?? 0;

  // Memory usage = peak heap across all operations
  const memoryPeakMB = Math.max(...results.map((r) => r.memPeakMB));

  const computed: ComputedMetric[] = [
    {
      metric: "QR Generation Time",
      description: fullGen
        ? "Hash + Sign + TLock + QR (full pipeline)"
        : "QR image generation only",
      value: formatDuration(qrGenTime),
    },
    {
      metric: "Signature Time",
      description: `Inner sign (${formatDuration(signInner?.avg ?? 0)}) + Outer sign (${formatDuration(signOuter?.avg ?? 0)})`,
      value: formatDuration(signatureTime),
    },
    {
      metric: "Verification Time",
      description: `Inner verify (${formatDuration(verifyInner?.avg ?? 0)}) + Outer verify (${formatDuration(verifyOuter?.avg ?? 0)})`,
      value: formatDuration(verificationTime),
    },
    {
      metric: "Encryption Overhead",
      description: "Time-lock encrypt via Drand network",
      value: tlockEnc ? formatDuration(encryptionOverhead) : "N/A (skipped)",
    },
    {
      metric: "Memory Usage (Peak)",
      description: "Peak heap memory during benchmarks",
      value: formatMemory(memoryPeakMB),
    },
  ];

  // Add full workflow metrics if available
  if (fullGen) {
    // Compute what percentage of full generation is time-lock
    const tlockPct =
      encryptionOverhead > 0
        ? ((encryptionOverhead / fullGen.avg) * 100).toFixed(1)
        : "0";
    computed.push({
      metric: "TLock % of Full Gen",
      description: `Time-lock encrypt as percentage of full QR generation`,
      value: `${tlockPct}%`,
    });
  }

  if (fullVerify) {
    computed.push({
      metric: "Full Verify Time",
      description: "Outer verify + TLock decrypt + Inner verify",
      value: formatDuration(fullVerify.avg),
    });
  }

  if (hashing) {
    const throughputMBs =
      file.data.length / (1024 * 1024) / (hashing.avg / 1000);
    computed.push({
      metric: "Hash Throughput",
      description: `SHA3-256 throughput for ${file.label} file`,
      value: `${throughputMBs.toFixed(2)} MB/s`,
    });
  }

  return {
    computed,
    summary: {
      file: file.name,
      size: file.label,
      format: file.format.toUpperCase(),
      qrGenTime,
      signatureTime,
      verificationTime,
      encryptionOverhead,
      memoryPeakMB,
    },
  };
}

function printComputedMetrics(title: string, metrics: ComputedMetric[]) {
  const maxMetric = Math.max(
    ...metrics.map((m) => m.metric.length),
    "Metric".length,
  );
  const maxDesc = Math.max(
    ...metrics.map((m) => m.description.length),
    "Description".length,
  );
  const maxVal = Math.max(
    ...metrics.map((m) => m.value.length),
    "Value".length,
  );

  console.log();
  console.log(`### Computed Metrics: ${title}`);
  console.log();
  console.log(
    `| ${"Metric".padEnd(maxMetric)} | ${"Description".padEnd(maxDesc)} | ${"Value".padEnd(maxVal)} |`,
  );
  console.log(
    `| ${"-".repeat(maxMetric)} | ${"-".repeat(maxDesc)} | ${"-".repeat(maxVal)} |`,
  );

  for (const m of metrics) {
    console.log(
      `| ${m.metric.padEnd(maxMetric)} | ${m.description.padEnd(maxDesc)} | ${m.value.padEnd(maxVal)} |`,
    );
  }
}

function printCrossFileSummary(summaries: FileSummary[]) {
  console.log();
  console.log("========================================================");
  console.log("  Cross-File Comparison Summary");
  console.log("========================================================");
  console.log();
  console.log(
    `| ${"File".padEnd(30)} | ${"Size".padEnd(6)} | ${"Fmt".padEnd(4)} | ${"QR Gen".padEnd(12)} | ${"Sig Time".padEnd(12)} | ${"Verify Time".padEnd(12)} | ${"Enc Overhead".padEnd(12)} | ${"Peak Mem".padEnd(10)} |`,
  );
  console.log(
    `| ${"-".repeat(30)} | ${"-".repeat(6)} | ${"-".repeat(4)} | ${"-".repeat(12)} | ${"-".repeat(12)} | ${"-".repeat(12)} | ${"-".repeat(12)} | ${"-".repeat(10)} |`,
  );

  for (const s of summaries) {
    console.log(
      `| ${s.file.padEnd(30)} | ${s.size.padEnd(6)} | ${s.format.padEnd(4)} | ${formatDuration(s.qrGenTime).padEnd(12)} | ${formatDuration(s.signatureTime).padEnd(12)} | ${formatDuration(s.verificationTime).padEnd(12)} | ${(s.encryptionOverhead > 0 ? formatDuration(s.encryptionOverhead) : "N/A").padEnd(12)} | ${formatMemory(s.memoryPeakMB).padEnd(10)} |`,
    );
  }
}

// ─── File Loader ───

function loadTestFiles(): TestFile[] {
  const files: TestFile[] = [];

  for (const group of FILE_MAP) {
    for (const [format, filename] of Object.entries(group.files)) {
      const filePath = join(DATASET_DIR, filename);
      if (!existsSync(filePath)) {
        console.warn(`  WARNING: ${filename} not found, skipping`);
        continue;
      }
      files.push({
        name: filename,
        label: group.label,
        format,
        data: readFileSync(filePath),
      });
    }
  }

  return files;
}

// ─── Inner Payload Builder (matches server/api/issuer/generate.post.ts) ───

function buildInnerPayload(
  hashBytes: Buffer,
  privateKeyB64: string,
  fileName: string,
): { innerPayload: Buffer; innerSig: Buffer } {
  const innerSig = sign(privateKeyB64, hashBytes);
  const uuidBytes = Buffer.from(randomUUID().replace(/-/g, ""), "hex");
  const sigLenBuf = Buffer.alloc(2);
  sigLenBuf.writeUInt16BE(innerSig.length);

  const innerPayload = Buffer.concat([
    uuidBytes, // 16 bytes
    hashBytes, // 32 bytes
    sigLenBuf, // 2 bytes
    innerSig, // variable (ECDSA P-256)
    Buffer.from(fileName, "utf-8"),
  ]);

  return { innerPayload, innerSig };
}

function buildOuterData(ciphertext: string): {
  outerData: Buffer;
  timestampBuf: Buffer;
} {
  const timestamp = Math.floor(Date.now() / 1000) + 30;
  const timestampBuf = Buffer.alloc(8);
  timestampBuf.writeBigInt64LE(BigInt(timestamp));
  const outerData = Buffer.concat([
    timestampBuf,
    Buffer.from(ciphertext, "utf-8"),
  ]);
  return { outerData, timestampBuf };
}

// ─── Main ───

async function main() {
  const args = process.argv.slice(2);
  const skipTLock = args.includes("--skip-tlock");
  const skipFull = args.includes("--skip-full");
  const n =
    parseInt(args.find((a) => a.startsWith("--n="))?.split("=")[1] || "") ||
    100;

  console.log("========================================================");
  console.log("  Smart Secure QR Code - Benchmark Suite");
  console.log("========================================================");
  console.log();

  // Load test files
  const files = loadTestFiles();
  if (files.length === 0) {
    console.error("ERROR: No test files found in", DATASET_DIR);
    console.error("Ensure test datasets exist in tests/dataset/");
    process.exit(1);
  }

  console.log(`Loaded ${files.length} test files`);
  console.log(`Iterations per test: ${n}`);
  if (skipTLock) console.log("Time-lock benchmarks: SKIPPED");
  if (skipFull) console.log("Full workflow benchmarks: SKIPPED");
  console.log();

  // Generate ECDSA P-256 key pair for all benchmarks
  const keyPair = generateKeyPair();

  // ─── Pre-encrypt payloads for decrypt/verification benchmarks ───

  const preEncMap = new Map<string, PreEncrypted>();
  const needPreEnc = !skipTLock || !skipFull;

  if (needPreEnc) {
    console.log("[Setup] Pre-encrypting payloads for decrypt benchmarks...");
    let encFailed = false;

    for (const f of files) {
      if (encFailed) break;

      const hashBytes = Buffer.from(hashSHA3(f.data), "hex");
      const { innerPayload, innerSig } = buildInnerPayload(
        hashBytes,
        keyPair.privateKeyB64,
        f.name,
      );

      try {
        const unlockTime = new Date(Date.now() + 30_000);
        const { ciphertext } = await tlockEncrypt(innerPayload, unlockTime);
        const { outerData } = buildOuterData(ciphertext);
        const outerSig = sign(keyPair.privateKeyB64, outerData);

        preEncMap.set(f.name, {
          ciphertext,
          innerPayload,
          hashBytes,
          innerSig,
          outerData,
          outerSig,
        });
        console.log(`  Encrypted: ${f.name}`);
      } catch (e: any) {
        console.warn(`  WARNING: Failed to encrypt ${f.name}: ${e.message}`);
        console.warn("  Time-lock and full benchmarks will be skipped.");
        encFailed = true;
      }
    }

    // Wait for time-lock rounds to pass
    if (preEncMap.size > 0) {
      const waitSeconds = 35;
      console.log();
      console.log(
        `[Setup] Waiting for time-lock rounds to pass (${waitSeconds}s)...`,
      );
      for (let i = waitSeconds; i > 0; i--) {
        process.stdout.write(`\r  ${i} seconds remaining...  `);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      console.log("\r  Time-lock rounds ready.               ");
      console.log();
    }
  }

  // ─── Run Benchmarks Per File ───

  const allSummaries: FileSummary[] = [];

  for (const f of files) {
    console.log(
      `--- Benchmark: ${f.name} (${f.label}, ${f.data.length.toLocaleString()} bytes) ---`,
    );

    const results: BenchmarkResult[] = [];
    const pe = preEncMap.get(f.name);

    // 1. Document Hashing (SHA3-256)
    results.push(
      await benchmark(`Document Hashing (SHA3-256, ${f.label})`, n, () => {
        hashSHA3(f.data);
      }),
    );

    // 2. ECDSA P-256 Key Generation
    results.push(
      await benchmark("ECDSA P-256 Key Generation", n, () => {
        generateKeyPair();
      }),
    );

    // 3. ECDSA P-256 Sign (inner) — sign the document hash
    const hashHex = hashSHA3(f.data);
    const hashBytes = Buffer.from(hashHex, "hex");

    results.push(
      await benchmark("ECDSA P-256 Sign (inner)", n, () => {
        sign(keyPair.privateKeyB64, hashBytes);
      }),
    );

    // 4. ECDSA P-256 Sign (outer) — sign timestamp + encrypted payload
    let outerDataForSign: Buffer;
    if (pe) {
      outerDataForSign = pe.outerData;
    } else {
      // Simulate realistic outer data size
      const timestampBuf = Buffer.alloc(8);
      timestampBuf.writeBigInt64LE(BigInt(Math.floor(Date.now() / 1000)));
      outerDataForSign = Buffer.concat([timestampBuf, Buffer.alloc(256)]);
    }

    results.push(
      await benchmark("ECDSA P-256 Sign (outer)", n, () => {
        sign(keyPair.privateKeyB64, outerDataForSign);
      }),
    );

    // 5. ECDSA P-256 Verify (inner)
    const innerSigForVerify = sign(keyPair.privateKeyB64, hashBytes);

    results.push(
      await benchmark("ECDSA P-256 Verify (inner)", n, () => {
        verify(keyPair.publicKeyB64, hashBytes, innerSigForVerify);
      }),
    );

    // 6. ECDSA P-256 Verify (outer)
    const outerSigForVerify = sign(keyPair.privateKeyB64, outerDataForSign);

    results.push(
      await benchmark("ECDSA P-256 Verify (outer)", n, () => {
        verify(keyPair.publicKeyB64, outerDataForSign, outerSigForVerify);
      }),
    );

    // 7. QR Code Generation
    const qrContent = randomUUID();

    results.push(
      await benchmark("QR Code Generation", n, async () => {
        await generateQRBase64(qrContent);
      }),
    );

    // 8. Time-Lock Encrypt (Drand)
    if (!skipTLock) {
      const { innerPayload } = buildInnerPayload(
        hashBytes,
        keyPair.privateKeyB64,
        f.name,
      );

      results.push(
        await benchmark("Time-Lock Encrypt (Drand)", n, async () => {
          await tlockEncrypt(innerPayload, new Date(Date.now() + 30_000));
        }),
      );
    }

    // 9. Time-Lock Decrypt (Drand)
    if (!skipTLock && pe) {
      results.push(
        await benchmark("Time-Lock Decrypt (Drand)", n, async () => {
          await tlockDecrypt(pe.ciphertext);
        }),
      );
    }

    // 10. Full QR Generation (complete issuer workflow)
    if (!skipFull) {
      results.push(
        await benchmark("**Full QR Generation**", n, async () => {
          // Hash document
          const h = hashSHA3(f.data);
          const hb = Buffer.from(h, "hex");

          // Build inner payload (sign + pack)
          const { innerPayload: ip } = buildInnerPayload(
            hb,
            keyPair.privateKeyB64,
            f.name,
          );

          // Time-lock encrypt
          const { ciphertext } = await tlockEncrypt(
            ip,
            new Date(Date.now() + 30_000),
          );

          // Build outer data and sign
          const { outerData: od } = buildOuterData(ciphertext);
          sign(keyPair.privateKeyB64, od);

          // Generate QR code
          await generateQRBase64(randomUUID());
        }),
      );
    }

    // 11. Full Verification (complete verifier workflow)
    if (!skipFull && pe) {
      results.push(
        await benchmark("**Full Verification**", n, async () => {
          // Verify outer signature
          verify(keyPair.publicKeyB64, pe.outerData, pe.outerSig);

          // Time-lock decrypt
          const decrypted = await tlockDecrypt(pe.ciphertext);

          // Parse inner payload: UUID(16) + Hash(32) + SigLen(2) + Sig(var) + FileName
          if (decrypted.length < 50) return;
          const innerHash = decrypted.subarray(16, 48);
          const sigLen = decrypted.readUInt16BE(48);
          const innerSig = decrypted.subarray(50, 50 + sigLen);

          // Verify inner signature
          verify(keyPair.publicKeyB64, innerHash, innerSig);

          // Verify hash consistency
          innerHash.toString("hex");
        }),
      );
    }

    printTable(`${f.name} (${f.label}, ${f.format.toUpperCase()})`, results);

    // Compute and print derived metrics
    const { computed, summary } = computeMetrics(results, f);
    printComputedMetrics(
      `${f.name} (${f.label}, ${f.format.toUpperCase()})`,
      computed,
    );
    allSummaries.push(summary);

    console.log();
  }

  // Print cross-file comparison summary
  printCrossFileSummary(allSummaries);

  console.log();
  console.log("========================================================");
  console.log("  Benchmark Complete");
  console.log("========================================================");
}

main().catch(console.error);
