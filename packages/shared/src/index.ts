export type HealthStatus = {
  status: "ok" | "error";
  service: string;
  timestamp: string;
};

/** Utilisateurs administration */
export type UserRole = "admin" | "staff";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
};

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
};

export type UpdateUserInput = {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type AuthResponse = {
  token: string;
  user: AppUser;
};

export type ActivityLogEntry = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  summary: string;
  method: string;
  path: string;
  createdAt: string;
};

export type ActivityOverview = {
  entries: ActivityLogEntry[];
  total: number;
};

/** Statistiques globales (jus de fruits) */
export type StatsDayPoint = {
  date: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
};

export type StatsTopProduct = {
  productName: string;
  quantity: number;
  revenue: number;
};

export type StatsPeriodPreset =
  | "today"
  | "week"
  | "month"
  | "year"
  | "custom";

export type StatsPeriod = {
  preset: StatsPeriodPreset;
  from: string;
  to: string;
  label: string;
};

export type StatsOverview = {
  period: StatsPeriod;
  revenue: number;
  expenses: number;
  profit: number;
  ordersCount: number;
  recentDays: StatsDayPoint[];
  topProducts: StatsTopProduct[];
};

export type StatsQuery = {
  preset?: StatsPeriodPreset;
  from?: string;
  to?: string;
};

/** Stock — jus en bouteilles (1 L et/ou 250 ml par produit) */
/** Devise utilisée dans l'application */
export const CURRENCY_CODE = "XOF" as const;
export const CURRENCY_LABEL = "FCFA" as const;

