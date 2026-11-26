/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui"
import { CliRenderEvents, parseColor, RGBA, TextAttributes, type MouseEvent, type ScrollBoxRenderable, type TextareaRenderable } from "@opentui/core"
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

function activateOnRelease(action: () => void | Promise<void>) {
  return (event: MouseEvent) => {
    if (event.button !== 0) return
    event.stopPropagation()
    void action()
  }
}

function DialogAction(props: { context: Context; label: string; shortcut: string; primary?: boolean; run: () => void | Promise<void> }) {
  const [hovered, setHovered] = createSignal(false)
  const { theme } = props.context
  const foreground = parseColor(theme.text.base)
  const fill = () => RGBA.fromValues(foreground.r, foreground.g, foreground.b, hovered() ? 0.2 : 0.1)
  return (
    <box flexDirection="row" gap={1} backgroundColor={fill()} paddingX={1}
      onMouseOver={() => setHovered(true)} onMouseOut={() => setHovered(false)}
      onMouseUp={activateOnRelease(props.run)}>
      <text fg={theme.text.base} attributes={(props.primary ? TextAttributes.BOLD : 0) | (hovered() ? TextAttributes.UNDERLINE : 0)}>
        {props.label}
      </text>
      <text fg={theme.text.muted}>{props.shortcut}</text>
    </box>
  )
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
      <Show when={error()}><text fg={context.theme.text.base}>{error()}</text></Show>
      <box onMouseUp={activateOnRelease(submit)}>
        <text fg={context.theme.text.base}>{saving() ? "Scheduling…" : "Schedule  Ctrl+S"}</text>
      </box>
    </box>
  )
}

