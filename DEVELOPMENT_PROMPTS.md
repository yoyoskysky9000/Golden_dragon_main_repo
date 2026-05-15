# Golden Dragon: AI & Architecture Prompt Matrix
**Extracted from Platform Research Paper & Roadmap**

---

## 🧠 1. Core Extraction & Technical Reality

### The Important Concepts
*   **Decentralized Intelligence**: Features like Bot Lab, Master Bot View, and Strategy Explorer suggest an environment where users can backtest and deploy custom or AI-driven trading bots.
*   **Unified Abstraction**: Using CCXT to standardize multi-exchange API communication in order to provide seamless Smart Order Routing and Copy Trading UI.
*   **Frictionless but Secure Onboarding**: Balancing retail-friendly 1-click Google OAuth with rigorous progressive KYC, AML, and 2FA to match fidelity/Robinhood standards.
*   **Real-time Decisioning**: Architecture moving from 5-second polling limits to near real-time WebSocket pipelines for orderbook/ticker data.

### What Actually Matters Technically
*   **Execution Latency:** Dropping 5s interval polling. You need WebSocket (`wss://`) native integrations on the backend pumping ticks over a unified multiplexed socket to the React frontend.
*   **Transactional Integrity:** A true `/api/order` endpoint interacting with CCXT that handles partial fills, slippage calculations, and atomicity when writing to Firestore (using `existsAfter` or admin transactions).
*   **State Management:** Multi-exchange caching (Redis/Memory) in the backend to prevent hitting rate limits across Binance, Kraken, and Coinbase APIs simultaneously.
*   **Progressive Security:** Transitioning from basic Firebase Auth to requiring Firebase multi-factor authentication (MFA) before execution.

### Hype vs. Useful
*   *Hype*: "Multi-agent hedge fund bot swarms" running entirely on the client, or AI predicting short-term tick movements using raw LLMs.
*   *Useful*: Background worker queues (Redis/BullMQ) securely running user-defined CCXT strategies (Algorithms), and LLMs parsing Fed Transcripts or Social Sentiment asynchronously to create macro signals (Data Marketplace).

### Concrete Implementation Ideas
1.  **WebSocket Migration:** Swap `Yahoo V8 API` polling for CCXT's `watchTicker()` WebSocket integration inside `server.ts`. Push standard JSON to the React app.
2.  **Charting Upgrade:** Migrate `StockChart.tsx` from static `recharts` to TradingView's `lightweight-charts` for WebGL-accelerated panning, zooming, and drawing.
3.  **Order Pipeline:** Create a strict, validated `/api/order/execute` backend route. Use Firestore Admin to deduct virtual balance -> Call CCXT `createOrder` -> Await response -> Update Firestore P&L.
4.  **Auth Hardening:** Implement a Firebase Phone Auth step (`signInWithPhoneNumber`) in `AccountDashboard.tsx` before allowing an API key to be stored in the vault.

---

## 🛠️ 2. High-Quality Prompts by Category

### Architecture Improvement Prompts
*   **For Gemini in VS Code / Cursor:**
    > "Refactor `server.ts` to implement CCXT WebSocket streaming (`watchTicker` and `watchOrderBook`) for the symbols 'BTC/USD' and 'ETH/USD'. Broadcast this data to connected React clients via `socket.io`. Ensure we handle exchange rate-limits and socket disconnections gracefully with exponential backoff."
*   **For Multi-Agent / Antigravity Workflows:**
    > "@workspace Review the current single-threaded `server.ts`. Propose a Dockerized microservice architecture separating the WebSocket price ingestor, the CCXT execution engine, and the REST API. Write a `docker-compose.yml` that includes a Redis instance for message brokering between these services."

### AI Trading Strategy Prompts
*   **For OpenAI Codex-style Agents / Cursor:**
    > "In `components/BotLab.tsx`, implement a backtesting UI that allows users to write a JS script (eval'd safely or parsed) representing a strategy. On the backend in `BacktestModule.ts`, write a function that loops over historical klines (OHLCV fetched from CCXT) and calculates hypothetical PnL, max drawdown, and win rate based on moving average crossovers."
*   **For Crypto Bots / Python Wrappers:**
    > "Generate a Python microservice that uses `ta-lib` and `ccxt`. It should subscribe to Binance futures, calculate the 14-period RSI on 1m candles in real-time, and execute a trailing stop-loss order when RSI drops below 30. Provide the endpoint that the Node.js backend can ping to activate this bot."

