import { z } from "zod";
import { AIDebugger } from "./ai-debugger";

// Zod schemas for agent state
export const AgentStateSchema = z.object({
  // Debugger instance
  debuggerInstance: z.instanceof(AIDebugger),
  
  // Session information
  sessionId: z.string(),
  debuggingGoal: z.string(),
  isActive: z.boolean(),
  
  // Current state
  currentStep: z.string(),
  lastAction: z.string().optional(),
  lastActionResult: z.any().optional(),
  
  // History and tracking
  actionHistory: z.array(z.object({
    timestamp: z.number(),
    action: z.string(),
    parameters: z.any().optional(),
    result: z.any().optional(),
    reasoning: z.string().optional()
  })),
  
  // Analysis state
  identifiedIssues: z.array(z.string()),
  hypotheses: z.array(z.string()),
  verifiedFacts: z.array(z.string()),
  
  // Performance metrics
  startTime: z.number(),
  totalActions: z.number(),
  breakpointsHit: z.number(),
  
  // LLM context
  lastLLMResponse: z.any().optional(),
  confidenceHistory: z.array(z.number()),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export class DebugAgentState {
  private state: AgentState;

  constructor(debuggerInstance: AIDebugger, debuggingGoal: string) {
    this.state = {
      debuggerInstance,
      sessionId: this.generateSessionId(),
      debuggingGoal,
      isActive: true,
      currentStep: "initialize",
      actionHistory: [],
      identifiedIssues: [],
      hypotheses: [],
      verifiedFacts: [],
      startTime: Date.now(),
      totalActions: 0,
      breakpointsHit: 0,
      confidenceHistory: [],
    };
  }

  private generateSessionId(): string {
    return `debug-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // State updates
  recordAction(action: string, parameters: any, result: any, reasoning?: string) {
    this.state.actionHistory.push({
      timestamp: Date.now(),
      action,
      parameters,
      result,
      reasoning
    });
    
    this.state.lastAction = action;
    this.state.lastActionResult = result;
    this.state.totalActions++;
    
    // Track breakpoints hit
    if (action === "resume" && result?.success && this.state.lastActionResult?.reason === "Breakpoint") {
      this.state.breakpointsHit++;
    }
  }

  addIssue(issue: string) {
    if (!this.state.identifiedIssues.includes(issue)) {
      this.state.identifiedIssues.push(issue);
    }
  }

  addHypothesis(hypothesis: string) {
    if (!this.state.hypotheses.includes(hypothesis)) {
      this.state.hypotheses.push(hypothesis);
    }
  }

  addVerifiedFact(fact: string) {
    if (!this.state.verifiedFacts.includes(fact)) {
      this.state.verifiedFacts.push(fact);
    }
  }

  updateConfidence(confidence: number) {
    this.state.confidenceHistory.push(confidence);
    // Keep only last 20 confidence values
    if (this.state.confidenceHistory.length > 20) {
      this.state.confidenceHistory.shift();
    }
  }

  setCurrentStep(step: string) {
    this.state.currentStep = step;
  }

  setLastLLMResponse(response: any) {
    this.state.lastLLMResponse = response;
  }

  deactivate() {
    this.state.isActive = false;
  }

  // State queries
  getState(): AgentState {
    return { ...this.state };
  }

  getSummary() {
    const duration = Date.now() - this.state.startTime;
    return {
      sessionId: this.state.sessionId,
      duration: `${Math.round(duration / 1000)}s`,
      totalActions: this.state.totalActions,
      breakpointsHit: this.state.breakpointsHit,
      issuesIdentified: this.state.identifiedIssues.length,
      hypothesesTested: this.state.hypotheses.length,
      factsVerified: this.state.verifiedFacts.length,
      currentStep: this.state.currentStep,
      isActive: this.state.isActive,
      averageConfidence: this.state.confidenceHistory.length > 0 
        ? this.state.confidenceHistory.reduce((a, b) => a + b, 0) / this.state.confidenceHistory.length 
        : 0
    };
  }

  shouldStopBasedOnHistory(): boolean {
    // Stop if too many actions without progress
    if (this.state.totalActions > 50) {
      return true;
    }
    
    // Stop if same action repeated too many times
    const recentActions = this.state.actionHistory.slice(-10);
    if (recentActions.length >= 5) {
      const lastAction = recentActions[recentActions.length - 1].action;
      const sameActionCount = recentActions.filter(a => a.action === lastAction).length;
      if (sameActionCount >= 5) {
        return true;
      }
    }
    
    // Stop if confidence consistently low
    if (this.state.confidenceHistory.length >= 10) {
      const lowConfidenceCount = this.state.confidenceHistory.filter(c => c < 0.3).length;
      if (lowConfidenceCount >= 8) {
        return true;
      }
    }
    
    return false;
  }

  getRecentActions(limit: number = 5) {
    return this.state.actionHistory.slice(-limit);
  }

  // Validation
  validateState() {
    return AgentStateSchema.parse(this.state);
  }
}