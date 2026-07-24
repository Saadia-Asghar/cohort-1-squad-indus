import { useEffect, useState } from "react";
import { useAppAuth } from "@/lib/app-auth";
import { Users, UserPlus, Trash2 } from "lucide-react";

type TeamResponse = {
  seatLimit: number;
  seatsUsed: number;
  seatsAvailable: number;
  owner: { email: string; displayName: string; role: string };
  members: Array<{
    id: number;
    email: string;
    role: string;
    displayName: string;
    active: boolean;
  }>;
  yourRole: string;
};

async function authHeaders(
  getClerkToken: (options?: { template?: string }) => Promise<string | null>,
): Promise<HeadersInit> {
  const native = typeof window !== "undefined" ? localStorage.getItem("baker_token") : null;
  if (native) return { Authorization: `Bearer ${native}` };
  const clerk = await getClerkToken();
  return clerk ? { Authorization: `Bearer ${clerk}` } : {};
}

export function TeamAccessPanel({ bakerId }: { bakerId: number }) {
  const { getToken } = useAppAuth();
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders(getToken);
      const res = await fetch(`/api/bakers/${bakerId}/team`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to load team (${res.status})`);
      }
      setTeam(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bakerId > 0) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bakerId]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...(await authHeaders(getToken)),
      };
      const res = await fetch(`/api/bakers/${bakerId}/team`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password, displayName: displayName || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Could not create staff login");
      setEmail("");
      setPassword("");
      setDisplayName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(memberId: number) {
    if (!confirm("Remove this staff login?")) return;
    setError(null);
    try {
      const headers = await authHeaders(getToken);
      const res = await fetch(`/api/bakers/${bakerId}/team/${memberId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not remove staff");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading team access…
      </div>
    );
  }

  const isOwner = (team?.yourRole ?? "owner") === "owner";
  const canInvite = isOwner && (team?.seatsAvailable ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <Users className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="font-serif text-xl font-bold">Team access</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {team
              ? `${team.seatsUsed} of ${team.seatLimit} login seat${team.seatLimit === 1 ? "" : "s"} used.`
              : null}{" "}
            Bakery Team includes a second staff login.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      {team && (
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <p className="font-medium">{team.owner.displayName || "Owner"}</p>
              <p className="text-muted-foreground">{team.owner.email}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</span>
          </li>
          {team.members
            .filter((m) => m.active)
            .map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <p className="font-medium">{m.displayName || m.email}</p>
                  <p className="text-muted-foreground">{m.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Staff
                  </span>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => void deactivate(m.id)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`Remove ${m.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      )}

      {canInvite && (
        <form onSubmit={(e) => void invite(e)} className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Add staff login
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              required
              placeholder="staff@email.com"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="text"
              placeholder="Display name"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <input
            type="password"
            required
            minLength={8}
            placeholder="Temporary password (min 8 chars)"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Saving…" : "Create login"}
          </button>
        </form>
      )}

      {isOwner && team && team.seatsAvailable <= 0 && (
        <p className="text-xs text-muted-foreground">
          No free seats. Upgrade to Bakery Team (or remove a staff login) to add another person.
        </p>
      )}
    </div>
  );
}
