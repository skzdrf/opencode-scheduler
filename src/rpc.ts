import { Rpc } from "@opencode/plugin/rpc"
import { enqueueSchema } from "./task.ts"

const empty = { type: "object", properties: {}, additionalProperties: false } as const
const task = {
  type: "object",
  properties: {
    ...enqueueSchema.properties,
    id: { type: "string" },
    project: { type: "string" },
    directory: { type: "string" },
    state: { type: "string" },
    sessionID: { anyOf: [{ type: "string" }, { type: "null" }] },
    error: { anyOf: [{ type: "string" }, { type: "null" }] },
  },
  required: [...enqueueSchema.required, "id", "project", "directory", "state"],
  additionalProperties: false,
} as const

export const Scheduler = Rpc.define({
  id: "opencode-scheduler",
  events: {},
  methods: {
    enqueue: {
      input: enqueueSchema,
      output: task,
      errors: { invalid_task: empty },
    },
    list: { input: empty, output: { type: "array", items: task } },
    remove: {
      input: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
      output: { type: "boolean" },
    },
  },
})
