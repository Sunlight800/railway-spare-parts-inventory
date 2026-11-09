export interface SparePartItem {
  part_id: string;
  part_name: string;
  category: string;
  annual_usage_units: number;
  unit_price_inr: number;
  annual_consumption_value_inr: number;
  current_stock_units: number;
  lead_time_days: number;
  supplier_id: string;
  legacy_criticality?: string;
  
  abc_class: string;
  sde_class: string;
  ved_class: string;
  music3d_code: string;
  service_level: number;
  z_score: number;
  target_stockout_prob_pct: number;
  hml_class: string;
  sos_class: string;
  golf_class: string;
  fsn_class: string;
  classification_status: string;
  confidence?: number;

  average_daily_demand: number;
  lead_time_demand: number;
  safety_stock: number;
  reorder_point: number;
  stock_cover_days: number;
  estimated_stockout_risk: number;
  risk_gap: number;
  estimated_fill_rate: number;
  stock_status: 'HEALTHY' | 'UNDERSTOCK' | 'OUT_OF_STOCK' | 'OVERSTOCK';
  data_source?: string;
}

export interface Music3DCell {
  code: string;
  abc: string;
  sde: string;
  ved: string;
  service_level: number;
  z_score: number;
  target_stockout_prob: number;
  target_stockout_prob_pct: number;
  description: string;
  part_count: number;
  total_spend_inr: number;
  total_stock_units: number;
  avg_actual_stockout_risk_pct: number;
  avg_stock_cover_days: number;
}

export interface Music3DMatrixResponse {
  dimensions: {
    abc: string[];
    sde: string[];
    ved: string[];
  };
  total_combinations: number;
  cells: Music3DCell[];
}

export interface ClassificationCategoryStat {
  category: string;
  count: number;
  percentage_items: number;
  total_spend_inr: number;
  spend_share_pct: number;
}

export interface ClassificationSummary {
  total_parts: number;
  total_annual_spend_inr: number;
  total_inventory_value_inr: number;
  abc: ClassificationCategoryStat[];
  sde: ClassificationCategoryStat[];
  ved: ClassificationCategoryStat[];
  hml: ClassificationCategoryStat[];
  sos: ClassificationCategoryStat[];
  golf: ClassificationCategoryStat[];
  fsn: ClassificationCategoryStat[];
  approved_count: number;
  ai_suggested_count: number;
  pending_count: number;
}

export interface InventoryHealthKPIs {
  kpis: {
    total_spare_parts: number;
    total_inventory_quantity: number;
    total_inventory_value_inr: number;
    total_annual_spend_inr: number;
    total_vital_parts: number;
    parts_below_reorder_point: number;
    parts_high_stockout_risk: number;
    vital_parts_zero_stock: number;
    overall_availability_index_pct: number;
  };
  risk_distribution: {
    low_risk_count: number;
    medium_risk_count: number;
    critical_risk_count: number;
  };
  stock_status_distribution: Record<string, number>;
  category_breakdown: Array<{
    category: string;
    part_count: number;
    inventory_value_inr: number;
    annual_consumption_inr: number;
  }>;
}

export interface AIRecommendation {
  part_id: string;
  part_name: string;
  category: string;
  alert_type: string;
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
  music3d_code: string;
  evidence: string;
  suggested_action: string;
  rationale: string;
  requires_approval: boolean;
  data_source_flag: string;
}

export interface WorkPackageShortageItem {
  part_id: string;
  part_name: string;
  required_quantity: number;
  current_stock: number;
  shortfall: number;
  ved_class: string;
  sde_class: string;
  lead_time_days: number;
  estimated_stockout_risk: number;
}

export interface WorkPackage {
  work_package_id: string;
  title: string;
  asset_id: string;
  asset_name?: string;
  asset_system?: string;
  section: string;
  description?: string;
  due_date?: string;
  scheduled_block_date?: string;
  estimated_duration_hours: number;
  readiness_status: 'READY' | 'PARTIALLY_READY' | 'NOT_READY' | 'REVIEW_REQUIRED';
  readiness_pct: number;
  priority_score: number;
  total_required_parts: number;
  available_parts_count: number;
  shortage_count: number;
  shortage_items: WorkPackageShortageItem[];
  max_procurement_lead_time_days: number;
  recommendation: string;
}

export interface SupplierItem {
  supplier_id: string;
  supplier_name: string;
  supplier_type: string;
  golf_category: 'G' | 'O' | 'L' | 'F';
  location: string;
  procurement_source: string;
  import_dependency: boolean;
  approved_status: string;
  lead_time_avg_days: number;
  lead_time_variance_days: number;
  reliability_score: number;
  parts_count: number;
  vital_parts_count: number;
  high_risk_parts_count: number;
}

export interface AssetItem {
  asset_id: string;
  asset_name: string;
  asset_type: string;
  system: string;
  location: string;
  criticality: string;
  status: string;
  total_linked_parts: number;
  vital_parts_count: number;
  has_shortage: boolean;
  material_readiness_status: string;
  linked_parts: Array<{
    part_id: string;
    part_name: string;
    category: string;
    required_quantity: number;
    current_stock: number;
    ved_class: string;
    music3d_code: string;
    stockout_risk: number;
    status: string;
  }>;
}
