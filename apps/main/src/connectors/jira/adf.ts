/**
 * Minimal ADF document factory. Atlassian's ADF is sprawling; we only need
 * paragraph + text + link for now.
 */
export function adfPrComment(prUrl: string, ticketTitle: string): unknown {
  return {
    version: 1,
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Pull request opened by Tickitt: ' },
          {
            type: 'text',
            text: prUrl,
            marks: [{ type: 'link', attrs: { href: prUrl } }],
          },
        ],
      },
    ],
  };
}
