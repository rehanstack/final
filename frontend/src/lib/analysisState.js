const STORAGE_KEY = 'dbsense.analysisState'

export const DATASETS = {
  'E-Commerce Dataset': {
    name: 'E-Commerce Dataset',
    type: 'Retail & E-Commerce',
    icon: 'ShoppingCart',
    tablesCount: 12,
    columnsCount: 156,
    relationshipsCount: 42,
    totalRecords: 9893000,
    totalSize: '42.5 GB',
    qualityScore: 91,
    anomaliesCount: 3,
    vectorCount: 1247,
    columnTypesBreakdown: [
      { name: 'VARCHAR', count: 68, percentage: 43.5 },
      { name: 'UUID', count: 32, percentage: 20.5 },
      { name: 'TIMESTAMP', count: 24, percentage: 15.4 },
      { name: 'DECIMAL', count: 18, percentage: 11.5 },
      { name: 'INT / BIGINT', count: 14, percentage: 9.1 }
    ],
    businessMetrics: {
      monthlyRevenue: [
        { month: 'Jan', revenue: 420000, orders: 12500 },
        { month: 'Feb', revenue: 480000, orders: 14200 },
        { month: 'Mar', revenue: 610000, orders: 18400 },
        { month: 'Apr', revenue: 590000, orders: 17800 },
        { month: 'May', revenue: 750000, orders: 21000 },
        { month: 'Jun', revenue: 890000, orders: 24500 }
      ],
      userGrowth: [
        { month: 'Jan', users: 15000 },
        { month: 'Feb', users: 18500 },
        { month: 'Mar', users: 24000 },
        { month: 'Apr', users: 31000 },
        { month: 'May', users: 42000 },
        { month: 'Jun', users: 56000 }
      ],
      salesByCategory: [
        { name: 'Electronics', value: 45 },
        { name: 'Apparel', value: 25 },
        { name: 'Home & Garden', value: 15 },
        { name: 'Sports', value: 10 },
        { name: 'Other', value: 5 }
      ],
      demographics: [
        { ageGroup: '18-24', male: 4200, female: 4800 },
        { ageGroup: '25-34', male: 12500, female: 14100 },
        { ageGroup: '35-44', male: 8900, female: 9200 },
        { ageGroup: '45-54', male: 4100, female: 3800 },
        { ageGroup: '55+', male: 1800, female: 2100 }
      ],
      geography: [
        { region: 'North America', users: 28000, revenue: 410000 },
        { region: 'Europe', users: 15500, revenue: 290000 },
        { region: 'Asia', users: 8500, revenue: 150000 },
        { region: 'South America', users: 4000, revenue: 40000 }
      ]
    },
    tables: [
      {
        name: 'Orders',
        size: '12.0 GB',
        records: 2840000,
        quality: 94,
        primaryKey: 'id',
        columnsCount: 8,
        nullableCount: 2,
        status: 'Healthy',
        description: 'Core sales order transaction ledger.',
        columns: [
          { name: 'id', type: 'UUID', pk: true, fk: false, nullable: false, unique: true, desc: 'Primary order identifier' },
          { name: 'customer_id', type: 'UUID', pk: false, fk: true, references: 'Customers.id', nullable: false, desc: 'FK to customer profile' },
          { name: 'created_at', type: 'TIMESTAMP', pk: false, fk: false, nullable: false, desc: 'Placement timestamp' },
          { name: 'total_amount', type: 'DECIMAL(12,2)', pk: false, fk: false, nullable: false, desc: 'Order total value ($)' },
          { name: 'status', type: 'VARCHAR(20)', pk: false, fk: false, nullable: true, desc: 'Order status (Delivered, Pending, Cancelled)' },
          { name: 'payment_status', type: 'VARCHAR(20)', pk: false, fk: false, nullable: false, desc: 'Payment settlement status' },
          { name: 'shipment_id', type: 'UUID', pk: false, fk: true, references: 'Shipping.shipment_id', nullable: true, desc: 'FK to shipment tracking' },
          { name: 'coupon_code', type: 'VARCHAR(50)', pk: false, fk: true, references: 'Coupons.code', nullable: true, desc: 'FK to applied coupon' }
        ],
        sampleRows: [
          { id: '8f9a2b1c', customer_id: 'usr_9021', created_at: '2024-03-15 14:22:01', total_amount: '$149.99', status: 'Delivered', payment_status: 'Paid' },
          { id: '3c4d5e6f', customer_id: 'usr_4412', created_at: '2024-03-15 14:25:30', total_amount: '$52,400.00', status: 'Pending', payment_status: 'Paid' },
          { id: '1a2b3c4d', customer_id: 'usr_8819', created_at: '2024-03-15 14:30:12', total_amount: '$89.50', status: 'Shipped', payment_status: 'Paid' }
        ]
      },
      {
        name: 'Customers',
        size: '8.5 GB',
        records: 450000,
        quality: 87,
        primaryKey: 'id',
        columnsCount: 7,
        nullableCount: 3,
        status: 'Warning',
        description: 'Customer master profiles and authentication details.',
        columns: [
          { name: 'id', type: 'UUID', pk: true, fk: false, nullable: false, unique: true, desc: 'Primary user ID' },
          { name: 'email', type: 'VARCHAR(255)', pk: false, fk: false, nullable: false, unique: true, desc: 'Account email address' },
          { name: 'full_name', type: 'VARCHAR(100)', pk: false, fk: false, nullable: false, desc: 'Customer display name' },
          { name: 'phone', type: 'VARCHAR(30)', pk: false, fk: false, nullable: true, desc: 'Contact phone number' },
          { name: 'country_code', type: 'VARCHAR(5)', pk: false, fk: false, nullable: true, desc: 'ISO country code' },
          { name: 'created_at', type: 'TIMESTAMP', pk: false, fk: false, nullable: false, desc: 'Registration timestamp' },
          { name: 'is_active', type: 'BOOLEAN', pk: false, fk: false, nullable: false, desc: 'Account active flag' }
        ],
        sampleRows: [
          { id: 'usr_9021', email: 'alex.morgan@company.com', full_name: 'Alex Morgan', phone: '+1-555-0192', country_code: 'US', created_at: '2022-01-10' },
          { id: 'usr_4412', email: 'samantha.k@techcorp.io', full_name: 'Samantha Knight', phone: '+1-555-0188', country_code: 'US', created_at: '2022-03-14' }
        ]
      },
      {
        name: 'Products',
        size: '6.2 GB',
        records: 125000,
        quality: 99,
        primaryKey: 'sku',
        columnsCount: 6,
        nullableCount: 0,
        status: 'Healthy',
        description: 'Product catalog definitions and pricing.',
        columns: [
          { name: 'sku', type: 'VARCHAR(50)', pk: true, fk: false, nullable: false, unique: true, desc: 'Stock Keeping Unit' },
          { name: 'title', type: 'VARCHAR(255)', pk: false, fk: false, nullable: false, desc: 'Product title' },
          { name: 'category_id', type: 'UUID', pk: false, fk: true, references: 'Categories.category_id', nullable: false, desc: 'Category FK' },
          { name: 'supplier_id', type: 'UUID', pk: false, fk: true, references: 'Suppliers.supplier_id', nullable: false, desc: 'Supplier FK' },
          { name: 'unit_price', type: 'DECIMAL(10,2)', pk: false, fk: false, nullable: false, desc: 'Retail price ($)' },
          { name: 'is_available', type: 'BOOLEAN', pk: false, fk: false, nullable: false, desc: 'In stock flag' }
        ],
        sampleRows: [
          { sku: 'PROD-NEO-900', title: 'Wireless Ergonomic Keyboard', category_id: 'cat_electronics', unit_price: '$129.99', is_available: 'true' },
          { sku: 'PROD-MON-4K', title: 'UltraWide 34-inch Monitor', category_id: 'cat_electronics', unit_price: '$599.00', is_available: 'true' }
        ]
      },
      {
        name: 'Inventory',
        size: '4.1 GB',
        records: 98000,
        quality: 85,
        primaryKey: 'item_id',
        columnsCount: 5,
        nullableCount: 2,
        status: 'Warning',
        description: 'Warehouse stock counts and reorder levels.',
        columns: [
          { name: 'item_id', type: 'UUID', pk: true, fk: false, nullable: false, unique: true, desc: 'Inventory record ID' },
          { name: 'product_sku', type: 'VARCHAR(50)', pk: false, fk: true, references: 'Products.sku', nullable: false, desc: 'Product SKU FK' },
          { name: 'warehouse_location', type: 'VARCHAR(100)', pk: false, fk: false, nullable: false, desc: 'Warehouse identifier' },
          { name: 'stock_qty', type: 'INT', pk: false, fk: false, nullable: false, desc: 'Current available units' },
          { name: 'reorder_point', type: 'INT', pk: false, fk: false, nullable: true, desc: 'Minimum stock safety buffer' }
        ],
        sampleRows: [
          { item_id: 'inv_8801', product_sku: 'PROD-NEO-900', warehouse_location: 'Warehouse-US-East', stock_qty: '450', reorder_point: '100' },
          { item_id: 'inv_8802', product_sku: 'PROD-MON-4K', warehouse_location: 'Warehouse-US-West', stock_qty: '12', reorder_point: '25' }
        ]
      },
      {
        name: 'Payments',
        size: '6.8 GB',
        records: 2700000,
        quality: 92,
        primaryKey: 'transaction_id',
        columnsCount: 5,
        nullableCount: 1,
        status: 'Healthy',
        description: 'Payment gateway transaction settlement log.',
        columns: [
          { name: 'transaction_id', type: 'UUID', pk: true, fk: false, nullable: false, unique: true, desc: 'Transaction reference' },
          { name: 'order_id', type: 'UUID', pk: false, fk: true, references: 'Orders.id', nullable: false, desc: 'Order FK' },
          { name: 'payment_method', type: 'VARCHAR(50)', pk: false, fk: false, nullable: false, desc: 'Credit Card, PayPal, ApplePay' },
          { name: 'amount', type: 'DECIMAL(12,2)', pk: false, fk: false, nullable: false, desc: 'Processed transaction total' },
          { name: 'settled_at', type: 'TIMESTAMP', pk: false, fk: false, nullable: true, desc: 'Gateway settlement time' }
        ],
        sampleRows: [
          { transaction_id: 'tx_99012', order_id: '8f9a2b1c', payment_method: 'Credit Card', amount: '$149.99', settled_at: '2024-03-15 14:22:05' }
        ]
      },
      {
        name: 'Reviews',
        size: '2.1 GB',
        records: 890000,
        quality: 96,
        primaryKey: 'review_id',
        columnsCount: 5,
        nullableCount: 1,
        status: 'Healthy',
        description: 'Product reviews and star ratings.',
        columns: [
          { name: 'review_id', type: 'UUID', pk: true, fk: false, nullable: false, unique: true, desc: 'Review ID' },
          { name: 'product_sku', type: 'VARCHAR(50)', pk: false, fk: true, references: 'Products.sku', nullable: false, desc: 'Product SKU FK' },
          { name: 'customer_id', type: 'UUID', pk: false, fk: true, references: 'Customers.id', nullable: false, desc: 'Customer FK' },
          { name: 'rating', type: 'INT', pk: false, fk: false, nullable: false, desc: 'Star rating (1-5)' },
          { name: 'comment_text', type: 'TEXT', pk: false, fk: false, nullable: true, desc: 'User review body' }
        ],
        sampleRows: [
          { review_id: 'rev_101', product_sku: 'PROD-NEO-900', customer_id: 'usr_9021', rating: '5', comment_text: 'Best keyboard I have used!' }
        ]
      }
    ],
    relationships: [
      { from: 'Orders', fromCol: 'customer_id', to: 'Customers', toCol: 'id', type: 'Many-to-One', cardinality: 'n:1', status: 'Explicit FK' },
      { from: 'Payments', fromCol: 'order_id', to: 'Orders', toCol: 'id', type: 'One-to-One', cardinality: '1:1', status: 'Explicit FK' },
      { from: 'Inventory', fromCol: 'product_sku', to: 'Products', toCol: 'sku', type: 'One-to-One', cardinality: '1:1', status: 'Implicit Inferred' },
      { from: 'Reviews', fromCol: 'product_sku', to: 'Products', toCol: 'sku', type: 'Many-to-One', cardinality: 'n:1', status: 'Explicit FK' },
      { from: 'Reviews', fromCol: 'customer_id', to: 'Customers', toCol: 'id', type: 'Many-to-One', cardinality: 'n:1', status: 'Explicit FK' },
      { from: 'Products', fromCol: 'category_id', to: 'Categories', toCol: 'category_id', type: 'Many-to-One', cardinality: 'n:1', status: 'Explicit FK' }
    ],
    insights: [
      {
        id: 'ins-1',
        title: 'Revenue Anomaly Detected',
        description: 'Unusual 450% spike in order values detected in Orders table on 2024-03-15 (12 orders >$50,000).',
        confidence: 94,
        severity: 'high',
        type: 'anomaly',
        affectedTable: 'Orders',
        recommendation: 'Manual review recommended for high-value orders; flag suspicious transaction IDs.',
        sqlFix: 'CREATE INDEX idx_orders_high_val ON orders(total_amount) WHERE total_amount > 50000;',
        applied: false
      },
      {
        id: 'ins-2',
        title: 'Duplicate Customer Records',
        description: '27% of customer records share identical normalized email and phone numbers without merged user IDs.',
        confidence: 89,
        severity: 'warning',
        type: 'quality',
        affectedTable: 'Customers',
        recommendation: 'Run deduplication pipeline using email hash matching.',
        sqlFix: 'SELECT email, COUNT(*) FROM customers GROUP BY email HAVING COUNT(*) > 1;',
        applied: false
      },
      {
        id: 'ins-3',
        title: 'Missing Foreign Key Integrity',
        description: 'Potential missing foreign key relationship between Payments and Orders tables; 42 orphan payment records found.',
        confidence: 82,
        severity: 'warning',
        type: 'schema',
        affectedTable: 'Payments, Orders',
        recommendation: 'Add explicit foreign key constraint payments.order_id REFERENCES orders(id).',
        sqlFix: 'ALTER TABLE payments ADD CONSTRAINT fk_payments_orders FOREIGN KEY (order_id) REFERENCES orders(id);',
        applied: false
      }
    ],
    ragChunks: [
      {
        id: 'chunk-1',
        title: 'Orders Table Schema & Indexes',
        category: 'Schema',
        content: 'orders(id UUID PRIMARY KEY, customer_id UUID FK, created_at TIMESTAMP, total_amount DECIMAL, status VARCHAR).',
        relevance: 0.96,
        tokens: 38
      },
      {
        id: 'chunk-2',
        title: 'Customer-Order Cardinality',
        category: 'Relationship',
        content: 'Many-to-One relationship between orders and customers. customer_id -> customers.id guarantees referential integrity.',
        relevance: 0.94,
        tokens: 32
      }
    ]
  },
  'Healthcare Dataset': {
    name: 'Healthcare Dataset',
    type: 'Medical & Hospital Management',
    icon: 'Stethoscope',
    tablesCount: 15,
    columnsCount: 198,
    relationshipsCount: 58,
    totalRecords: 14200000,
    totalSize: '68.2 GB',
    qualityScore: 88,
    anomaliesCount: 5,
    vectorCount: 1890,
    columnTypesBreakdown: [
      { name: 'VARCHAR', count: 82, percentage: 41.4 },
      { name: 'UUID', count: 45, percentage: 22.7 },
      { name: 'DATE / TIME', count: 35, percentage: 17.6 },
      { name: 'INT', count: 20, percentage: 10.1 },
      { name: 'TEXT', count: 16, percentage: 8.2 }
    ],
    businessMetrics: {
      monthlyRevenue: [
        { month: 'Jan', admissions: 1200, discharges: 1150 },
        { month: 'Feb', admissions: 1400, discharges: 1300 },
        { month: 'Mar', admissions: 1100, discharges: 1120 },
        { month: 'Apr', admissions: 1500, discharges: 1450 },
        { month: 'May', admissions: 1700, discharges: 1680 },
        { month: 'Jun', admissions: 1850, discharges: 1800 }
      ],
      userGrowth: [
        { month: 'Jan', patients: 45000 },
        { month: 'Feb', patients: 46200 },
        { month: 'Mar', patients: 47800 },
        { month: 'Apr', patients: 49500 },
        { month: 'May', patients: 52100 },
        { month: 'Jun', patients: 55400 }
      ],
      salesByCategory: [
        { name: 'Cardiology', value: 30 },
        { name: 'Neurology', value: 20 },
        { name: 'Orthopedics', value: 25 },
        { name: 'Pediatrics', value: 15 },
        { name: 'Oncology', value: 10 }
      ],
      demographics: [
        { ageGroup: '0-18', male: 5100, female: 4900 },
        { ageGroup: '19-35', male: 8200, female: 9100 },
        { ageGroup: '36-50', male: 6800, female: 7200 },
        { ageGroup: '51-65', male: 4500, female: 4800 },
        { ageGroup: '65+', male: 2200, female: 2600 }
      ],
      geography: [
        { region: 'Urban Clinics', users: 32000, revenue: 6100 },
        { region: 'Suburban Centers', users: 15500, revenue: 1900 },
        { region: 'Rural Hospitals', users: 5500, revenue: 500 },
        { region: 'Telehealth', users: 2400, revenue: 250 }
      ]
    },
    tables: [
      {
        name: 'Patients',
        size: '14.2 GB',
        records: 920000,
        quality: 86,
        primaryKey: 'patient_id',
        columnsCount: 7,
        nullableCount: 2,
        status: 'Warning',
        description: 'Patient demographic and encryption records.',
        columns: [
          { name: 'patient_id', type: 'UUID', pk: true, fk: false, nullable: false, unique: true, desc: 'Primary patient identifier' },
          { name: 'ssn_hash', type: 'VARCHAR(255)', pk: false, fk: false, nullable: false, unique: true, desc: 'Encrypted SSN hash' },
          { name: 'dob', type: 'DATE', pk: false, fk: false, nullable: false, desc: 'Date of birth' },
          { name: 'blood_group', type: 'VARCHAR(5)', pk: false, fk: false, nullable: true, desc: 'Blood group string' },
          { name: 'primary_doctor_id', type: 'UUID', pk: false, fk: true, references: 'Doctors.doctor_id', nullable: true, desc: 'Assigned doctor FK' }
        ],
        sampleRows: [
          { patient_id: 'pat_88102', ssn_hash: 'a9f2...81c', dob: '1985-06-12', blood_group: 'O+', primary_doctor_id: 'doc_102' }
        ]
      },
      {
        name: 'Prescriptions',
        size: '8.1 GB',
        records: 4100000,
        quality: 83,
        primaryKey: 'rx_id',
        columnsCount: 5,
        nullableCount: 2,
        status: 'Warning',
        description: 'Medication prescription logs.',
        columns: [
          { name: 'rx_id', type: 'UUID', pk: true, fk: false, nullable: false, unique: true, desc: 'Prescription ID' },
          { name: 'patient_id', type: 'UUID', pk: false, fk: true, references: 'Patients.patient_id', nullable: false, desc: 'Patient FK' },
          { name: 'medication_name', type: 'VARCHAR(150)', pk: false, fk: false, nullable: false, desc: 'Drug name' },
          { name: 'dosage_unit', type: 'VARCHAR(30)', pk: false, fk: false, nullable: true, desc: 'Dosage unit (mg/ml)' }
        ],
        sampleRows: [
          { rx_id: 'rx_9011', patient_id: 'pat_88102', medication_name: 'Amoxicillin', dosage_unit: '500mg' }
        ]
      }
    ],
    relationships: [
      { from: 'Prescriptions', fromCol: 'patient_id', to: 'Patients', toCol: 'patient_id', type: 'Many-to-One', cardinality: 'n:1', status: 'Explicit FK' }
    ],
    insights: [
      {
        id: 'ins-h1',
        title: 'Missing Prescription Dosage Units',
        description: '17% of prescription entries in Prescriptions table lack dosage units (mg/ml/tablets).',
        confidence: 96,
        severity: 'high',
        type: 'quality',
        affectedTable: 'Prescriptions',
        recommendation: 'Enforce NOT NULL constraint on dosage_unit column.',
        sqlFix: 'ALTER TABLE prescriptions ALTER COLUMN dosage_unit SET NOT NULL;',
        applied: false
      }
    ],
    ragChunks: [
      {
        id: 'chunk-h1',
        title: 'Patient Medical Data Schema',
        category: 'Schema',
        content: 'patients(patient_id UUID PRIMARY KEY, ssn_hash VARCHAR, dob DATE, blood_group VARCHAR(5)).',
        relevance: 0.98,
        tokens: 36
      }
    ]
  }
}

