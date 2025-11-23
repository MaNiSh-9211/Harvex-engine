# AI Debugging Agent

An AI-powered debugging agent that uses LangGraph and Groq to automatically debug Node.js applications.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your API key:

```bash
cp env.example .env
```

Edit `.env` and add your Groq API key:

```
GROQ_API_KEY=your_actual_groq_api_key_here
```

### 3. Get Groq API Key

1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key to your `.env` file

### 4. Run the Agent

```bash
# Development mode with hot reload
npm run dev

# Run once
npm run debug

# Build and run production
npm run build
npm start
```

## Usage

```bash
# Run with default goal
npm run debug

# Run with custom debugging goal
npm run debug "Fix the authentication bug in the login flow"
```

## Features

- **Automated Debugging**: AI agent automatically sets breakpoints and analyzes code
- **Chrome DevTools Integration**: Uses Chrome Remote Interface for debugging
- **LLM-Powered Analysis**: Uses Groq's LLM for intelligent debugging decisions
- **State Management**: LangGraph manages the debugging workflow
- **Comprehensive Logging**: Detailed logs of all debugging actions

## Architecture

- `ai-debugger.ts`: Core debugging functionality using Chrome DevTools Protocol
- `llm-service.ts`: Integration with Groq LLM for decision making
- `agent-state.ts`: State management for the debugging session
- `state-graph.ts`: LangGraph workflow orchestration
- `index.ts`: Main entry point

## Requirements

- Node.js >= 18.0.0
- Chrome/Chromium browser for debugging
- Groq API key
