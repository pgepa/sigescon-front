import { z } from "zod"

/** Em produção, use URL absoluta (https://.../api/v1). Caminho relativo (/api/v1) só faz sentido com reverse proxy no mesmo host. */
const viteBaseUrl = z
  .string()
  .min(1)
  .refine(
    (val) => val.startsWith("/") || /^https?:\/\//i.test(val),
    { message: "Use uma URL http(s) ou um caminho que comece com / (ex.: /api/v1)" },
  )

const envSchema = z.object({
  VITE_API_URL: viteBaseUrl,
  VITE_AUTH_API_URL: viteBaseUrl,
})

export const env = envSchema.parse(import.meta.env)
