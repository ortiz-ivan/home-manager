const API_BASE = "http://127.0.0.1:8000/api/inventory/";

async function request(path = "", options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.detail || "No se pudo completar la operacion";
    throw new Error(detail);
  }

  return data;
}

export function listProducts() {
  return request();
}

export function createProduct(payload) {
  return request("", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id, payload) {
  return request(`${id}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id) {
  return request(`${id}/`, {
    method: "DELETE",
  });
}

export function consumeProduct(id, quantity = 1) {
  return request(`${id}/consume/`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

export function buyProduct(id, quantity = 1) {
  return request(`${id}/buy/`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
}

export function markOutOfStock(id) {
  return request(`${id}/out_of_stock/`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}
