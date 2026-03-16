import crypto from 'node:crypto'

// ─── SHA3-256 Hashing ───

export function hashSHA3(data: Buffer): string {
  return crypto.createHash('sha3-256').update(data).digest('hex')
}

// ─── Ed25519 Key Generation ───

export function generateEd25519KeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')

  const pubDer = publicKey.export({ type: 'spki', format: 'der' })
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' })

  // Raw public key is last 32 bytes of SPKI DER
  const rawPub = pubDer.subarray(pubDer.length - 32)

  return {
    publicKeyRaw: rawPub,
    privateKeyDer: privDer,
    publicKeyB64: rawPub.toString('base64'),
    privateKeyB64: privDer.toString('base64'),
  }
}

// ─── Ed25519 Signing ───

export function sign(privateKeyB64: string, data: Buffer): Buffer {
  const privDer = Buffer.from(privateKeyB64, 'base64')
  const keyObj = crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' })
  return Buffer.from(crypto.sign(null, data, keyObj))
}

export function verify(publicKeyB64: string, data: Buffer, signature: Buffer): boolean {
  const rawPub = Buffer.from(publicKeyB64, 'base64')
  // Wrap raw 32-byte key in SPKI DER
  const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex')
  const spkiDer = Buffer.concat([spkiPrefix, rawPub])
  const keyObj = crypto.createPublicKey({ key: spkiDer, format: 'der', type: 'spki' })
  return crypto.verify(null, data, keyObj, signature)
}

// ─── Key Fingerprint ───

export function computeFingerprint(publicKeyB64: string): string {
  const raw = Buffer.from(publicKeyB64, 'base64')
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  return hash.substring(0, 8)
}

// ─── PEM Export / Import ───

export function publicKeyToPEM(publicKeyB64: string): string {
  const rawPub = Buffer.from(publicKeyB64, 'base64')
  const spkiPrefix = Buffer.from('302a300506032b6570032100', 'hex')
  const spkiDer = Buffer.concat([spkiPrefix, rawPub])
  const keyObj = crypto.createPublicKey({ key: spkiDer, format: 'der', type: 'spki' })
  return keyObj.export({ type: 'spki', format: 'pem' }) as string
}

export function privateKeyToPEM(privateKeyB64: string): string {
  const privDer = Buffer.from(privateKeyB64, 'base64')
  const keyObj = crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' })
  return keyObj.export({ type: 'pkcs8', format: 'pem' }) as string
}

export function importPublicKeyPEM(pem: string): { publicKeyB64: string } {
  const keyObj = crypto.createPublicKey(pem)
  const der = keyObj.export({ type: 'spki', format: 'der' })
  const rawPub = der.subarray(der.length - 32)
  return { publicKeyB64: rawPub.toString('base64') }
}

export function importPrivateKeyPEM(pem: string): { publicKeyB64: string; privateKeyB64: string } {
  const privObj = crypto.createPrivateKey(pem)
  const privDer = privObj.export({ type: 'pkcs8', format: 'der' })

  // Derive public key from private key
  const pubObj = crypto.createPublicKey(privObj)
  const pubDer = pubObj.export({ type: 'spki', format: 'der' })
  const rawPub = pubDer.subarray(pubDer.length - 32)

  return {
    publicKeyB64: rawPub.toString('base64'),
    privateKeyB64: Buffer.from(privDer).toString('base64'),
  }
}
