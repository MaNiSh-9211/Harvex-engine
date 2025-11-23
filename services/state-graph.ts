import { StateGraph, END } from "@langchain/langgraph";
import { z } from "zod";
import { AIDebugger } from "./ai-debugger";
import { LLMService, LLMActionResponse } from "./llm-service";
import { DebugAgentState, AgentState } from "./agent-state";

// State schema for LangGraph
const GraphStateSchema = z.object({
  agentState: z.instanceof(DebugAgentState),
  llmService: z.instanceof(LLMService),
  debuggerInstance: z.instanceof(AIDebugger),
  lastLLMResponse: z.any().optional(),
  shouldStop: z.boolean().default(false),
  error: z.string().optional(),
  iterationCount: z.number().default(0),
});

type GraphState = z.infer<typeof GraphStateSchema>;

export class DebuggingStateGraph {
  private graph: StateGraph<GraphState>;
  private maxIterations = 100;

  constructor() {
    this.graph = new StateGraph<GraphState>({
      channels: {
        agentState: {
          reducer: (x: DebugAgentState, y: DebugAgentState) => y ?? x,
          default: () => new DebugAgentState(new AIDebugger(), ""),
        },
        llmService: {
          reducer: (x: LLMService, y: LLMService) => y ?? x,
          default: () => new LLMService(""),
        },
        debuggerInstance: {
          reducer: (x: AIDebugger, y: AIDebugger) => y ?? x,
          default: () => new AIDebugger(),
        },
        lastLLMResponse: {
          reducer: (x: any, y: any) => y ?? x,
          default: () => null,
        },
        shouldStop: {
          reducer: (x: boolean, y: boolean) => y ?? x,
          default: () => false,
        },
        error: {
          reducer: (x: string | undefined, y: string | undefined) => y ?? x,
          default: () => undefined,
        },
        iterationCount: {
          reducer: (x: number, y: number) => y ?? x,
          default: () => 0,
        },
      }
    });

    this.buildGraph();
  }

  private buildGraph() {
    // Add nodes
    this.graph
      .addNode("__start__", this.initializeNode.bind(this))
      .addNode("analyze_state", this.analyzeStateNode.bind(this))
      .addNode("execute_action", this.executeActionNode.bind(this))
      .addNode("evaluate_progress", this.evaluateProgressNode.bind(this))
      .addNode("handle_error", this.handleErrorNode.bind(this))
      .addNode("__end__", this.stopAgentNode.bind(this));

    // Define entry point
    this.graph.setEntryPoint("__start__");

    // Define conditional edges
    this.graph.addConditionalEdges("__start__", this.initializeCondition.bind(this));
    // @ts-expect-error LangGraph conditional edge type inference issue
    this.graph.addConditionalEdges("analyze_state", this.analysisCondition.bind(this));
    // @ts-expect-error LangGraph conditional edge type inference issue
    this.graph.addConditionalEdges("execute_action", this.actionCondition.bind(this));
    // @ts-expect-error LangGraph conditional edge type inference issue
    this.graph.addConditionalEdges("evaluate_progress", this.progressCondition.bind(this));
    // @ts-expect-error LangGraph conditional edge type inference issue
    this.graph.addConditionalEdges("handle_error", this.errorCondition.bind(this));

    // Add normal edges
    // @ts-expect-error LangGraph edge type inference issue
    this.graph.addEdge("__end__", END);
  }

  // Node implementations
  private async initializeNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log("🔧 Initializing debugging session...");
    
