#!/usr/bin/env node
import fetch from "node-fetch";
import CDP from "chrome-remote-interface";
import { z } from "zod";

// Zod schemas for validation
export const BreakpointSchema = z.object({
  file: z.string(),
  lineNumber: z.number(),
  condition: z.string().optional().nullable(),
  hitCount: z.number().optional().nullable(),
});

export const EvaluationResultSchema = z.object({
  success: z.boolean(),
  result: z.any().nullable(),
  error: z.string().optional(),
});

// Main debugger class for AI agent
export class AIDebugger {
  private client: any;
  private state = {
    isPaused: false,
    lastPausedFrame: null as any,
    breakpoints: {} as Record<string, any>,
    scriptIdToUrl: new Map<string, string>(),
    breakpointsEnabled: true,
    watchpoints: new Set<string>(),
    executionHistory: [] as any[],
    conditionalBreakpoints: new Map<string, string>(),
    hitCountBreakpoints: new Map<string, { current: number; target: number }>(),
    isConnected: false,
  };

  private readonly CONFIG = {
    maxHistory: 100,
    maxWatchpoints: 20,
    port: 9269,
  };

  // Connection management
  async connect(port?: number): Promise<{ success: boolean; error?: string }> {
    try {
      const wsUrl = await this.getWebSocketUrl(port);
      this.client = await CDP({ target: wsUrl });

      await this.client.Debugger.enable();
      await this.client.Runtime.enable();
      await this.client.Profiler.enable();
      await this.client.Runtime.runIfWaitingForDebugger();

      this.setupEventListeners();
      this.state.isConnected = true;

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async disconnect(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.client) {
        await this.client.close();
        this.state.isConnected = false;
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async getWebSocketUrl(port?: number): Promise<string> {
    const targetPort = port || this.CONFIG.port;
    const res = await fetch(`http://localhost:${targetPort}/json/list`);
    const targets = await res.json() as any[];
    if (!targets.length) throw new Error("No debug targets found");
    return targets[0].webSocketDebuggerUrl;
  }

  private setupEventListeners() {
    this.client.Debugger.paused(async (params: any) => {
      this.state.isPaused = true;
      this.state.lastPausedFrame = params.callFrames[0];
      
      this.state.executionHistory.push({
        url: this.state.lastPausedFrame.url,
        line: this.state.lastPausedFrame.location.lineNumber + 1,
        column: this.state.lastPausedFrame.location.columnNumber,
        timestamp: Date.now(),
        reason: params.reason,
      });

      if (this.state.executionHistory.length > this.CONFIG.maxHistory) {
        this.state.executionHistory.shift();
      }
    });

    this.client.Debugger.resumed(() => {
      this.state.isPaused = false;
      this.state.lastPausedFrame = null;
    });

    this.client.Debugger.scriptParsed(async ({ scriptId, url }: any) => {
      this.state.scriptIdToUrl.set(scriptId, url);
      await this.applyBreakpointsToScript(scriptId, url);
    });

    this.client.Runtime.consoleAPICalled(({ args }: any) => {
      const messages = args.map((arg: any) => arg.value || arg.description || '');
      console.log('[TARGET]', ...messages);
    });

    this.client.Runtime.exceptionThrown(({ exceptionDetails }: any) => {
      console.log('Exception:', exceptionDetails.exception?.description);
    });
  }

  // Core debugging actions
  async setBreakpoint(file: string, lineNumber: number, condition?: string, hitCount?: number): Promise<{ success: boolean; breakpointId?: string; error?: string }> {
    try {
      const bpKey = `${file}:${lineNumber}`;
      const lineNumber0Based = lineNumber - 1;

      for (const [scriptId, url] of this.state.scriptIdToUrl.entries()) {
        if (url.endsWith(file)) {
          const result = await this.client.Debugger.setBreakpoint({
            location: { 
              scriptId, 
              lineNumber: lineNumber0Based, 
              columnNumber: 0 
            },
          });

          if (result.breakpointId) {
            this.state.breakpoints[bpKey] = {
              file,
              lineNumber: lineNumber0Based,
              breakpointId: result.breakpointId,
              scriptId: scriptId,
              condition,
              hitCount
            };

            if (condition) {
              this.state.conditionalBreakpoints.set(result.breakpointId, condition);
            }
            if (hitCount) {
              this.state.hitCountBreakpoints.set(result.breakpointId, { current: 0, target: hitCount });
            }

            return { success: true, breakpointId: result.breakpointId };
          }
        }
      }

      this.state.breakpoints[bpKey] = {
        file,
        lineNumber: lineNumber0Based,
        breakpointId: null,
        condition,
        hitCount
      };

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async removeBreakpoint(breakpointKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.state.breakpoints[breakpointKey]) {
        return { success: false, error: "Breakpoint not found" };
      }

      const bp = this.state.breakpoints[breakpointKey];
      if (bp.breakpointId) {
        await this.client.Debugger.removeBreakpoint({ breakpointId: bp.breakpointId });
        this.state.conditionalBreakpoints.delete(bp.breakpointId);
        this.state.hitCountBreakpoints.delete(bp.breakpointId);
      }

      delete this.state.breakpoints[breakpointKey];
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async clearAllBreakpoints(): Promise<{ success: boolean; error?: string }> {
    try {
      for (const bpKey in this.state.breakpoints) {
        const bp = this.state.breakpoints[bpKey];
        if (bp.breakpointId) {
          await this.client.Debugger.removeBreakpoint({ breakpointId: bp.breakpointId });
        }
      }

      this.state.breakpoints = {};
      this.state.conditionalBreakpoints.clear();
      this.state.hitCountBreakpoints.clear();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async enableBreakpoints(): Promise<{ success: boolean; error?: string }> {
    try {
      this.state.breakpointsEnabled = true;
      await this.client.Debugger.setBreakpointsActive({ active: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async disableBreakpoints(): Promise<{ success: boolean; error?: string }> {
    try {
      this.state.breakpointsEnabled = false;
      await this.client.Debugger.setBreakpointsActive({ active: false });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async resume(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.state.isPaused) {
        return { success: false, error: "Cannot resume: Not paused" };
      }

      await this.client.Debugger.resume();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async stepOver(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.state.isPaused) {
        return { success: false, error: "Cannot step: Not paused" };
      }

      await this.client.Debugger.stepOver();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async stepIn(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.state.isPaused) {
        return { success: false, error: "Cannot step: Not paused" };
      }

      await this.client.Debugger.stepInto();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async stepOut(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.state.isPaused) {
        return { success: false, error: "Cannot step: Not paused" };
      }

      await this.client.Debugger.stepOut();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async runWithoutBreakpoints(): Promise<{ success: boolean; error?: string }> {
    try {
      const wasEnabled = this.state.breakpointsEnabled;
      this.state.breakpointsEnabled = false;
      await this.client.Debugger.setBreakpointsActive({ active: false });

      if (this.state.isPaused) {
        await this.client.Debugger.resume();
      }

      setTimeout(async () => {
        this.state.breakpointsEnabled = wasEnabled;
        await this.client.Debugger.setBreakpointsActive({ active: wasEnabled });
      }, 2000);

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async evaluateExpression(expression: string): Promise<{ success: boolean; result?: any; error?: string }> {
    try {
      if (!this.state.lastPausedFrame) {
        return { success: false, error: "No paused context to evaluate expression" };
      }

      const result = await this.client.Runtime.evaluate({
        expression: expression,
        returnByValue: true,
        generatePreview: true,
        contextId: this.state.lastPausedFrame.callFrameId
      });

      if (result.exceptionDetails) {
        return { success: false, error: `Evaluation error: ${result.exceptionDetails.text}` };
      }

      return { success: true, result: result.result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async watchVariable(variableName: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.state.watchpoints.size >= this.CONFIG.maxWatchpoints) {
        return { success: false, error: `Too many watchpoints. Maximum is ${this.CONFIG.maxWatchpoints}` };
      }

      this.state.watchpoints.add(variableName);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async unwatchVariable(variableName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (variableName) {
        if (this.state.watchpoints.has(variableName)) {
          this.state.watchpoints.delete(variableName);
          return { success: true };
        } else {
          return { success: false, error: "Watchpoint not found" };
        }
      } else {
        this.state.watchpoints.clear();
        return { success: true };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getScope(): Promise<{ success: boolean; scopes?: any[]; error?: string }> {
    try {
      if (!this.state.lastPausedFrame) {
        return { success: false, error: "No paused frame" };
      }

      const scopes: any[] = [];
      for (const scope of this.state.lastPausedFrame.scopeChain) {
        const objectId = scope.object.objectId;
        if (!objectId) continue;

        const props = await this.client.Runtime.getProperties({ 
          objectId, 
          ownProperties: true,
          generatePreview: true 
        });

        const scopeData = {
          type: scope.type,
          properties: props.result.map((prop: any) => ({
            name: prop.name,
            value: prop.value?.value ?? prop.value?.description ?? prop.value?.type,
            enumerable: prop.enumerable
          }))
        };

        scopes.push(scopeData);
      }

      return { success: true, scopes };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getSourceContext(lines: number = 5): Promise<{ success: boolean; source?: string[]; error?: string }> {
    try {
      if (!this.state.lastPausedFrame) {
        return { success: false, error: "Not paused at a breakpoint" };
      }

      const scriptSource = await this.client.Debugger.getScriptSource({ 
        scriptId: this.state.lastPausedFrame.location.scriptId 
      });
      const sourceCode = scriptSource.scriptSource.split('\n');
      
      const currentLine = this.state.lastPausedFrame.location.lineNumber;
      const start = Math.max(0, currentLine - lines);
      const end = Math.min(sourceCode.length - 1, currentLine + lines);
      const context = sourceCode.slice(start, end + 1);

      return { success: true, source: context };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getStatus(): Promise<{ success: boolean; status?: any; error?: string }> {
    try {
      const status = {
        isConnected: this.state.isConnected,
        isPaused: this.state.isPaused,
        breakpointsCount: Object.keys(this.state.breakpoints).length,
        breakpointsEnabled: this.state.breakpointsEnabled,
        watchpointsCount: this.state.watchpoints.size,
        scriptsLoaded: this.state.scriptIdToUrl.size,
        historyEntries: this.state.executionHistory.length,
        lastPauseLocation: this.state.lastPausedFrame ? {
          url: this.state.lastPausedFrame.url,
          line: this.state.lastPausedFrame.location.lineNumber + 1,
          column: this.state.lastPausedFrame.location.columnNumber
        } : null,
        lastPauseReason: this.state.executionHistory.length > 0 
          ? this.state.executionHistory[this.state.executionHistory.length - 1].reason 
          : null
      };

      return { success: true, status };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getHistory(limit: number = 10): Promise<{ success: boolean; history?: any[]; error?: string }> {
    try {
      const history = this.state.executionHistory.slice(-limit);
      return { success: true, history };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async startProfiling(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.Profiler.start();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async stopProfiling(): Promise<{ success: boolean; profile?: any; error?: string }> {
    try {
      const profile = await this.client.Profiler.stop();
      return { success: true, profile };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async collectGarbage(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.HeapProfiler.collectGarbage();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Helper methods
  private async applyBreakpointsToScript(scriptId: string, url: string) {
    for (const bpKey in this.state.breakpoints) {
      const bp = this.state.breakpoints[bpKey];
      if (url.endsWith(bp.file) && !bp.breakpointId) {
        try {
          const result = await this.client.Debugger.setBreakpoint({
            location: { 
              scriptId, 
              lineNumber: bp.lineNumber,
              columnNumber: bp.columnNumber || 0 
            },
          });

          if (result.breakpointId) {
            bp.breakpointId = result.breakpointId;
            bp.scriptId = scriptId;

            if (bp.condition) {
              this.state.conditionalBreakpoints.set(result.breakpointId, bp.condition);
            }
            if (bp.hitCount) {
              this.state.hitCountBreakpoints.set(result.breakpointId, { current: 0, target: bp.hitCount });
            }
          }
        } catch (err) {
          // Silent fail for AI agent
        }
      }
    }
  }

  // Stop conditions for AI agent
  shouldStopDebugging(): { shouldStop: boolean; reason?: string } {
    if (!this.state.isConnected) {
      return { shouldStop: true, reason: "Debugger disconnected" };
    }

    if (!this.state.isPaused && this.state.executionHistory.length > 10) {
      const lastPause = this.state.executionHistory[this.state.executionHistory.length - 1];
      const timeSinceLastPause = Date.now() - lastPause.timestamp;
      
      if (timeSinceLastPause > 30000) {
        return { shouldStop: true, reason: "No breakpoints hit for 30 seconds" };
      }
    }

    if (this.state.executionHistory.length > 1000) {
      return { shouldStop: true, reason: "Maximum execution history reached" };
    }

    return { shouldStop: false };
  }

  // Get current state for AI decision making
  getCurrentState() {
    return {
      isPaused: this.state.isPaused,
      breakpoints: Object.keys(this.state.breakpoints),
      watchpoints: Array.from(this.state.watchpoints),
      lastPauseReason: this.state.executionHistory.length > 0 
        ? this.state.executionHistory[this.state.executionHistory.length - 1].reason 
        : null,
    };
  }

  // Get all breakpoints
  getBreakpoints(): { success: boolean; breakpoints?: any; error?: string } {
    try {
      return { success: true, breakpoints: this.state.breakpoints };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const aiDebugger = new AIDebugger();