export interface CCSystemInit {
  type: 'system';
  subtype: 'init';
  session_id: string;
  cwd: string;
  tools: string[];
  model: string;
}

export interface CCAssistant {
  type: 'assistant';
  message: {
    id: string;
    content: Array<
      | { type: 'text'; text: string }
      | { type: 'tool_use'; id: string; name: string; input: unknown }
    >;
    stop_reason?: string | null;
  };
}

export interface CCUser {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{
      type: 'tool_result';
      tool_use_id: string;
      content: unknown;
      is_error?: boolean;
    }>;
  };
}

export interface CCResult {
  type: 'result';
  subtype: 'success' | 'error_max_turns' | 'error' | string;
  is_error: boolean;
  duration_ms: number;
  result?: string;
  session_id: string;
  total_cost_usd?: number;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

export type CCStreamEvent = CCSystemInit | CCAssistant | CCUser | CCResult | { type: string };
