import Groq from "groq-sdk";
import { z } from "zod";

// Zod schema for LLM response
export const LLMActionResponseSchema = z.object({
  reasoning: z.string(),
  action: z.enum([
    "set_breakpoint",
    "remove_breakpoint", 
    "clear_breakpoints",
    "enable_breakpoints",
    "disable_breakpoints",
    "resume",
    "step_over",
    "step_in",
    "step_out",
    "run_without_breakpoints",
    "evaluate_expression",
    "watch_variable",
    "unwatch_variable",
    "get_scope",
    "get_source_context",
    "get_status",
    "get_history",
    "start_profiling",
    "stop_profiling",
    "collect_garbage",
    "analyze_state",
    "wait_for_pause",
    "stop_agent"
  ]),
  parameters: z.object({
    file: z.string().optional(),
    lineNumber: z.number().optional(),
    condition: z.string().optional(),
    hitCount: z.number().optional(),
    breakpointKey: z.string().optional(),
    expression: z.string().optional(),
    variableName: z.string().optional(),
    lines: z.number().optional(),
    limit: z.number().optional()
  }).optional(),
  confidence: z.number().min(0).max(1),
  stop_agent: z.boolean().default(false)
});

export type LLMActionResponse = z.infer<typeof LLMActionResponseSchema>;

export class LLMService {
  private groq: Groq;
  private model: string;

  constructor(apiKey: string, model: string = "llama3-70b-8192") {
    this.groq = new Groq({ apiKey });
    this.model = model;
  }

  async determineNextAction(
    currentState: any,
    executionHistory: any[],
    debuggingGoal: string
  ): Promise<LLMActionResponse> {
    const prompt = this.buildPrompt(currentState, executionHistory, debuggingGoal);

    try {
      const completion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `You are an expert debugging AI agent. Analyze the current debugging state and determine the next optimal action to achieve the debugging goal. Always respond with valid JSON matching the required schema.`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: this.model,
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: "json_object" }
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("No response from LLM");
      }

      const parsedResponse = JSON.parse(responseText);
      return LLMActionResponseSchema.parse(parsedResponse);
    } catch (error) {
      console.error("LLM Service Error:", error);
      // Fallback response
      return {
        reasoning: "Error occurred, falling back to analysis",
        action: "analyze_state",
        parameters: {},
        confidence: 0.5,
        stop_agent: false
      };
    }
  }

  private buildPrompt(currentState: any, executionHistory: any[], debuggingGoal: string): string {
    return `
DEBUGGING CONTEXT:
------------------
Goal: ${debuggingGoal}

CURRENT STATE:
- Connected: ${currentState.isConnected}
- Paused: ${currentState.isPaused}
- Breakpoints Enabled: ${currentState.breakpointsEnabled}
- Active Breakpoints: ${currentState.breakpointsCount}
- Watchpoints: ${currentState.watchpointsCount}
- Scripts Loaded: ${currentState.scriptsLoaded}

LAST PAUSE:
${currentState.lastPauseLocation ? 
  `Location: ${currentState.lastPauseLocation.url}:${currentState.lastPauseLocation.line}
Reason: ${currentState.lastPauseReason}` : 
  'No recent pause'}

EXECUTION HISTORY (last 5):
${executionHistory.slice(-5).map((entry, i) => 
  `${i+1}. ${entry.reason} at ${entry.url}:${entry.line}`
).join('\n')}

AVAILABLE ACTIONS:
1. set_breakpoint - Set breakpoint at file:line (requires file, lineNumber)
2. remove_breakpoint - Remove specific breakpoint (requires breakpointKey)
3. clear_breakpoints - Remove all breakpoints
4. enable_breakpoints / disable_breakpoints - Toggle all breakpoints
5. resume - Continue execution
6. step_over / step_in / step_out - Step through code
7. run_without_breakpoints - Run temporarily without breakpoints
8. evaluate_expression - Evaluate JS expression (requires expression)
9. watch_variable / unwatch_variable - Monitor variables
10. get_scope - Get current variable scope
11. get_source_context - Get source code around current line
12. get_status - Get current debugger status
13. get_history - Get execution history
14. start_profiling / stop_profiling - Performance profiling
15. collect_garbage - Trigger GC
16. analyze_state - Analyze current state without action
17. wait_for_pause - Wait for next pause event
18. stop_agent - Stop debugging session

RESPONSE FORMAT:
{
  "reasoning": "Detailed reasoning for chosen action",
  "action": "action_name",
  "parameters": { /* action-specific parameters */ },
  "confidence": 0.95,
  "stop_agent": false
}

Determine the next optimal debugging action based on the current state and goal. Focus on systematic investigation and problem-solving.
`;
  }
}