// #!/usr/bin/env node
// import fetch from "node-fetch";
// import CDP from "chrome-remote-interface";
// import readline from "readline";
// import chalk from "chalk";

// // Global state
// let client;
// let lastPausedFrame = null;
// let breakpoints = {};
// let scriptIdToUrl = new Map(); // Track script IDs and their URLs

// // Fetch WebSocket URL from Node inspector
// async function getWebSocketUrl(port = 9269) {
//   const res = await fetch(`http://localhost:${port}/json/list`);
//   const targets = await res.json();
//   if (!targets.length) throw new Error("No debug targets found");
//   return targets[0].webSocketDebuggerUrl;
// }

// // Connect to Node inspector via CDP
// async function connect() {
//   const wsUrl = await getWebSocketUrl();
//   client = await CDP({ target: wsUrl });

//   // Enable Debugger and Runtime
//   await client.Debugger.enable();
//   await client.Runtime.enable();
//   await client.Runtime.runIfWaitingForDebugger();
//   console.log(chalk.green("Connected to Node Inspector via CDP"));

//   // Listen for paused events
//   client.Debugger.paused(async (params) => {
//     lastPausedFrame = params.callFrames[0];
//     const url = lastPausedFrame.url;
//     const line = lastPausedFrame.location.lineNumber;
//     const column = lastPausedFrame.location.columnNumber;
    
//     console.log(chalk.magenta(`\nPaused at ${url}:${line + 1}:${column}`));
//     console.log(chalk.gray("Type 'resume' to continue, 'scope' to inspect variables"));
//   });

//   // Track all parsed scripts
//   client.Debugger.scriptParsed(async ({ scriptId, url }) => {
//     scriptIdToUrl.set(scriptId, url);
    
//     // Apply any pending breakpoints for this script
//     for (const bpKey in breakpoints) {
//       const bp = breakpoints[bpKey];
//       if (url.endsWith(bp.file) && !bp.breakpointId) {
//         try {
//           const result = await client.Debugger.setBreakpoint({
//             location: { 
//               scriptId, 
//               lineNumber: bp.lineNumber, // This should be 0-based
//               columnNumber: bp.columnNumber || 0 
//             },
//           });
          
//           if (result.breakpointId) {
//             bp.breakpointId = result.breakpointId;
//             bp.scriptId = scriptId;
//             console.log(
//               chalk.green(`✓ Breakpoint applied at ${bp.file}:${bp.lineNumber + 1}`)
//             );
//           }
//         } catch (err) {
//           console.log(chalk.yellow(`⚠ Could not set breakpoint at ${bp.file}:${bp.lineNumber + 1} - ${err.message}`));
//         }
//       }
//     }
//   });
// }

// // Set breakpoint immediately if script is loaded, or queue it
// async function setBreakpointNow(file, lineNumber) {
//   const bpKey = `${file}:${lineNumber}`;
  
//   // Convert to 0-based for CDP
//   const lineNumber0Based = lineNumber - 1;
  
//   // Look for already loaded scripts that match this file
//   for (const [scriptId, url] of scriptIdToUrl.entries()) {
//     if (url.endsWith(file)) {
//       try {
//         const result = await client.Debugger.setBreakpoint({
//           location: { 
//             scriptId, 
//             lineNumber: lineNumber0Based, 
//             columnNumber: 0 
//           },
//         });
        
//         if (result.breakpointId) {
//           breakpoints[bpKey] = {
//             file,
//             lineNumber: lineNumber0Based,
//             breakpointId: result.breakpointId,
//             scriptId: scriptId
//           };
//           console.log(chalk.green(`✓ Breakpoint set at ${file}:${lineNumber}`));
//           return true;
//         }
//       } catch (err) {
//         console.log(chalk.yellow(`⚠ Could not set breakpoint: ${err.message}`));
//         return false;
//       }
//     }
//   }
  
//   // If script not found, queue the breakpoint
//   breakpoints[bpKey] = {
//     file,
//     lineNumber: lineNumber0Based,
//     breakpointId: null
//   };
//   console.log(chalk.yellow(`⏳ Breakpoint scheduled at ${file}:${lineNumber} (script not loaded yet)`));
//   return true;
// }

// // CLI commands
// function startCli() {
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//     prompt: chalk.cyan("dbg> "),
//   });

