// src/index.ts
import { config } from 'dotenv';
import { AIDebugger } from './ai-debugger';
import { LLMService } from './llm-service';
import { DebuggingStateGraph } from './state-graph';

// Load environment variables from .env file
config();

async function main() {
  const debuggingGoal = process.argv[2] || process.env.DEFAULT_DEBUG_GOAL || "Find and fix the memory leak in the application";
  
  console.log("🤖 Starting AI Debugging Agent...");
  console.log(`🎯 Goal: ${debuggingGoal}`);
  
  // Check for required environment variables first
  if (!process.env.GROQ_API_KEY) {
    console.error("❌ GROQ_API_KEY environment variable is required");
    console.error("Please set GROQ_API_KEY in your .env file or environment variables");
    console.error("Copy env.example to .env and fill in your API key");
    process.exit(1);
  }
  
  const debuggerInstance = new AIDebugger();
  const llmService = new LLMService(process.env.GROQ_API_KEY);
  const stateGraph = new DebuggingStateGraph();
  
  try {
    const result = await stateGraph.run(debuggerInstance, llmService, debuggingGoal);
    console.log("✅ Debugging session completed:", result.agentState.getSummary());
  } catch (error) {
    console.error("❌ Debugging session failed:", error);
    process.exit(1);
  }
}

main();