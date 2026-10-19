/**
 * Utilitários de máscaras para campos de formulário no SIGESCON.
 */

/**
 * Máscara para o PAE (Processo Administrativo Eletrônico).
 * Apenas dígitos e barra, sem limite de tamanho (ex: 2026/123456).
 */
export function maskPae(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[^\d/]/g, "");
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
