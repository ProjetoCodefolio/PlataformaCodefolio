// Conversão entre data ISO (UTC, como é gravada no banco) e o valor do
// <input type="datetime-local">, que é sempre no horário local do navegador.

const pad = (n) => String(n).padStart(2, "0");

/**
 * ISO → "aaaa-mm-ddThh:mm" no horário local. Devolve "" para vazio/inválido.
 */
export const isoToLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

/**
 * "aaaa-mm-ddThh:mm" (horário local) → ISO. Devolve "" para vazio/inválido.
 */
export const localInputToIso = (local) => {
  if (!local) return "";
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
};
