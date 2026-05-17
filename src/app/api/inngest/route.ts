import { serve } from "inngest/next";
import { reminderLadder } from "@/inngest/functions/reminderLadder";
import { travelUpdatePass } from "@/inngest/functions/travelUpdatePass";
import { inngest } from "@/inngest/client";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [travelUpdatePass, reminderLadder],
});
