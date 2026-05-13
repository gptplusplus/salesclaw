const API_BASE_URL = import.meta.env.VITE_API_URL || '';

interface ChatResponse {
  response: string;
  thread_id: string;
  actions: any[];
  reasoning?: string;
}

interface OntologyObjectResponse {
  id: string;
  type: string;
  properties: Record<string, any>;
  links: Record<string, any[]>;
  metadata: Record<string, any>;
}

interface SearchResponse {
  results: OntologyObjectResponse[];
  total: number;
  limit: number;
}

interface ActionResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
  code?: string;
  transaction_id: string;
}

interface PendingAction {
  id: string;
  title: string;
  description: string;
  type: string;
  entity_id: string;
  entity_name: string;
  entity_type: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  timestamp: string;
  proposed_by: string;
}

interface StreamChunkData {
  type: 'thinking' | 'answer' | 'done' | 'error' | 'connected';
  content: string;
  thinking: string;
  answer: string;
  thread_id?: string;
}

type StreamCallback = (data: StreamChunkData) => void;

class ApiClient {
  private baseUrl: string;
  private ws: WebSocket | null = null;
  private wsReconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private wsOnMessage: ((data: any) => void) | null = null;
  private wsOnError: ((error: Event) => void) | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = localStorage.getItem('auth_token');
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<{ status: string; name: string; version: string }> {
    return this.request('/health');
  }