### UI/UX Enhancement Prompts
*   **For Gemini in VS Code:**
    > "Rewrite `StockChart.tsx` to use the `@kurkle/color` and `lightweight-charts` library. It should accept an array of OHLCV data as props. Add an interactive tooltip that displays the Open, High, Low, Close, and Volume when hovering over a specific candle, similar to Interactive Brokers."
*   **For Cursor:**
    > "Create a new file `OrderTicket.tsx`. Implement a highly dense, professional trading panel similar to Fidelity's Active Trader Pro. Include an asset selector, order type dropdown (Market, Limit, Stop), a Quantity slider (0-100% of buying power), and a large 'Execute' button. Calculate and display structural slippage before submission."

### Backend Optimization Prompts
*   **For Antigravity Workflows:**
    > "/execute Find all instances of standard `setInterval` polling in `server.ts` and `services/mockMarket.ts`. Replace them with an event-driven architecture using `EventEmitter`. Ensure that API keys stored in Firestore are decrypted strictly in memory using a backend environment secret before passing them to the CCXT initializer."
*   **For Docker/DigitalOcean Deployments:**
    > "Create a GitHub Actions pipeline (`.github/workflows/deploy.yml`) that builds the Vite React frontend and Node.js backend into a single lean Docker container. Push the image to DigitalOcean Container Registry and execute a `kubectl rollout restart` command for the production cluster."

### Profit-Focused Experimentation Prompts
*   **For Kalshi Prediction Bots / Streamlit Dashboards:**
    > "Write a Streamlit dashboard (Python) that consumes the Golden Dragon API and the Kalshi API. Plot the implied probability of a Fed rate cut alongside the current Golden Dragon BTC/USD orderbook depth. Add a module that calculates theoretical arbitrage or correlation coefficients between the two."
*   **For Cursor / Crypto Bots:**
    > "Implement the logic in `SmartOrderRouter.tsx` and the corresponding backend route to query an order size of 10 BTC. Query the CCXT order books of Binance, Kraken, and Coinbase simultaneously. Write an algorithm that splits the 10 BTC order proportionally across the exchanges to achieve the absolute lowest average slippage cost."

### Autonomous Agent Prompts
*   **For Multi-Agent Systems:**
    > "System Configuration: You are the 'Master Bot' in Golden Dragon. Read the `security_spec.md` and current user portfolio from Firestore. If the user's risk profile allows, use the `ccxt` plugin to rebalance exactly 5% of their USDC into high-momentum altcoins. Present the trade rationale in markdown format to `components/AIAssistant.tsx`."

### Data Pipeline & Model-Training Prompts
*   **For Google Gemini / OpenAI Agents:**
    > "Create a data pipeline script `fetch_training_data.js`. Use CCXT to download 1 year of 1-hour OHLCV data for the top 50 cryptocurrencies by volume. Clean the data (fill missing candles, normalize volume), calculate RSI, MACD, and Bollinger Bands, and export the resulting dataset as a partitioned Parquet file for model training."

---

## 🎯 3. Implementation Checklists by Platform

### 🛠 Visual Studio Code / Cursor Rules
Add this to your `.cursorrules` or `.vscode/settings.json` to enforce architecture standards:
```json
{
  "rules": [
    "Never use setInterval for price data; default to Socket.io or WebSocket streams.",
    "Order execution logic MUST reside in the Node.js backend, never CCXT direct-from-client.",
    "Charts must use canvas/webgl based rendering (lightweight-charts) for performance.",
    "Always enforce type-checking on CCXT API responses using Zod or TS interfaces."
  ]
}
```

### 🚢 Docker / DigitalOcean Production Setup
*   **Strategy:** Multi-stage Dockerfile
    *   *Stage 1:* Build Vite frontend (`npm run build`).
    *   *Stage 2:* Compile TypeScript backend (`esbuild`).
    *   *Stage 3:* Distroless Node environment serving static assets + Express API.
*   **Prompt:** `"Write a multi-stage Dockerfile mimicking the DigitalOcean App Platform spec for a monorepo Express+Vite setup. Bind to port 8080."`

### 🔒 Firebase Security & Compliance
*   **Strategy:** Update `firestore.rules`.
*   **Prompt:** `"Review my firestore.rules. Enforce that document IDs in the /orders/{orderId} collection match a strict regex. Add a rule ensuring that only users with a 'KYC_VERIFIED' custom claim can write an order where 'assetType' is 'crypto', preventing shadow-status bypasses."`
