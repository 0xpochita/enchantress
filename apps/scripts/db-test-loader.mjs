import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_ROOT = new URL("../src/", import.meta.url);

function withTsExtension(url) {
  const path = fileURLToPath(url);
  if (existsSync(`${path}.ts`)) return pathToFileURL(`${path}.ts`).href;
  if (existsSync(`${path}/index.ts`))
    return pathToFileURL(`${path}/index.ts`).href;
  return null;
}

function localUrl(specifier, parentURL) {
  if (specifier.startsWith("@/"))
    return new URL(specifier.slice(2), SOURCE_ROOT);
  if (specifier.startsWith(".") && parentURL)
    return new URL(specifier, parentURL);
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  const url = localUrl(specifier, context.parentURL);
  const resolved = url && !url.pathname.endsWith(".ts") && withTsExtension(url);
  return nextResolve(resolved || url?.href || specifier, context);
}