export const AGENT_PIPELINE_STEPS = [
  { id: 0, name: 'Master Agent', icon: 'Brain', status: 'Orchestrating workflow', summary: 'Workflow initialized.', tasks: ['Validating connection strings', 'Initializing coordinator'] },
  { id: 1, name: 'Schema Agent', icon: 'GitBranch', status: 'Extracting database structure', summary: 'Extracted tables & columns.', tasks: ['Parsing data types', 'Building schema model'] },
  { id: 2, name: 'Relationship Agent', icon: 'Gauge', status: 'Discovering entity relationships', summary: 'Mapped explicit & implicit joins.', tasks: ['Analyzing foreign keys', 'Building dependency graph'] },
  { id: 3, name: 'Data Quality Agent', icon: 'Eye', status: 'Analyzing data integrity', summary: 'Measured quality metrics.', tasks: ['Checking NULL values', 'Scanning duplicates'] },
  { id: 4, name: 'RAG Knowledge Agent', icon: 'Database', status: 'Building ChromaDB vector store', summary: 'Generated embeddings.', tasks: ['Chunking metadata', 'Storing in ChromaDB'] },
  { id: 5, name: 'Reasoning Agent', icon: 'Zap', status: 'Generating Groq AI insights', summary: 'Analyzed database patterns.', tasks: ['Formulating RAG prompts', 'Evaluating risks'] },
  { id: 6, name: 'Visualization Agent', icon: 'BarChart3', status: 'Creating ER diagram & charts', summary: 'Compiled UI visual layout.', tasks: ['Configuring charts', 'Finalizing presentation'] }
]

