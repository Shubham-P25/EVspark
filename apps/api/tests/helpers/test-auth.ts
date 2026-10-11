import { generateKeyPair, SignJWT } from "jose";
import { setTestKeyResolver } from "../../src/middleware/auth";

let testKeyPair: any = null;

export async function setupTestAuth() {
  if (!testKeyPair) {
    testKeyPair = await generateKeyPair("RS256");
    setTestKeyResolver(async () => testKeyPair.publicKey);
  }
}

export async function createTestToken(payload: { sub: string; email: string; name?: string }) {
  await setupTestAuth();
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(testKeyPair.privateKey);
}
