import type { PromptContext } from './run.types.js';

export function buildPrompt(ctx: PromptContext): string {
  const body = ctx.ticketBody ? `Description:\n${ctx.ticketBody}\n\n` : '';
  return `You are working on ticket ${ctx.ticketKey}: ${ctx.ticketTitle}.\n\n${body}Repository: ${ctx.repoName}\n\nPlease implement the necessary changes. Work in the current directory. Commit your changes when done.`;
}
