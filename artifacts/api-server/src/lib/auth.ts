import crypto from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 12;
const PASSWORD_ALGORITHM = "sha512";
const PASSWORD_ITERATIONS = 310_000;
const PASSWORD_KEY_LENGTH = 64;
const LEGACY_PASSWORD_ITERATIONS = 1_000;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to a random value of at least 32 characters");
  }
  return secret;
}

export function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payloadStr = Buffer.from(JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_TTL_SECONDS })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${header}.${payloadStr}`)
    .digest("base64url");
  return `${header}.${payloadStr}.${signature}`;
}

export function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature) return null;
    const decodedHeader = JSON.parse(
      Buffer.from(header, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
    if (decodedHeader.alg !== "HS256" || decodedHeader.typ !== "JWT") return null;
    const expectedSig = crypto
      .createHmac("sha256", getJwtSecret())
      .update(`${header}.${payload}`)
      .digest("base64url");
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (typeof decoded.exp !== "number" || decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_ALGORITHM)
    .toString("hex");
  return `pbkdf2$${PASSWORD_ALGORITHM}$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (storedHash.startsWith("pbkdf2$")) {
      const [scheme, algorithm, iterationsValue, salt, hash] = storedHash.split("$");
      const iterations = Number(iterationsValue);
      if (
        scheme !== "pbkdf2" ||
        algorithm !== PASSWORD_ALGORITHM ||
        !Number.isInteger(iterations) ||
        iterations < PASSWORD_ITERATIONS ||
        !salt ||
        !hash
      ) {
        return false;
      }
      const expected = Buffer.from(hash, "hex");
      const actual = crypto.pbkdf2Sync(password, salt, iterations, expected.length, algorithm);
      return expected.length > 0 &&
        expected.length === actual.length &&
        crypto.timingSafeEqual(expected, actual);
    }

    // Temporary compatibility path for existing accounts. Successful legacy
    // logins are immediately rehashed by the login route.
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const expected = Buffer.from(hash, "hex");
    const actual = crypto.pbkdf2Sync(
      password,
      salt,
      LEGACY_PASSWORD_ITERATIONS,
      expected.length,
      PASSWORD_ALGORITHM,
    );
    return expected.length > 0 &&
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function needsPasswordRehash(storedHash: string): boolean {
  if (!storedHash.startsWith("pbkdf2$")) return true;
  const [, algorithm, iterationsValue] = storedHash.split("$");
  return algorithm !== PASSWORD_ALGORITHM || Number(iterationsValue) < PASSWORD_ITERATIONS;
}
