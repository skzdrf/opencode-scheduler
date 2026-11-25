import assert from "node:assert/strict"
import test from "node:test"
import { modelRef, parseTaskInput } from "../src/task.ts"

const now = Date.parse("2027-01-01T00:00:00Z")
const input = {
  runAt: "2027-01-20T09:00+03:00",
  agent: "build",
  model: "provider/family/model",
  prompt: "Check the failing tests.\nSummarize the findings.",
}

test("normalizes the offset and preserves the multiline prompt and model ID", () => {
  assert.deepEqual(parseTaskInput(input, now), { ...input, runAt: "2027-01-20T06:00:00.000Z" })
  assert.deepEqual(modelRef(input.model), { providerID: "provider", id: "family/model" })
})

test("rejects past, ambiguous, and nonexistent times", () => {
  for (const runAt of ["2027-01-01T00:00:00Z", "2027-01-20T09:00", "2027-02-30T09:00Z", "2027-01-20T24:00Z"]) {
    assert.throws(() => parseTaskInput({ ...input, runAt }, now), undefined, runAt)
  }
})

test("rejects overrides for the project and working directory", () => {
  for (const field of ["directory", "project", "workspaceID"]) {
    assert.throws(() => parseTaskInput({ ...input, [field]: "other" }, now), /accepts runAt/)
  }
})

test("requires the agent, an explicit provider/model, and a nonempty prompt", () => {
  for (const change of [{ agent: " " }, { model: "model" }, { model: "provider/" }, { prompt: "\n " }]) {
    assert.throws(() => parseTaskInput({ ...input, ...change }, now))
  }
})
