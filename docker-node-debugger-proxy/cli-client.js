// import WebSocket from 'ws';
// import readline from 'readline';
// import { log } from './utils/logger.js';

// const ws = new WebSocket('ws://localhost:8080');

// // Setup readline interface
// const rl = readline.createInterface({
//   input: process.stdin,
//   output: process.stdout,
//   prompt: 'dbg> '
// });

// // Keep track of when the prompt is active
// let promptActive = false;

// // Function to safely print messages and re-display prompt
// function printResponse(message) {
//   if (promptActive) {
//     // Move cursor to new line before printing
//     process.stdout.clearLine();
//     process.stdout.cursorTo(0);
//   }
//   log('Response:', message);
//   if (promptActive) {
//     rl.prompt(true); // Redisplay prompt
//   }
// }

// // WebSocket events
// ws.on('open', () => {
//   log('Connected to Debug Proxy Server');
//   promptActive = true;
//   rl.prompt();
// });

// ws.on('message', (msg) => {
//   printResponse(msg.toString());
// });

// ws.on('close', () => {
//   printResponse('Disconnected from Debug Proxy Server');
//   process.exit(0);
// });

// ws.on('error', (err) => {
//   printResponse('WebSocket error: ' + err.message);
// });

// // Readline input handling
// rl.on('line', (line) => {
//   const trimmed = line.trim();
//   if (trimmed === 'exit') {
//     ws.close();
//     rl.close();
//     return;
//   }

//   let msg = trimmed;
//   try {
//     msg = JSON.parse(trimmed); // Try parsing JSON
//   } catch {
//     // keep as string
//   }

//   try {
//     ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
//   } catch (err) {
//     printResponse('Failed to send command: ' + err.message);
//   }

//   rl.prompt();
// });






















// import WebSocket from 'ws';
// import readline from 'readline';
// import { log } from './utils/logger.js';

// const ws = new WebSocket('ws://localhost:8080');

// let lastCallFrameId = null;  // store paused frame
// let breakpoints = {};        // store breakpoints by id

// ws.on('open', () => {
//   log('Connected to Debug Proxy Server');

//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//     prompt: 'dbg> '
//   });

//   rl.prompt();

//   rl.on('line', async (line) => {
//     const trimmed = line.trim();
//     const [cmd, ...args] = trimmed.split(' ');

//     switch (cmd) {
//       case 'exit':
//         ws.close();
//         rl.close();
//         return;

//       case 'resume':
//         ws.send(JSON.stringify({ id: Date.now(), method: 'Debugger.resume' }));
//         break;

//       case 'stepOver':
//         ws.send(JSON.stringify({ id: Date.now(), method: 'Debugger.stepOver' }));
//         break;

//       case 'stepIn':
//         ws.send(JSON.stringify({ id: Date.now(), method: 'Debugger.stepInto' }));
//         break;

//       case 'stepOut':
//         ws.send(JSON.stringify({ id: Date.now(), method: 'Debugger.stepOut' }));
//         break;

//       case 'breakpoint': {
//         const [file, lineStr] = args;
//         const lineNumber = parseInt(lineStr, 10);
//         const id = Date.now();
//         ws.send(JSON.stringify({
//           id,
//           method: 'Debugger.setBreakpointByUrl',
//           params: { url: `file://${file}`, lineNumber, columnNumber: 0 }
//         }));
//         breakpoints[id] = `${file}:${lineNumber}`;
//         break;
//       }

//       case 'removeBreakpoint': {
//         const bpId = args[0];
//         ws.send(JSON.stringify({
//           id: Date.now(),
//           method: 'Debugger.removeBreakpoint',
//           params: { breakpointId: bpId }
//         }));
//         breakpoints[bpId] && delete breakpoints[bpId];
//         break;
//       }

//       case 'scope':
//         if (!lastCallFrameId) {
//           log('No paused frame to inspect. Hit a breakpoint first.');
//           break;
//         }
//         ws.send(JSON.stringify({
//           id: Date.now(),
//           method: 'Debugger.getProperties',
//           params: { callFrameId: lastCallFrameId }
//         }));
//         break;

//       default:
//         try {
//           // send raw JSON if possible
//           const msg = JSON.parse(trimmed);
//           ws.send(JSON.stringify(msg));
//         } catch {
//           log(`Unknown command: ${cmd}`);
//         }
//         break;
//     }

//     rl.prompt();
//   });
// });

// ws.on('message', (msg) => {
//   const data = JSON.parse(msg.toString());
//   log('Response:', JSON.stringify(data, null, 2));

