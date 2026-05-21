/** Redirecionamento com reload total, compatível com hash history (`createHashRouter`). */
export function redirectToLogin(): void {
  const base = import.meta.env.BASE_URL;
  const withSlash = base.endsWith('/') ? base : `${base}/`;
  window.location.assign(`${withSlash}#/login`);
}