    try {
      const connectResult = await state.debuggerInstance.connect();
      if (!connectResult.success) {
        throw new Error(`Failed to connect: ${connectResult.error}`);
      }

      state.agentState.setCurrentStep("connected");
      console.log("✅ Debugger connected successfully");

      return {
        agentState: state.agentState,
        error: undefined
      };
    } catch (error: any) {
      return {
        error: `Initialization failed: ${error.message}`,
        shouldStop: true
      };
    }
  }

  private async analyzeStateNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log("🔍 Analyzing current state...");
    
    try {
      const statusResult = await state.debuggerInstance.getStatus();
      if (!statusResult.success) {
        throw new Error(`Failed to get status: ${statusResult.error}`);
      }

      const historyResult = await state.debuggerInstance.getHistory(10);
      const history = historyResult.success ? (historyResult.history || []) : [];

      const llmResponse = await state.llmService.determineNextAction(
        statusResult.status,
        history,
        state.agentState.getState().debuggingGoal
      );

      state.agentState.setLastLLMResponse(llmResponse);
      state.agentState.updateConfidence(llmResponse.confidence);

      console.log(`🤖 AI Decision: ${llmResponse.action} (confidence: ${llmResponse.confidence})`);
      console.log(`📝 Reasoning: ${llmResponse.reasoning}`);

      return {
        lastLLMResponse: llmResponse,
        agentState: state.agentState
      };
    } catch (error: any) {
      return {
        error: `Analysis failed: ${error.message}`,
        lastLLMResponse: null
      };
    }
  }

  private async executeActionNode(state: GraphState): Promise<Partial<GraphState>> {
    const llmResponse = state.lastLLMResponse as LLMActionResponse;
    console.log(`🎯 Executing action: ${llmResponse.action}`);
    
    try {
      let result: any;
      
      switch (llmResponse.action) {
        case "set_breakpoint":
          result = await state.debuggerInstance.setBreakpoint(
            llmResponse.parameters?.file!,
            llmResponse.parameters?.lineNumber!,
            llmResponse.parameters?.condition,
            llmResponse.parameters?.hitCount
          );
          break;
          
        case "remove_breakpoint":
          result = await state.debuggerInstance.removeBreakpoint(llmResponse.parameters?.breakpointKey!);
          break;
          
        case "clear_breakpoints":
          result = await state.debuggerInstance.clearAllBreakpoints();
          break;
          
        case "enable_breakpoints":
          result = await state.debuggerInstance.enableBreakpoints();
          break;
          
        case "disable_breakpoints":
          result = await state.debuggerInstance.disableBreakpoints();
          break;
          
        case "resume":
          result = await state.debuggerInstance.resume();
          break;
          
        case "step_over":
          result = await state.debuggerInstance.stepOver();
          break;
          
        case "step_in":
          result = await state.debuggerInstance.stepIn();
          break;
          
        case "step_out":
          result = await state.debuggerInstance.stepOut();
          break;
          
        case "run_without_breakpoints":
          result = await state.debuggerInstance.runWithoutBreakpoints();
          break;
          
        case "evaluate_expression":
          result = await state.debuggerInstance.evaluateExpression(llmResponse.parameters?.expression!);
          break;
          
        case "watch_variable":
          result = await state.debuggerInstance.watchVariable(llmResponse.parameters?.variableName!);
          break;
          
        case "unwatch_variable":
          result = await state.debuggerInstance.unwatchVariable(llmResponse.parameters?.variableName);
          break;
          
        case "get_scope":
          result = await state.debuggerInstance.getScope();
          break;
          
        case "get_source_context":
          result = await state.debuggerInstance.getSourceContext(llmResponse.parameters?.lines);
          break;
          
        case "get_status":
          result = await state.debuggerInstance.getStatus();
          break;
          
        case "get_history":
          result = await state.debuggerInstance.getHistory(llmResponse.parameters?.limit);
          break;
          
        case "start_profiling":
          result = await state.debuggerInstance.startProfiling();
          break;
          
        case "stop_profiling":
          result = await state.debuggerInstance.stopProfiling();
          break;
          
        case "collect_garbage":
          result = await state.debuggerInstance.collectGarbage();
          break;
          
        case "analyze_state":
        case "wait_for_pause":
          // No-op actions for analysis/waiting
          result = { success: true, result: "Analysis/wait completed" };
          break;
          
        default:
          result = { success: false, error: `Unknown action: ${llmResponse.action}` };
      }

      // Record the action
      state.agentState.recordAction(
        llmResponse.action,
        llmResponse.parameters,
        result,
        llmResponse.reasoning
      );

      // Update state based on action results
      if (result.success && llmResponse.action === "get_scope" && result.scopes) {
        this.analyzeScopes(result.scopes, state.agentState);
      }

      if (result.success && llmResponse.action === "evaluate_expression" && result.result) {
        console.log(`📊 Evaluation result: ${JSON.stringify(result.result.value)}`);
      }

      return {
        agentState: state.agentState,
        error: undefined
      };
    } catch (error: any) {
      return {
        error: `Action execution failed: ${error.message}`,
        agentState: state.agentState
      };
    }
  }

  private async evaluateProgressNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log("📈 Evaluating progress...");
    
    const llmResponse = state.lastLLMResponse as LLMActionResponse;
    const agentState = state.agentState.getState();
    
    // Check if LLM wants to stop
    if (llmResponse.stop_agent) {
      console.log("🛑 LLM requested to stop agent");
      return { shouldStop: true };
    }
    
    // Check stop conditions
    const debuggerStop = state.debuggerInstance.shouldStopDebugging();
    if (debuggerStop.shouldStop) {
      console.log(`🛑 Debugger stop condition: ${debuggerStop.reason}`);
      return { shouldStop: true };
    }
    
    const historyStop = state.agentState.shouldStopBasedOnHistory();
    if (historyStop) {
      console.log("🛑 History-based stop condition triggered");
      return { shouldStop: true };
    }
    
    // Check iteration limit
    if (state.iterationCount >= this.maxIterations) {
      console.log("🛑 Maximum iterations reached");
      return { shouldStop: true };
    }
    
    // Check if debugging goal might be achieved
    if (this.isGoalLikelyAchieved(agentState)) {
      console.log("🎯 Debugging goal likely achieved");
      return { shouldStop: true };
    }
    
    return {
      iterationCount: state.iterationCount + 1,
      shouldStop: false
    };
  }

  private async handleErrorNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log(`❌ Handling error: ${state.error}`);
    
    // Record error in state
    state.agentState.addIssue(`Error: ${state.error}`);
    
    // Try to recover by going back to analysis
    if (state.iterationCount < this.maxIterations) {
      console.log("🔄 Attempting recovery...");
      return {
        error: undefined,
        lastLLMResponse: null
      };
    }
    
    // Too many errors, stop
    return {
      shouldStop: true,
      error: `Too many errors: ${state.error}`
    };
  }

  private async stopAgentNode(state: GraphState): Promise<Partial<GraphState>> {
    console.log("🛑 Stopping debugging agent...");
    
    const summary = state.agentState.getSummary();
    console.log("📊 Session Summary:", summary);
    
    // Disconnect debugger
    await state.debuggerInstance.disconnect();
    state.agentState.deactivate();
    
    return {
      shouldStop: true,
      agentState: state.agentState
    };
  }

  // Conditional edge functions
  private initializeCondition(state: GraphState) {
    if (state.error) {
      return "handle_error";
    }
    return "analyze_state";
  }

  private analysisCondition(state: GraphState) {
    if (state.error) {
      return "handle_error";
    }
    if (!state.lastLLMResponse) {
      return "handle_error";
    }
    return "execute_action";
  }

  private actionCondition(state: GraphState) {
    if (state.error) {
      return "handle_error";
    }
    return "evaluate_progress";
  }

  private progressCondition(state: GraphState) {
    if (state.error) {
      return "handle_error";
    }
    if (state.shouldStop) {
      return "__end__";
    }
    return "analyze_state"; // Loop back for next iteration
  }

  private errorCondition(state: GraphState) {
    if (state.shouldStop || state.iterationCount >= this.maxIterations) {
      return "__end__";
    }
    return "analyze_state"; // Try to recover
  }

  // Helper methods
  private analyzeScopes(scopes: any[], agentState: DebugAgentState) {
    if (!scopes || !Array.isArray(scopes)) return;
    
    for (const scope of scopes) {
      if (!scope.properties || !Array.isArray(scope.properties)) continue;
      
      for (const prop of scope.properties) {
        if (prop.value === null || prop.value === undefined) {
          agentState.addIssue(`Variable ${prop.name} is ${prop.value}`);
        }
        if (prop.value && typeof prop.value === 'string' && prop.value.includes('Error')) {
          agentState.addIssue(`Potential error in variable ${prop.name}: ${prop.value}`);
        }
      }
    }
  }

  private isGoalLikelyAchieved(agentState: AgentState): boolean {
    // Simple heuristic: if we've identified issues and verified facts, goal might be achieved
    const hasIdentifiedIssues = agentState.identifiedIssues.length > 0;
    const hasVerifiedFacts = agentState.verifiedFacts.length > 0;
    const hasReasonableActions = agentState.totalActions >= 5;
    
    return hasIdentifiedIssues && hasVerifiedFacts && hasReasonableActions;
  }

  // Public method to run the graph
  async run(debuggerInstance: AIDebugger, llmService: LLMService, debuggingGoal: string) {
    const agentState = new DebugAgentState(debuggerInstance, debuggingGoal);
    
    const initialState: GraphState = {
      agentState,
      llmService,
      debuggerInstance,
      lastLLMResponse: null,
      shouldStop: false,
      error: undefined,
      iterationCount: 0
    };

    const compiledGraph = this.graph.compile();
    return await compiledGraph.invoke(initialState);
  }
}