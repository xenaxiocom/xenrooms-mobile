// Ported from the web client (xenaxiocom/webmail, lib/xenaxio/chat/snippet.ts at 491c2a07d): the language
// names of code blocks, as the composer writes them. Highlighting stays in the web.
export const LANGUAGES: Record<string, { name: string; ext: string }> = {
  plaintext: { name: "Text", ext: "txt" },
  bash: { name: "Shell", ext: "sh" },
  c: { name: "C", ext: "c" },
  cpp: { name: "C++", ext: "cpp" },
  csharp: { name: "C#", ext: "cs" },
  css: { name: "CSS", ext: "css" },
  diff: { name: "Diff", ext: "diff" },
  dockerfile: { name: "Dockerfile", ext: "dockerfile" },
  go: { name: "Go", ext: "go" },
  ini: { name: "INI / TOML", ext: "ini" },
  java: { name: "Java", ext: "java" },
  javascript: { name: "JavaScript", ext: "js" },
  json: { name: "JSON", ext: "json" },
  kotlin: { name: "Kotlin", ext: "kt" },
  markdown: { name: "Markdown", ext: "md" },
  php: { name: "PHP", ext: "php" },
  powershell: { name: "PowerShell", ext: "ps1" },
  python: { name: "Python", ext: "py" },
  ruby: { name: "Ruby", ext: "rb" },
  rust: { name: "Rust", ext: "rs" },
  sql: { name: "SQL", ext: "sql" },
  swift: { name: "Swift", ext: "swift" },
  typescript: { name: "TypeScript", ext: "ts" },
  xml: { name: "HTML / XML", ext: "html" },
  yaml: { name: "YAML", ext: "yaml" },
};

/** What people write after ``` for these languages. */
const ALIASES: Record<string, string> = {
  text: "plaintext", txt: "plaintext", plain: "plaintext",
  sh: "bash", shell: "bash", zsh: "bash", console: "bash",
  "c++": "cpp", cc: "cpp", h: "c", hpp: "cpp", cs: "csharp", "c#": "csharp",
  docker: "dockerfile", toml: "ini", js: "javascript", jsx: "javascript", mjs: "javascript", node: "javascript",
  kt: "kotlin", md: "markdown", ps1: "powershell", ps: "powershell", py: "python", rb: "ruby", rs: "rust",
  ts: "typescript", tsx: "typescript", html: "xml", htm: "xml", svg: "xml", vue: "xml", yml: "yaml", golang: "go", patch: "diff",
};

/** A language id we know, from what was written after ``` (or null). */
export function languageOf(tag: string | null | undefined): string | null {
  const t = (tag ?? "").trim().toLowerCase();
  if (!t) return null;
  if (t in LANGUAGES) return t;
  return ALIASES[t] ?? null;
}
