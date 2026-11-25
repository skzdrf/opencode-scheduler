import { Database } from "bun:sqlite"
import { mkdirSync } from "node:fs"
import { homedir } from "node:os"
import { dirname, join } from "node:path"
import type { Task } from "./task.ts"

export const LEASE_MS = 30_000
type ClaimedTask = Task & { firstAttemptAt: number | null }

export function queuePath(channel: string) {
  const root = process.env.XDG_STATE_HOME || join(homedir(), ".local", "state")
  return join(root, "opencode-scheduler", `${channel}.sqlite`)
}

export class Queue {
  private readonly db: Database

  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
    this.db = new Database(path)
    this.db.exec(`
      PRAGMA busy_timeout = 3000;
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project TEXT NOT NULL,
        directory TEXT NOT NULL,
        runAt TEXT NOT NULL,
        agent TEXT NOT NULL,
        model TEXT NOT NULL,
        prompt TEXT NOT NULL,
        state TEXT NOT NULL,
        sessionID TEXT,
        error TEXT,
        owner TEXT,
        leaseUntil INTEGER,
        firstAttemptAt INTEGER,
        retryAt INTEGER
      );
      CREATE INDEX IF NOT EXISTS tasks_project_due ON tasks(project, state, runAt);
    `)
  }

  add(task: Task) {
    this.db.run(`INSERT INTO tasks (id, project, directory, runAt, agent, model, prompt, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
    [task.id, task.project, task.directory, task.runAt, task.agent, task.model, task.prompt])
  }

  list(project: string): Task[] {
    return this.db.query<Task, [string]>(`SELECT id, project, directory, runAt, agent, model, prompt,
      state, sessionID, error FROM tasks WHERE project = ? ORDER BY runAt, id`).all(project)
  }

  claim(project: string, owner: string, now: number): ClaimedTask | null {
    return this.db.query<ClaimedTask, [string, number, number, string, string, number]>(`UPDATE tasks
      SET state = 'running', owner = ?, leaseUntil = ?, firstAttemptAt = coalesce(firstAttemptAt, ?), error = NULL, retryAt = NULL
      WHERE id = (SELECT id FROM tasks WHERE project = ? AND state = 'scheduled' AND runAt <= ?
        AND (retryAt IS NULL OR retryAt <= ?) ORDER BY runAt, id LIMIT 1)
      RETURNING id, project, directory, runAt, agent, model, prompt, state, sessionID, error, firstAttemptAt`)
      .get(owner, now + LEASE_MS, now, project, new Date(now).toISOString(), now)
  }

  reclaim(project: string, owner: string, now: number): ClaimedTask | null {
    return this.db.query<ClaimedTask, [string, number, string, number]>(`UPDATE tasks
      SET owner = ?, leaseUntil = ?
      WHERE id = (SELECT id FROM tasks WHERE project = ? AND state = 'running' AND leaseUntil <= ? ORDER BY runAt, id LIMIT 1)
      RETURNING id, project, directory, runAt, agent, model, prompt, state, sessionID, error, firstAttemptAt`)
      .get(owner, now + LEASE_MS, project, now)
  }

  defer(id: string, owner: string, retryAt: number, error: string) {
    this.db.run("UPDATE tasks SET state = 'scheduled', retryAt = ?, error = ?, owner = NULL, leaseUntil = NULL WHERE id = ? AND owner = ?",
      [retryAt, error, id, owner])
  }

  renew(owner: string, now: number) {
    this.db.run("UPDATE tasks SET leaseUntil = ? WHERE owner = ? AND state = 'running'", [now + LEASE_MS, owner])
  }

  link(id: string, owner: string, sessionID: string) {
    const result = this.db.run("UPDATE tasks SET sessionID = ? WHERE id = ? AND owner = ?", [sessionID, id, owner])
    if (!result.changes) throw new Error("The task was claimed by another OpenCode server.")
  }

  finish(id: string, owner: string, error?: string) {
    this.db.run("UPDATE tasks SET state = ?, error = ?, owner = NULL, leaseUntil = NULL WHERE id = ? AND owner = ?",
      [error ? "failed" : "completed", error ?? null, id, owner])
  }

  close() {
    this.db.close()
  }
}
