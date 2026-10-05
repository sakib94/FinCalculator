/**
 * A tiny, safe arithmetic evaluator for the pop-up calculator:
 * numbers, + − × ÷, brackets and unary minus — nothing else. It never
 * uses eval or Function, so whatever is typed can only ever be a sum.
 *
 *   evaluate('12×14 + 10×12')  → 288
 *   evaluate('(20+5)*2')       → 50
 *   evaluate('5 ÷ 0')          → null
 */

type Token = { kind: 'num'; value: number } | { kind: 'op'; value: '+' | '-' | '*' | '/' | '(' | ')' };

/** Normalises the display symbols and Indian digit grouping. */
export function normalise(expr: string): string {
  return expr
    .replace(/[×xX]/g, '*')
    .replace(/÷/g, '/')
    .replace(/[−–]/g, '-')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
}

function tokenize(src: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if ('+-*/()'.includes(c)) {
      tokens.push({ kind: 'op', value: c as '+' });
      i++;
      continue;
    }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
    if (!m) return null;
    tokens.push({ kind: 'num', value: Number(m[1]) });
    i += m[1].length;
  }
  return tokens;
}

/**
 * The value of an expression, or null when it is incomplete, malformed,
 * divides by zero or is not a finite number.
 */
export function evaluate(expr: string): number | null {
  const parsed = tokenize(normalise(expr));
  if (!parsed || parsed.length === 0) return null;
  const tokens: Token[] = parsed;
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v: string) => peek()?.kind === 'op' && peek()!.value === v;

  // expr := term (('+'|'-') term)*
  function parseExpr(): number | null {
    let left = parseTerm();
    while (left != null && (isOp('+') || isOp('-'))) {
      const op = (tokens[pos++] as { value: string }).value;
      const right = parseTerm();
      if (right == null) return null;
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  // term := factor (('*'|'/') factor)*
  function parseTerm(): number | null {
    let left = parseFactor();
    while (left != null && (isOp('*') || isOp('/'))) {
      const op = (tokens[pos++] as { value: string }).value;
      const right = parseFactor();
      if (right == null) return null;
      if (op === '/' && right === 0) return null;
      left = op === '*' ? left * right : left / right;
    }
    return left;
  }
  // factor := number | '(' expr ')' | ('-'|'+') factor
  function parseFactor(): number | null {
    const tok = peek();
    if (!tok) return null;
    if (tok.kind === 'num') {
      pos++;
      return tok.value;
    }
    if (tok.value === '-' || tok.value === '+') {
      pos++;
      const v = parseFactor();
      return v == null ? null : tok.value === '-' ? -v : v;
    }
    if (tok.value === '(') {
      pos++;
      const v = parseExpr();
      if (v == null || !isOp(')')) return null;
      pos++;
      return v;
    }
    return null;
  }

  const result = parseExpr();
  if (result == null || pos !== tokens.length || !Number.isFinite(result)) return null;
  // Float dust: 0.1 + 0.2 shows as 0.3.
  return Math.round(result * 1e9) / 1e9;
}