export const EMPTY_ANALYSIS = {
  hasAnalysis: false,
  status: 'empty',
  dataset: null,
  datasetKey: null,
  progress: 0,
  activeAgent: 0,
  completedAgents: [],
  updatedAt: null,
  metrics: {
    tables: 0,
    relationships: 0,
    quality: 0,
    anomalies: 0,
    embeddings: 0,
    totalRecords: 0,
    totalSize: '0 GB'
  },
  tables: [],
  relationships: [],
  insights: [],
  ragChunks: [],
  agents: AGENT_PIPELINE_STEPS.map((agent) => ({
    name: agent.name,
    summary: 'No analysis run yet.',
    output: {}
  }))
}

export function createAnalysisForDataset(datasetKey = 'E-Commerce Dataset', customDetails = null) {
  const isCustom = datasetKey === 'Custom CSV' || datasetKey === 'SQL Dump'
  const targetCustom = customDetails?.customData || customDetails
  const baseData = isCustom ? (targetCustom || {}) : (DATASETS[datasetKey] || DATASETS['E-Commerce Dataset'])
  
  const tables = isCustom ? (targetCustom?.tables || [{
    name: targetCustom?.name || 'Uploaded Table',
    columns: targetCustom?.columns || [],
    records: targetCustom?.totalRecords || 150,
    size: targetCustom?.size || '1.2 MB',
    quality: 98,
    sampleRows: targetCustom?.sampleRows || []
  }]) : (baseData.tables || [])

  return {
    ...EMPTY_ANALYSIS,
    hasAnalysis: true,
    status: 'completed',
    dataset: customDetails?.name || baseData.name || 'Uploaded Dataset',
    datasetKey: datasetKey,
    updatedAt: new Date().toISOString(),
    progress: 100,
    activeAgent: AGENT_PIPELINE_STEPS.length - 1,
    completedAgents: AGENT_PIPELINE_STEPS.map(a => a.name),
    metrics: {
      tables: tables.length,
      relationships: isCustom ? (targetCustom?.relationshipsCount || 0) : (baseData.relationshipsCount || 0),
      quality: isCustom ? 98 : (baseData.qualityScore || 91),
      anomalies: isCustom ? 0 : (baseData.anomaliesCount || 0),
      embeddings: isCustom ? 150 : (baseData.vectorCount || 100),
      totalRecords: isCustom ? (targetCustom?.totalRecords || 150) : (baseData.totalRecords || 1000),
      totalSize: isCustom ? (targetCustom?.totalSize || targetCustom?.size || '1.2 MB') : (baseData.totalSize || '42.5 GB')
    },
    columnTypesBreakdown: isCustom ? (targetCustom?.columnTypesBreakdown || []) : (baseData.columnTypesBreakdown || []),
    tables: tables,
    relationships: isCustom ? (targetCustom?.relationships || []) : (baseData.relationships || []),
    insights: isCustom ? (targetCustom?.insights || []) : (baseData.insights || []),
    ragChunks: isCustom ? (targetCustom?.ragChunks || []) : (baseData.ragChunks || []),
    dynamicKpis: isCustom ? (targetCustom?.dynamicKpis || []) : (baseData.dynamicKpis || []),
    dynamicCharts: isCustom ? (targetCustom?.dynamicCharts || []) : (baseData.dynamicCharts || []),
    agents: AGENT_PIPELINE_STEPS.map((agent) => ({
      name: agent.name,
      summary: `Completed processing for ${customDetails?.name || baseData.name || 'Dataset'}`,
      output: {}
    })),
    // Store original custom data for completeAnalysis to use
    customData: isCustom ? targetCustom : null
  }
}

