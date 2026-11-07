import { formatCents } from '@/lib/utils/formatters';
import { getSaleItemName, sortSalesOldestFirst } from '@/lib/utils/saleUtils';
import { Sale } from '@/types/Sale';
import { format, parseISO } from 'date-fns';
import { Linking, Platform } from 'react-native';

const BRAZIL_COUNTRY_CODE = '55';

export const DEFAULT_CHARGE_TEMPLATE = [
  'Olá, *{cliente}*! Tudo bem?',
  'Segue o resumo das suas compras pendentes:',
  '{compras}',
  '*Total pendente: {total}*',
  'Obrigado pela preferência!',
].join('\n\n');

export const CHARGE_TEMPLATE_VARIABLES = [
  { key: 'cliente', description: 'Nome do cliente' },
  { key: 'compras', description: 'Lista das compras pendentes' },
  { key: 'total', description: 'Total pendente' },
];

export const TEMPLATE_VARIABLE_PATTERN = /\{([^{}\s]+)\}/g;

export function findUnknownVariables(template: string): string[] {
  const knownKeys = CHARGE_TEMPLATE_VARIABLES.map(variable => variable.key);
  const usedKeys = [...template.matchAll(TEMPLATE_VARIABLE_PATTERN)].map(match => match[1]);
  return [...new Set(usedKeys.filter(key => !knownKeys.includes(key)))];
}

export interface FormattedSegment {
  text: string;
  bold: boolean;
}

// Mesmas regras do WhatsApp: o negrito fica em uma linha, sem espaço colado nos asteriscos,
// e não abre nem fecha no meio de uma palavra, como em 2*3*4.
export function splitBoldSegments(message: string): FormattedSegment[] {
  const isWordChar = (char: string | undefined) => char !== undefined && /[0-9A-Za-zÀ-ÿ]/.test(char);
  const segments: FormattedSegment[] = [];
  let cursor = 0;

  for (const match of message.matchAll(/\*([^*\s](?:[^*\n]*[^*\s])?)\*/g)) {
    const end = match.index + match[0].length;
    if (isWordChar(message[match.index - 1]) || isWordChar(message[end])) continue;

    if (match.index > cursor) segments.push({ text: message.slice(cursor, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    cursor = end;
  }

  if (cursor < message.length) segments.push({ text: message.slice(cursor), bold: false });
  return segments;
}

function toCents(value: number): number {
  return Math.round(value * 100);
}

function formatMoney(cents: number): string {
  return `R$ ${formatCents(cents)}`;
}

// Vendas antigas podem ter só a data; nesse caso a hora é omitida para não exibir 00:00.
function formatSaleDate(date: string): string {
  const parsed = parseISO(date);
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return format(parsed, 'dd/MM/yyyy');
  return format(parsed, "dd/MM/yyyy 'às' HH:mm");
}

// Usa *negrito* porque o WhatsApp não renderiza **. O cálculo é feito em centavos
// para o total bater com customers.total_owed, sem erro de ponto flutuante.
export function buildChargeMessage(customerName: string, pendingSales: Sale[], template?: string | null): string {
  let totalCents = 0;

  const saleBlocks = sortSalesOldestFirst(pendingSales).map(sale => {
    const subtotalCents = toCents(sale.total_price);
    const paidCents = toCents(sale.amount_paid);
    totalCents += subtotalCents - paidCents;

    const paidNote = paidCents > 0 ? ` (Já pago ${formatMoney(paidCents)})` : '';
    const items = sale.items.map(item =>
      `- ${item.quantity}x ${getSaleItemName(item)} - ${formatMoney(toCents(item.subtotal))}`
    );

    return [`*${formatSaleDate(sale.date)}* - ${formatMoney(subtotalCents)}${paidNote}`, ...items].join('\n');
  });

  const values: Record<string, string> = {
    cliente: customerName,
    compras: saleBlocks.join('\n\n'),
    total: formatMoney(totalCents),
  };

  // Passada única com função: o texto inserido não é reinterpretado, então um nome
  // como "{total}" ou com "$&" não altera o resultado.
  return (template ?? DEFAULT_CHARGE_TEMPLATE).replace(
    TEMPLATE_VARIABLE_PATTERN,
    (match, key: string) => values[key] ?? match
  );
}

// Linking.openURL rejeita em Android e iOS quando não há quem abra o link, então não
// é preciso canOpenURL (que exigiria declarar o esquema na config nativa). A mensagem
// só é preenchida: o envio continua sendo feito pelo usuário dentro do WhatsApp.
export async function openWhatsappChat(phone: string, message: string): Promise<void> {
  const number = `${BRAZIL_COUNTRY_CODE}${phone}`;
  const text = encodeURIComponent(message);
  const webUrl = `https://wa.me/${number}?text=${text}`;

  if (Platform.OS !== 'web') {
    try {
      await Linking.openURL(`whatsapp://send?phone=${number}&text=${text}`);
      return;
    } catch {
      // WhatsApp não instalado: segue para o wa.me no navegador.
    }
  }

  await Linking.openURL(webUrl);
}
