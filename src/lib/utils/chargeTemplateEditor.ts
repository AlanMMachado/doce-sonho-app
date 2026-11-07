import { CHARGE_TEMPLATE_VARIABLES, TEMPLATE_VARIABLE_PATTERN } from '@/lib/utils/whatsapp';

export interface TextRange {
  start: number;
  end: number;
}

export interface VariableToken extends TextRange {
  key: string;
}

export interface TemplateSegment {
  text: string;
  variableKey: string | null;
  isUnknownVariable: boolean;
}

export interface EditResult {
  text: string;
  cursor: number;
}

// Subconjunto de TextLayoutLine, o que o onTextLayout entrega para cada linha.
export interface TextLine {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DropLine extends TextRange {
  bottom: number;
  left: number;
  width: number;
  gaps: number[];
}

interface PositionedLine extends TextRange {
  line: TextLine;
}

const knownKeys = CHARGE_TEMPLATE_VARIABLES.map(variable => variable.key);

function isWhitespace(char: string | undefined): boolean {
  return char !== undefined && /\s/.test(char);
}

export function splitTemplate(text: string): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  let cursor = 0;

  for (const match of text.matchAll(TEMPLATE_VARIABLE_PATTERN)) {
    const start = match.index;
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), variableKey: null, isUnknownVariable: false });
    }
    const isKnown = knownKeys.includes(match[1]);
    segments.push({ text: match[0], variableKey: isKnown ? match[1] : null, isUnknownVariable: !isKnown });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), variableKey: null, isUnknownVariable: false });
  }
  return segments;
}

export function findVariableTokens(text: string): VariableToken[] {
  return [...text.matchAll(TEMPLATE_VARIABLE_PATTERN)]
    .filter(match => knownKeys.includes(match[1]))
    .map(match => ({ key: match[1], start: match.index, end: match.index + match[0].length }));
}

function findChangedRange(previous: string, next: string) {
  let start = 0;
  const maxPrefix = Math.min(previous.length, next.length);
  while (start < maxPrefix && previous[start] === next[start]) start++;

  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (previousEnd > start && nextEnd > start && previous[previousEnd - 1] === next[nextEnd - 1]) {
    previousEnd--;
    nextEnd--;
  }
  return { start, previousEnd, nextEnd };
}

function countChangedChars(a: string, b: string): number {
  const { start, previousEnd, nextEnd } = findChangedRange(a, b);
  return Math.max(previousEnd, nextEnd) - start;
}

// Compara o texto antes e depois de uma edição do teclado. Uma edição que atinge parte
// de uma variável passa a valer para a variável inteira, e digitar dentro dela joga o
// texto para depois da variável. Assim nunca sobra um pedaço como "{tot" na mensagem.
export function applyAtomicEdit(previous: string, next: string): EditResult {
  const { start, previousEnd, nextEnd } = findChangedRange(previous, next);
  const inserted = next.slice(start, nextEnd);
  const tokens = findVariableTokens(previous);

  if (start === previousEnd) {
    const container = tokens.find(token => token.start < start && start < token.end);
    if (!container) return { text: next, cursor: start + inserted.length };
    return {
      text: previous.slice(0, container.end) + inserted + previous.slice(container.end),
      cursor: container.end + inserted.length,
    };
  }

  const touched = tokens.filter(token => start < token.end && previousEnd > token.start);
  if (touched.length === 0) return { text: next, cursor: start + inserted.length };

  const removeStart = Math.min(start, ...touched.map(token => token.start));
  const removeEnd = Math.max(previousEnd, ...touched.map(token => token.end));
  return {
    text: previous.slice(0, removeStart) + inserted + previous.slice(removeEnd),
    cursor: removeStart + inserted.length,
  };
}

export interface PendingCorrection {
  staleText: string;
  result: EditResult;
}

export type NativeChange =
  | { kind: 'accept'; text: string }
  | { kind: 'correct'; correction: PendingCorrection }
  | { kind: 'ignore'; correction: PendingCorrection };

