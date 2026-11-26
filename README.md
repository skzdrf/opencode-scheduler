# OpenCode Scheduler

Schedule a one-off prompt from the OpenCode terminal UI or ask an agent to schedule it. The OpenCode server stores the task and opens a new session in the original working directory when it is due. Each task belongs to the project active when you schedule it.

## Install

Use OpenCode 2.4.1. The Git package includes the prebuilt terminal UI. OpenCode supplies its runtime, so installation requires no separate Node.js, OpenTUI, or Solid setup.

### Local or standalone

On the machine where you run OpenCode, merge these settings into your existing `opencode.json` or `opencode.jsonc`. Use `~/.config/opencode/opencode.json` for all projects or `opencode.json` in a project for that project only. Replace any existing scheduler entry in `plugins`.

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["github:skzdrf/opencode-scheduler#master"],
  "experimental": { "location_idle_timeout": false }
}
```

Open a terminal in the project and run `opencode`, then enter `/schedule`. The default shared service can run scheduled tasks after you close the terminal UI. `opencode --standalone` starts a private server that exits with the UI. [OpenCode CLI](https://opencode.ai/docs/cli/#background-service)

### Server with a remote terminal client

1. On the **server**, add the `opencode.json(c)` settings above. If you run `opencode serve`, keep it running. For example, start a server reachable through SSH:

   ```sh
   opencode serve --hostname 127.0.0.1 --port 4096
   ```

2. On the **client**, add the same Git package to `plugins` in `~/.config/opencode/cli.json`. This installs the TUI in the client's plugin cache. Use the same branch or tag on both machines. [OpenCode CLI plugins](https://opencode.ai/docs/cli/plugins/)

   ```json
   {
     "plugins": ["github:skzdrf/opencode-scheduler#master"]
   }
   ```

3. Connect to the server URL. If you started the loopback-only server above, leave this SSH tunnel open in one client terminal:

   ```sh
   ssh -N -L 4096:127.0.0.1:4096 user@my-server
   ```

   In another terminal, set `OPENCODE_PASSWORD` to the password printed by `opencode serve` and connect. [OpenCode server access](https://opencode.ai/docs/cli/web/#authentication)

   ```sh
   opencode --server http://127.0.0.1:4096
   ```

4. Use `/sessions` to open a session in the server project, then run `/scheduled-tasks`. You can also pass `--session <session-id>` when connecting. The list shows tasks for the open project.

`experimental.location_idle_timeout: false` keeps the project loaded so scheduled tasks can run after long periods of inactivity. [OpenCode configuration](https://opencode.ai/docs/config/#location-idle-timeout)

### Pin a release

Replace `#master` in the configuration with a published release tag that includes `dist/tui.js`. OpenCode uses the Git package spec to install the release. Direct GitHub Release `.tgz` URLs are unsupported in OpenCode 2.4.1. [OpenCode plugin installation](https://opencode.ai/docs/plugins/#manage)

## Schedule and inspect tasks

- Enter `/schedule` or select **+ Schedule task** in the sidebar. Enter a future ISO 8601 date and time with a UTC offset, an agent ID, a `provider/model` ID, and the prompt. Press **Ctrl+S** to save. The form works when no model is connected.
- With a model connected, enter `/schedule-agent` followed by as many task details as you have, for example `/schedule-agent At 2027-01-20T09:00+03:00, use build on provider/model to summarize recent changes`. You can also run it without arguments. The current agent uses OpenCode's question dialog to collect any missing details, then calls `schedule_task` and reports the task ID and scheduled time. The agent and model you provide are for the future session.
- Enter `/scheduled-tasks` or select the sidebar’s **Scheduled tasks** heading to browse the active project’s tasks. Select a task to see its prompt, model, state, and original directory. **Open session** appears after OpenCode creates the task’s session.
- From a conversation with an available model, ask the agent to schedule a task. The `schedule_task` tool accepts the same four fields and derives the directory from the current session.
- In a task's details, select **Delete task** or press **D**. Select **Keep task** or press **N** to go back to the details, or confirm with **Delete task** or **Y**. Deleting a scheduled task cancels its launch. Completed and failed tasks can be removed from the list while keeping their OpenCode sessions. A running task can be removed after it finishes.

## Server behavior

Keep OpenCode’s normal shared service or an `opencode serve` process running. Once the server has loaded the plugin for a project, it can execute its tasks after the TUI disconnects. If the server stops, pending tasks remain queued and overdue tasks become eligible when the server loads the plugin for that project again. Worktree paths are captured at enqueue time, and OpenCode uses the files and settings present there at execution time.

If the selected model is missing from the original directory’s model list, the scheduler checks again every 30 seconds for up to five minutes from the first attempt. Once OpenCode accepts the prompt, its regular provider retry and permission handling apply. If the server stops during execution, the scheduler checks the original session’s saved outcome after its lease expires. Tasks with no confirmed outcome are marked failed and retain the session link when available.

The queue is stored under `$XDG_STATE_HOME/opencode-scheduler` or `~/.local/state/opencode-scheduler`, with a database per OpenCode release channel. The database contains task prompts, provider/model selections, working directories, and session IDs.

## Development

For local development, clone the repository, run `npm ci`, and use the checkout’s absolute path as the plugin entry. Run `npm run build:tui` after editing `src/tui.tsx` and include the updated `dist/tui.js` in the commit. Run `npm run check` and `npm test` from the checkout. The tests use Node.js 22.6 or newer. The plugin runs inside OpenCode’s Bun runtime.

To build a distributable archive, run `npm run build:tui` and `npm pack --pack-destination dist`. The resulting `.tgz` can be attached to a GitHub Release. For one-line OpenCode installation, tag the commit that contains the build and use its Git package spec in `plugins`.
