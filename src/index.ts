import { Plugin } from "@opencode/plugin"
import { randomUUID } from "node:crypto"
import { stat } from "node:fs/promises"
import { normalize } from "node:path"
import { Queue, queuePath } from "./queue.ts"
import { Scheduler } from "./rpc.ts"
import { enqueueSchema, modelRef, parseTaskInput, taskTitle, type Task } from "./task.ts"

const id = "opencode-scheduler"
const retryInterval = 30_000
const retryWindow = 5 * 60_000

function pathKey(path: string) {
  const key = normalize(path)
  return process.platform === "win32" ? key.toLowerCase() : key
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default Plugin.define({
  id,
  async setup(ctx) {
    const owner = randomUUID()
    const projectID = ctx.location.project.id
    const root = projectID === "global" ? ctx.location.directory : ctx.location.project.canonical
    const project = `${projectID}:${pathKey(root)}`
    const queue = new Queue(queuePath(ctx.app.channel))
    const stop = new AbortController()
    const workers = new Set<Promise<void>>()

    function enqueue(input: ReturnType<typeof parseTaskInput>, directory: string) {
      const task: Task = { ...input, id: randomUUID(), project, directory, state: "scheduled" }
      queue.add(task)
      return { ...task }
    }

    async function run(task: Task & { firstAttemptAt: number | null }, recovered: boolean) {
      let error: string | undefined
      try {
        let sessionID = task.sessionID
        if (!recovered) {
          const directory = task.directory
          if (!(await stat(directory)).isDirectory()) throw new Error("The original directory is unavailable.")
          stop.signal.throwIfAborted()
          const model = modelRef(task.model)
          const models = await ctx.model.list({ location: { directory } }, { signal: stop.signal })
          if (!models.data.some((candidate) => candidate.providerID === model.providerID && candidate.modelID === model.id)) {
            const reason = `Model ${task.model} is unavailable in the original directory.`
            const now = Date.now()
            if (now + retryInterval <= (task.firstAttemptAt ?? now) + retryWindow) {
              queue.defer(task.id, owner, now + retryInterval, `${reason} OpenCode will retry in 30 seconds.`)
              return
            }
            throw new Error(reason)
          }
          const session = await ctx.session.create({
            title: `Scheduled: ${taskTitle(task)}`,
            location: { directory },
            agent: task.agent,
            model,
            metadata: { schedulerTaskID: task.id },
          }, { signal: stop.signal })
          sessionID = session.id
          queue.link(task.id, owner, sessionID)
          if (session.projectID !== projectID || pathKey(session.location.directory) !== pathKey(directory)) {
            throw new Error("OpenCode resolved the original directory to a different project or checkout.")
          }
          stop.signal.throwIfAborted()
          await ctx.session.prompt({ sessionID, text: task.prompt }, { signal: stop.signal })
        }
        if (!sessionID) throw new Error("OpenCode stopped before creating the scheduled session.")
        // A reclaimed task can still have a running session after a plugin reload.
        await ctx.session.wait({ sessionID }, { signal: stop.signal })
        const session = await ctx.session.get({ sessionID }, { signal: stop.signal })
        if (session.outcome !== "succeeded") {
          throw new Error(session.outcome === "interrupted" ? "The OpenCode session was interrupted." :
            session.outcome === "failed" ? "The OpenCode session failed. Open it for details." :
            "OpenCode stopped before a session outcome was recorded.")
        }
      } catch (cause) {
        error = message(cause)
      }
      if (!stop.signal.aborted) queue.finish(task.id, owner, error)
    }

    function tick() {
      try {
        const now = Date.now()
        if (workers.size > 0) queue.renew(owner, now)
        while (workers.size < 4) {
          const orphan = queue.reclaim(project, owner, now)
          const task = orphan ?? queue.claim(project, owner, now)
          if (!task) break
          const work = run(task, Boolean(orphan))
            .catch((cause) => console.error(`[${id}] ${message(cause)}`))
            .finally(() => workers.delete(work))
          workers.add(work)
        }
      } catch (cause) {
        console.error(`[${id}] ${message(cause)}`)
      }
    }

    try {
      await ctx.rpc.register(Scheduler, {
        list: async () => queue.list(project),
        enqueue: async (input, context) => {
          let fields
          try {
            fields = parseTaskInput(input)
          } catch (cause) {
            return context.error("invalid_task", message(cause), {})
          }
          return enqueue(fields, ctx.location.directory)
        },
      })

      await ctx.tool.transform((editor) => {
        editor.add({
          name: "schedule_task",
          description: "Schedule a one-off OpenCode session in the current project and working directory at the user's request.",
          input: enqueueSchema,
          async execute(input, context) {
            const fields = parseTaskInput(input)
            const session = await ctx.session.get({ sessionID: context.sessionID }, { signal: context.signal })
            if (session.projectID !== projectID ||
                (projectID === "global" && pathKey(session.location.directory) !== pathKey(ctx.location.directory))) {
              throw new Error("The session is outside the scheduler's current project.")
            }
            const task = enqueue(fields, session.location.directory)
            return { content: `Scheduled task ${task.id} for ${task.runAt} with ${task.agent} and ${task.model}.` }
          },
        })
      })
    } catch (cause) {
      queue.close()
      throw cause
    }

    const timer = setInterval(tick, 1000)
    timer.unref?.()
    return async () => {
      clearInterval(timer)
      stop.abort()
      await Promise.allSettled(workers)
      queue.close()
    }
  },
})