// Uma correção do app leva um instante para chegar ao aparelho. Com o backspace segurado,
// o próximo evento ainda pode vir do texto antigo, com um pedaço da variável, e aceitá-lo
// devolveria esse pedaço à mensagem. Enquanto o evento estiver mais perto do texto antigo
// do que da correção, ele é descartado e a correção é reenviada.
export function resolveNativeChange(value: string, next: string, pending: PendingCorrection | null): NativeChange {
  if (pending && countChangedChars(next, pending.staleText) < countChangedChars(next, pending.result.text)) {
    return { kind: 'ignore', correction: { ...pending, staleText: next } };
  }

  const edit = applyAtomicEdit(value, next);
  if (edit.text === next) return { kind: 'accept', text: next };
  return { kind: 'correct', correction: { staleText: next, result: edit } };
}

function insertToken(text: string, token: string, start: number, end: number): EditResult {
  const before = text[start - 1];
  const after = text[end];
  const prefix = before !== undefined && !isWhitespace(before) ? ' ' : '';
  const suffix = after !== undefined && !isWhitespace(after) && !/[.,;:!?)]/.test(after) ? ' ' : '';

  return {
    text: `${text.slice(0, start)}${prefix}${token}${suffix}${text.slice(end)}`,
    cursor: start + prefix.length + token.length,
  };
}

// Um cursor dentro de uma variável é levado para o fim dela antes de inserir.
export function insertVariable(text: string, key: string, selection: TextRange): EditResult {
  const container = findVariableTokens(text).find(
    token => token.start < selection.start && selection.start < token.end
  );
  const start = container?.end ?? selection.start;
  const end = container ? container.end : selection.end;
  return insertToken(text, `{${key}}`, start, end);
}

// O Android inclui o \n final no texto da linha e outras plataformas podem não incluir.
function positionLines(text: string, lines: TextLine[]): PositionedLine[] {
  let cursor = 0;
  return lines.map(line => {
    const start = cursor;
    const end = start + line.text.replace(/\n$/, '').length;
    cursor = text[end] === '\n' ? end + 1 : end;
    return { line, start, end };
  });
}

// Tabela calculada no JS com os pontos de soltar de cada linha. A busca em findDropGap roda
// na UI thread a cada movimento do dedo, onde não vale a pena reprocessar o texto.
export function buildDropLines(text: string, lines: TextLine[]): DropLine[] {
  const positioned = positionLines(text, lines);
  if (positioned.length === 0) {
    return [{ bottom: 0, left: 0, width: 0, start: text.length, end: text.length, gaps: [text.length] }];
  }

  const tokens = findVariableTokens(text);
  return positioned.map(({ line, start, end }) => {
    const gaps: number[] = [];
    for (let offset = start; offset <= end; offset++) {
      const isGap =
        offset === start ||
        offset === end ||
        isWhitespace(text[offset - 1]) ||
        isWhitespace(text[offset]);
      if (isGap && !tokens.some(token => token.start < offset && offset < token.end)) gaps.push(offset);
    }
    return { bottom: line.y + line.height, left: line.x, width: line.width, start, end, gaps };
  });
}

// A posição exata do caractere não é exposta pelo React Native, então ela é estimada
// proporcionalmente à largura da linha. Por isso o encaixe é sempre entre palavras.
export function findDropGap(dropLines: DropLine[], x: number, y: number): number {
  'worklet';
  let target = dropLines[dropLines.length - 1];
  for (let index = 0; index < dropLines.length; index++) {
    if (y < dropLines[index].bottom) {
      target = dropLines[index];
      break;
    }
  }

  const ratio = target.width > 0 ? Math.min(Math.max((x - target.left) / target.width, 0), 1) : 0;
  const estimate = Math.round(target.start + ratio * (target.end - target.start));

  let best = target.gaps[0] ?? target.start;
  for (let index = 1; index < target.gaps.length; index++) {
    if (Math.abs(target.gaps[index] - estimate) < Math.abs(best - estimate)) best = target.gaps[index];
  }
  return best;
}
