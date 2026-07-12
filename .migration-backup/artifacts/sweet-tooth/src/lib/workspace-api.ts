export type WorkspaceGoal = {
  id: number;
  bakerId: number;
  label: string;
  metric: string;
  targetValue: number;
  period: string;
  currentValue: number;
  progressPercent: number;
  achieved: boolean;
  achievedAt: string | null;
};

export type WorkspaceNote = {
  id: number;
  bakerId: number;
  content: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceReminder = {
  id: number;
  bakerId: number;
  title: string;
  dueAt: string;
  done: boolean;
};

export type BakerWorkspace = {
  goals: WorkspaceGoal[];
  notes: WorkspaceNote[];
  reminders: WorkspaceReminder[];
};

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function getBakerWorkspace(bakerId: number): Promise<BakerWorkspace> {
  return parseJson(await fetch(`/api/bakers/${bakerId}/workspace`));
}

export async function createBakerGoal(bakerId: number, data: { label: string; targetValue: number; metric?: string }) {
  return parseJson(await fetch(`/api/bakers/${bakerId}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
}

export async function createBakerNote(bakerId: number, content: string) {
  return parseJson(await fetch(`/api/bakers/${bakerId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }));
}

export async function createBakerReminder(bakerId: number, data: { title: string; dueAt: string }) {
  return parseJson(await fetch(`/api/bakers/${bakerId}/reminders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
}

export async function updateBakerReminder(bakerId: number, reminderId: number, done: boolean) {
  return parseJson(await fetch(`/api/bakers/${bakerId}/reminders/${reminderId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ done }),
  }));
}