/** Formate un montant en franc CFA (sans décimales) */
export function formatCfa(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} ${CURRENCY_LABEL}`;
}

export type JuiceVolume = "1L" | "250ml";

export type JuiceFormat = {
  volume: JuiceVolume;
  price: number;
  quantity: number;
  minQuantity: number;
  enabled: boolean;
};

export type JuiceProduct = {
  id: string;
  name: string;
  description: string;
  photoUrls: string[];
  formats: JuiceFormat[];
  createdAt: string;
};

export function productTotalStock(product: JuiceProduct): number {
  return product.formats
    .filter((f) => f.enabled)
    .reduce((sum, f) => sum + f.quantity, 0);
}

export function productHasLowStock(product: JuiceProduct): boolean {
  return product.formats.some(
    (f) => f.enabled && f.quantity <= f.minQuantity,
  );
}

export type ProductionRecord = {
  id: string;
  productId: string;
  productName: string;
  volume: JuiceVolume;
  quantity: number;
  producedAt: string;
  notes: string;
  createdAt: string;
};

export type StockOverview = {
  products: JuiceProduct[];
  recentProductions: ProductionRecord[];
  totalUnitsInStock: number;
  lowStockCount: number;
  productionsThisMonth: number;
};

export type CreateJuiceFormatInput = {
  volume: JuiceVolume;
  price: number;
  minQuantity?: number;
  enabled: boolean;
};

export type CreateJuiceProductInput = {
  name: string;
  description?: string;
  formats: CreateJuiceFormatInput[];
};

export type CreateProductionInput = {
  productId: string;
  volume: JuiceVolume;
  quantity: number;
  producedAt?: string;
  notes?: string;
};

/** Comptabilité — entrées / sorties */
export const DEFAULT_CAISSE_AMOUNT = 25_865;

export type AccountingEntrySource = "manual" | "sale" | "delivery" | "caisse";

export type AccountingEntry = {
  id: string;
  date: string;
  label: string;
  amount: number;
  type: "income" | "expense";
  source: AccountingEntrySource;
  /** ID vente, course ou écriture manuelle */
  sourceId?: string;
};

export type ManualAccountingEntry = {
  id: string;
  date: string;
  label: string;
  amount: number;
  type: "income" | "expense";
  createdAt: string;
};

export type CreateManualAccountingEntryInput = {
  date: string;
  label: string;
  amount: number;
  type: "income" | "expense";
};

export type UpdateCaisseInput = {
  amount: number;
};

export type AccountingOverview = {
  /** Argent déjà en caisse au démarrage du suivi */
  caisse: number;
  /** Caisse + revenus − dépenses */
  balance: number;
  /** Revenus du mois (ventes + manuels, hors caisse) */
  incomeMonth: number;
  expenseMonth: number;
  /** Caisse + tous les revenus enregistrés */
  incomeTotal: number;
  /** Ventes + revenus manuels uniquement */
  incomeFromOperations: number;
  expenseTotal: number;
  recentEntries: AccountingEntry[];
};

/** Courses — tournées avec lignes libellé / quantité / prix */
export type DeliveryRunLine = {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  /** true = il reste après production ; false = tout utilisé ; absent = pas encore renseigné */
  hasRemaining?: boolean;
  /** Détail de ce qu'il reste (obligatoire si hasRemaining === true) */
  remainingNote?: string;
};

export type DeliveryRunFee = {
  id: string;
  label: string;
  amount: number;
};

export type DeliveryRun = {
  id: string;
  date: string;
  items: DeliveryRunLine[];
  fees: DeliveryRunFee[];
  totalAmount: number;
  createdAt: string;
};

/** Ligne encore en stock après une course (liste agrégée) */
export type DeliveryRemainingItem = {
  runId: string;
  runDate: string;
  itemId: string;
  label: string;
  quantity: number;
  remainingNote: string;
};

export type DeliveriesOverview = {
  runs: DeliveryRun[];
  /** Tous les articles encore restants, toutes courses confondues */
  remainingItems: DeliveryRemainingItem[];
  totalRuns: number;
  totalRunsMonth: number;
  totalAmountMonth: number;
};

export type CreateDeliveryRunLineInput = {
  label: string;
  quantity: number;
  unitPrice: number;
};

export type CreateDeliveryRunFeeInput = {
  label: string;
  amount: number;
};

export type CreateDeliveryRunInput = {
  date: string;
  items: CreateDeliveryRunLineInput[];
  fees?: CreateDeliveryRunFeeInput[];
};

export type UpdateDeliveryItemRemainingInput = {
  itemId: string;
  hasRemaining: boolean;
  remainingNote?: string;
};

export function deliveryRunTotal(items: DeliveryRunLine[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}

export function buildDeliveryRemainingItems(runs: DeliveryRun[]): DeliveryRemainingItem[] {
  const items: DeliveryRemainingItem[] = [];

  for (const run of runs) {
    for (const item of run.items) {
      if (item.hasRemaining !== true) continue;
      items.push({
        runId: run.id,
        runDate: run.date,
        itemId: item.id,
        label: item.label,
        quantity: item.quantity,
        remainingNote: item.remainingNote?.trim() ?? "",
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.runDate).getTime() - new Date(a.runDate).getTime(),
  );
}

export function deliveryRemainingCounts(items: DeliveryRunLine[]): {
  pending: number;
  withRemaining: number;
  usedUp: number;
} {
  let pending = 0;
  let withRemaining = 0;
  let usedUp = 0;
  for (const item of items) {
    if (item.hasRemaining === undefined) pending += 1;
    else if (item.hasRemaining) withRemaining += 1;
    else usedUp += 1;
  }
  return { pending, withRemaining, usedUp };
}

/** Clients */
export type Client = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt: string;
};

export type ClientSummary = Client & {
  orderCount: number;
  totalSpent: number;
};

export type ClientsOverview = {
  clients: ClientSummary[];
  totalClients: number;
  totalOrders: number;
};

export type CreateClientInput = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
};

/** Ventes */
export type SalePaymentStatus = "paid" | "unpaid";

export type SaleLineItem = {
  productId: string;
  productName: string;
  volume: JuiceVolume;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type Sale = {
  id: string;
  clientId: string;
  clientName: string;
  orderedAt: string;
  items: SaleLineItem[];
  totalAmount: number;
  paymentStatus: SalePaymentStatus;
  notes: string;
  createdAt: string;
};

export type SalesOverview = {
  sales: Sale[];
  recentSales: Sale[];
  salesToday: number;
  revenueToday: number;
  revenueMonth: number;
};

export type CreateSaleLineInput = {
  productId: string;
  volume: JuiceVolume;
  quantity: number;
};

export type CreateSaleInput = {
  clientId: string;
  orderedAt?: string;
  items: CreateSaleLineInput[];
  paymentStatus?: SalePaymentStatus;
  notes?: string;
};

export type UpdateSalePaymentInput = {
  paymentStatus: SalePaymentStatus;
};

export function saleTotal(items: SaleLineItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}
