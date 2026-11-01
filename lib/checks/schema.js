import { z } from "zod";
import { AREAS } from "./areas.js";

export const CheckResult = z.object({
  id: z.string(),
  area: z.enum([...AREAS, "performance"]),
  title: z.string(),
  metric: z.string(),
  threshold: z.string(),
  // null: the data needed wasn't available, so the check neither passed nor failed.
  passed: z.boolean().nullable(),
  value: z.union([z.number(), z.boolean()]).nullable(),
  display: z.string(),
  evidence: z.array(z.string()).min(1),
});
