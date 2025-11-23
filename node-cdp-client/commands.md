resume, c        # Continue to next breakpoint
stepOver, n      # Execute next line (step over)
stepIn, s        # Step into function
stepOut, o       # Step out of current function



# Custom Node Debugger — Full CLI Command Reference

This document lists **all commands supported by the custom CLI debugger**.

---

## 1. `help`
**Usage:**  
```
help
```
Shows the list of all available commands.

---

## 2. `exit` / `quit`
**Usage:**  
```
exit
quit
```
**Description:**  
Disconnects from the CDP debugger and closes the CLI.

---

## 3. `resume` / `c`
**Usage:**  
```
resume
c
```
**Description:**  
Resumes program execution after a pause/breakpoint.

**Errors:**  
- “Cannot resume: Not paused” – occurs if code is currently running.

---

## 4. `stepOver` / `n`
**Usage:**  
```
stepOver
n
```
**Description:**  
Executes the next line (skips into functions).

**Errors:**  
- “Cannot step: Not paused”

---

## 5. `stepIn` / `s`
**Usage:**  
```
stepIn
s
```
**Description:**  
Steps into the next function call.

**Errors:**  
- “Cannot step: Not paused”

---

## 6. `stepOut` / `o`
**Usage:**  
```
stepOut
o
```
**Description:**  
Finishes the current function and pauses in the caller.

**Errors:**  
- “Cannot step: Not paused”

---

## 7. `setBreakpoint` / `b`
**Usage:**  
```
setBreakpoint <file> <line> [condition] [hitCount]
b <file> <line> [condition] [hitCount]
```

### Arguments:
| Arg | Meaning |
|-----|---------|
| `file` | File name (must match script URL ending) |
| `line` | 1-based line number |
| `condition` | Optional JS expression |
| `hitCount` | Optional hit count threshold |

### Description:
- If script is already loaded → breakpoint is set immediately.
- If not → breakpoint is scheduled until script loads.
- Supports **conditional breakpoints**.
- Supports **hit-count breakpoints**.

### Examples:
```
b app.js 20
b server.js 55 x > 10
b index.js 100 "" 5
```

---

## 8. `breakpoints` / `bl`
**Usage:**  
```
breakpoints
bl
```

**Description:**  
Shows all breakpoints with:

- active/pending status  
- condition  
- hitCount  

---

## 9. `removeBreakpoint` / `rb`
**Usage:**  
```
removeBreakpoint <file:line>
rb <file:line>
```

Example:
```
rb app.js:22
```

**Description:**  
Deletes the breakpoint and removes internal hit/condition tracking.

---

## 10. `clearAllBreakpoints` / `cab`
**Usage:**  
```
clearAllBreakpoints
cab
```

**Description:**  
Removes **every** breakpoint (active + pending).

---

## 11. `disableBreakpoints` / `breakoff`
**Usage:**  
```
disableBreakpoints
breakoff
```

**Description:**  
Temporarily disables all breakpoints without deleting them.

---

## 12. `enableBreakpoints` / `breakon`
**Usage:**  
```
enableBreakpoints
breakon
```

**Description:**  
Re-enables all breakpoints that were previously disabled.

---

## 13. `scope` / `p`
### Show all variables
```
scope
p
```

### Show specific variable
```
scope <variableName>
p <variableName>
```

**Description:**  
Displays variables from all scopes or prints one variable using runtime evaluation.

---

## 14. `eval` / `e`
**Usage:**  
```
eval <expression>
e <expression>
```

Example:
```
e myVar + 10
e user.name
```

**Description:**  
Evaluates JavaScript code inside the currently paused frame.

**Output:**  
Printed JSON preview.

**Errors:**  
- If not paused → evaluation fails.

---

## 15. Console Output Interception
(Not a command — automatic)

Whenever target program calls:
```
console.log()
console.error()
console.warn()
```

Debugger prints:
```
[CONSOLE] <message>
```

---

## 16. Exception Monitoring
(Not a command — automatic)

Any runtime exception triggers:
```
💥 Exception: <error>
```

---

## 17. Script Source Context (Automatic)
On pause debugger prints:
- file URL  
- line/column  
- surrounding source code with highlight  

---

# Summary Table

| Command | Alias | Purpose |
|--------|--------|---------|
| help | — | Show all commands |
| exit | quit | Close debugger |
| resume | c | Continue execution |
| stepOver | n | Next line |
| stepIn | s | Step into function |
| stepOut | o | Step out of function |
| setBreakpoint | b | Create BP (optional cond + hitcount) |
| breakpoints | bl | List BPs |
| removeBreakpoint | rb | Remove one BP |
| clearAllBreakpoints | cab | Remove all BPs |
| disableBreakpoints | breakoff | Turn off all BPs |
| enableBreakpoints | breakon | Turn BPs back on |
| scope | p | Inspect scope or variable |
| eval | e | Evaluate JS in paused frame |

---

If you want I can generate:

✅ A `.txt` version  
✅ A `.md` version (this one)  
✅ A CLI `--help` auto-generated output  
✅ Or embed this into your actual CLI code  

Just tell me.
