import { usePrivy } from "@privy-io/react-auth";
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

interface ApiRequest {
  method?: "POST" | "DELETE";
  body?: unknown;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  token: string,
  { method, body }: ApiRequest = {},
): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const parsed = await readJson(response);
  if (!response.ok) throw new ApiError(response.status, failureMessage(parsed));
  return schema.parse(parsed);
}

export function useApi() {
  const { getAccessToken } = usePrivy();
  const token = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new ApiError(401, "Please log in again.");
    return accessToken;
  };
  return {
    get: async <T>(path: string, schema: z.ZodType<T>) =>
      request(path, schema, await token()),
    post: async <T>(path: string, body: unknown, schema: z.ZodType<T>) =>
      request(path, schema, await token(), { method: "POST", body }),
    delete: async <T>(path: string, schema: z.ZodType<T>) =>
      request(path, schema, await token(), { method: "DELETE" }),
  };
}

export type Api = ReturnType<typeof useApi>;
