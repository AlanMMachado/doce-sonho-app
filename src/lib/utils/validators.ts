export function isValidDate(data: string): boolean {
  const parts = data.split('/');
  if (parts.length !== 3) return false;
  const [dia, mes, ano] = parts.map(Number);
  if (!dia || !mes || !ano || ano < 1900 || ano > 2100) return false;
  if (mes < 1 || mes > 12) return false;
  const date = new Date(ano, mes - 1, dia);
  return date.getFullYear() === ano && date.getMonth() === mes - 1 && date.getDate() === dia;
}
