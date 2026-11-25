# OpenCode Scheduler

Schedule a one-off prompt from the OpenCode terminal UI or ask an agent to schedule it. The OpenCode server stores the task and opens a new session in the original working directory when it is due. Each task belongs to the project active when you schedule it.

## Install

With OpenCode 2.4.1, add the GitHub entry below to the `plugins` array in your existing `opencode.json` or `opencode.jsonc`. OpenCode downloads the plugin from the public repository and tracks the `feature/scheduler` development branch. If you previously configured a local checkout, replace its entry with the GitHub entry. [OpenCode plugin installation](https://opencode.ai/docs/plugins/#manage)

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:skzdrf/opencode-scheduler#feature/scheduler"],
  "experimental": { "location_idle_timeout": false }
}
```

Use the project configuration for one project or the global configuration for all projects. If you connect to `opencode serve`, edit the configuration on the server host. Set `experimental.location_idle_timeout` to `false` so tasks can run after the project has been idle for more than an hour. Reload the project, then enter `/schedule` in the TUI to open the task form. [OpenCode configuration](https://opencode.ai/docs/config/#location-idle-timeout)

## Schedule and inspect tasks

- Enter `/schedule` or select **+ Schedule task** in the sidebar. Enter a future ISO 8601 date and time with a UTC offset, an agent ID, a `provider/model` ID, and the prompt. Press **Ctrl+S** to save. The form works when no model is connected.
- Enter `/scheduled-tasks` or select the sidebar’s **Scheduled tasks** heading to browse the active project’s tasks. Select a task to see its prompt, model, state, and original directory. **Open session** appears after OpenCode creates the task’s session.
- From a conversation with an available model, ask the agent to schedule a task. The `schedule_task` tool accepts the same four fields and derives the directory from the current session.
- In a task's details, select **Delete** or press **D**, then confirm. Deleting a scheduled task cancels its launch. Completed and failed tasks can be removed from the list while keeping their OpenCode sessions. A running task can be removed after it finishes.

## Server behavior

Keep OpenCode’s normal shared service or an `opencode serve` process running. Once the server has loaded the plugin for a project, it can execute its tasks after the TUI disconnects. If the server stops, pending tasks remain queued and overdue tasks become eligible when the server loads the plugin for that project again. Worktree paths are captured at enqueue time, and OpenCode uses the files and settings present there at execution time.

If the selected model is missing from the original directory’s model list, the scheduler checks again every 30 seconds for up to five minutes from the first attempt. Once OpenCode accepts the prompt, its regular provider retry and permission handling apply. If the server stops during execution, the scheduler checks the original session’s saved outcome after its lease expires. Tasks with no confirmed outcome are marked failed and retain the session link when available.

The queue is stored under `$XDG_STATE_HOME/opencode-scheduler` or `~/.local/state/opencode-scheduler`, with a database per OpenCode release channel. The database contains task prompts, provider/model selections, working directories, and session IDs.

## Development

For local development, clone the repository, run `npm ci`, and use the checkout’s absolute path as the plugin entry. Run `npm run check` and `npm test` from the checkout. The tests use Node.js 22.6 or newer. The plugin runs inside OpenCode’s Bun runtime.