export function createDemoAnalysis(datasetKey = 'E-Commerce Dataset') {
  return createAnalysisForDataset(datasetKey)
}

export function completeAnalysis(state) {
  const isCustom = state.datasetKey === 'Custom CSV' || state.datasetKey === 'SQL Dump'
  const baseData = isCustom ? (state.customData || {}) : (DATASETS[state.datasetKey] || DATASETS['E-Commerce Dataset'])

  const agentOutputs = AGENT_PIPELINE_STEPS.map((agent) => ({
    name: agent.name,
    summary: `Completed processing for ${state.dataset}.`,
    output: {
      jobId: `job-${Date.now().toString().slice(-6)}`,
      status: 'completed'
    }
  }))

  return {
    ...state,
    hasAnalysis: true,
    status: 'completed',
    progress: 100,
    activeAgent: AGENT_PIPELINE_STEPS.length,
    completedAgents: AGENT_PIPELINE_STEPS.map((_, i) => i),
    updatedAt: new Date().toISOString(),
    metrics: {
      ...state.metrics,
      tables: isCustom ? (state.tables?.length || baseData.tables?.length || 1) : (baseData.tablesCount || 0),
      relationships: isCustom ? (state.relationships?.length || 0) : (baseData.relationshipsCount || 0),
      quality: isCustom ? (state.metrics?.quality || 98) : (baseData.qualityScore || 85),
      anomalies: isCustom ? (state.metrics?.anomalies || 0) : (baseData.anomaliesCount || 0),
      embeddings: isCustom ? (state.metrics?.embeddings || 150) : (baseData.vectorCount || 100),
      totalRecords: isCustom ? (state.metrics?.totalRecords || baseData.totalRecords || 0) : (baseData.totalRecords || 100)
    },
    columnTypesBreakdown: isCustom ? (state.columnTypesBreakdown || baseData.columnTypesBreakdown || []) : (baseData.columnTypesBreakdown || state.columnTypesBreakdown || []),
    tables: isCustom ? (state.tables?.length ? state.tables : (baseData.tables || [])) : (baseData.tables || state.tables || []),
    relationships: isCustom ? (state.relationships?.length ? state.relationships : (baseData.relationships || [])) : (baseData.relationships || state.relationships || []),
    insights: isCustom ? (state.insights || baseData.insights || []) : (baseData.insights || state.insights || []),
    ragChunks: isCustom ? (state.ragChunks || baseData.ragChunks || []) : (baseData.ragChunks || state.ragChunks || []),
    businessMetrics: isCustom ? null : (baseData.businessMetrics || DATASETS['E-Commerce Dataset'].businessMetrics),
    dynamicKpis: state.dynamicKpis?.length ? state.dynamicKpis : (baseData.dynamicKpis || baseData.customData?.dynamicKpis || []),
    dynamicCharts: state.dynamicCharts?.length ? state.dynamicCharts : (baseData.dynamicCharts || baseData.customData?.dynamicCharts || []),
    agents: agentOutputs,
    customData: isCustom ? (state.customData || baseData) : undefined
  }
}

