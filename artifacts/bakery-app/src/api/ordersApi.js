const BASE = '/api/orders';

function toSnake(order) {
  if (!order || typeof order !== 'object') return order;
  return {
    id: order.id,
    customer_name: order.customerName,
    customer_phone: order.customerPhone,
    cake_type: order.cakeType,
    flavor: order.flavor,
    weight: order.weight,
    design_notes: order.designNotes,
    delivery_date: order.deliveryDate,
    delivery_time: order.deliveryTime,
    delivery_type: order.deliveryType,
    price: order.price,
    payment_status: order.paymentStatus,
    status: order.status,
    special_requests: order.specialRequests,
    notes: order.notes,
    source: order.source,
    confidence: order.confidence,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

export const OrdersApi = {
  async list(sort = '-delivery_date', limit = 100) {
    const params = new URLSearchParams({ sort, limit: String(limit) });
    const res = await fetch(`${BASE}?${params}`);
    if (!res.ok) throw new Error('Failed to fetch orders');
    const data = await res.json();
    return Array.isArray(data) ? data.map(toSnake) : data;
  },

  async get(id) {
    const res = await fetch(`${BASE}/${id}`);
    if (!res.ok) throw new Error('Order not found');
    return toSnake(await res.json());
  },

  async create(data) {
    const res = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create order');
    return toSnake(await res.json());
  },

  async update(id, data) {
    const camelData = {};
    const map = {
      status: 'status', notes: 'notes', price: 'price',
      customer_name: 'customerName', customer_phone: 'customerPhone',
      cake_type: 'cakeType', flavor: 'flavor', weight: 'weight',
      design_notes: 'designNotes', delivery_date: 'deliveryDate',
      delivery_time: 'deliveryTime', delivery_type: 'deliveryType',
      payment_status: 'paymentStatus', special_requests: 'specialRequests',
      source: 'source', confidence: 'confidence',
    };
    for (const [k, v] of Object.entries(data)) {
      const camelKey = map[k] || k;
      camelData[camelKey] = v;
    }
    const res = await fetch(`${BASE}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(camelData),
    });
    if (!res.ok) throw new Error('Failed to update order');
    return toSnake(await res.json());
  },

  async delete(id) {
    const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete order');
  },

  async bulkCreate(orders) {
    const res = await fetch(`${BASE}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orders }),
    });
    if (!res.ok) throw new Error('Failed to bulk create orders');
    const data = await res.json();
    return Array.isArray(data) ? data.map(toSnake) : data;
  },
};

export const Order = {
  list: (sort, limit) => OrdersApi.list(sort, limit),
  get: (id) => OrdersApi.get(id),
  create: (data) => OrdersApi.create(data),
  update: (id, data) => OrdersApi.update(id, data),
  delete: (id) => OrdersApi.delete(id),
  bulkCreate: (orders) => OrdersApi.bulkCreate(orders),
};
