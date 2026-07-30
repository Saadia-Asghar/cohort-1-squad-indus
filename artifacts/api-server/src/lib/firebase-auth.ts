import crypto from "node:crypto";

type FirebaseClaims = {
  aud?: unknown;
  iss?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  exp?: unknown;
};

type FirebaseIdentity = {
  uid: string;
  email: string;
};

type GoogleCertificateResponse = Record<string, string>;

let certificates: GoogleCertificateResponse | null = null;
let certificatesExpireAt = 0;

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="), "base64");
}

function parseJson<T>(value: Buffer): T {
  return JSON.parse(value.toString("utf8")) as T;
}

function projectId(): string {
  const value = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!value) throw new Error("Firebase sign-in is not configured.");
  return value;
}

async function getCertificates(): Promise<GoogleCertificateResponse> {
  if (certificates && Date.now() < certificatesExpireAt) return certificates;

  const response = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  );
  if (!response.ok) throw new Error("Could not verify Firebase sign-in.");

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? 3600);
  certificates = (await response.json()) as GoogleCertificateResponse;
  certificatesExpireAt = Date.now() + Math.max(60, maxAge) * 1000;
  return certificates;
}

/**
 * Verifies a Firebase Auth ID token without accepting client-provided identity
 * claims. Google publishes the rotating certificates used by Firebase tokens.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<FirebaseIdentity> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid Firebase sign-in token.");

  let header: { alg?: unknown; kid?: unknown };
  let claims: FirebaseClaims;
  try {
    header = parseJson(fromBase64Url(parts[0]));
    claims = parseJson(fromBase64Url(parts[1]));
  } catch {
    throw new Error("Invalid Firebase sign-in token.");
  }

  if (header.alg !== "RS256" || typeof header.kid !== "string") {
    throw new Error("Invalid Firebase sign-in token.");
  }

  const certificate = (await getCertificates())[header.kid];
  if (!certificate) throw new Error("Firebase sign-in token has expired. Please try again.");

  const validSignature = crypto.verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    certificate,
    fromBase64Url(parts[2]),
  );
  if (!validSignature) throw new Error("Invalid Firebase sign-in token.");

  const firebaseProjectId = projectId();
  const now = Math.floor(Date.now() / 1000);
  if (
    claims.aud !== firebaseProjectId ||
    claims.iss !== `https://securetoken.google.com/${firebaseProjectId}` ||
    typeof claims.sub !== "string" ||
    claims.sub.length === 0 ||
    typeof claims.exp !== "number" ||
    claims.exp <= now ||
    typeof claims.email !== "string" ||
    claims.email_verified !== true
  ) {
    throw new Error("Use a verified Google account to continue.");
  }

  return { uid: claims.sub, email: claims.email.trim().toLowerCase() };
}