//   rl.prompt();

//   rl.on("line", async (line) => {
//     const [cmd, ...args] = line.trim().split(" ");
//     if (!cmd) return rl.prompt();

//     try {
//       switch (cmd) {
//         case "exit":
//           await client.close();
//           rl.close();
//           return;

//         case "resume":
//         case "c":
//           if (!lastPausedFrame) {
//             console.log(chalk.red("Cannot resume: Node is not paused yet"));
//             break;
//           }
//           await client.Debugger.resume();
//           lastPausedFrame = null;
//           console.log(chalk.gray("Resumed execution"));
//           break;

//         case "stepOver":
//         case "n":
//           if (!lastPausedFrame) {
//             console.log(chalk.red("Cannot step: Node is not paused"));
//             break;
//           }
//           await client.Debugger.stepOver();
//           break;

//         case "stepIn":
//         case "s":
//           if (!lastPausedFrame) {
//             console.log(chalk.red("Cannot step: Node is not paused"));
//             break;
//           }
//           await client.Debugger.stepInto();
//           break;

//         case "stepOut":
//         case "o":
//           if (!lastPausedFrame) {
//             console.log(chalk.red("Cannot step: Node is not paused"));
//             break;
//           }
//           await client.Debugger.stepOut();
//           break;

//         case "setBreakpoint":
//         case "b": {
//           const [file, lineStr] = args;
//           if (!file || !lineStr) {
//             console.log("Usage: setBreakpoint <file> <lineNumber>");
//             break;
//           }
//           const lineNumber = parseInt(lineStr, 10);
//           if (isNaN(lineNumber) || lineNumber < 1) {
//             console.log(chalk.red("Line number must be a positive integer"));
//             break;
//           }
//           await setBreakpointNow(file, lineNumber);
//           break;
//         }

//         case "breakpoints":
//         case "bl":
//           console.log(chalk.blue("\nActive Breakpoints:"));
//           if (Object.keys(breakpoints).length === 0) {
//             console.log("  No breakpoints set");
//           } else {
//             Object.entries(breakpoints).forEach(([bpKey, bp]) => {
//               const status = bp.breakpointId ? chalk.green("✓ active") : chalk.yellow("⏳ pending");
//               console.log(`  ${bpKey} ${status}`);
//             });
//           }
//           break;

//         case "removeBreakpoint":
//         case "rb": {
//           const [bpKey] = args;
//           if (!breakpoints[bpKey]) {
//             console.log(chalk.red("Breakpoint not found"));
//             break;
//           }
//           const bp = breakpoints[bpKey];
//           if (bp.breakpointId) {
//             await client.Debugger.removeBreakpoint({ breakpointId: bp.breakpointId });
//           }
//           delete breakpoints[bpKey];
//           console.log(chalk.green(`Breakpoint removed: ${bpKey}`));
//           break;
//         }

//         case "scope":
//         case "p":
//           if (!lastPausedFrame) {
//             console.log(chalk.red("No paused frame. Hit a breakpoint first."));
//             break;
//           }
//           for (const scope of lastPausedFrame.scopeChain) {
//             const objectId = scope.object.objectId;
//             if (!objectId) continue;
//             const props = await client.Runtime.getProperties({ 
//               objectId, 
//               ownProperties: true,
//               generatePreview: true 
//             });
//             console.log(chalk.green(`\n--- ${scope.type.toUpperCase()} SCOPE ---`));
//             for (const prop of props.result) {
//               if (prop.value) {
//                 const value = prop.value.value ?? 
//                              prop.value.description ?? 
//                              (prop.value.type === 'function' ? '[Function]' : 
//                               prop.value.type === 'object' ? '[Object]' : '[Unknown]');
//                 console.log(`${chalk.cyan(prop.name)}: ${chalk.white(value)}`);
//               }
//             }
//           }
//           break;

//         default:
//           console.log(chalk.red("Unknown command:", cmd));
//           console.log(chalk.gray("Available commands: resume(c), stepOver(n), stepIn(s), stepOut(o), setBreakpoint(b), breakpoints(bl), removeBreakpoint(rb), scope(p), exit"));
//       }
//     } catch (err) {
//       console.log(chalk.red("Error executing command:", err.message));
//     }

//     rl.prompt();
//   });
// }

