const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const getHeaders = () => {
    // Check both legacy 'token' and new 'epolix_token'
    const token = localStorage.getItem('epolix_token') || localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
};

export const api = {
    async get(endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'GET',
            headers: getHeaders()
        });
        return handleResponse(response);
    },

    async post(endpoint, data) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    async put(endpoint, data) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    async patch(endpoint, data) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'PATCH',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    async delete(endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        return handleResponse(response);
    }
};

async function handleResponse(response) {
    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        // If unauthorized/expired, we might want to trigger a logout
        if (response.status === 401) {
            // Signal a session expiry without immediate destructive redirect
            // This is safer as AuthContext will handle the state update.
            console.warn('[API] 401 Unauthorized detected.');
        }
        throw new Error(data?.message || data?.error || 'API request failed');
    }
    return data;
}

export default api;
