import {
  timelockEncrypt,
  timelockDecrypt,
  HttpCachingChain,
  HttpChainClient,
  roundAt,
  Buffer as TlockBuffer,
} from 'tlock-js'

const CHAIN_HASH = '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971'
const DRAND_URL = `https://api.drand.sh/${CHAIN_HASH}`

let chain: HttpCachingChain | null = null
let client: HttpChainClient | null = null

function getClient() {
  if (!chain || !client) {
    chain = new HttpCachingChain(DRAND_URL)
    client = new HttpChainClient(chain)
  }
  return { chain, client }
}

/**
 * Time-lock encrypt data so it can only be decrypted after `unlockTime`.
 * Returns the armor-encoded ciphertext string and the drand round number.
 */
export async function tlockEncrypt(data: Buffer, unlockTime: Date): Promise<{ ciphertext: string; round: number }> {
  const { chain, client } = getClient()
  const chainInfo = await chain.info()
  const round = roundAt(unlockTime.getTime(), chainInfo)

  const ct = await timelockEncrypt(round, TlockBuffer.from(data), client)

  return {
    ciphertext: ct,
    round,
  }
}

/**
 * Decrypt time-locked ciphertext. Will fail if the drand round
 * hasn't been published yet (time hasn't passed).
 */
export async function tlockDecrypt(ciphertext: string): Promise<Buffer> {
  const { client } = getClient()
  const plaintext = await timelockDecrypt(ciphertext, client)
  return Buffer.from(plaintext)
}