// // Main
// (async () => {
//   try {
//     await connect();
//     startCli();
//   } catch (err) {
//     console.error(chalk.red("Failed to start debugger:", err));
//     process.exit(1);
//   }
// })();






// #!/usr/bin/env node
import fetch from "node-fetch";
import CDP from "chrome-remote-interface";
import readline from "readline";
import chalk from "chalk";
import fs from "fs";

// Global state
let client;
let lastPausedFrame = null;
let breakpoints = {};
let scriptIdToUrl = new Map();
let isPaused = false;
let breakpointsEnabled = true;
let watchpoints = new Map();
let executionHistory = [];
let sourceMaps = new Map();
let conditionalBreakpoints = new Map();
let hitCountBreakpoints = new Map();
let lastEvaluationResult = null;

// Configuration
const CONFIG = {
  maxHistory: 100,
  maxWatchpoints: 20,
  enableSourceMaps: true
};

// Fetch WebSocket URL from Node inspector
async function getWebSocketUrl(port = 9269) {
  const res = await fetch(`http://localhost:${port}/json/list`);
  const targets = await res.json();
  if (!targets.length) throw new Error("No debug targets found");
  return targets[0].webSocketDebuggerUrl;
}

// Connect to Node inspector via CDP
async function connect() {
  const wsUrl = await getWebSocketUrl();
  client = await CDP({ target: wsUrl });

  // Enable necessary domains
  await client.Debugger.enable();
  await client.Runtime.enable();
  await client.Profiler.enable();
  await client.Runtime.runIfWaitingForDebugger();
  
  console.log(chalk.green("✓ Connected to Node Inspector via CDP"));
  console.log(chalk.gray("Type 'help' for available commands"));

  // Listen for paused events
  client.Debugger.paused(async (params) => {
    isPaused = true;
    lastPausedFrame = params.callFrames[0];
    const url = lastPausedFrame.url;
    const line = lastPausedFrame.location.lineNumber;
    const column = lastPausedFrame.location.columnNumber;
    
    // Add to execution history
    executionHistory.push({
      url,
      line: line + 1,
      column,
      timestamp: Date.now(),
      reason: params.reason
    });
    
    if (executionHistory.length > CONFIG.maxHistory) {
      executionHistory.shift();
    }
    
    console.log(chalk.magenta(`\n⏸️  Paused at ${url}:${line + 1}:${column} (${params.reason})`));
    
    // Show source code context
    await showSourceContext(url, line);
    
    console.log(chalk.gray("Type 'help' for available commands"));
  });

  // Listen for resumed events
  client.Debugger.resumed(() => {
    isPaused = false;
    lastPausedFrame = null;
    console.log(chalk.gray("→ Execution resumed"));
  });

  // Track all parsed scripts
  client.Debugger.scriptParsed(async ({ scriptId, url, sourceMapURL }) => {
    scriptIdToUrl.set(scriptId, url);
    
    if (sourceMapURL && CONFIG.enableSourceMaps) {
      sourceMaps.set(url, sourceMapURL);
    }
    
    // Apply any pending breakpoints for this script
    await applyBreakpointsToScript(scriptId, url);
  });

  // Handle console API calls
  client.Runtime.consoleAPICalled(({ type, args, stackTrace }) => {
    const messages = args.map(arg => arg.value || arg.description || '');
    const prefix = chalk.blue('[CONSOLE]');
    console.log(prefix, ...messages);
  });

  // Handle exceptions
  client.Runtime.exceptionThrown(({ exceptionDetails }) => {
    console.log(chalk.red('💥 Exception:'), exceptionDetails.exception?.description || 'Unknown exception');
  });
}

// Apply breakpoints to a specific script
async function applyBreakpointsToScript(scriptId, url) {
  for (const bpKey in breakpoints) {
    const bp = breakpoints[bpKey];
    if (url.endsWith(bp.file) && !bp.breakpointId) {
      try {
        // Check conditional breakpoint
        if (bp.condition) {
          conditionalBreakpoints.set(bp.breakpointId, bp.condition);
        }
        
        // Check hit count breakpoint
        if (bp.hitCount) {
          hitCountBreakpoints.set(bp.breakpointId, { current: 0, target: bp.hitCount });
        }
        
        const result = await client.Debugger.setBreakpoint({
          location: { 
            scriptId, 
            lineNumber: bp.lineNumber,
            columnNumber: bp.columnNumber || 0 
          },
        });
        
        if (result.breakpointId) {
          bp.breakpointId = result.breakpointId;
          bp.scriptId = scriptId;
          console.log(
            chalk.green(`✓ Breakpoint applied at ${bp.file}:${bp.lineNumber + 1}`)
          );
        }
      } catch (err) {
        console.log(chalk.yellow(`⚠ Could not set breakpoint at ${bp.file}:${bp.lineNumber + 1} - ${err.message}`));
      }
    }
  }
}

