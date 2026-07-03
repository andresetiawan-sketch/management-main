import { appParams } from '@/lib/app-params';

const buildApiUrl = (path = '') => {
  const base = appParams.apiBaseUrl || import.meta.env.VITE_API_URL || '/';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const requestJson = async (path, options = {}) => {
  const { method = 'GET', body, headers = {}, query = {} } = options;
  const url = new URL(buildApiUrl(path));

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(data.error || data.message || 'Request failed');
  }

  return response.json().catch(() => null);
};

const createEntityProxy = (entityName) => new Proxy({}, {
  get(_, prop) {
    if (prop === 'list') {
      return async (sort = '-created_date', limit = 1000) => requestJson(`/api/${entityName}`, { query: { sort, limit } });
    }
    if (prop === 'filter') {
      return async (query = {}, sort = '-created_date', limit = 1000) => requestJson(`/api/${entityName}`, { query: { ...query, sort, limit } });
    }
    if (prop === 'get') {
      return async (id) => requestJson(`/api/${entityName}/${id}`);
    }
    if (prop === 'create') {
      return async (data) => requestJson(`/api/${entityName}`, { method: 'POST', body: data });
    }
    if (prop === 'update') {
      return async (id, data) => requestJson(`/api/${entityName}/${id}`, { method: 'PATCH', body: data });
    }
    if (prop === 'delete') {
      return async (id) => requestJson(`/api/${entityName}/${id}`, { method: 'DELETE' });
    }
    return undefined;
  },
});

const createEntityNamespace = () => {
  const namespace = new Proxy({}, {
    get(_, entityName) {
      return createEntityProxy(String(entityName));
    },
  });
  return namespace;
};

export const base44 = {
  entities: createEntityNamespace(),
  asServiceRole: {
    entities: createEntityNamespace(),
  },
  integrations: {
    Core: {
      UploadFile: async ({ file, folder = 'uploads' }) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const response = await fetch(buildApiUrl('/api/uploads'), {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(data.error || 'Upload failed');
        }

        return response.json();
      },
    },
  },
};

export default base44;