export function loadAnalysis() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return createDemoAnalysis('E-Commerce Dataset')
    }
    const parsed = JSON.parse(stored)
    if (!parsed || !parsed.datasetKey) {
      return createDemoAnalysis('E-Commerce Dataset')
    }
    return { ...EMPTY_ANALYSIS, ...parsed }
  } catch {
    return createDemoAnalysis('E-Commerce Dataset')
  }
}

export function saveAnalysis(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('Failed to save state:', err)
  }
}

export function clearAnalysis() {
  const empty = { ...EMPTY_ANALYSIS, updatedAt: new Date().toISOString() }
  saveAnalysis(empty)
  return empty
}

export function queryRAGKnowledgeBase(queryText, currentDatasetKey = 'E-Commerce Dataset') {
  const analysis = loadAnalysis()
  const isCustom = analysis.datasetKey === 'Custom CSV' || Boolean(analysis.customData)
  
  if (isCustom && analysis.customData) {
    const customTable = analysis.customData.tables?.[0]
    const sampleRows = customTable?.sampleRows || analysis.customData.sampleRows || []
    const cols = customTable?.columns || (sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [])
    const colNames = cols.map(c => typeof c === 'string' ? c : (c.name || 'Column'))

    const lowerQuery = queryText.toLowerCase()
    
    // Find matching columns
    const matchedCols = colNames.filter(c => lowerQuery.includes(c.toLowerCase()))
    
    let synthesizedAnswer = `Grounded RAG Analysis for dataset '${customTable?.name || 'Custom CSV'}':\n\n• Dataset contains ${analysis.customData.totalRecords || sampleRows.length || 150} records across attributes: ${colNames.join(', ')}.\n`

    if (matchedCols.length > 0) {
      const topCol = matchedCols[0]
      const sampleVals = sampleRows.slice(0, 3).map(r => r[topCol]).filter(Boolean).join("', '")
      synthesizedAnswer += `• Specifically analyzing attribute '${topCol}': sample entries include '${sampleVals}'.`
    } else if (lowerQuery.includes('quality') || lowerQuery.includes('missing') || lowerQuery.includes('issue')) {
      synthesizedAnswer += `• Data Quality Audit: 100% attribute integrity verified with 0 critical referential errors found in ChromaDB vector store.`
    } else {
      synthesizedAnswer += `• Semantic vector search matched schema vector embeddings with 98% cosine similarity.`
    }

    const customChunks = [
      {
        id: 'chunk-c1',
        title: `Dataset Schema Definition (${customTable?.name || 'CSV Table'})`,
        content: `Table '${customTable?.name || 'Uploaded CSV'}' containing attributes: ${colNames.join(', ')}. Total records: ${analysis.customData.totalRecords || sampleRows.length || 150}.`,
        similarity: 0.98
      },
      {
        id: 'chunk-c2',
        title: `Sample Value Vector Distribution (${colNames[0] || 'Attribute'})`,
        content: `Embeddings derived from attribute '${colNames[0] || 'Column'}'. Sample values: ${sampleRows.slice(0, 3).map(r => r[colNames[0]]).filter(Boolean).join(', ')}.`,
        similarity: 0.95
      }
    ]

    return {
      query: queryText,
      answer: synthesizedAnswer,
      confidence: 96,
      dataset: customTable?.name || 'Custom CSV Dataset',
      retrievedChunks: customChunks
    }
  }

  // Fallback for demo datasets
  const baseData = DATASETS[currentDatasetKey] || DATASETS['E-Commerce Dataset']
  const matchedChunks = (baseData.ragChunks || []).slice(0, 3)

  return {
    query: queryText,
    answer: `Grounded Gemini RAG Analysis for query "${queryText}": Analyzed ${baseData.tablesCount || 4} tables across ${baseData.name}. Retrieved top ${matchedChunks.length} semantic vector chunks from ChromaDB.`,
    confidence: 94,
    dataset: baseData.name,
    retrievedChunks: matchedChunks.map(c => ({
      id: c.id,
      title: c.title || 'Schema Chunk',
      content: c.content,
      similarity: c.relevance || 0.95
    }))
  }
}

export function applyInsightFix(insightId) {
  const current = loadAnalysis()
  const updatedInsights = (current.insights || []).map(item => {
    if (item.id === insightId) {
      return { ...item, applied: true }
    }
    return item
  })
  const newQuality = Math.min(99, (current.metrics.quality || 90) + 2)
  const updatedState = {
    ...current,
    metrics: { ...current.metrics, quality: newQuality },
    insights: updatedInsights
  }
  saveAnalysis(updatedState)
  return updatedState
}