// Show source code context around current line
async function showSourceContext(url, currentLine, contextLines = 5) {
  try {
    // Try to get source from file system first
    let sourceCode = null;
    const filePath = url.replace('file://', '');
    
    if (fs.existsSync(filePath)) {
      sourceCode = fs.readFileSync(filePath, 'utf8').split('\n');
    } else {
      // Fallback to CDP
      const scriptSource = await client.Debugger.getScriptSource({ scriptId: lastPausedFrame.location.scriptId });
      sourceCode = scriptSource.scriptSource.split('\n');
    }
    
    if (sourceCode) {
      console.log(chalk.cyan(`\nSource: ${url}`));
      console.log(chalk.cyan('─'.repeat(80)));
      
      const start = Math.max(0, currentLine - contextLines);
      const end = Math.min(sourceCode.length - 1, currentLine + contextLines);
      
      for (let i = start; i <= end; i++) {
        const line = sourceCode[i];
        const lineNum = i + 1;
        if (i === currentLine) {
          console.log(chalk.magenta(`→ ${lineNum.toString().padStart(4)} │ ${line}`));
        } else {
          console.log(chalk.gray(`  ${lineNum.toString().padStart(4)} │ ${line}`));
        }
      }
      console.log(chalk.cyan('─'.repeat(80)));
    }
  } catch (err) {
    // Silently fail if we can't get source
  }
}

// Set breakpoint immediately if script is loaded, or queue it
async function setBreakpointNow(file, lineNumber, condition = null, hitCount = null) {
  const bpKey = `${file}:${lineNumber}`;
  const lineNumber0Based = lineNumber - 1;
  
  // Look for already loaded scripts that match this file
  for (const [scriptId, url] of scriptIdToUrl.entries()) {
    if (url.endsWith(file)) {
      try {
        const result = await client.Debugger.setBreakpoint({
          location: { 
            scriptId, 
            lineNumber: lineNumber0Based, 
            columnNumber: 0 
          },
        });
        
        if (result.breakpointId) {
          breakpoints[bpKey] = {
            file,
            lineNumber: lineNumber0Based,
            breakpointId: result.breakpointId,
            scriptId: scriptId,
            condition,
            hitCount
          };
          
          if (condition) {
            conditionalBreakpoints.set(result.breakpointId, condition);
          }
          if (hitCount) {
            hitCountBreakpoints.set(result.breakpointId, { current: 0, target: hitCount });
          }
          
          console.log(chalk.green(`✓ Breakpoint set at ${file}:${lineNumber}`));
          return true;
        }
      } catch (err) {
        console.log(chalk.yellow(`⚠ Could not set breakpoint: ${err.message}`));
        return false;
      }
    }
  }
  
  // If script not found, queue the breakpoint
  breakpoints[bpKey] = {
    file,
    lineNumber: lineNumber0Based,
    breakpointId: null,
    condition,
    hitCount
  };
  console.log(chalk.yellow(`⏳ Breakpoint scheduled at ${file}:${lineNumber} (script not loaded yet)`));
  return true;
}

// Evaluate expression in current context
async function evaluateExpression(expression) {
  if (!lastPausedFrame) {
    console.log(chalk.red("No paused context to evaluate expression"));
    return null;
  }
  
  try {
    const result = await client.Runtime.evaluate({
      expression: expression,
      returnByValue: false,
      generatePreview: true,
      contextId: lastPausedFrame.callFrameId
    });
    
    lastEvaluationResult = result;
    
    if (result.exceptionDetails) {
      console.log(chalk.red(`Evaluation error: ${result.exceptionDetails.text}`));
      return null;
    }
    
    return result.result;
  } catch (err) {
    console.log(chalk.red(`Evaluation failed: ${err.message}`));
    return null;
  }
}