//   // automatically update last paused frame
//   if (data.method === 'Debugger.paused') {
//     lastCallFrameId = data.params.callFrames[0].callFrameId;
//     log('Paused at:', data.params.callFrames[0].location);
//   }
// });

// ws.on('close', () => log('Disconnected from Debug Proxy Server'));
// ws.on('error', (err) => log('WebSocket error:', err.message));














// import WebSocket from 'ws';
// import readline from 'readline';
// import chalk from 'chalk';
// import { log } from './utils/logger.js';

// const ws = new WebSocket('ws://localhost:8080');

// let lastCallFrameId = null;  // Store paused frame
// let breakpoints = {};        // Store breakpoints by id
// let idCounter = 1;           // Incremental integer id for JSON-RPC

// // Function to send commands with proper integer id
// function sendCommand(method, params = {}) {
//   const id = idCounter++;
//   const message = JSON.stringify({ id, method, params });
//   ws.send(message);
//   log(chalk.blue(`[Sent] ${method}`));
//   return id;
// }

// function printResponse(data) {
//   console.log(chalk.yellow('\n======= Debugger Response ======='));
//   console.log(chalk.white(JSON.stringify(data, null, 2)));
//   console.log(chalk.yellow('=================================\n'));
// }

// ws.on('open', () => {
//   log(chalk.green('Connected to Debug Proxy Server'));

//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//     prompt: chalk.cyan('dbg> ')
//   });

//   rl.prompt();

//   rl.on('line', async (line) => {
//     const trimmed = line.trim();
//     if (!trimmed) {
//       rl.prompt();
//       return;
//     }

//     const [cmd, ...args] = trimmed.split(' ');

//     switch (cmd) {
//       case 'exit':
//         ws.close();
//         rl.close();
//         return;

//       case 'enable':
//         sendCommand('Debugger.enable');
//         break;

//       case 'resume':
//         sendCommand('Debugger.resume');
//         break;

//       case 'stepOver':
//         sendCommand('Debugger.stepOver');
//         break;

//       case 'stepIn':
//         sendCommand('Debugger.stepInto');
//         break;

//       case 'stepOut':
//         sendCommand('Debugger.stepOut');
//         break;

//       case 'setBreakpoint': {
//         const [file, lineStr] = args;
//         if (!file || !lineStr) {
//           log(chalk.red('Usage: setBreakpoint <file> <lineNumber>'));
//           break;
//         }
//         const lineNumber = parseInt(lineStr, 10);
//         const id = sendCommand('Debugger.setBreakpointByUrl', {
//           url: `file://${file}`,
//           lineNumber,
//           columnNumber: 0
//         });
//         breakpoints[id] = `${file}:${lineNumber}`;
//         log(chalk.green(`Setting breakpoint at ${file}:${lineNumber}`));
//         break;
//       }

//       case 'removeBreakpoint': {
//         const [bpId] = args;
//         if (!bpId) {
//           log(chalk.red('Usage: removeBreakpoint <breakpointId>'));
//           break;
//         }
//         sendCommand('Debugger.removeBreakpoint', { breakpointId: bpId });
//         breakpoints[bpId] && delete breakpoints[bpId];
//         log(chalk.green(`Removed breakpoint ${bpId}`));
//         break;
//       }

//       case 'scope':
//         if (!lastCallFrameId) {
//           log(chalk.red('No paused frame to inspect. Hit a breakpoint first.'));
//           break;
//         }
//         sendCommand('Debugger.getProperties', { callFrameId: lastCallFrameId });
//         break;

//       default:
//         try {
//           const msg = JSON.parse(trimmed);
//           ws.send(JSON.stringify(msg));
//         } catch {
//           log(chalk.red(`Unknown command: ${cmd}`));
//         }
//         break;
//     }

//     rl.prompt();
//   });
// });

// ws.on('message', (msg) => {
//   const data = JSON.parse(msg.toString());
//   printResponse(data);

//   // Automatically update last paused frame
//   if (data.method === 'Debugger.paused') {
//     lastCallFrameId = data.params.callFrames[0].callFrameId;
//     log(chalk.magenta(`Paused at: ${data.params.callFrames[0].location.scriptId} line ${data.params.callFrames[0].location.lineNumber}`));
//   }
// });

// ws.on('close', () => log(chalk.red('Disconnected from Debug Proxy Server')));
// ws.on('error', (err) => log(chalk.red('WebSocket error:', err.message)));








