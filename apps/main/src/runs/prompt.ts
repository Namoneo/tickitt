import type { PromptContext, WorktreeInfo } from './run.types.js';

export function buildPrompt(ctx: PromptContext): string {
  const body = ctx.ticketBody ? `Description:\n${ctx.ticketBody}\n\n` : '';
  return `You are working on ticket ${ctx.ticketKey}: ${ctx.ticketTitle}.\n\n${body}Repository: ${ctx.repoName}\n\nPlease implement the necessary changes. Work in the current directory. Commit your changes when done.`;
}

export function buildContinuationPrompt(feedback: string, info: WorktreeInfo, iteration: number): string {
  return [
    `Reviewer feedback (iteration ${iteration + 1}):`,
    '',
    feedback.trim(),
    '',
    '---',
    '',
    `You are continuing in the same git worktree at ${info.path} on branch ${info.branchName}.`,
    'Apply the requested changes and commit when done.',
  ].join('\n');
}
