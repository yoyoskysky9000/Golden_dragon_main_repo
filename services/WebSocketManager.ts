import WebSocket from 'ws';
import { EventEmitter } from 'events';

// Configuration for the WebSocket Manager
export interface WSManagerConfig {
  url: string;
  heartbeatIntervalMs?: number;
  reconnectDelayMs?: number;
  maxReconnectDelayMs?: number;
}

/**
 * High-performance, fault-tolerant WebSocket Manager for ingesting real-time market data.
 * Designed for low latency, isolated error handling, and memory safety.
 */
export class MarketDataStreamer extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  
  // Heartbeat state
  private pingInterval: NodeJS.Timeout | null = null;
  private pingTimeout: NodeJS.Timeout | null = null;
  private isAlive: boolean = false;
  private heartbeatIntervalMs: number;
  
  // Reconnection state
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentReconnectDelayMs: number;
  private readonly baseReconnectDelayMs: number;
  private readonly maxReconnectDelayMs: number;
  private isShuttingDown: boolean = false;

  constructor(config: WSManagerConfig) {
    super();
    // Optimize EventEmitter for high-throughput (unlimited listeners or defined bounded limit to avoid warning)
    this.setMaxListeners(100);

    this.url = config.url;
    this.heartbeatIntervalMs = config.heartbeatIntervalMs || 30000;
    this.baseReconnectDelayMs = config.reconnectDelayMs || 1000;
    this.maxReconnectDelayMs = config.maxReconnectDelayMs || 30000;
    this.currentReconnectDelayMs = this.baseReconnectDelayMs;
  }

  /**
   * Initializes the connection and sets up event listeners safely.
   */
  public connect(): void {
    if (this.isShuttingDown) return;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      this.clearTimers();
      this.ws = new WebSocket(this.url);
      
      this.ws.on('open', this.onOpen.bind(this));
      this.ws.on('message', this.onMessage.bind(this));
      this.ws.on('close', this.onClose.bind(this));
      this.ws.on('error', this.onError.bind(this));
      this.ws.on('pong', this.onPong.bind(this));

    } catch (err: any) {
      console.error(`[MarketDataStreamer] Initialization failed: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Called when connection is established. Resets backoff and starts heartbeat.
   */
  private onOpen(): void {
    console.log(`[MarketDataStreamer] Connected to ${this.url}`);
    this.isAlive = true;
    this.currentReconnectDelayMs = this.baseReconnectDelayMs; // Reset backoff
    this.startHeartbeat();
    
    // Notify internal subscribers
    this.emit('connected');
  }

  /**
   * High-throughput message handler. Parses safely and emits without blocking.
   */
  private onMessage(data: WebSocket.RawData): void {
    try {
      // Fast path parsing (avoiding complex object overhead where possible)
      // For ultra-high frequency, you might process raw buffers, but JSON is standard here.
      const parsedData = JSON.parse(data.toString());
      
      // Broadcast to internal listeners
      this.emit('data', parsedData);
    } catch (err) {
      // Isolate parsing errors so they don't crash the socket loop
      console.warn(`[MarketDataStreamer] Malformed message received. Cannot parse.`);
    }
  }

  /**
   * Handles close events and triggers reconnection.
   */
  private onClose(code: number, reason: Buffer): void {
    if (this.isShuttingDown) return;
    console.log(`[MarketDataStreamer] Connection closed. Code: ${code}, Reason: ${reason.toString() || 'None'}`);
    this.clearTimers();
    this.emit('disconnected');
    this.scheduleReconnect();
  }

  /**
   * Traps socket-level errors gracefully to prevent process crash.
   */
  private onError(error: Error): void {
    console.error(`[MarketDataStreamer] Socket Error: ${error.message}`);
    // Error is typically followed by a close event, but we can proactively close to be safe
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  /**
   * Heartbeat PONG response handler.
   */
  private onPong(): void {
    this.isAlive = true;
  }

  /**
   * Manages the Ping/Pong heartbeat lifecycle to detect silent dead connections.
   */
  private startHeartbeat(): void {
    this.pingInterval = setInterval(() => {
      // If we haven't received a pong since the last ping, assume dead.
      if (!this.isAlive) {
        console.warn(`[MarketDataStreamer] Heartbeat timeout. Terminating stale connection.`);
        this.ws?.terminate();
        return;
      }

      this.isAlive = false; // Require next pong to set true
      try {
        this.ws?.ping();
      } catch (e) {
        // Safe catch if socket is closing
      }
    }, this.heartbeatIntervalMs);
  }

  /**
   * Exponential backoff for reconnection strategy.
   * Prevents spamming the remote server during outages.
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimer) return;

    console.log(`[MarketDataStreamer] Reconnecting in ${this.currentReconnectDelayMs}ms...`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.currentReconnectDelayMs);

    // Exponentially increase the delay, capped at maxReconnectDelayMs
    this.currentReconnectDelayMs = Math.min(this.currentReconnectDelayMs * 1.5, this.maxReconnectDelayMs);
  }

  /**
   * Cleans up all intervals and timeouts to avoid memory leaks.
   */
  private clearTimers(): void {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.pingTimeout) clearTimeout(this.pingTimeout);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    
    this.pingInterval = null;
    this.pingTimeout = null;
    this.reconnectTimer = null;
  }

  /**
   * Graceful shutdown function to cleanly tear down the manager
   * on SIGTERM or process exit.
   */
  public shutdown(): void {
    console.log(`[MarketDataStreamer] Initiating graceful shutdown...`);
    this.isShuttingDown = true;
    this.clearTimers();
    
    if (this.ws) {
      // Remove generic event listeners to prevent feedback loops during teardown
      this.ws.removeAllListeners('close');
      this.ws.removeAllListeners('message');
      this.ws.removeAllListeners('error');
      
      try {
        this.ws.close(1000, 'Server Shutting Down');
      } catch (err) {
        this.ws.terminate();
      }
      this.ws = null;
    }

    // Clean up internal event listeners
    this.removeAllListeners();
  }
}
