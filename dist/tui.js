// Generated from src/tui.tsx by npm run build:tui.
import { memo as _$memo } from "@opentui/solid";
import { use as _$use } from "@opentui/solid";
import { spread as _$spread } from "@opentui/solid";
import { mergeProps as _$mergeProps } from "@opentui/solid";
import { createComponent as _$createComponent } from "@opentui/solid";
import { createTextNode as _$createTextNode } from "@opentui/solid";
import { effect as _$effect } from "@opentui/solid";
import { insertNode as _$insertNode } from "@opentui/solid";
import { insert as _$insert } from "@opentui/solid";
import { setProp as _$setProp } from "@opentui/solid";
import { createElement as _$createElement } from "@opentui/solid";
/** @jsxImportSource @opentui/solid */
import { Plugin } from "@opencode/plugin/tui";
import { CliRenderEvents, parseColor, RGBA, TextAttributes } from "@opentui/core";
import { createEffect, createSignal, For, onCleanup, Show, untrack } from "solid-js";
import { Scheduler } from "../src/rpc.ts";
import { parseTaskInput, taskTitle } from "../src/task.ts";
const fields = [{
  name: "runAt",
  label: "Run at",
  placeholder: "2027-01-20T09:00+03:00"
}, {
  name: "agent",
  label: "Agent",
  placeholder: "build"
}, {
  name: "model",
  label: "Provider/model",
  placeholder: "provider/model"
}];
function showTime(task) {
  return new Date(task.runAt).toLocaleString();
}
function sidebarTime(task) {
  return new Date(task.runAt).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
const stateOrder = {
  running: 0,
  scheduled: 1,
  failed: 2,
  completed: 2
};
function taskOrder(a, b) {
  const order = stateOrder[a.state] - stateOrder[b.state];
  if (order) return order;
  return stateOrder[a.state] === 2 ? b.runAt.localeCompare(a.runAt) : a.runAt.localeCompare(b.runAt);
}
function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
function activateOnRelease(action) {
  return event => {
    if (event.button !== 0) return;
    event.stopPropagation();
    void action();
  };
}
function DialogAction(props) {
  const [hovered, setHovered] = createSignal(false);
  const {
    theme
  } = props.context;
  const foreground = parseColor(theme.text.base);
  const fill = () => RGBA.fromValues(foreground.r, foreground.g, foreground.b, hovered() ? 0.2 : 0.1);
  return (() => {
    var _el$ = _$createElement("box"),
      _el$2 = _$createElement("text"),
      _el$3 = _$createElement("text");
    _$insertNode(_el$, _el$2);
    _$insertNode(_el$, _el$3);
    _$setProp(_el$, "flexDirection", "row");
    _$setProp(_el$, "gap", 1);
    _$setProp(_el$, "paddingX", 1);
    _$setProp(_el$, "onMouseOver", () => setHovered(true));
    _$setProp(_el$, "onMouseOut", () => setHovered(false));
    _$insert(_el$2, () => props.label);
    _$insert(_el$3, () => props.shortcut);
    _$effect(_p$ => {
      var _v$ = fill(),
        _v$2 = activateOnRelease(props.run),
        _v$3 = theme.text.base,
        _v$4 = (props.primary ? TextAttributes.BOLD : 0) | (hovered() ? TextAttributes.UNDERLINE : 0),
        _v$5 = theme.text.muted;
      _v$ !== _p$.e && (_p$.e = _$setProp(_el$, "backgroundColor", _v$, _p$.e));
      _v$2 !== _p$.t && (_p$.t = _$setProp(_el$, "onMouseUp", _v$2, _p$.t));
      _v$3 !== _p$.a && (_p$.a = _$setProp(_el$2, "fg", _v$3, _p$.a));
      _v$4 !== _p$.o && (_p$.o = _$setProp(_el$2, "attributes", _v$4, _p$.o));
      _v$5 !== _p$.i && (_p$.i = _$setProp(_el$3, "fg", _v$5, _p$.i));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined,
      i: undefined
    });
    return _el$;
  })();
}
function TaskForm(props) {
  const {
    context
  } = props;
  const model = context.ui.model.current();
  const [draft, setDraft] = createSignal({
    runAt: "",
    agent: "build",
    model: model ? `${model.providerID}/${model.modelID}` : "",
    prompt: ""
  });
  const [focus, setFocus] = createSignal(0);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  let promptInput;
  let mounted = true;
  onCleanup(() => {
    mounted = false;
  });
  async function submit() {
    if (saving()) return;
    setError("");
    setSaving(true);
    try {
      await props.save(parseTaskInput({
        ...draft(),
        prompt: promptInput?.plainText ?? ""
      }));
      if (mounted) context.ui.dialog.clear();
      context.ui.toast.show({
        message: "Task scheduled",
        variant: "success"
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }
  const colors = {
    textColor: context.theme.text.base,
    focusedTextColor: context.theme.text.base,
    focusedBackgroundColor: context.theme.background.element
  };
  context.keymap.layer(() => ({
    mode: "global",
    priority: 100,
    commands: [{
      bind: "tab",
      run: () => setFocus(value => (value + 1) % 4)
    }, {
      bind: "shift+tab",
      run: () => setFocus(value => (value + 3) % 4)
    }, {
      bind: "ctrl+s",
      run: () => {
        void submit();
      }
    }]
  }));
  return (() => {
    var _el$4 = _$createElement("box"),
      _el$5 = _$createElement("text"),
      _el$7 = _$createElement("box"),
      _el$8 = _$createElement("text"),
      _el$0 = _$createElement("textarea"),
      _el$10 = _$createElement("box"),
      _el$11 = _$createElement("text");
    _$insertNode(_el$4, _el$5);
    _$insertNode(_el$4, _el$7);
    _$insertNode(_el$4, _el$10);
    _$setProp(_el$4, "flexDirection", "column");
    _$setProp(_el$4, "padding", 1);
    _$insertNode(_el$5, _$createTextNode(`Schedule a task`));
    _$insert(_el$4, _$createComponent(For, {
      each: fields,
      children: (field, index) => (() => {
        var _el$12 = _$createElement("box"),
          _el$13 = _$createElement("text"),
          _el$14 = _$createElement("input");
        _$insertNode(_el$12, _el$13);
        _$insertNode(_el$12, _el$14);
        _$setProp(_el$12, "flexDirection", "column");
        _$setProp(_el$12, "onMouseDown", () => setFocus(index()));
        _$insert(_el$13, () => field.label);
        _$spread(_el$14, _$mergeProps(colors, {
          get focused() {
            return focus() === index();
          },
          get value() {
            return draft()[field.name];
          },
          get placeholder() {
            return field.placeholder;
          },
          "onSubmit": () => setFocus(index() + 1),
          "onInput": value => setDraft(current => ({
            ...current,
            [field.name]: value
          }))
        }), false);
        _$effect(_$p => _$setProp(_el$13, "fg", context.theme.text.base, _$p));
        return _el$12;
      })()
    }), _el$7);
    _$insertNode(_el$7, _el$8);
    _$insertNode(_el$7, _el$0);
    _$setProp(_el$7, "flexDirection", "column");
    _$setProp(_el$7, "onMouseDown", () => setFocus(3));
    _$insertNode(_el$8, _$createTextNode(`Prompt`));
    _$use(element => {
      promptInput = element;
    }, _el$0);
    _$spread(_el$0, _$mergeProps(colors, {
      get focused() {
        return focus() === 3;
      },
      "height": 3,
      "placeholder": "What should OpenCode do?",
      "keyBindings": [{
        name: "s",
        ctrl: true,
        action: "submit"
      }],
      "onSubmit": () => void submit()
    }), false);
    _$insert(_el$4, _$createComponent(Show, {
      get when() {
        return error();
      },
      get children() {
        var _el$1 = _$createElement("text");
        _$insert(_el$1, error);
        _$effect(_$p => _$setProp(_el$1, "fg", context.theme.text.base, _$p));
        return _el$1;
      }
    }), _el$10);
    _$insertNode(_el$10, _el$11);
    _$insert(_el$11, () => saving() ? "Scheduling…" : "Schedule  Ctrl+S");
    _$effect(_p$ => {
      var _v$6 = context.theme.text.base,
        _v$7 = context.theme.text.base,
        _v$8 = activateOnRelease(submit),
        _v$9 = context.theme.text.base;
      _v$6 !== _p$.e && (_p$.e = _$setProp(_el$5, "fg", _v$6, _p$.e));
      _v$7 !== _p$.t && (_p$.t = _$setProp(_el$8, "fg", _v$7, _p$.t));
      _v$8 !== _p$.a && (_p$.a = _$setProp(_el$10, "onMouseUp", _v$8, _p$.a));
      _v$9 !== _p$.o && (_p$.o = _$setProp(_el$11, "fg", _v$9, _p$.o));
      return _p$;
    }, {
      e: undefined,
      t: undefined,
      a: undefined,
      o: undefined
    });
    return _el$4;
  })();
}
export default Plugin.define({
  id: "opencode-scheduler.tui",
  setup(context) {
    const rpc = () => context.client.rpc(Scheduler);
    const [taskRevision, setTaskRevision] = createSignal(0);
    async function location(sessionID) {
      if (!sessionID) return context.location ?? context.data.location.default();
      const session = context.data.session.get(sessionID) ?? (await context.client.session.get({
        sessionID
      }));
      return session.location;
    }
    function activeSession() {
      const route = context.ui.router.current();
      return route.type === "session" ? route.sessionID : undefined;
    }
    async function tasks(target) {
      const current = await rpc().list({}, {
        location: target
      });
      return current.sort(taskOrder);
    }
    async function openForm() {
      try {
        const target = await location(activeSession());
        context.ui.dialog.show(() => _$createComponent(TaskForm, {
          context: context,
          save: input => rpc().enqueue(input, {
            location: target
          })
        }));
        context.ui.dialog.set({
          size: "large"
        });
      } catch (cause) {
        context.ui.toast.show({
          message: errorMessage(cause),
          variant: "error"
        });
      }
    }
    function details(task, target, fromList = false) {
      const metadata = [{
        label: "Run at",
        value: showTime(task)
      }, {
        label: "Agent",
        value: task.agent
      }, {
        label: "Model",
        value: task.model
      }, {
        label: "Directory",
        value: task.directory
      }];
      const {
        theme
      } = context;
      const sessionID = task.sessionID;
      function openSession() {
        if (sessionID) {
          context.ui.dialog.clear();
          context.ui.router.navigate({
            type: "session",
            sessionID
          });
        }
      }
      context.ui.dialog.show(() => {
        const [confirming, setConfirming] = createSignal(false);
        const [deleting, setDeleting] = createSignal(false);
        const [error, setError] = createSignal("");
        const [terminalRows, setTerminalRows] = createSignal(context.renderer.height);
        const [bodyRows, setBodyRows] = createSignal(1);
        // Reserve room for the dialog frame, title, and actions outside the scroll area.
        const bodyHeight = () => Math.max(1, Math.min(bodyRows(), 16, Math.floor(terminalRows() * 0.75) - 6));
        const resize = () => setTerminalRows(context.renderer.height);
        context.renderer.on(CliRenderEvents.RESIZE, resize);
        let body;
        let mounted = true;
        onCleanup(() => {
          mounted = false;
          context.renderer.off(CliRenderEvents.RESIZE, resize);
        });
        function keepTask() {
          if (deleting()) return;
          setError("");
          setConfirming(false);
        }
        async function remove() {
          if (!confirming() || deleting()) return;
          setError("");
          setDeleting(true);
          try {
            const removed = await rpc().remove({
              id: task.id
            }, {
              location: target
            });
            setTaskRevision(revision => revision + 1);
            context.ui.toast.show(removed ? {
              message: "Task deleted",
              variant: "success"
            } : {
              message: "Task is already running or has been deleted",
              variant: "warning"
            });
            if (!mounted) return;
            if (fromList) await openListAt(target, () => mounted);else context.ui.dialog.clear();
          } catch (cause) {
            if (mounted) setError(errorMessage(cause));else context.ui.toast.show({
              message: errorMessage(cause),
              variant: "error"
            });
          } finally {
            if (mounted) setDeleting(false);
          }
        }
        context.keymap.layer(() => ({
          mode: "global",
          priority: 100,
          commands: confirming() ? [{
            bind: "y",
            run: () => void remove()
          }, {
            bind: "n",
            run: keepTask
          }, {
            bind: "escape",
            run: keepTask
          }] : [{
            bind: "pageup",
            run: () => {
              body?.scrollBy(-1, "viewport");
            }
          }, {
            bind: "pagedown",
            run: () => {
              body?.scrollBy(1, "viewport");
            }
          }, ...(task.state === "running" ? [] : [{
            bind: "d",
            run: () => setConfirming(true)
          }]), ...(sessionID ? [{
            bind: "o",
            run: openSession
          }] : [])]
        }));
        return (() => {
          var _el$15 = _$createElement("box");
          _$setProp(_el$15, "flexDirection", "column");
          _$setProp(_el$15, "paddingX", 2);
          _$setProp(_el$15, "paddingY", 1);
          _$setProp(_el$15, "gap", 1);
          _$insert(_el$15, _$createComponent(Show, {
            get when() {
              return !confirming();
            },
            get fallback() {
              return [(() => {
                var _el$31 = _$createElement("text");
                _$insertNode(_el$31, _$createTextNode(`Delete task?`));
                _$effect(_p$ => {
                  var _v$16 = theme.text.base,
                    _v$17 = TextAttributes.BOLD;
                  _v$16 !== _p$.e && (_p$.e = _$setProp(_el$31, "fg", _v$16, _p$.e));
                  _v$17 !== _p$.t && (_p$.t = _$setProp(_el$31, "attributes", _v$17, _p$.t));
                  return _p$;
                }, {
                  e: undefined,
                  t: undefined
                });
                return _el$31;
              })(), (() => {
                var _el$33 = _$createElement("box"),
                  _el$34 = _$createElement("text"),
                  _el$35 = _$createElement("text");
                _$insertNode(_el$33, _el$34);
                _$insertNode(_el$33, _el$35);
                _$setProp(_el$33, "flexDirection", "column");
                _$setProp(_el$34, "wrapMode", "none");
                _$setProp(_el$34, "truncate", true);
                _$insert(_el$34, () => taskTitle(task));
                _$setProp(_el$35, "wrapMode", "word");
                _$insert(_el$35, () => task.state === "scheduled" ? "This will cancel its scheduled run." : "This will remove the task from the scheduler.");
                _$effect(_p$ => {
                  var _v$18 = theme.text.muted,
                    _v$19 = theme.text.base;
                  _v$18 !== _p$.e && (_p$.e = _$setProp(_el$34, "fg", _v$18, _p$.e));
                  _v$19 !== _p$.t && (_p$.t = _$setProp(_el$35, "fg", _v$19, _p$.t));
                  return _p$;
                }, {
                  e: undefined,
                  t: undefined
                });
                return _el$33;
              })(), _$createComponent(Show, {
                get when() {
                  return error();
                },
                get children() {
                  var _el$36 = _$createElement("text");
                  _$setProp(_el$36, "wrapMode", "word");
                  _$insert(_el$36, error);
                  _$effect(_$p => _$setProp(_el$36, "fg", theme.text.base, _$p));
                  return _el$36;
                }
              }), _$createComponent(Show, {
                get when() {
                  return !deleting();
                },
                get fallback() {
                  return (() => {
                    var _el$38 = _$createElement("text");
                    _$insertNode(_el$38, _$createTextNode(`Deleting…`));
                    _$effect(_$p => _$setProp(_el$38, "fg", theme.text.muted, _$p));
                    return _el$38;
                  })();
                },
                get children() {
                  var _el$37 = _$createElement("box");
                  _$setProp(_el$37, "flexDirection", "row");
                  _$setProp(_el$37, "flexWrap", "wrap");
                  _$setProp(_el$37, "gap", 1);
                  _$insert(_el$37, _$createComponent(DialogAction, {
                    context: context,
                    label: "Keep task",
                    shortcut: "N",
                    run: keepTask
                  }), null);
                  _$insert(_el$37, _$createComponent(DialogAction, {
                    context: context,
                    label: "Delete task",
                    shortcut: "Y",
                    primary: true,
                    run: remove
                  }), null);
                  return _el$37;
                }
              })];
            },
            get children() {
              return [(() => {
                var _el$16 = _$createElement("box"),
                  _el$17 = _$createElement("text"),
                  _el$19 = _$createElement("text");
                _$insertNode(_el$16, _el$17);
                _$insertNode(_el$16, _el$19);
                _$setProp(_el$16, "flexDirection", "row");
                _$setProp(_el$16, "justifyContent", "space-between");
                _$setProp(_el$16, "gap", 1);
                _$setProp(_el$16, "flexShrink", 0);
                _$insertNode(_el$17, _$createTextNode(`Scheduled task`));
                _$insert(_el$19, () => task.state);
                _$effect(_p$ => {
                  var _v$0 = theme.text.base,
                    _v$1 = TextAttributes.BOLD,
                    _v$10 = theme.text.muted;
                  _v$0 !== _p$.e && (_p$.e = _$setProp(_el$17, "fg", _v$0, _p$.e));
                  _v$1 !== _p$.t && (_p$.t = _$setProp(_el$17, "attributes", _v$1, _p$.t));
                  _v$10 !== _p$.a && (_p$.a = _$setProp(_el$19, "fg", _v$10, _p$.a));
                  return _p$;
                }, {
                  e: undefined,
                  t: undefined,
                  a: undefined
                });
                return _el$16;
              })(), (() => {
                var _el$20 = _$createElement("scrollbox"),
                  _el$21 = _$createElement("box"),
                  _el$22 = _$createElement("box"),
                  _el$23 = _$createElement("box"),
                  _el$24 = _$createElement("text"),
                  _el$26 = _$createElement("text");
                _$insertNode(_el$20, _el$21);
                _$use(element => {
                  body = element;
                }, _el$20);
                _$setProp(_el$20, "flexGrow", 0);
                _$setProp(_el$20, "flexShrink", 1);
                _$insertNode(_el$21, _el$22);
                _$insertNode(_el$21, _el$23);
                _$setProp(_el$21, "flexDirection", "column");
                _$setProp(_el$21, "gap", 1);
                _$setProp(_el$21, "flexShrink", 0);
                _$setProp(_el$21, "onSizeChange", function () {
                  setBodyRows(this.height);
                });
                _$setProp(_el$22, "flexDirection", "column");
                _$insert(_el$22, _$createComponent(For, {
                  each: metadata,
                  children: field => (() => {
                    var _el$40 = _$createElement("box"),
                      _el$41 = _$createElement("text"),
                      _el$42 = _$createElement("text");
                    _$insertNode(_el$40, _el$41);
                    _$insertNode(_el$40, _el$42);
                    _$setProp(_el$40, "flexDirection", "row");
                    _$setProp(_el$40, "gap", 1);
                    _$setProp(_el$41, "width", 9);
                    _$setProp(_el$41, "flexShrink", 0);
                    _$insert(_el$41, () => field.label);
                    _$setProp(_el$42, "minWidth", 0);
                    _$setProp(_el$42, "flexShrink", 1);
                    _$setProp(_el$42, "wrapMode", "word");
                    _$insert(_el$42, () => field.value);
                    _$effect(_p$ => {
                      var _v$20 = theme.text.muted,
                        _v$21 = theme.text.base;
                      _v$20 !== _p$.e && (_p$.e = _$setProp(_el$41, "fg", _v$20, _p$.e));
                      _v$21 !== _p$.t && (_p$.t = _$setProp(_el$42, "fg", _v$21, _p$.t));
                      return _p$;
                    }, {
                      e: undefined,
                      t: undefined
                    });
                    return _el$40;
                  })()
                }));
                _$insertNode(_el$23, _el$24);
                _$insertNode(_el$23, _el$26);
                _$setProp(_el$23, "flexDirection", "column");
                _$insertNode(_el$24, _$createTextNode(`Prompt`));
                _$setProp(_el$26, "wrapMode", "word");
                _$insert(_el$26, () => task.prompt);
                _$insert(_el$21, _$createComponent(Show, {
                  get when() {
                    return task.error;
                  },
                  get children() {
                    var _el$27 = _$createElement("box"),
                      _el$28 = _$createElement("text"),
                      _el$29 = _$createElement("text");
                    _$insertNode(_el$27, _el$28);
                    _$insertNode(_el$27, _el$29);
                    _$setProp(_el$27, "flexDirection", "column");
                    _$insert(_el$28, () => task.state === "failed" ? "Error" : "Last attempt");
                    _$setProp(_el$29, "wrapMode", "word");
                    _$insert(_el$29, () => task.error);
                    _$effect(_p$ => {
                      var _v$11 = theme.text.muted,
                        _v$12 = theme.text.base;
                      _v$11 !== _p$.e && (_p$.e = _$setProp(_el$28, "fg", _v$11, _p$.e));
                      _v$12 !== _p$.t && (_p$.t = _$setProp(_el$29, "fg", _v$12, _p$.t));
                      return _p$;
                    }, {
                      e: undefined,
                      t: undefined
                    });
                    return _el$27;
                  }
                }), null);
                _$effect(_p$ => {
                  var _v$13 = bodyHeight(),
                    _v$14 = theme.text.muted,
                    _v$15 = theme.text.base;
                  _v$13 !== _p$.e && (_p$.e = _$setProp(_el$20, "height", _v$13, _p$.e));
                  _v$14 !== _p$.t && (_p$.t = _$setProp(_el$24, "fg", _v$14, _p$.t));
                  _v$15 !== _p$.a && (_p$.a = _$setProp(_el$26, "fg", _v$15, _p$.a));
                  return _p$;
                }, {
                  e: undefined,
                  t: undefined,
                  a: undefined
                });
                return _el$20;
              })(), (() => {
                var _el$30 = _$createElement("box");
                _$setProp(_el$30, "flexDirection", "row");
                _$setProp(_el$30, "flexWrap", "wrap");
                _$setProp(_el$30, "gap", 1);
                _$setProp(_el$30, "flexShrink", 0);
                _$insert(_el$30, _$createComponent(Show, {
                  when: sessionID,
                  get children() {
                    return _$createComponent(DialogAction, {
                      context: context,
                      label: "Open session",
                      shortcut: "O",
                      run: openSession
                    });
                  }
                }), null);
                _$insert(_el$30, _$createComponent(Show, {
                  get when() {
                    return task.state !== "running";
                  },
                  get children() {
                    return _$createComponent(DialogAction, {
                      context: context,
                      label: "Delete task",
                      shortcut: "D",
                      run: () => {
                        setConfirming(true);
                      }
                    });
                  }
                }), null);
                _$insert(_el$30, _$createComponent(DialogAction, {
                  context: context,
                  label: "Close",
                  shortcut: "Esc",
                  run: () => context.ui.dialog.clear()
                }), null);
                return _el$30;
              })()];
            }
          }));
          return _el$15;
        })();
      });
      context.ui.dialog.set({
        size: "medium",
        centered: true
      });
    }
    async function openListAt(target, canShow) {
      try {
        const items = await tasks(target);
        if (canShow?.() === false) return;
        if (items.length === 0) {
          await context.ui.dialog.alert({
            title: "Scheduled tasks",
            message: "This project has no scheduled tasks."
          });
          return;
        }
        const task = await context.ui.dialog.select({
          title: "Scheduled tasks",
          options: items.map(task => ({
            title: taskTitle(task),
            value: task,
            description: `${task.state} · ${showTime(task)}`
          }))
        });
        if (task) details(task, target, true);
      } catch (cause) {
        if (canShow?.()) context.ui.dialog.clear();
        context.ui.toast.show({
          message: errorMessage(cause),
          variant: "error"
        });
      }
    }
    async function openList() {
      try {
        await openListAt(await location(activeSession()));
      } catch (cause) {
        context.ui.toast.show({
          message: errorMessage(cause),
          variant: "error"
        });
      }
    }
    context.keymap.layer(() => ({
      mode: "global",
      commands: [{
        id: "scheduler.enqueue",
        title: "Schedule a task",
        palette: true,
        slash: {
          name: "schedule"
        },
        run: openForm
      }, {
        id: "scheduler.list",
        title: "Scheduled tasks",
        palette: true,
        slash: {
          name: "scheduled-tasks"
        },
        run: openList
      }]
    }));
    function Sidebar(props) {
      const [snapshot, setSnapshot] = createSignal();
      const items = () => snapshot()?.items ?? [];
      let mounted = true;
      let running = false;
      let request = 0;
      let lastSessionID;
      async function refresh() {
        const currentRequest = ++request;
        running = true;
        const sessionID = props.sessionID;
        try {
          const target = await location(sessionID);
          const current = await tasks(target);
          if (mounted && currentRequest === request) setSnapshot({
            target,
            items: current
          });
        } catch {
          if (mounted && currentRequest === request) setSnapshot(undefined);
        } finally {
          if (currentRequest === request) running = false;
        }
      }
      createEffect(() => {
        const sessionID = props.sessionID;
        taskRevision();
        // Clear another project's tasks while the new session location loads.
        if (sessionID !== lastSessionID) {
          lastSessionID = sessionID;
          setSnapshot(undefined);
        }
        void untrack(refresh);
      });
      const timer = setInterval(() => {
        if (!running) void refresh();
      }, 2000);
      onCleanup(() => {
        mounted = false;
        clearInterval(timer);
      });
      return (() => {
        var _el$43 = _$createElement("box"),
          _el$44 = _$createElement("box"),
          _el$45 = _$createElement("text"),
          _el$47 = _$createElement("box"),
          _el$48 = _$createElement("text");
        _$insertNode(_el$43, _el$44);
        _$insertNode(_el$43, _el$47);
        _$setProp(_el$43, "flexDirection", "column");
        _$insertNode(_el$44, _el$45);
        _$insertNode(_el$45, _$createTextNode(`Scheduled tasks`));
        _$insertNode(_el$47, _el$48);
        _$insertNode(_el$48, _$createTextNode(`+ Schedule task`));
        _$insert(_el$43, _$createComponent(For, {
          get each() {
            return items().slice(0, 5);
          },
          get fallback() {
            return (() => {
              var _el$54 = _$createElement("text");
              _$insertNode(_el$54, _$createTextNode(`No tasks`));
              _$effect(_$p => _$setProp(_el$54, "fg", context.theme.text.muted, _$p));
              return _el$54;
            })();
          },
          children: task => (() => {
            var _el$56 = _$createElement("box"),
              _el$57 = _$createElement("text"),
              _el$58 = _$createElement("text"),
              _el$59 = _$createTextNode(` · `);
            _$insertNode(_el$56, _el$57);
            _$insertNode(_el$56, _el$58);
            _$setProp(_el$56, "flexDirection", "column");
            _$setProp(_el$57, "truncate", true);
            _$insert(_el$57, () => taskTitle(task));
            _$insertNode(_el$58, _el$59);
            _$setProp(_el$58, "truncate", true);
            _$insert(_el$58, () => task.state, _el$59);
            _$insert(_el$58, () => sidebarTime(task), null);
            _$effect(_p$ => {
              var _v$28 = activateOnRelease(() => {
                  const current = snapshot();
                  if (current?.items.includes(task)) details(task, current.target);
                }),
                _v$29 = context.theme.text.base,
                _v$30 = context.theme.text.muted;
              _v$28 !== _p$.e && (_p$.e = _$setProp(_el$56, "onMouseUp", _v$28, _p$.e));
              _v$29 !== _p$.t && (_p$.t = _$setProp(_el$57, "fg", _v$29, _p$.t));
              _v$30 !== _p$.a && (_p$.a = _$setProp(_el$58, "fg", _v$30, _p$.a));
              return _p$;
            }, {
              e: undefined,
              t: undefined,
              a: undefined
            });
            return _el$56;
          })()
        }), null);
        _$insert(_el$43, _$createComponent(Show, {
          get when() {
            return items().length > 5;
          },
          get children() {
            var _el$50 = _$createElement("box"),
              _el$51 = _$createElement("text"),
              _el$52 = _$createTextNode(`View all `),
              _el$53 = _$createTextNode(` tasks`);
            _$insertNode(_el$50, _el$51);
            _$insertNode(_el$51, _el$52);
            _$insertNode(_el$51, _el$53);
            _$insert(_el$51, () => items().length, _el$53);
            _$effect(_p$ => {
              var _v$22 = activateOnRelease(openList),
                _v$23 = context.theme.text.muted;
              _v$22 !== _p$.e && (_p$.e = _$setProp(_el$50, "onMouseUp", _v$22, _p$.e));
              _v$23 !== _p$.t && (_p$.t = _$setProp(_el$51, "fg", _v$23, _p$.t));
              return _p$;
            }, {
              e: undefined,
              t: undefined
            });
            return _el$50;
          }
        }), null);
        _$effect(_p$ => {
          var _v$24 = activateOnRelease(openList),
            _v$25 = context.theme.text.base,
            _v$26 = activateOnRelease(openForm),
            _v$27 = context.theme.text.base;
          _v$24 !== _p$.e && (_p$.e = _$setProp(_el$44, "onMouseUp", _v$24, _p$.e));
          _v$25 !== _p$.t && (_p$.t = _$setProp(_el$45, "fg", _v$25, _p$.t));
          _v$26 !== _p$.a && (_p$.a = _$setProp(_el$47, "onMouseUp", _v$26, _p$.a));
          _v$27 !== _p$.o && (_p$.o = _$setProp(_el$48, "fg", _v$27, _p$.o));
          return _p$;
        }, {
          e: undefined,
          t: undefined,
          a: undefined,
          o: undefined
        });
        return _el$43;
      })();
    }
    return context.ui.slot({
      append: "sidebar.content",
      render: slot => _$createComponent(Sidebar, {
        get sessionID() {
          return slot.sessionID;
        }
      })
    });
  }
});
