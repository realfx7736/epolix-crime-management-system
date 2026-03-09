const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
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
    const data = await response.json();
    if (!response.ok) {
        // If unauthorized/expired, we might want to trigger a logout
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login?session=expired';
        }
        throw new Error(data.message || 'API request failed');
    }
    return data;
}