import WebSocket from 'ws';
import readline from 'readline';
import chalk from 'chalk';
import { log } from './utils/logger.js';

const ws = new WebSocket('ws://localhost:8080');

let lastPausedFrame = null;   // Store paused callFrame info
let breakpoints = {};         // Store breakpoints by id
let idCounter = 1;            // Incremental integer id for JSON-RPC
let pendingScopeRequests = {}; // Track scope requests

// Function to send commands with proper integer id
function sendCommand(method, params = {}) {
  const id = idCounter++;
  const message = JSON.stringify({ id, method, params });
  ws.send(message);
  log(chalk.blue(`[Sent] ${method}`));
  return id;
}

function printResponse(data) {
  console.log(chalk.yellow('\n======= Debugger Response ======='));
  console.log(chalk.white(JSON.stringify(data, null, 2)));
  console.log(chalk.yellow('=================================\n'));
}

function printScope(type, props) {
  console.log(chalk.green(`\n--- ${type.toUpperCase()} SCOPE ---`));
  for (const prop of props) {
    const name = chalk.cyan(prop.name);
    const value = prop.value
      ? chalk.white(`${prop.value.value ?? prop.value.description}`)
      : chalk.gray('<unavailable>');
    console.log(`  ${name}: ${value}`);
  }
}

ws.on('open', () => {
  log(chalk.green('Connected to Debug Proxy Server'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('dbg> ')
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    const [cmd, ...args] = trimmed.split(' ');

    switch (cmd) {
      case 'exit':
        ws.close();
        rl.close();
        return;

      case 'enable':
        sendCommand('Debugger.enable');
        break;

      case 'resume':
        sendCommand('Debugger.resume');
        break;

      case 'stepOver':
        sendCommand('Debugger.stepOver');
        break;

      case 'stepIn':
        sendCommand('Debugger.stepInto');
        break;

      case 'stepOut':
        sendCommand('Debugger.stepOut');
        break;

      case 'setBreakpoint': {
        const [file, lineStr] = args;
        if (!file || !lineStr) {
          log(chalk.red('Usage: setBreakpoint <file> <lineNumber>'));
          break;
        }
        const lineNumber = parseInt(lineStr, 10);
        const id = sendCommand('Debugger.setBreakpointByUrl', {
          url: `file://${file}`,
          lineNumber,
          columnNumber: 0
        });
        breakpoints[id] = `${file}:${lineNumber}`;
        log(chalk.green(`Setting breakpoint at ${file}:${lineNumber}`));
        break;
      }

      case 'removeBreakpoint': {
        const [bpId] = args;
        if (!bpId) {
          log(chalk.red('Usage: removeBreakpoint <breakpointId>'));
          break;
        }
        sendCommand('Debugger.removeBreakpoint', { breakpointId: bpId });
        breakpoints[bpId] && delete breakpoints[bpId];
        log(chalk.green(`Removed breakpoint ${bpId}`));
        break;
      }

      case 'scope':
        if (!lastPausedFrame) {
          log(chalk.red('No paused frame to inspect. Hit a breakpoint first.'));
          break;
        }
        // Fetch variables for each scope in the chain
        for (const scope of lastPausedFrame.scopeChain) {
          const objectId = scope.object.objectId;
          if (!objectId) continue;

          const reqId = sendCommand('Runtime.getProperties', {
            objectId,
            ownProperties: true
          });
          pendingScopeRequests[reqId] = scope.type;
        }
        break;

      default:
        try {
          const msg = JSON.parse(trimmed);
          ws.send(JSON.stringify(msg));
        } catch {
          log(chalk.red(`Unknown command: ${cmd}`));
        }
        break;
    }

    rl.prompt();
  });
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg.toString());

  // Check if this response is for scope variables
  if (pendingScopeRequests[data.id]) {
    const scopeType = pendingScopeRequests[data.id];
    delete pendingScopeRequests[data.id];
    if (data.result && data.result.result) {
      printScope(scopeType, data.result.result);
    }
    return;
  }

  printResponse(data);

  // Automatically update last paused frame
  if (data.method === 'Debugger.paused') {
    lastPausedFrame = data.params.callFrames[0];
    log(
      chalk.magenta(
        `Paused at: ${lastPausedFrame.location.scriptId} line ${lastPausedFrame.location.lineNumber}`
      )
    );
  }
});

ws.on('close', () => log(chalk.red('Disconnected from Debug Proxy Server')));
ws.on('error', (err) => log(chalk.red('WebSocket error:', err.message)));
