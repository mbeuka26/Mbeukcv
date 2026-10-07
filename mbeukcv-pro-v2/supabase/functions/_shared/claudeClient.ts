import Anthropic from 'npm:@anthropic-ai/sdk@0.27.3';
import { ApiError } from './errors.ts';
import { CLAUDE_MAX_OUTPUT_TOKENS, CLAUDE_MODEL_ID } from '../../../contracts/claudeModel.ts';

export async function callClaudeTool(params: {
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  toolName: string;
  toolDescription: string;
  inputSchema: { type: 'object'; [key: string]: unknown };
  maxTokens?: number;
}): Promise<unknown> {
  const client = new Anthropic({ apiKey: params.apiKey });

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL_ID,
      max_tokens: Math.min(params.maxTokens ?? CLAUDE_MAX_OUTPUT_TOKENS, CLAUDE_MAX_OUTPUT_TOKENS),
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userPrompt }],
      tools: [
        {
          name: params.toolName,
          description: params.toolDescription,
          input_schema: params.inputSchema,
        },
      ],
      tool_choice: { type: 'tool', name: params.toolName },
    });
  } catch (err) {
    throw ApiError.upstream(
      `Échec de l'appel à l'API Anthropic : ${err instanceof Error ? err.message : 'erreur inconnue'}`
    );
  }

  const toolUseBlock = response.content.find(
    (block) => block.type === 'tool_use' && block.name === params.toolName
  );

  if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
    throw ApiError.upstream('Réponse Anthropic inattendue : aucun bloc tool_use trouvé.');
  }

  return toolUseBlock.input;
}