export default Plugin.define({
  id: "opencode-scheduler.tui",
  setup(context) {
    const rpc = () => context.client.rpc(Scheduler)
    const [taskRevision, setTaskRevision] = createSignal(0)
    async function location(sessionID?: string) {
      if (!sessionID) return context.location ?? context.data.location.default()
      const session = context.data.session.get(sessionID) ?? await context.client.session.get({ sessionID })
      return session.location
    }
    type TaskLocation = Awaited<ReturnType<typeof location>>

    function activeSession() {
      const route = context.ui.router.current()
      return route.type === "session" ? route.sessionID : undefined
    }

    async function tasks(target: TaskLocation) {
      const current = await rpc().list({}, { location: target }) as Task[]
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

    function details(task: Task, target: TaskLocation, fromList = false) {
      const metadata = [
        { label: "Run at", value: showTime(task) },
        { label: "Agent", value: task.agent },
        { label: "Model", value: task.model },
        { label: "Directory", value: task.directory },
      ]
      const { theme } = context
      const sessionID = task.sessionID
      function openSession() {
        if (sessionID) {
          context.ui.dialog.clear()
          context.ui.router.navigate({ type: "session", sessionID })
        }
      }
      context.ui.dialog.show(() => {
        const [confirming, setConfirming] = createSignal(false)
        const [deleting, setDeleting] = createSignal(false)
        const [error, setError] = createSignal("")
        const [terminalRows, setTerminalRows] = createSignal(context.renderer.height)
        const [bodyRows, setBodyRows] = createSignal(1)
        // Reserve room for the dialog frame, title, and actions outside the scroll area.
        const bodyHeight = () => Math.max(1, Math.min(bodyRows(), 16, Math.floor(terminalRows() * 0.75) - 6))
        const resize = () => setTerminalRows(context.renderer.height)
        context.renderer.on(CliRenderEvents.RESIZE, resize)
        let body: ScrollBoxRenderable | undefined
        let mounted = true
        onCleanup(() => {
          mounted = false
          context.renderer.off(CliRenderEvents.RESIZE, resize)
        })

        function keepTask() {
          if (deleting()) return
          setError("")
          setConfirming(false)
        }

        async function remove() {
          if (!confirming() || deleting()) return
          setError("")
          setDeleting(true)
          try {
            const removed = await rpc().remove({ id: task.id }, { location: target })
            setTaskRevision((revision) => revision + 1)
            context.ui.toast.show(removed
              ? { message: "Task deleted", variant: "success" }
              : { message: "Task is already running or has been deleted", variant: "warning" })
            if (!mounted) return
            if (fromList) await openListAt(target, () => mounted)
            else context.ui.dialog.clear()
          } catch (cause) {
            if (mounted) setError(errorMessage(cause))
            else context.ui.toast.show({ message: errorMessage(cause), variant: "error" })
          } finally {
            if (mounted) setDeleting(false)
          }
        }

        context.keymap.layer(() => ({
          mode: "global", priority: 100,
          commands: confirming() ? [
            { bind: "y", run: () => void remove() },
            { bind: "n", run: keepTask },
            { bind: "escape", run: keepTask },
          ] : [
            { bind: "pageup", run: () => { body?.scrollBy(-1, "viewport") } },
            { bind: "pagedown", run: () => { body?.scrollBy(1, "viewport") } },
            ...(task.state === "running" ? [] : [{ bind: "d", run: () => setConfirming(true) }]),
            ...(sessionID ? [{ bind: "o", run: openSession }] : []),
          ],
        }))
        return <box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
          <Show when={!confirming()} fallback={
            <>
              <text fg={theme.text.base} attributes={TextAttributes.BOLD}>Delete task?</text>
              <box flexDirection="column">
                <text fg={theme.text.muted} wrapMode="none" truncate>{taskTitle(task)}</text>
                <text fg={theme.text.base} wrapMode="word">{task.state === "scheduled"
                  ? "This will cancel its scheduled run."
                  : "This will remove the task from the scheduler."}</text>
              </box>
              <Show when={error()}><text fg={theme.text.base} wrapMode="word">{error()}</text></Show>
              <Show when={!deleting()} fallback={<text fg={theme.text.muted}>Deleting…</text>}>
                <box flexDirection="row" flexWrap="wrap" gap={1}>
                  <DialogAction context={context} label="Keep task" shortcut="N" run={keepTask} />
                  <DialogAction context={context} label="Delete task" shortcut="Y" primary run={remove} />
                </box>
              </Show>
            </>
          }>
            <box flexDirection="row" justifyContent="space-between" gap={1} flexShrink={0}>
              <text fg={theme.text.base} attributes={TextAttributes.BOLD}>Scheduled task</text>
              <text fg={theme.text.muted}>{task.state}</text>
            </box>
            <scrollbox height={bodyHeight()} flexGrow={0} flexShrink={1} ref={(element) => { body = element }}>
              <box flexDirection="column" gap={1} flexShrink={0} onSizeChange={function () { setBodyRows(this.height) }}>
                <box flexDirection="column">
                  <For each={metadata}>{(field) => (
                    <box flexDirection="row" gap={1}>
                      <text fg={theme.text.muted} width={9} flexShrink={0}>{field.label}</text>
                      <text fg={theme.text.base} minWidth={0} flexShrink={1} wrapMode="word">{field.value}</text>
                    </box>
                  )}</For>
                </box>
                <box flexDirection="column">
                  <text fg={theme.text.muted}>Prompt</text>
                  <text fg={theme.text.base} wrapMode="word">{task.prompt}</text>
                </box>
                <Show when={task.error}>
                  <box flexDirection="column">
                    <text fg={theme.text.muted}>{task.state === "failed" ? "Error" : "Last attempt"}</text>
                    <text fg={theme.text.base} wrapMode="word">{task.error}</text>
                  </box>
                </Show>
              </box>
            </scrollbox>
            <box flexDirection="row" flexWrap="wrap" gap={1} flexShrink={0}>
              <Show when={sessionID}><DialogAction context={context} label="Open session" shortcut="O" run={openSession} /></Show>
              <Show when={task.state !== "running"}>
                <DialogAction context={context} label="Delete task" shortcut="D" run={() => { setConfirming(true) }} />
              </Show>
              <DialogAction context={context} label="Close" shortcut="Esc" run={() => context.ui.dialog.clear()} />
            </box>
          </Show>
        </box>
      })
      context.ui.dialog.set({ size: "medium", centered: true })
    }

    async function openListAt(target: TaskLocation, canShow?: () => boolean) {
      try {
        const items = await tasks(target)
        if (canShow?.() === false) return
        if (items.length === 0) {
          await context.ui.dialog.alert({ title: "Scheduled tasks", message: "This project has no scheduled tasks." })
          return
        }
        const task = await context.ui.dialog.select({
          title: "Scheduled tasks",
          options: items.map((task) => ({ title: taskTitle(task), value: task, description: `${task.state} · ${showTime(task)}` })),
        })
        if (task) details(task, target, true)
      } catch (cause) {
        if (canShow?.()) context.ui.dialog.clear()
        context.ui.toast.show({ message: errorMessage(cause), variant: "error" })
      }
    }

    async function openList() {
      try {
        await openListAt(await location(activeSession()))
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
      const [snapshot, setSnapshot] = createSignal<{ target: TaskLocation; items: Task[] }>()
      const items = () => snapshot()?.items ?? []
      let mounted = true
      let running = false
      let request = 0
      let lastSessionID: string | undefined
      async function refresh() {
        const currentRequest = ++request
        running = true
        const sessionID = props.sessionID
        try {
          const target = await location(sessionID)
          const current = await tasks(target)
          if (mounted && currentRequest === request) setSnapshot({ target, items: current })
        } catch {
          if (mounted && currentRequest === request) setSnapshot(undefined)
        } finally {
          if (currentRequest === request) running = false
        }
      }
      createEffect(() => {
        const sessionID = props.sessionID
        taskRevision()
        // Clear another project's tasks while the new session location loads.
        if (sessionID !== lastSessionID) {
          lastSessionID = sessionID
          setSnapshot(undefined)
        }
        void untrack(refresh)
      })
      const timer = setInterval(() => { if (!running) void refresh() }, 2000)
      onCleanup(() => { mounted = false; clearInterval(timer) })

      return (
        <box flexDirection="column">
          <box onMouseUp={activateOnRelease(openList)}><text fg={context.theme.text.base}>Scheduled tasks</text></box>
          <box onMouseUp={activateOnRelease(openForm)}><text fg={context.theme.text.base}>+ Schedule task</text></box>
          <For each={items().slice(0, 5)} fallback={<text fg={context.theme.text.muted}>No tasks</text>}>
            {(task) => <box flexDirection="column" onMouseUp={activateOnRelease(() => {
              const current = snapshot()
              if (current?.items.includes(task)) details(task, current.target)
            })}>
              <text fg={context.theme.text.base} truncate>{taskTitle(task)}</text>
              <text fg={context.theme.text.muted} truncate>{task.state} · {sidebarTime(task)}</text>
            </box>}
          </For>
          <Show when={items().length > 5}>
            <box onMouseUp={activateOnRelease(openList)}><text fg={context.theme.text.muted}>View all {items().length} tasks</text></box>
          </Show>
        </box>
      )
    }
    return context.ui.slot({ append: "sidebar.content", render: (slot) => <Sidebar sessionID={slot.sessionID} /> })
  },
})
