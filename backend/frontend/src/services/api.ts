const envApiUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();
export const API_BASE = envApiUrl 
  ? (envApiUrl.replace(/\/+$/, '').endsWith('/api') ? envApiUrl.replace(/\/+$/, '') : `${envApiUrl.replace(/\/+$/, '')}/api`)
  : '/api';


export const api = {
  // Spare Parts
  getSpareParts: async (params: Record<string, any> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, String(val));
      }
    });
    const res = await fetch(`${API_BASE}/spare-parts?${query.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch spare parts: ${res.statusText}`);
    return res.json();
  },

  getSparePartDetail: async (partId: string) => {
    const res = await fetch(`${API_BASE}/spare-parts/${partId}`);
    if (!res.ok) throw new Error(`Failed to fetch part ${partId}: ${res.statusText}`);
    return res.json();
  },

  createSparePart: async (payload: any) => {
    const res = await fetch(`${API_BASE}/spare-parts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to create spare part');
    }
    return res.json();
  },

  updateSparePart: async (partId: string, payload: any) => {
    const res = await fetch(`${API_BASE}/spare-parts/${partId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to update spare part');
    }
    return res.json();
  },

  deleteSparePart: async (partId: string) => {
    const res = await fetch(`${API_BASE}/spare-parts/${partId}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to delete spare part');
    }
    return res.json();
  },

  quickUpdateStock: async (partId: string, quantity: number) => {
    const res = await fetch(`${API_BASE}/spare-parts/${partId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Failed to update stock');
    }
    return res.json();
  },

  // Classifications
  getClassificationSummary: async () => {
    const res = await fetch(`${API_BASE}/classifications/summary`);
    if (!res.ok) throw new Error('Failed to fetch classification summary');
    return res.json();
  },

  getMusic3DMatrix: async () => {
    const res = await fetch(`${API_BASE}/classifications/music3d`);
    if (!res.ok) throw new Error('Failed to fetch MUSIC-3D matrix');
    return res.json();
  },

  getMusic3DCellDetail: async (code: string) => {
    const res = await fetch(`${API_BASE}/classifications/music3d/${code}`);
    if (!res.ok) throw new Error(`Failed to fetch cell ${code}`);
    return res.json();
  },

  getAbcAnalysis: async () => {
    const res = await fetch(`${API_BASE}/classifications/abc`);
    if (!res.ok) throw new Error('Failed to fetch ABC Pareto data');
    return res.json();
  },

  getSosAnalysis: async () => {
    const res = await fetch(`${API_BASE}/classifications/sos`);
    if (!res.ok) throw new Error('Failed to fetch SOS analysis');
    return res.json();
  },

  getClassificationMethodDetails: async (method: string) => {
    const res = await fetch(`${API_BASE}/classifications/method/${method}`);
    if (!res.ok) throw new Error(`Failed to fetch classification details for ${method}`);
    return res.json();
  },

  updateClassification: async (partId: string, payload: any) => {
    const res = await fetch(`${API_BASE}/classifications/${partId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to update classification');
    return res.json();
  },

  // Inventory Health & Recommendations
  getInventoryHealth: async () => {
    const res = await fetch(`${API_BASE}/inventory/health`);
    if (!res.ok) throw new Error('Failed to fetch inventory health');
    return res.json();
  },

  getStockoutRiskDetails: async () => {
    const res = await fetch(`${API_BASE}/inventory/stockout-risk`);
    if (!res.ok) throw new Error('Failed to fetch stockout risk details');
    return res.json();
  },

  getRecommendations: async () => {
    const res = await fetch(`${API_BASE}/inventory/recommendations`);
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
  },

  // Simulation
  getPrebuiltScenarios: async () => {
    const res = await fetch(`${API_BASE}/simulation/prebuilt-scenarios`);
    if (!res.ok) throw new Error('Failed to fetch prebuilt scenarios');
    return res.json();
  },

  runSimulation: async (payload: any) => {
    const res = await fetch(`${API_BASE}/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Simulation execution failed');
    return res.json();
  },

  getSimulationHistory: async () => {
    const res = await fetch(`${API_BASE}/simulation/history`);
    if (!res.ok) throw new Error('Failed to fetch simulation history');
    return res.json();
  },

  // Maintenance Block Planning
  getWorkPackages: async () => {
    const res = await fetch(`${API_BASE}/block-planning/work-packages`);
    if (!res.ok) throw new Error('Failed to fetch work packages');
    return res.json();
  },

  getBlockCalendar: async () => {
    const res = await fetch(`${API_BASE}/block-planning/calendar`);
    if (!res.ok) throw new Error('Failed to fetch block calendar');
    return res.json();
  },

  rescheduleWorkPackage: async (payload: { work_package_id: string; new_date: string; new_section?: string }) => {
    const res = await fetch(`${API_BASE}/block-planning/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to reschedule package');
    return res.json();
  },

  // Suppliers & Assets
  getSuppliers: async () => {
    const res = await fetch(`${API_BASE}/suppliers`);
    if (!res.ok) throw new Error('Failed to fetch suppliers');
    return res.json();
  },

  getAssets: async () => {
    const res = await fetch(`${API_BASE}/assets`);
    if (!res.ok) throw new Error('Failed to fetch assets');
    return res.json();
  },

  // Data Management
  uploadInventoryFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/data-management/import`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Import failed');
    }
    return res.json();
  },

  resetDemoData: async () => {
    const res = await fetch(`${API_BASE}/data-management/reset-demo`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to reset demo data');
    return res.json();
  },

  // Methodology
  getMethodology: async () => {
    const res = await fetch(`${API_BASE}/methodology/reference-table`);
    if (!res.ok) throw new Error('Failed to fetch methodology');
    return res.json();
  }
};
