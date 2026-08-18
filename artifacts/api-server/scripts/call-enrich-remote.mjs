const apiBase = process.env.PUBLIC_API_URL?.replace(/\/$/, "") || "https://cohort-1-squad-indus-api-server-z3b.vercel.app";
const secret = process.env.ENRICH_DEMO_SECRET?.trim();
if (!secret) {
  console.error("ENRICH_DEMO_SECRET is required for enrich-demo");
  process.exit(1);
}

const res = await fetch(`${apiBase}/api/admin/enrich-demo`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
let parsed;
try {
  parsed = JSON.parse(body);
} catch {
  parsed = body;
}

console.log(res.status, JSON.stringify(parsed));
process.exit(res.ok ? 0 : 1);
