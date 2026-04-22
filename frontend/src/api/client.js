import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const AUTH_STORAGE_KEY = 'people_app_access_token'
const AUTH_SESSION_KEY = 'people_app_session'
const AUTH_EMAIL =
  import.meta.env.VITE_AUTH_EMAIL || import.meta.env.VITE_AUTH_USERNAME || 'admin@people.local'
const AUTH_PASSWORD = import.meta.env.VITE_AUTH_PASSWORD || 'admin123'

const getStoredToken = () => {
  try {
    return localStorage.getItem(AUTH_STORAGE_KEY)
  } catch {
    return null
  }
}

const getStoredSession = () => {
  try {
    const value = localStorage.getItem(AUTH_SESSION_KEY)
    return value ? JSON.parse(value) : null
  } catch {
    return null
  }
}

const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_STORAGE_KEY, token)
      return
    }
    localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // no-op in restricted environments
  }
}

const setStoredSession = (session) => {
  try {
    if (session) {
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
      return
    }
    localStorage.removeItem(AUTH_SESSION_KEY)
  } catch {
    // no-op
  }
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(async (config) => {
  const token = getStoredToken()
  config.headers = config.headers || {}
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      setStoredToken(null)
      setStoredSession(null)
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: async (email = AUTH_EMAIL, password = AUTH_PASSWORD) => {
    const response = await axios.post(`${API_URL}/auth/login`, { email, password })
    const token = response.data?.access_token
    setStoredToken(token)
    setStoredSession(response.data)
    return response.data
  },
  loginGoogle: async (idToken, tenantCnpj) => {
    const body = { id_token: idToken }
    if (tenantCnpj) body.tenant_cnpj = tenantCnpj
    const response = await axios.post(`${API_URL}/auth/google`, body)
    const token = response.data?.access_token
    setStoredToken(token)
    setStoredSession(response.data)
    return response.data
  },
  registerTenant: async (payload) => {
    const response = await axios.post(`${API_URL}/auth/register-tenant`, payload)
    return response.data
  },
  me: () => api.get('/users/me'),
  logout: () => {
    setStoredToken(null)
    setStoredSession(null)
  },
  getToken: () => getStoredToken(),
  getSession: () => getStoredSession(),
}

export const collaboratorsAPI = {
  list: () => api.get('/collaborators'),
  get: async (id) => {
    const res = await api.get('/collaborators')
    const collaborator = res.data.find((item) => String(item.id) === String(id))
    if (!collaborator) {
      throw new Error('Collaborator not found')
    }
    return { data: collaborator }
  },
  create: (data) => api.post('/collaborators', data),
  downloadImportTemplate: () =>
    api.get('/collaborators/import-template', {
      responseType: 'text',
    }),
  importCsv: (file, options = {}) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/collaborators/import-csv', formData, {
      params: {
        update_existing: Boolean(options.updateExisting),
        enrich_from_txt: options.enrichFromTxt !== false,
      },
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  update: (id, data) => api.put(`/collaborators/${id}`, data),
  delete: (id) => api.delete(`/collaborators/${id}`),
  updateRisk: (id, action) => api.patch(`/collaborators/${id}/risk`, { action }),
  startPDI: (id) => api.post(`/collaborators/${id}/start-pdi`),
}

export const oneOnOnesAPI = {
  list: async () => {
    const collaboratorsRes = await collaboratorsAPI.list()
    const collaborators = collaboratorsRes.data
    const oneOnOnesByCollaborator = await Promise.all(
      collaborators.map(async (collaborator) => {
        const res = await api.get(`/one-on-ones/collaborator/${collaborator.id}`)
        return res.data.map((item) => ({
          ...item,
          collaborator_name: collaborator.name,
        }))
      })
    )
    return { data: oneOnOnesByCollaborator.flat() }
  },
  create: (data) => api.post('/one-on-ones', data),
  update: (id, data) => api.put(`/one-on-ones/${id}`, data),
  delete: (id) => api.delete(`/one-on-ones/${id}`),
  listByCollaborator: (collaboratorId) => api.get(`/one-on-ones/collaborator/${collaboratorId}`),
}

export const pdisAPI = {
  list: async () => {
    const collaboratorsRes = await collaboratorsAPI.list()
    const collaborators = collaboratorsRes.data
    const pdisByCollaborator = await Promise.all(
      collaborators.map(async (collaborator) => {
        const res = await api.get(`/pdis/collaborator/${collaborator.id}`)
        return res.data.map((item) => ({
          ...item,
          collaborator_name: collaborator.name,
        }))
      })
    )
    return { data: pdisByCollaborator.flat() }
  },
  create: (data) => api.post('/pdis', data),
  update: (id, data) => api.put(`/pdis/${id}`, data),
  delete: (id) => api.delete(`/pdis/${id}`),
  listByCollaborator: (collaboratorId) => api.get(`/pdis/collaborator/${collaboratorId}`),
}

export const reportingAPI = {
  dashboard: () => api.get('/reporting/dashboard'),
  riskBreakdown: () => api.get('/reporting/risk-breakdown'),
  heatmap: () => api.get('/reporting/heatmap'),
}

export const actionsAPI = {
  list: () => api.get('/actions'),
  create: (data) => api.post('/actions', data),
  update: (id, data) => api.put(`/actions/${id}`, data),
  delete: (id) => api.delete(`/actions/${id}`),
  updateStatus: (id, status) => api.patch(`/actions/${id}/status`, { status }),
}

export const usersAPI = {
  list: () => api.get('/users'),
  invite: (data) => api.post('/users', data),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  activate: (id) => api.patch(`/users/${id}/activate`),
  remove: (id) => api.delete(`/users/${id}`),
}

export const tenantsAPI = {
  me: () => api.get('/tenants/me'),
  update: (data) => api.patch('/tenants/me', data),
}

export const okrsAPI = {
  list: (cycle) => api.get('/okrs/objectives', { params: cycle ? { cycle } : {} }),
  create: (data) => api.post('/okrs/objectives', data),
  update: (id, data) => api.put(`/okrs/objectives/${id}`, data),
  deleteObjective: (id) => api.delete(`/okrs/objectives/${id}`),
  addKeyResult: (objectiveId, data) =>
    api.post(`/okrs/objectives/${objectiveId}/key-results`, data),
  updateKeyResult: (krId, data) => api.put(`/okrs/key-results/${krId}`, data),
  updateKrProgress: (krId, currentValue) =>
    api.patch(`/okrs/key-results/${krId}/progress`, { current_value: currentValue }),
  deleteKeyResult: (krId) => api.delete(`/okrs/key-results/${krId}`),
}

export const aiAPI = {
  getConfig: () => api.get('/ai/config'),
  createConfig: (data) => api.post('/ai/config', data),
  updateConfig: (data) => api.patch('/ai/config', data),
  processOneOnOne: (data) => api.post('/ai/process', data),
  getLogs: (limit = 50, offset = 0) => api.get('/ai/logs', { params: { limit, offset } }),
  getOneOnOneLog: (oneOnOneId) => api.get(`/ai/logs/${oneOnOneId}`),
}

export default api
