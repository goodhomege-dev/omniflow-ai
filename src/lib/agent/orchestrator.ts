import { DatabaseRepository } from '../db/repo';
import { LlmProvider, LlmMessage } from '../llm/types';
import { buildSystemPrompt } from './prompt';
import { parseAgentJson, AgentResponse } from './schema';
import { ToolExecutor } from './tools';
import { applySafetyGuards } from './guards';
import { isCorruptedGeorgian, generateSmartFallback } from '../llm/openrouter';

export interface ProcessMessageInput {
  channel: 'messenger' | 'whatsapp' | 'telegram';
  platformUserId: string;
  platformMessageId: string;
  text: string;
  displayName?: string;
  attachments?: any[];
}

export interface ProcessMessageOutput {
  handled: boolean;
  isDuplicate: boolean;
  replyText?: string;
  response?: AgentResponse;
  isHumanTakeover?: boolean;
}

export class AgentOrchestrator {
  private toolExecutor: ToolExecutor;

  constructor(
    private repo: DatabaseRepository,
    private llm: LlmProvider
  ) {
    this.toolExecutor = new ToolExecutor(repo);
  }

  async processIncomingMessage(input: ProcessMessageInput): Promise<ProcessMessageOutput> {
    // 1. Get or create conversation
    const { conversation } = await this.repo.getOrCreateConversation(
      input.channel,
      input.platformUserId,
      input.displayName
    );

    // 2. Save incoming message with unique constraint / duplicate detection
    const { message, isDuplicate } = await this.repo.saveMessage({
      conversationId: conversation.id,
      channel: input.channel,
      platformMessageId: input.platformMessageId,
      senderType: 'customer',
      content: input.text,
      attachments: input.attachments,
    });

    if (isDuplicate) {
      return { handled: true, isDuplicate: true };
    }

    // 3. Check if human has taken over
    if (conversation.aiPaused || conversation.isHumanAssigned) {
      return {
        handled: true,
        isDuplicate: false,
        isHumanTakeover: true,
      };
    }

    // 4. Build system prompt from dynamic business config
    const config = await this.repo.getBusinessConfig();
    const systemPrompt = buildSystemPrompt(config);

    // 5. Load recent history
    const history = await this.repo.getConversationHistory(conversation.id, 10);
    const messages: LlmMessage[] = history.map(h => ({
      role: h.senderType === 'customer' ? 'user' : 'assistant',
      content: h.content,
    }));

    // If history doesn't have the current message yet (due to timing), add it
    if (!messages.some(m => m.content === input.text)) {
      messages.push({ role: 'user', content: input.text });
    }

    // Context flags for safety guard
    let orderCreatedThisTurn = false;
    let paymentConfirmedThisTurn = false;
    const activeOrder = await this.repo.getActiveDraftOrder(conversation.id);

    // 6. Tool execution loop (max 4 iterations)
    let currentIteration = 0;
    const maxIterations = 4;
    let finalResponse: AgentResponse | null = null;

    while (currentIteration < maxIterations) {
      currentIteration++;

      let rawLlmOutput = '';
      try {
        rawLlmOutput = await this.llm.generateText(systemPrompt, messages);
      } catch (llmErr) {
        console.error('LLM generation error:', (llmErr as Error)?.message || llmErr);
        finalResponse = {
          replyText: 'გამარჯობა! სისტემა დროებით დაკავებულია. თქვენი შეტყობინება გადაეცა ოპერატორს და უმოკლეს დროში გიპასუხებთ.',
          platform: input.channel,
          intent: 'general_question',
          isOrderReady: false,
          isEscalate: true,
          missingFields: [],
          order: null,
          actions: [{ name: 'REQUEST_HUMAN_HANDOFF', args: { reason: 'LLM connection or quota issue' } }],
        };
        await this.repo.recordAudit('SYSTEM', 'LLM_EXECUTION_ERROR', 'messages', message.id, null, { error: (llmErr as Error)?.message });
        break;
      }

      const parsed = parseAgentJson(rawLlmOutput);

      if (!parsed.success) {
        // Safe fallback on invalid JSON from LLM
        finalResponse = {
          replyText: 'გამარჯობა! გთხოვთ დამიზუსტოთ, რა გაინტერესებთ ჩვენი პროდუქციის ან შეკვეთის შესახებ?',
          platform: input.channel,
          intent: 'general_question',
          isOrderReady: false,
          isEscalate: false,
          missingFields: [],
          order: null,
          actions: [],
        };
        await this.repo.recordAudit('SYSTEM', 'LLM_PARSE_ERROR', 'messages', message.id, null, { error: parsed.error });
        break;
      }

      const agentData = parsed.data;

      // Ensure replyText is clean, pure Georgian without foreign script token corruption
      if (agentData.replyText && isCorruptedGeorgian(agentData.replyText)) {
        console.warn('[Orchestrator] Detected corrupted text in LLM response, replacing with safe Georgian fallback.');
        const fallbackRaw = generateSmartFallback(messages);
        const fbParsed = parseAgentJson(fallbackRaw);
        if (fbParsed.success) {
          agentData.replyText = fbParsed.data.replyText;
          agentData.intent = fbParsed.data.intent;
        }
      }

      // If no actions, we have our final text
      if (!agentData.actions || agentData.actions.length === 0) {
        finalResponse = agentData;
        break;
      }

      // Execute actions
      const toolResults: any[] = [];
      for (const action of agentData.actions) {
        const result = await this.toolExecutor.execute(action.name, action.args || {}, {
          conversationId: conversation.id,
          channel: input.channel,
        });
        toolResults.push(result);

        if (action.name === 'CREATE_ORDER' && result.result?.success) {
          orderCreatedThisTurn = true;
        }
        if (action.name === 'VERIFY_PAYMENT' && result.result?.status === 'CONFIRMED_PAID') {
          paymentConfirmedThisTurn = true;
        }
        if (action.name === 'REQUEST_HUMAN_HANDOFF') {
          agentData.isEscalate = true;
        }
      }

      // Feed tool results back into conversation for the next round
      messages.push({
        role: 'assistant',
        content: JSON.stringify(agentData),
      });
      messages.push({
        role: 'user',
        content: `[TOOL_RESULTS]: ${JSON.stringify(toolResults)}`,
      });

      // If the action was CREATE_ORDER or REQUEST_HUMAN_HANDOFF, finish up
      if (agentData.actions.some(a => a.name === 'CREATE_ORDER' || a.name === 'REQUEST_HUMAN_HANDOFF')) {
        finalResponse = agentData;
        break;
      }
    }

    if (!finalResponse) {
      finalResponse = {
        replyText: 'ინფორმაცია გადამოწმებულია. რით შემიძლია კიდევ დაგეხმაროთ?',
        platform: input.channel,
        intent: 'general_question',
        isOrderReady: false,
        isEscalate: false,
        missingFields: [],
        order: null,
        actions: [],
      };
    }

    // 7. Apply Post-Guard Safety Checks
    const guardedResponse = applySafetyGuards(finalResponse, {
      orderCreatedThisTurn,
      paymentConfirmedThisTurn,
      activeOrderExists: !!activeOrder,
    });

    // 8. Save Agent response message to DB
    await this.repo.saveMessage({
      conversationId: conversation.id,
      channel: input.channel,
      platformMessageId: `agent-${Date.now()}`,
      senderType: 'ai_agent',
      content: guardedResponse.replyText,
    });

    // 9. Queue to Outbox for channel dispatch
    await this.repo.queueOutboxMessage(
      input.channel,
      input.platformUserId,
      guardedResponse.replyText
    );

    // 10. Update conversation intent
    await this.repo.updateConversation(conversation.id, {
      currentIntent: guardedResponse.intent,
      isHumanAssigned: guardedResponse.isEscalate,
      aiPaused: guardedResponse.isEscalate,
    });

    return {
      handled: true,
      isDuplicate: false,
      replyText: guardedResponse.replyText,
      response: guardedResponse,
    };
  }
}