  async login(username: string, password: string): Promise<{ access_token: string; token_type: string; user_id: string; display_name: string }> {
    const result = await this.request<{ access_token: string; token_type: string; user_id: string; display_name: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('auth_token', result.access_token);
    localStorage.setItem('user_id', result.user_id);
    return result;
  }

  async register(username: string, password: string, displayName?: string): Promise<{ access_token: string; token_type: string; user_id: string; display_name: string }> {
    const result = await this.request<{ access_token: string; token_type: string; user_id: string; display_name: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password, display_name: displayName }),
    });
    localStorage.setItem('auth_token', result.access_token);
    localStorage.setItem('user_id', result.user_id);
    return result;
  }

  async chat(message: string, userId: string, threadId?: string, context?: Record<string, any>): Promise<ChatResponse> {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        user_id: userId,
        thread_id: threadId,
        context,
      }),
    });
  }

  async chatStream(
    message: string,
    userId: string,
    onChunk: StreamCallback,
    onError: (error: Error) => void,
    threadId?: string,
    context?: Record<string, any>
  ): Promise<void> {
    const url = `${this.baseUrl}/api/chat/stream`;
    const token = localStorage.getItem('auth_token');
    
    console.log('[SSE] Request to:', url);
    console.log('[SSE] Token present:', !!token);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          user_id: userId,
          thread_id: threadId,
          context,
        }),
      });

      console.log('[SSE] Response status:', response.status);
      console.log('[SSE] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.detail || `HTTP ${response.status}`);
      }

      // 使用标准SSE解析方式
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let totalChunks = 0;

      console.log('[SSE] Reader created, starting to read stream...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[SSE] Stream ended. Total chunks:', totalChunks);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // 处理完整的SSE行
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留不完整的最后一行

        for (const line of lines) {
          const trimmedLine = line.trim();
          
          // 跳过空行和注释
          if (!trimmedLine || trimmedLine.startsWith(':')) {
            continue;
          }

          // 解析SSE data字段
          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6).trim();
            
            if (dataStr === '[DONE]') {
              console.log('[SSE] Received [DONE] marker');
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              totalChunks++;
              console.log(`[SSE] Chunk #${totalChunks}: type=${data.type}`);
              onChunk(data);
            } catch (e) {
              console.warn('[SSE] Failed to parse stream data:', dataStr, e);
            }
          }
        }
      }
    } catch (error) {
      console.error('[SSE] Error:', error);
      onError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async getOntologyObjects(objectType?: string): Promise<{ results: any[]; total: number }> {
    const params = objectType ? `?type=${encodeURIComponent(objectType)}` : '';
    return this.request(`/api/ontology/objects${params}`);
  }

  async getOntologyObject(objectType: string, objectId: string, userId: string): Promise<OntologyObjectResponse> {
    return this.request(`/api/ontology/${objectType}/${objectId}?user_id=${userId}`);
  }

  async searchOntologyObjects(
    objectType: string,
    query: string,
    userId: string,
    limit: number = 10
  ): Promise<SearchResponse> {
    return this.request(
      `/api/ontology/${objectType}/search?query=${encodeURIComponent(query)}&limit=${limit}&user_id=${userId}`
    );
  }

  async createOntologyObject(objectType: string, data: Record<string, any>): Promise<any> {
    return this.request(`/api/ontology/${objectType}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOntologyObject(objectType: string, objectId: string, data: Record<string, any>): Promise<any> {
    return this.request(`/api/ontology/${objectType}/${objectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteOntologyObject(objectType: string, objectId: string): Promise<any> {
    return this.request(`/api/ontology/${objectType}/${objectId}`, {
      method: 'DELETE',
    });
  }

  async executeOntologyAction(
    objectType: string,
    objectId: string,
    action: string,
    params: Record<string, any>,
    userId: string
  ): Promise<ActionResponse> {
    return this.request(`/api/ontology/${objectType}/${objectId}/action`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        params,
        user_id: userId,
      }),
    });
  }

  async getPendingActions(userId: string): Promise<PendingAction[]> {
    return this.request(`/api/actions/pending?user_id=${userId}`);
  }

  async approveAction(actionId: string, userId: string): Promise<{ action_id: string; status: string; message: string }> {
    const result = await this.request<{ action_id: string; status: string; message: string }>(`/api/actions/${actionId}/approve`, {
      method: 'POST',
      body: JSON.stringify({
        approved: true,
        user_id: userId,
      }),
    });
    this.request(`/api/actions/${actionId}/execute`, {
      method: 'POST',
    }).catch(() => {});
    return result;
  }

  async rejectAction(actionId: string, userId: string, feedback?: string): Promise<{ action_id: string; status: string; message: string }> {
    return this.request(`/api/actions/${actionId}/reject`, {
      method: 'POST',
      body: JSON.stringify({
        approved: false,
        feedback,
        user_id: userId,
      }),
    });
  }

  async getScenarios(category?: string): Promise<{ results: any[]; total: number }> {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return this.request(`/api/scenarios/${params}`);
  }

  async getScenario(scenarioId: string): Promise<any> {
    return this.request(`/api/scenarios/${scenarioId}`);
  }

  async getInferenceRules(): Promise<{ results: any[]; total: number }> {
    return this.request('/api/inference/rules');
  }

  async executeInferenceRule(ruleId: string): Promise<any> {
    return this.request(`/api/inference/rules/${ruleId}/execute`, {
      method: 'POST',
    });
  }

  async getNotifications(userId: string): Promise<{ results: any[]; total: number }> {
    return this.request(`/api/notifications/?user_id=${userId}`);
  }

  async markNotificationRead(notificationId: string): Promise<any> {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async getReminders(userId: string): Promise<any[]> {
    return this.request(`/api/reminders/?user_id=${userId}`);
  }

  async dismissReminder(reminderId: string): Promise<any> {
    return this.request(`/api/reminders/${reminderId}/dismiss`, {
      method: 'POST',
    });
  }

  async getPerception(): Promise<any[]> {
    return this.request('/api/perception/run', {
      method: 'POST',
    });
  }

  async getEntityPerception(entityId: string): Promise<any> {
    return this.request(`/api/perception/${entityId}`);
  }

  async getSuggestions(): Promise<any[]> {
    return this.request('/api/suggestions/');
  }

  async getInsights(): Promise<any[]> {
    return this.request('/api/insights/');
  }

  async getAgentStatus(): Promise<any[]> {
    return this.request('/api/agent/status');
  }

  async invokeAgent(query: string): Promise<{
    status: string;
    perception: string;
    reasoning: string;
    plan: string;
    execution: string;
  }> {
    return this.request('/api/agent/invoke', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  connectWebSocket(userId: string, onMessage: (data: any) => void, onError?: (error: Event) => void): WebSocket {
    this.wsOnMessage = onMessage;
    this.wsOnError = onError ?? null;
    this.wsReconnectAttempts = 0;
    return this.connectWebSocketInternal(userId);
  }

  private connectWebSocketInternal(userId: string): WebSocket {
    const wsUrl = this.baseUrl ? this.baseUrl.replace(/^http/, 'ws') : `ws://${window.location.host}`;
    this.ws = new WebSocket(`${wsUrl}/api/ws/${userId}`);

    this.ws.onopen = () => {
      this.wsReconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.wsOnMessage?.(data);
    };

    this.ws.onerror = (error) => {
      // WebSocket error events are often triggered during normal reconnection
      // The actual connection status will be handled by onclose
      this.wsOnError?.(error);
    };

    this.ws.onclose = () => {
      if (this.wsReconnectAttempts < this.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, this.wsReconnectAttempts), 5000);
        setTimeout(() => {
          this.wsReconnectAttempts++;
          this.connectWebSocketInternal(userId);
        }, delay);
      }
    };

    return this.ws;
  }

  sendWebSocketMessage(message: string, userId: string, threadId?: string, territory?: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify({
      type: 'chat',
      message,
      user_id: userId,
      thread_id: threadId,
      territory,
    }));
  }

  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const apiClient = new ApiClient();
export default apiClient;
