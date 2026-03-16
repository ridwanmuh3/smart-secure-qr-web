import * as crypto from "node:crypto";
import { performance } from "node:perf_hooks";

/**
 * CONFIGURATION
 * 1 MB Blob of random data
 */
const DATA_SIZE = 1 * 1024 * 1024;
const data = crypto.randomBytes(DATA_SIZE);

interface BenchResult {
  Algorithm: string;
  "KeyGen (ms)": string;
  "Sign 1MB (ms)": string;
  "Verify 1MB (ms)": string;
}

/**
 * Main Benchmark Runner
 */
async function runBenchmark() {
  console.log(
    `--- Starting Cryptography Performance Test (Data Size: ${DATA_SIZE / 1024 / 1024} MB) --- \n`,
  );

  const summary: BenchResult[] = [];

  // 1. RSA (2048-bit)
  summary.push(
    await benchmarkAlgo(
      "RSA-2048",
      () => crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }),
      (keys) => crypto.sign("sha256", data, keys.privateKey),
      (keys, sig) => crypto.verify("sha256", data, keys.publicKey, sig),
    ),
  );

  // 2. ECDSA (P-256 / secp256r1)
  summary.push(
    await benchmarkAlgo(
      "ECDSA-P256",
      () => crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" }),
      (keys) => crypto.sign("sha256", data, keys.privateKey),
      (keys, sig) => crypto.verify("sha256", data, keys.publicKey, sig),
    ),
  );

  // 3. EdDSA (Ed25519)
  summary.push(
    await benchmarkAlgo(
      "Ed25519",
      () => crypto.generateKeyPairSync("ed25519"),
      (keys) => crypto.sign(null, data, keys.privateKey), // Ed25519 manages its own hashing
      (keys, sig) => crypto.verify(null, data, keys.publicKey, sig),
    ),
  );

  console.table(summary);
}

/**
 * Helper to measure execution time
 */
async function benchmarkAlgo(
  name: string,
  keygen: () => crypto.KeyPairKeyObjectResult,
  sign: (keys: crypto.KeyPairKeyObjectResult) => Buffer,
  verify: (keys: crypto.KeyPairKeyObjectResult, sig: Buffer) => boolean,
): Promise<BenchResult> {
  // Measure Key Generation
  const startKey = performance.now();
  const keys = keygen();
  const endKey = performance.now();

  // Measure Signing
  const startSign = performance.now();
  const signature = sign(keys);
  const endSign = performance.now();

  // Measure Verification
  const startVerify = performance.now();
  const isValid = verify(keys, signature);
  const endVerify = performance.now();

  if (!isValid) throw new Error(`${name} verification failed!`);

  return {
    Algorithm: name,
    "KeyGen (ms)": (endKey - startKey).toFixed(3),
    "Sign 1MB (ms)": (endSign - startSign).toFixed(3),
    "Verify 1MB (ms)": (endVerify - startVerify).toFixed(3),
  };
}

runBenchmark().catch(console.error);
