#!/usr/bin/env node
import fetch from "node-fetch";
import CDP from "chrome-remote-interface";
import readline from "readline";
import chalk from "chalk";

// Global state
let client;
let lastPausedFrame = null;
let breakpoints = {};
let scriptIdToUrl = new Map(); // Track script IDs and their URLs

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

  // Enable Debugger and Runtime
  await client.Debugger.enable();
  await client.Runtime.enable();
  await client.Runtime.runIfWaitingForDebugger();
  console.log(chalk.green("Connected to Node Inspector via CDP"));

  // Listen for paused events
  client.Debugger.paused(async (params) => {
    lastPausedFrame = params.callFrames[0];
    const url = lastPausedFrame.url;
    const line = lastPausedFrame.location.lineNumber;
    const column = lastPausedFrame.location.columnNumber;
    
    console.log(chalk.magenta(`\nPaused at ${url}:${line + 1}:${column}`));
    console.log(chalk.gray("Type 'resume' to continue, 'scope' to inspect variables"));
  });

  // Track all parsed scripts
  client.Debugger.scriptParsed(async ({ scriptId, url }) => {
    scriptIdToUrl.set(scriptId, url);
    
    // Apply any pending breakpoints for this script
    for (const bpKey in breakpoints) {
      const bp = breakpoints[bpKey];
      if (url.endsWith(bp.file) && !bp.breakpointId) {
        try {
          const result = await client.Debugger.setBreakpoint({
            location: { 
              scriptId, 
              lineNumber: bp.lineNumber, // This should be 0-based
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
  });
}

// Set breakpoint immediately if script is loaded, or queue it
async function setBreakpointNow(file, lineNumber) {
  const bpKey = `${file}:${lineNumber}`;
  
  // Convert to 0-based for CDP
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
            scriptId: scriptId
          };
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
    breakpointId: null
  };
  console.log(chalk.yellow(`⏳ Breakpoint scheduled at ${file}:${lineNumber} (script not loaded yet)`));
  return true;
}

// CLI commands
function startCli() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan("dbg> "),
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const [cmd, ...args] = line.trim().split(" ");
    if (!cmd) return rl.prompt();

    try {
      switch (cmd) {
        case "exit":
          await client.close();
          rl.close();
          return;

        case "resume":
        case "c":
          if (!lastPausedFrame) {
            console.log(chalk.red("Cannot resume: Node is not paused yet"));
            break;
          }
          await client.Debugger.resume();
          lastPausedFrame = null;
          console.log(chalk.gray("Resumed execution"));
          break;

        case "stepOver":
        case "n":
          if (!lastPausedFrame) {
            console.log(chalk.red("Cannot step: Node is not paused"));
            break;
          }
          await client.Debugger.stepOver();
          break;

        case "stepIn":
        case "s":
          if (!lastPausedFrame) {
            console.log(chalk.red("Cannot step: Node is not paused"));
            break;
          }
          await client.Debugger.stepInto();
          break;

        case "stepOut":
        case "o":
          if (!lastPausedFrame) {
            console.log(chalk.red("Cannot step: Node is not paused"));
            break;
          }
          await client.Debugger.stepOut();
          break;

        case "setBreakpoint":
        case "b": {
          const [file, lineStr] = args;
          if (!file || !lineStr) {
            console.log("Usage: setBreakpoint <file> <lineNumber>");
            break;
          }
          const lineNumber = parseInt(lineStr, 10);
          if (isNaN(lineNumber) || lineNumber < 1) {
            console.log(chalk.red("Line number must be a positive integer"));
            break;
          }
          await setBreakpointNow(file, lineNumber);
          break;
        }

        case "breakpoints":
        case "bl":
          console.log(chalk.blue("\nActive Breakpoints:"));
          if (Object.keys(breakpoints).length === 0) {
            console.log("  No breakpoints set");
          } else {
            Object.entries(breakpoints).forEach(([bpKey, bp]) => {
              const status = bp.breakpointId ? chalk.green("✓ active") : chalk.yellow("⏳ pending");
              console.log(`  ${bpKey} ${status}`);
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
          }
          delete breakpoints[bpKey];
          console.log(chalk.green(`Breakpoint removed: ${bpKey}`));
          break;
        }

        case "scope":
        case "p":
          if (!lastPausedFrame) {
            console.log(chalk.red("No paused frame. Hit a breakpoint first."));
            break;
          }
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
              if (prop.value) {
                const value = prop.value.value ?? 
                             prop.value.description ?? 
                             (prop.value.type === 'function' ? '[Function]' : 
                              prop.value.type === 'object' ? '[Object]' : '[Unknown]');
                console.log(`${chalk.cyan(prop.name)}: ${chalk.white(value)}`);
              }
            }
          }
          break;

        default:
          console.log(chalk.red("Unknown command:", cmd));
          console.log(chalk.gray("Available commands: resume(c), stepOver(n), stepIn(s), stepOut(o), setBreakpoint(b), breakpoints(bl), removeBreakpoint(rb), scope(p), exit"));
      }
    } catch (err) {
      console.log(chalk.red("Error executing command:", err.message));
    }

    rl.prompt();
  });
}

// Main
(async () => {
  try {
    await connect();
    startCli();
  } catch (err) {
    console.error(chalk.red("Failed to start debugger:", err));
    process.exit(1);
  }
})();