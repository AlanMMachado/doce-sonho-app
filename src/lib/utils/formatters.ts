export function formatDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function dateToISO(date: string): string {
  const [day, month, year] = date.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Só acrescenta um separador depois que existe dígito para vir depois dele;
// assim o backspace nunca fica preso em um caractere da máscara.
export function formatPhone(input: string): string {
  const allDigits = input.replace(/\D/g, '');
  // Número colado com código do país, como "+55 11 99999-8888". O que já passou pela máscara
  // começa com "(" e fica de fora, para não cortar o DDD 55 ao digitar um dígito a mais.
  const isPastedWithCountryCode = !input.startsWith('(') && allDigits.length > 11 && allDigits.startsWith('55');
  const digits = (isPastedWithCountryCode ? allDigits.slice(2) : allDigits).slice(0, 11);
  if (digits.length <= 2) return digits;
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  const prefixLength = number.length === 9 ? 5 : 4;
  if (number.length <= prefixLength) return `(${ddd}) ${number}`;
  return `(${ddd}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}

export function formatCents(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
