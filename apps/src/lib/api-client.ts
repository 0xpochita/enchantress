import { z } from "zod";

const errorBodySchema = z.object({ error: z.string() });

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  const type = response.headers.get("content-type") ?? "";
  return type.includes("application/json") ? response.json() : null;
}

function failureMessage(body: unknown): string {
  const parsed = errorBodySchema.safeParse(body);
  return parsed.success ? parsed.data.error : "Something went wrong.";
}

export async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  accessToken: string,
): Promise<T> {
  const response = await fetch(path, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const body = await readJson(response);
  if (!response.ok) throw new ApiError(response.status, failureMessage(body));
  return schema.parse(body);
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  accessToken: string,
): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const parsed = await readJson(response);
  if (!response.ok) throw new ApiError(response.status, failureMessage(parsed));
  return schema.parse(parsed);
}
