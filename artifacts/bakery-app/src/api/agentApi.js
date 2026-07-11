const BASE = '/api/agent';

// Clerk uses session cookies for auth — no API key header needed in browser
function authHeaders(extra = {}) {
  return { ...extra };
}

export const AgentApi = {
  async getKnowledge() {
    const res = await fetch(`${BASE}/knowledge`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load knowledge');
    return res.json();
  },

  async saveKnowledge(data) {
    const res = await fetch(`${BASE}/knowledge`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to save knowledge');
    return res.json();
  },

  // Streaming chat — calls onChunk(text) for each token, returns final {done, order?}
  async chat({ sessionId, message, history, onChunk }) {
    const res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ sessionId, message, history }),
    });
    if (!res.ok) throw new Error('Chat failed');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalEvent = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) onChunk(data.content);
            if (data.done) finalEvent = data;
          } catch { /* skip */ }
        }
      }
    }
    return finalEvent;
  },

  async getDeliveryMessage(orderId) {
    const res = await fetch(`${BASE}/delivery-message`, {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) throw new Error('Failed to generate message');
    return res.json();
  },
};