// Advanced debugging commands
function startCli() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan("dbg> "),
  });

  // Command history
  let commandHistory = [];
  let historyIndex = -1;

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmedLine = line.trim();
    if (trimmedLine) {
      commandHistory.push(trimmedLine);
      historyIndex = commandHistory.length;
    }

    const [cmd, ...args] = trimmedLine.split(" ");
    if (!cmd) {
      rl.prompt();
      return;
    }

    try {
      switch (cmd) {
        case "exit":
        case "quit":
          console.log(chalk.yellow("Disconnecting from debugger..."));
          await client.close();
          rl.close();
          return;

        case "resume":
        case "c":
          if (!isPaused) {
            console.log(chalk.red("Cannot resume: Not paused"));
            break;
          }
          await client.Debugger.resume();
          break;

        case "stepOver":
        case "n":
          if (!isPaused) {
            console.log(chalk.red("Cannot step: Not paused"));
            break;
          }
          await client.Debugger.stepOver();
          break;

        case "stepIn":
        case "s":
          if (!isPaused) {
            console.log(chalk.red("Cannot step: Not paused"));
            break;
          }
          await client.Debugger.stepInto();
          break;

        case "stepOut":
        case "o":
          if (!isPaused) {
            console.log(chalk.red("Cannot step: Not paused"));
            break;
          }
          await client.Debugger.stepOut();
          break;

        case "setBreakpoint":
        case "b": {
          const [file, lineStr, condition, hitCount] = args;
          if (!file || !lineStr) {
            console.log("Usage: setBreakpoint <file> <lineNumber> [condition] [hitCount]");
            break;
          }
          const lineNumber = parseInt(lineStr, 10);
          if (isNaN(lineNumber) || lineNumber < 1) {
            console.log(chalk.red("Line number must be a positive integer"));
            break;
          }
          await setBreakpointNow(file, lineNumber, condition, hitCount ? parseInt(hitCount) : null);
          break;
        }

        case "breakpoints":
        case "bl":
          console.log(chalk.blue("\n📌 Active Breakpoints:"));
          if (Object.keys(breakpoints).length === 0) {
            console.log("  No breakpoints set");
          } else {
            Object.entries(breakpoints).forEach(([bpKey, bp]) => {
              const status = bp.breakpointId ? chalk.green("✓ active") : chalk.yellow("⏳ pending");
              const condition = bp.condition ? chalk.yellow(` [if: ${bp.condition}]`) : '';
              const hitCount = bp.hitCount ? chalk.cyan(` [hit: ${bp.hitCount}]`) : '';
              console.log(`  ${bpKey} ${status}${condition}${hitCount}`);
            });
          }
          break;

        case "removeBreakpoint":
        case "rb": {
          const [bpKey] = args;
          if (!breakpoints[bpKey]) {
            console.log(chalk.red("Breakpoint not found"));
            break;
          }
          const bp = breakpoints[bpKey];
          if (bp.breakpointId) {
            await client.Debugger.removeBreakpoint({ breakpointId: bp.breakpointId });
            conditionalBreakpoints.delete(bp.breakpointId);
            hitCountBreakpoints.delete(bp.breakpointId);
          }
          delete breakpoints[bpKey];
          console.log(chalk.green(`✓ Breakpoint removed: ${bpKey}`));
          break;
        }

        case "clearAllBreakpoints":
        case "cab":
          for (const bpKey in breakpoints) {
            const bp = breakpoints[bpKey];
            if (bp.breakpointId) {
              await client.Debugger.removeBreakpoint({ breakpointId: bp.breakpointId });
            }
          }
          breakpoints = {};
          conditionalBreakpoints.clear();
          hitCountBreakpoints.clear();
          console.log(chalk.green("✓ All breakpoints cleared"));
          break;

        case "disableBreakpoints":
        case "breakoff":
          breakpointsEnabled = false;
          await client.Debugger.setBreakpointsActive({ active: false });
          console.log(chalk.yellow("⏸️  All breakpoints disabled"));
          break;

        case "enableBreakpoints":
        case "breakon":
          breakpointsEnabled = true;
          await client.Debugger.setBreakpointsActive({ active: true });
          console.log(chalk.green("▶️  All breakpoints enabled"));
          break;

        case "scope":
        case "p": {
          if (!lastPausedFrame) {
            console.log(chalk.red("No paused frame. Hit a breakpoint first."));
            break;
          }
          
          const [variable] = args;
          if (variable) {
            // Show specific variable
            const result = await evaluateExpression(variable);
            if (result) {
              console.log(chalk.cyan(`${variable} =`), chalk.white(JSON.stringify(result.value, null, 2)));
            }
          } else {
            // Show all scopes
            for (const scope of lastPausedFrame.scopeChain) {
              const objectId = scope.object.objectId;
              if (!objectId) continue;
              const props = await client.Runtime.getProperties({ 
                objectId, 
                ownProperties: true,
                generatePreview: true 
              });
              console.log(chalk.green(`\n--- ${scope.type.toUpperCase()} SCOPE ---`));
              for (const prop of props.result) {
                if (prop.value && prop.enumerable) {
                  const value = prop.value.value ?? 
                               prop.value.description ?? 
                               (prop.value.type === 'function' ? '[Function]' : 
                                prop.value.type === 'object' ? '[Object]' : '[Unknown]');
                  console.log(`  ${chalk.cyan(prop.name)}: ${chalk.white(value)}`);
                }
              }
            }
          }
          break;
        }

        case "eval":
        case "e": {
          const expression = args.join(' ');
          if (!expression) {
            console.log("Usage: eval <expression>");
            break;
          }
          const result = await evaluateExpression(expression);
          if (result) {
            console.log(chalk.cyan("Result:"), chalk.white(JSON.stringify(result.value, null, 2)));
          }
          break;
        }

        case "watch": {
          const [variable] = args;
          if (!variable) {
            console.log("Usage: watch <variableName>");
            break;
          }
          if (watchpoints.size >= CONFIG.maxWatchpoints) {
            console.log(chalk.red(`Too many watchpoints. Maximum is ${CONFIG.maxWatchpoints}`));
            break;
          }
          watchpoints.set(variable, true);
          console.log(chalk.green(`✓ Watching variable: ${variable}`));
          break;
        }

        case "unwatch": {
          const [variable] = args;
          if (!variable) {
            // Show all watchpoints
            console.log(chalk.blue("\n👀 Active Watchpoints:"));
            if (watchpoints.size === 0) {
              console.log("  No watchpoints set");
            } else {
              watchpoints.forEach((_, key) => console.log(`  ${key}`));
            }
            break;
          }
          if (watchpoints.has(variable)) {
            watchpoints.delete(variable);
            console.log(chalk.green(`✓ Stopped watching: ${variable}`));
          } else {
            console.log(chalk.red("Watchpoint not found"));
          }
          break;
        }

        case "history":
        case "h":
          console.log(chalk.blue("\n📜 Execution History:"));
          executionHistory.slice(-10).forEach((entry, index) => {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            console.log(chalk.gray(`  ${index + 1}. ${time} - ${entry.url}:${entry.line} (${entry.reason})`));
          });
          break;

        case "backtrace":
        case "bt":
          if (!lastPausedFrame) {
            console.log(chalk.red("No paused frame"));
            break;
          }
          console.log(chalk.blue("\n🔄 Call Stack:"));
          // Note: In CDP, callFrames are available in paused event
          console.log(chalk.gray("  Call stack inspection requires full stack trace from paused event"));
          break;

        case "source":
        case "src": {
          const [lineStr] = args;
          const contextLines = lineStr ? parseInt(lineStr) : 5;
          if (lastPausedFrame) {
            await showSourceContext(
              lastPausedFrame.url, 
              lastPausedFrame.location.lineNumber, 
              contextLines
            );
          } else {
            console.log(chalk.red("Not paused at a breakpoint"));
          }
          break;
        }

        case "runWithoutBreakpoints":
        case "rwb":
          const wasEnabled = breakpointsEnabled;
          breakpointsEnabled = false;
          await client.Debugger.setBreakpointsActive({ active: false });
          console.log(chalk.yellow("🏃 Running without breakpoints..."));
          await client.Debugger.resume();
          
          // Re-enable after a delay to catch the next pause
          setTimeout(async () => {
            breakpointsEnabled = wasEnabled;
            await client.Debugger.setBreakpointsActive({ active: wasEnabled });
          }, 1000);
          break;

        case "profile":
          console.log(chalk.yellow("📊 Starting CPU profiling..."));
          await client.Profiler.start();
          break;

        case "profileStop":
          console.log(chalk.yellow("📊 Stopping CPU profiling..."));
          const profile = await client.Profiler.stop();
          console.log(chalk.cyan("Profile data collected. Save to file to analyze."));
          break;

        case "gc":
          await client.HeapProfiler.collectGarbage();
          console.log(chalk.green("🗑️  Garbage collection triggered"));
          break;

        case "status":
          console.log(chalk.blue("\n📊 Debugger Status:"));
          console.log(`  State: ${isPaused ? chalk.magenta('Paused') : chalk.green('Running')}`);
          console.log(`  Breakpoints: ${Object.keys(breakpoints).length} (${breakpointsEnabled ? 'enabled' : 'disabled'})`);
          console.log(`  Watchpoints: ${watchpoints.size}`);
          console.log(`  Scripts loaded: ${scriptIdToUrl.size}`);
          console.log(`  History entries: ${executionHistory.length}`);
          break;

        case "help":
        case "?":
          showHelp();
          break;

        case "up":
          if (historyIndex > 0) {
            historyIndex--;
            rl.line = commandHistory[historyIndex];
            rl.cursor = rl.line.length;
            rl.output.write('\x1b[2K\r');
            rl.output.write(rl._prompt + rl.line);
          }
          break;

        case "down":
          if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            rl.line = commandHistory[historyIndex];
            rl.cursor = rl.line.length;
            rl.output.write('\x1b[2K\r');
            rl.output.write(rl._prompt + rl.line);
          } else {
            historyIndex = commandHistory.length;
            rl.line = '';
            rl.cursor = 0;
            rl.output.write('\x1b[2K\r');
            rl.output.write(rl._prompt);
          }
          break;

        default:
          console.log(chalk.red("Unknown command:", cmd));
          console.log(chalk.gray("Type 'help' for available commands"));
      }
    } catch (err) {
      console.log(chalk.red("Error executing command:", err.message));
    }

    rl.prompt();
  });

  // Handle Ctrl+C to not exit but show prompt
  rl.on('SIGINT', () => {
    console.log(chalk.yellow("\nUse 'exit' to quit the debugger"));
    rl.prompt();
  });
}

