import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBakerWorkspace,
  createBakerGoal,
  createBakerNote,
  createBakerReminder,
  updateBakerReminder,
} from "@/lib/workspace-api";
import { useBuyerSession } from "@/hooks/use-session";
import { format } from "date-fns";
import { Target, StickyNote, Bell, CheckCircle2, Plus } from "lucide-react";
import { useState } from "react";

export function DashboardWorkspace() {
  const { bakerId } = useBuyerSession();
  const queryClient = useQueryClient();
  const [goalLabel, setGoalLabel] = useState("Monthly orders");
  const [goalTarget, setGoalTarget] = useState("50");
  const [noteText, setNoteText] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDue, setReminderDue] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["baker-workspace", bakerId],
    queryFn: () => getBakerWorkspace(bakerId),
    enabled: !!bakerId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["baker-workspace", bakerId] });

  const addGoal = useMutation({
    mutationFn: () => createBakerGoal(bakerId, { label: goalLabel, targetValue: parseInt(goalTarget, 10) || 1 }),
    onSuccess: invalidate,
  });

  const addNote = useMutation({
    mutationFn: () => createBakerNote(bakerId, noteText),
    onSuccess: () => { setNoteText(""); invalidate(); },
  });

  const addReminder = useMutation({
    mutationFn: () => createBakerReminder(bakerId, { title: reminderTitle, dueAt: new Date(reminderDue).toISOString() }),
    onSuccess: () => { setReminderTitle(""); setReminderDue(""); invalidate(); },
  });

  const toggleReminder = useMutation({
    mutationFn: ({ id, done }: { id: number; done: boolean }) => updateBakerReminder(bakerId, id, done),
    onSuccess: invalidate,
  });

  if (isLoading) {
    return <div className="h-48 bg-muted animate-pulse rounded-xl" />;
  }

  const primaryGoal = data?.goals[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
      {/* Goals */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-lg font-bold">Goals</h3>
        </div>
        {primaryGoal ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{primaryGoal.label}</span>
              <span className="font-mono text-muted-foreground">
                {primaryGoal.currentValue}/{primaryGoal.targetValue}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${primaryGoal.achieved ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${primaryGoal.progressPercent}%` }}
              />
            </div>
            {primaryGoal.achieved && (
              <p className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Goal reached!
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No goal set yet.</p>
        )}
        <div className="flex gap-2">
          <input
            value={goalLabel}
            onChange={(e) => setGoalLabel(e.target.value)}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
            placeholder="Goal label"
          />
          <input
            value={goalTarget}
            onChange={(e) => setGoalTarget(e.target.value)}
            type="number"
            min={1}
            className="w-20 px-3 py-2 border border-border rounded-lg text-sm"
          />
          <button
            onClick={() => addGoal.mutate()}
            disabled={addGoal.isPending}
            className="p-2 bg-primary text-primary-foreground rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notepad */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-secondary" />
          <h3 className="font-serif text-lg font-bold">Notepad</h3>
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {data?.notes.slice(0, 4).map((note) => (
            <p key={note.id} className="text-sm p-2 bg-muted/50 rounded-lg">{note.content}</p>
          ))}
          {(!data?.notes || data.notes.length === 0) && (
            <p className="text-sm text-muted-foreground">Quick notes for your kitchen.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && noteText.trim() && addNote.mutate()}
            className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
            placeholder="Add a note..."
          />
          <button
            onClick={() => noteText.trim() && addNote.mutate()}
            disabled={addNote.isPending}
            className="p-2 bg-secondary text-secondary-foreground rounded-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Reminders */}
      <div className="p-6 rounded-xl border border-border bg-card shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-serif text-lg font-bold">Reminders</h3>
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {data?.reminders.filter((r) => !r.done).slice(0, 5).map((reminder) => (
            <label key={reminder.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={reminder.done}
                onChange={(e) => toggleReminder.mutate({ id: reminder.id, done: e.target.checked })}
                className="mt-1"
              />
              <span>
                <span className="font-medium">{reminder.title}</span>
                <span className="block text-xs text-muted-foreground">
                  {format(new Date(reminder.dueAt), "MMM d, h:mm a")}
                </span>
              </span>
            </label>
          ))}
          {(!data?.reminders || data.reminders.filter((r) => !r.done).length === 0) && (
            <p className="text-sm text-muted-foreground">No upcoming reminders.</p>
          )}
        </div>
        <div className="space-y-2">
          <input
            value={reminderTitle}
            onChange={(e) => setReminderTitle(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            placeholder="Reminder title"
          />
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={reminderDue}
              onChange={(e) => setReminderDue(e.target.value)}
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
            />
            <button
              onClick={() => reminderTitle.trim() && reminderDue && addReminder.mutate()}
              disabled={addReminder.isPending}
              className="p-2 bg-primary text-primary-foreground rounded-lg"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
