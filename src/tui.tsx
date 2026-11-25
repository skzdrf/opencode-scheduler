/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import type { TextareaRenderable } from "@opentui/core"
import { createEffect, createSignal, For, onCleanup, Show, untrack } from "solid-js"
import { Scheduler } from "./rpc.ts"
import { parseTaskInput, taskTitle, type Task, type TaskInput } from "./task.ts"

type Context = Plugin.Context
type SaveTask = (input: TaskInput) => Promise<unknown>

const fields = [
  { name: "runAt", label: "Run at", placeholder: "2027-01-20T09:00+03:00" },
  { name: "agent", label: "Agent", placeholder: "build" },
  { name: "model", label: "Provider/model", placeholder: "provider/model" },
] as const

function showTime(task: Task) {
  return new Date(task.runAt).toLocaleString()
}

function sidebarTime(task: Task) {
  return new Date(task.runAt).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  })
}

const stateOrder = { running: 0, scheduled: 1, failed: 2, completed: 2 }

function taskOrder(a: Task, b: Task) {
  const order = stateOrder[a.state] - stateOrder[b.state]
  if (order) return order
  return stateOrder[a.state] === 2 ? b.runAt.localeCompare(a.runAt) : a.runAt.localeCompare(b.runAt)
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function TaskForm(props: { context: Context; save: SaveTask }) {
  const { context } = props
  const model = context.ui.model.current()
  const [draft, setDraft] = createSignal<TaskInput>({
    runAt: "", agent: "build", model: model ? `${model.providerID}/${model.modelID}` : "", prompt: "",
  })
  const [focus, setFocus] = createSignal(0)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")
  let promptInput: TextareaRenderable | undefined
  let mounted = true
  onCleanup(() => { mounted = false })

  async function submit() {
    if (saving()) return
    setError("")
    setSaving(true)
    try {
      await props.save(parseTaskInput({ ...draft(), prompt: promptInput?.plainText ?? "" }))
      if (mounted) context.ui.dialog.clear()
      context.ui.toast.show({ message: "Task scheduled", variant: "success" })
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const colors = {
    textColor: context.theme.text.base,
    focusedTextColor: context.theme.text.base,
    focusedBackgroundColor: context.theme.background.element,
  }

  context.keymap.layer(() => ({
    mode: "global",
    priority: 100,
    commands: [
      { bind: "tab", run: () => setFocus((value) => (value + 1) % 4) },
      { bind: "shift+tab", run: () => setFocus((value) => (value + 3) % 4) },
      { bind: "ctrl+s", run: () => { void submit() } },
    ],
  }))

  return (
    <box flexDirection="column" padding={1}>
      <text fg={context.theme.text.base}>Schedule a task</text>
      <For each={fields}>{(field, index) => (
        <box flexDirection="column" onMouseDown={() => setFocus(index())}>
          <text fg={context.theme.text.base}>{field.label}</text>
          <input {...colors} focused={focus() === index()} value={draft()[field.name]}
            placeholder={field.placeholder} onSubmit={() => setFocus(index() + 1)}
            onInput={(value) => setDraft((current) => ({ ...current, [field.name]: value }))} />
        </box>
      )}</For>
      <box flexDirection="column" onMouseDown={() => setFocus(3)}>
        <text fg={context.theme.text.base}>Prompt</text>
        <textarea {...colors} focused={focus() === 3} height={3} placeholder="What should OpenCode do?"
          keyBindings={[{ name: "s", ctrl: true, action: "submit" }]} onSubmit={() => void submit()}
          ref={(element) => { promptInput = element }} />
      </box>
      <Show when={error()}><text fg={context.theme.status.error}>{error()}</text></Show>
      <box onMouseDown={() => void submit()}>
        <text fg={context.theme.text.base}>{saving() ? "Scheduling…" : "Schedule  Ctrl+S"}</text>
      </box>
    </box>
  )
}

export default Plugin.define({
  id: "opencode-scheduler.tui",
  setup(context) {
    const rpc = () => context.client.rpc(Scheduler)
    async function location(sessionID?: string) {
      if (!sessionID) return context.location ?? context.data.location.default()
      const session = context.data.session.get(sessionID) ?? await context.client.session.get({ sessionID })
      return session.location
    }

    function activeSession() {
      const route = context.ui.router.current()
      return route.type === "session" ? route.sessionID : undefined
    }

    async function tasks(sessionID?: string) {
      const current = await rpc().list({}, { location: await location(sessionID) }) as Task[]
      return current.sort(taskOrder)
    }

    async function openForm() {
      try {
        const target = await location(activeSession())
        context.ui.dialog.show(() => <TaskForm context={context} save={(input) => rpc().enqueue(input, { location: target })} />)
        context.ui.dialog.set({ size: "large" })
      } catch (cause) {
        context.ui.toast.show({ message: errorMessage(cause), variant: "error" })
      }
    }

    async function details(task: Task) {
      const description = [
        `Status  ${task.state}`, `Run at  ${showTime(task)}`, `Agent  ${task.agent}`, `Model  ${task.model}`,
        `Working directory  ${task.directory}`, "", task.prompt,
      ]
      if (task.error) description.push("", task.error)
      const message = description.join("\n")
      const sessionID = task.sessionID
      if (!sessionID) {
        await context.ui.dialog.alert({ title: "Scheduled task", message })
        return
      }
      const open = await context.ui.dialog.confirm({
        title: "Scheduled task", message, label: { confirm: "Open session", cancel: "Close" },
      })
      if (open) context.ui.router.navigate({ type: "session", sessionID })
    }

    async function openList() {
      try {
        const items = await tasks(activeSession())
        if (items.length === 0) {
          await context.ui.dialog.alert({ title: "Scheduled tasks", message: "This project has no scheduled tasks." })
          return
        }
        const task = await context.ui.dialog.select({
          title: "Scheduled tasks",
          options: items.map((task) => ({ title: taskTitle(task), value: task, description: `${task.state} · ${showTime(task)}` })),
        })
        if (task) await details(task)
      } catch (cause) {
        context.ui.toast.show({ message: errorMessage(cause), variant: "error" })
      }
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        { id: "scheduler.enqueue", title: "Schedule a task", palette: true, slash: { name: "schedule" }, run: openForm },
        { id: "scheduler.list", title: "Scheduled tasks", palette: true, slash: { name: "scheduled-tasks" }, run: openList },
      ],
    }))

    function Sidebar(props: { sessionID: string }) {
      const [items, setItems] = createSignal<Task[]>([])
      let mounted = true
      let running = false
      async function refresh() {
        if (running) return
        running = true
        const sessionID = props.sessionID
        try {
          const current = await tasks(sessionID)
          if (mounted && sessionID === props.sessionID) setItems(current)
        } catch {
          if (mounted && sessionID === props.sessionID) setItems([])
        } finally {
          running = false
        }
      }
      createEffect(() => {
        // Clear another project's tasks while the new session location loads.
        if (props.sessionID) {
          setItems([])
          void untrack(refresh)
        }
      })
      const timer = setInterval(() => void refresh(), 2000)
      onCleanup(() => { mounted = false; clearInterval(timer) })

      return (
        <box flexDirection="column">
          <box onMouseDown={() => void openList()}><text fg={context.theme.text.base}>Scheduled tasks</text></box>
          <box onMouseDown={() => void openForm()}><text fg={context.theme.text.base}>+ Schedule task</text></box>
          <For each={items().slice(0, 5)} fallback={<text fg={context.theme.text.muted}>No tasks</text>}>
            {(task) => <box flexDirection="column" onMouseDown={() => void details(task)}>
              <text fg={context.theme.text.base} truncate>{taskTitle(task)}</text>
              <text fg={context.theme.text.muted} truncate>{task.state} · {sidebarTime(task)}</text>
            </box>}
          </For>
          <Show when={items().length > 5}>
            <box onMouseDown={() => void openList()}><text fg={context.theme.text.muted}>View all {items().length} tasks</text></box>
          </Show>
        </box>
      )
    }
    return context.ui.slot({ append: "sidebar.content", render: (slot) => <Sidebar sessionID={slot.sessionID} /> })
  },
})
