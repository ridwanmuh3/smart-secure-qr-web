import crypto from "node:crypto";

// ─── SHA3-256 Hashing ───

export function hashSHA3(data: Buffer): string {
  return crypto.createHash("sha3-256").update(data).digest("hex");
}

// ─── ECDSA P-256 Key Generation ───

export function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  const pubDer = publicKey.export({ type: "spki", format: "der" });
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });

  // Extract raw uncompressed public key (65 bytes) from SPKI DER
  // P-256 SPKI structure: SEQUENCE { SEQUENCE { OID, OID }, BIT STRING { 0x04 || x || y } }
  const rawPub = extractRawPublicKey(pubDer);

  return {
    publicKeyRaw: rawPub,
    privateKeyDer: privDer,
    publicKeyB64: rawPub.toString("base64"),
    privateKeyB64: Buffer.from(privDer).toString("base64"),
  };
}

// ─── ECDSA P-256 Signing (SHA-256) ───

export function sign(privateKeyB64: string, data: Buffer): Buffer {
  const privDer = Buffer.from(privateKeyB64, "base64");
  const keyObj = crypto.createPrivateKey({
    key: privDer,
    format: "der",
    type: "pkcs8",
  });
  return Buffer.from(crypto.sign("sha256", data, keyObj));
}

export function verify(
  publicKeyB64: string,
  data: Buffer,
  signature: Buffer,
): boolean {
  const rawPub = Buffer.from(publicKeyB64, "base64");
  const spkiDer = wrapRawPublicKey(rawPub);
  const keyObj = crypto.createPublicKey({
    key: spkiDer,
    format: "der",
    type: "spki",
  });
  return crypto.verify("sha256", data, keyObj, signature);
}

// ─── Key Fingerprint ───

export function computeFingerprint(publicKeyB64: string): string {
  const raw = Buffer.from(publicKeyB64, "base64");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return hash.substring(0, 8);
}

// ─── PEM Export / Import ───

export function publicKeyToPEM(publicKeyB64: string): string {
  const rawPub = Buffer.from(publicKeyB64, "base64");
  const spkiDer = wrapRawPublicKey(rawPub);
  const keyObj = crypto.createPublicKey({
    key: spkiDer,
    format: "der",
    type: "spki",
  });
  return keyObj.export({ type: "spki", format: "pem" }) as string;
}

export function privateKeyToPEM(privateKeyB64: string): string {
  const privDer = Buffer.from(privateKeyB64, "base64");
  const keyObj = crypto.createPrivateKey({
    key: privDer,
    format: "der",
    type: "pkcs8",
  });
  return keyObj.export({ type: "pkcs8", format: "pem" }) as string;
}

export function importPublicKeyPEM(pem: string): { publicKeyB64: string } {
  const keyObj = crypto.createPublicKey(pem);
  const der = keyObj.export({ type: "spki", format: "der" });
  const rawPub = extractRawPublicKey(der);
  return { publicKeyB64: rawPub.toString("base64") };
}

export function importPrivateKeyPEM(pem: string): {
  publicKeyB64: string;
  privateKeyB64: string;
} {
  const privObj = crypto.createPrivateKey(pem);
  const privDer = privObj.export({ type: "pkcs8", format: "der" });

  // Derive public key from private key
  const pubObj = crypto.createPublicKey(privObj);
  const pubDer = pubObj.export({ type: "spki", format: "der" });
  const rawPub = extractRawPublicKey(pubDer);

  return {
    publicKeyB64: rawPub.toString("base64"),
    privateKeyB64: Buffer.from(privDer).toString("base64"),
  };
}

// ─── DER Helpers for P-256 ───

// P-256 SPKI prefix (for uncompressed 65-byte public key):
// SEQUENCE { SEQUENCE { OID 1.2.840.10045.2.1, OID 1.2.840.10045.3.1.7 }, BIT STRING }
const P256_SPKI_PREFIX = Buffer.from(
  "3059301306072a8648ce3d020106082a8648ce3d030107034200",
  "hex",
);

function wrapRawPublicKey(rawPub: Buffer): Buffer {
  return Buffer.concat([P256_SPKI_PREFIX, rawPub]);
}

function extractRawPublicKey(spkiDer: Buffer): Buffer {
  // The raw public key (65 bytes for uncompressed P-256) is at the end of the SPKI DER
  // SPKI prefix for P-256 is 26 bytes, so raw key starts at offset 26
  return spkiDer.subarray(P256_SPKI_PREFIX.length);
}
