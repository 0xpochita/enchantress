import { z } from "zod";

export const accountSchema = z.object({
  id: z.uuid(),
  email: z.string().nullable(),
  walletAddress: z.string().nullable(),
  isDelegated: z.boolean(),
});

export type Account = z.infer<typeof accountSchema>;
