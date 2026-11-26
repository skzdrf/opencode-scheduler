import { transformAsync } from "@babel/core"
import typescript from "@babel/preset-typescript"
import solid from "babel-preset-solid"
import { mkdir, readFile, writeFile } from "node:fs/promises"

const source = new URL("../src/tui.tsx", import.meta.url)
const buildDirectory = new URL("../dist/", import.meta.url)
const output = new URL("tui.js", buildDirectory)

const { code } = await transformAsync(await readFile(source, "utf8"), {
  filename: "tui.tsx",
  babelrc: false,
  configFile: false,
  presets: [[solid, { generate: "universal", moduleName: "@opentui/solid" }], typescript],
  plugins: [() => ({
    visitor: {
      ImportDeclaration({ node }) {
        if (node.source.value.startsWith("./")) {
          node.source.value = `../src/${node.source.value.slice(2)}`
        }
      },
    },
  })],
})

const compiled = `// Generated from src/tui.tsx by npm run build:tui.\n${code}\n`
if (process.argv.includes("--check")) {
  const current = await readFile(output, "utf8").catch((error) => {
    if (error.code !== "ENOENT") throw error
    return ""
  })
  if (current.replaceAll("\r\n", "\n") !== compiled) {
    throw new Error("dist/tui.js is out of date. Run npm run build:tui.")
  }
} else {
  await mkdir(buildDirectory, { recursive: true })
  await writeFile(output, compiled)
}
