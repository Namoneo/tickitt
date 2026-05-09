export interface TestResult {
  ok: boolean;
  identity?: { displayName: string; email?: string | undefined };
  error?: string;
}

export interface TicketDTO {
  externalId: string;
  key: string;
  title: string;
  body: string | null;
  status: string;
  statusCategory: 'todo' | 'in_progress' | 'done' | 'unknown';
  assignee: string | null;
  url: string;
  externalUpdatedAt: Date;
  raw: Record<string, unknown>;
}

export interface FetchTicketsOptions {
  jql: string;
  updatedSince?: string | undefined;
  pageSize?: number | undefined;
}

export interface FetchTicketsResult {
  tickets: TicketDTO[];
  newCursor: string | null;
}

export interface TicketSource {
  test(): Promise<TestResult>;
  fetchTickets(opts: FetchTicketsOptions): Promise<FetchTicketsResult>;
  // NEW (P4)
  addCommentLinkingPr(issueKey: string, prUrl: string, ticketTitle: string): Promise<void>;
  transitionByName(issueKey: string, statusName: string): Promise<{ ok: boolean; available?: string[] }>;
}