function showHelp() {
  console.log(chalk.blue("\n🛠️  Debugger Commands:"));
  console.log(chalk.cyan("\nExecution Control:"));
  console.log("  resume, c        - Continue execution");
  console.log("  stepOver, n      - Step over next function call");
  console.log("  stepIn, s        - Step into next function call");
  console.log("  stepOut, o       - Step out of current function");
  console.log("  rwb              - Run without breakpoints temporarily");
  
  console.log(chalk.cyan("\nBreakpoints:"));
  console.log("  b <file> <line> [cond] [count] - Set breakpoint");
  console.log("  bl                             - List breakpoints");
  console.log("  rb <bpKey>                     - Remove breakpoint");
  console.log("  cab                            - Clear all breakpoints");
  console.log("  breakoff                       - Disable all breakpoints");
  console.log("  breakon                        - Enable all breakpoints");
  
  console.log(chalk.cyan("\nInspection:"));
  console.log("  scope, p [var]   - Show variables in scope");
  console.log("  eval, e <expr>   - Evaluate expression");
  console.log("  watch <var>      - Add variable watch");
  console.log("  unwatch [var]    - Remove or list watchpoints");
  console.log("  src [lines]      - Show source code context");
  
  console.log(chalk.cyan("\nInformation:"));
  console.log("  history, h       - Show execution history");
  console.log("  backtrace, bt    - Show call stack");
  console.log("  status           - Show debugger status");
  console.log("  profile          - Start CPU profiling");
  console.log("  profileStop      - Stop CPU profiling");
  console.log("  gc               - Trigger garbage collection");
  
  console.log(chalk.cyan("\nNavigation:"));
  console.log("  up               - Previous command in history");
  console.log("  down             - Next command in history");
  console.log("  help, ?          - Show this help");
  console.log("  exit, quit       - Exit debugger");
}

// Main
(async () => {
  try {
    await connect();
    startCli();
  } catch (err) {
    console.error(chalk.red("Failed to start debugger:"), err);
    process.exit(1);
  }
})();