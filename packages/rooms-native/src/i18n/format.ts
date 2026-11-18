// The messages of the web client (next-intl, ICU) in the subset Rooms uses:
// `{name}` arguments and `{count, plural, =0 {…} one {# …} other {# …}}`.
// Unknown arguments stay as they are, so a missing value shows up instead of
// vanishing.

export type MessageParams = Record<string, string | number | null | undefined>;

const pluralRules = new Map<string, Intl.PluralRules | null>();

function pluralCategory(locale: string, n: number): string {
  if (!pluralRules.has(locale)) {
    let rules: Intl.PluralRules | null = null;
    try {
      rules = typeof Intl !== 'undefined' && typeof Intl.PluralRules === 'function' ? new Intl.PluralRules(locale) : null;
    } catch {
      rules = null;
    }
    pluralRules.set(locale, rules);
  }
  const rules = pluralRules.get(locale);
  if (rules) return rules.select(n);
  return n === 1 ? 'one' : 'other';
}

/** The index of the brace that closes the one at `open`. */
function closing(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return i;
  }
  return -1;
}

function plural(body: string, value: number, locale: string, params: MessageParams): string {
  const options = new Map<string, string>();
  let i = 0;
  while (i < body.length) {
    while (i < body.length && /\s/.test(body[i] as string)) i++;
    const start = i;
    while (i < body.length && body[i] !== '{' && !/\s/.test(body[i] as string)) i++;
    const key = body.slice(start, i);
    while (i < body.length && /\s/.test(body[i] as string)) i++;
    if (body[i] !== '{' || !key) break;
    const end = closing(body, i);
    if (end === -1) break;
    options.set(key, body.slice(i + 1, end));
    i = end + 1;
  }
  const chosen = options.get(`=${value}`) ?? options.get(pluralCategory(locale, value)) ?? options.get('other') ?? '';
  return format(chosen.replace(/#/g, String(value)), params, locale);
}

export function format(message: string, params: MessageParams = {}, locale = 'en'): string {
  let out = '';
  let i = 0;
  while (i < message.length) {
    const open = message.indexOf('{', i);
    if (open === -1) {
      out += message.slice(i);
      break;
    }
    out += message.slice(i, open);
    const end = closing(message, open);
    if (end === -1) {
      out += message.slice(open);
      break;
    }
    const inner = message.slice(open + 1, end);
    const match = /^\s*(\w+)\s*(?:,\s*(\w+)\s*,([\s\S]*))?$/.exec(inner);
    const name = match?.[1];
    const value = name ? params[name] : undefined;
    if (!match || value === undefined || value === null) out += message.slice(open, end + 1);
    else if (match[2] === 'plural') out += plural(match[3] ?? '', Number(value), locale, params);
    else out += String(value);
    i = end + 1;
  }
  return out;
}
