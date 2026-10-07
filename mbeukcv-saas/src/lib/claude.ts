import 'server-only';

export async function callClaudeTool(input: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  maxTokens: number;
  apiKey?: string;
}): Promise<unknown> {
  const apiKey = input.apiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim() || '';
  if (!apiKey) {
    throw new Error('Aucune clé Claude n’est disponible. Enregistrez la vôtre dans Paramètres, ou utilisez Claude.ai.');
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: 'user', content: input.user }],
      tools: [{ name: input.toolName, description: input.toolDescription, input_schema: input.inputSchema }],
      tool_choice: { type: 'tool', name: input.toolName },
    }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body && typeof body === 'object' && body.error && typeof body.error.message === 'string' ? body.error.message : `HTTP ${response.status}`;
    throw new Error(`Claude n’a pas répondu. ${detail}`);
  }
  const blocks = body && typeof body === 'object' && Array.isArray(body.content) ? body.content : [];
  const tool = blocks.find((block: { type?: string; name?: string }) => block?.type === 'tool_use' && block?.name === input.toolName);
  if (!tool || typeof tool !== 'object' || !('input' in tool)) {
    throw new Error('Claude n’a pas renvoyé de résultat exploitable.');
  }
  return tool.input;
}
