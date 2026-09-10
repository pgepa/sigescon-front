/**
 * Utilitários de máscaras para campos de formulário no SIGESCON.
 */

/**
 * Máscara para o PAE (Processo Administrativo Eletrônico).
 * Padrão: AAAA/NNNNNN (ex: 2026/123456)
 */
export function maskPae(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}/${digits.slice(4)}`;
}

/**
 * Máscara para o Número do Contrato.
 * Padrão: NN/AAAA ou NNN/AAAA ou NNNN/AAAA (ex: 99/2026, 123/2026)
 * Aceita até 6 dígitos antes da barra e 4 dígitos de ano após a barra.
 */
export function maskNumeroContrato(value: string | null | undefined): string {
  if (!value) return "";
  const cleaned = value.replace(/[^\d/]/g, "");
  const parts = cleaned.split("/");
  if (parts.length === 1) {
    const digits = parts[0].replace(/\D/g, "");
    if (digits.length > 5) {
      const num = digits.slice(0, digits.length - 4);
      const ano = digits.slice(digits.length - 4, digits.length);
      return `${num}/${ano}`;
    }
    return digits;
  }
  const num = parts[0].replace(/\D/g, "").slice(0, 6);
  const ano = parts.slice(1).join("").replace(/\D/g, "").slice(0, 4);
  return ano ? `${num}/${ano}` : `${num}/`;
}

/**
 * Formata um valor para exibição monetária brasileira (sem o prefixo R$).
 * Ex: 1234.56 -> "1.234,56"
 * Ex: "123456" -> "1.234,56"
 */
export function maskMoney(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  
  if (typeof value === "number") {
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // Remove caracteres não-numéricos
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Converte string formatada monetária brasileira para float/number.
 * Ex: "1.234,56" -> 1234.56
 */
export function unmaskMoney(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return isNaN(value) ? null : value;
  
  const cleaned = value.replace(/[^\d,-]/g, "").replace(",", ".");
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
