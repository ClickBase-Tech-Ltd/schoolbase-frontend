export type PageCoachCommand = "start" | "next" | "back" | "repeat" | "tasks" | "finish";

const startPatterns = [
  /^(?:(?:please|can you|could you)\s+)?teach me (?:this page|how to (?:use|navigate) this (?:page|screen)|how this page works|around)[?.!]*$/i,
  /^(?:(?:please|can you|could you)\s+)?(?:show me around|show me how (?:to use this page|this page works)|walk me through this page|guide me through this page)[?.!]*$/i,
  /^(?:(?:please|can you|could you)\s+)?start (?:a )?(?:page )?tour[?.!]*$/i,
  /^explain this page step by step[?.!]*$/i,
];

export function getPageCoachCommand(input: string, isTourActive: boolean): PageCoachCommand | null {
  const request = input.trim();
  if (startPatterns.some((pattern) => pattern.test(request))) return "start";
  if (!isTourActive) return null;

  if (/^(?:please\s+)?(?:next|continue|go on|move on|next step|go to the next step)(?:,\s*please)?[?.!]*$/i.test(request)) return "next";
  if (/^(?:please\s+)?(?:back|previous|go back|previous step|go back a step|go to the previous step)(?:,\s*please)?[?.!]*$/i.test(request)) return "back";
  if (/^(?:please\s+)?(?:repeat|repeat that|repeat the step|say that again)(?:,\s*please)?[?.!]*$/i.test(request)) return "repeat";
  if (/^(?:please\s+)?(?:common tasks|read common tasks|what are the common tasks|what can i do here)(?:,\s*please)?[?.!]*$/i.test(request)) return "tasks";
  if (/^(?:please\s+)?(?:finish|finish the tour|stop the tour|skip|skip the tour|end the tour|i['’]m done)(?:,\s*please)?[?.!]*$/i.test(request)) return "finish";
  return null;
}
