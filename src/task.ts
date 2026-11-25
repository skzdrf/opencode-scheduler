export const enqueueSchema = {
  type: "object",
  properties: {
    runAt: { type: "string", description: "Future ISO 8601 timestamp with a UTC offset or Z." },
    agent: { type: "string", description: "OpenCode agent ID." },
    model: { type: "string", description: "OpenCode model in provider/model format." },
    prompt: { type: "string", description: "Prompt for the new session." },
  },
  required: ["runAt", "agent", "model", "prompt"],
  additionalProperties: false,
} as const

export interface TaskInput {
  runAt: string
  agent: string
  model: string
  prompt: string
}

export interface Task extends TaskInput {
  id: string
  project: string
  directory: string
  state: "scheduled" | "running" | "completed" | "failed"
  sessionID?: string | null
  error?: string | null
}

const timestamp = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)(?::(\d\d)(?:\.\d{1,3})?)?(Z|[+-](\d\d):(\d\d))$/

export function parseTaskInput(input: unknown, now = Date.now()): TaskInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Enter the task fields.")
  if (Object.keys(input).some((key) => !Object.hasOwn(enqueueSchema.properties, key))) {
    throw new Error("The task accepts runAt, agent, model and prompt.")
  }
  const fields = input as Partial<Record<keyof TaskInput, unknown>>
  const runAt = typeof fields.runAt === "string" ? fields.runAt.trim() : ""
  const match = timestamp.exec(runAt)
  if (!match) throw new Error("Enter a date and time with a UTC offset, such as 2027-01-20T09:00+03:00.")
  const [, year, month, day, hours, minutes, seconds, , offsetHours, offsetMinutes] = match
  const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`)
  const epoch = Date.parse(runAt)
  if (!Number.isFinite(epoch) || calendar.getUTCDate() !== Number(day) || Number(hours) > 23 ||
    Number(minutes) > 59 || Number(seconds ?? 0) > 59 || Number(offsetHours ?? 0) > 23 || Number(offsetMinutes ?? 0) > 59) {
    throw new Error("Enter a valid calendar date and time.")
  }
  if (epoch <= now) throw new Error("Choose a time in the future.")

  const agent = typeof fields.agent === "string" ? fields.agent.trim() : ""
  const model = typeof fields.model === "string" ? fields.model.trim() : ""
  const prompt = typeof fields.prompt === "string" ? fields.prompt : ""
  if (!agent || /\s/.test(agent)) throw new Error("Enter an agent ID.")
  if (!/^[^/\s]+\/[^/\s][^\s]*$/.test(model)) throw new Error("Enter a model as provider/model.")
  if (!prompt.trim()) throw new Error("Enter a prompt.")
  return { runAt: new Date(epoch).toISOString(), agent, model, prompt }
}

export function modelRef(model: string) {
  const slash = model.indexOf("/")
  return { providerID: model.slice(0, slash), id: model.slice(slash + 1) }
}

export function taskTitle(task: Task) {
  return task.prompt.trim().split(/\r?\n/, 1)[0].slice(0, 70)
}
