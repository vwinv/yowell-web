export type HealthStatus = {
  status: "ok" | "error";
  service: string;
  timestamp: string;
};

/** Utilisateurs administration */
export type UserRole = "admin" | "staff";

export type {
  AppModulePermission,
  PermissionUser,
} from "./permissions";
export {
  ALL_MODULE_PERMISSIONS,
  formatPermissionList,
  MODULE_PERMISSION_OPTIONS,
  permissionForApiPath,
  permissionForRoute,
  permissionLabel,
  userCanMutate,
} from "./permissions";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: import("./permissions").AppModulePermission[];
  active: boolean;
  createdAt: string;
};

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
  permissions?: import("./permissions").AppModulePermission[];
};

export type UpdateUserInput = {
  email?: string;
  name?: string;
  password?: string;
  role?: UserRole;
  permissions?: import("./permissions").AppModulePermission[];
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

/** Même champs que la création — ajuste le stock en conséquence. */
export type UpdateProductionInput = CreateProductionInput;

/** Comptabilité — entrées / sorties */
export const DEFAULT_CAISSE_AMOUNT = 19_350;

/** Canaux de paiement (encaissements et dépenses) */
export type PaymentChannel = "cash" | "om" | "wave";

export const PAYMENT_CHANNEL_OPTIONS: {
  value: PaymentChannel;
  label: string;
}[] = [
  { value: "cash", label: "Cash" },
  { value: "om", label: "Orange Money" },
  { value: "wave", label: "Wave" },
];

export function paymentChannelLabel(
  channel: PaymentChannel | undefined | null,
): string {
  if (!channel) return "—";
  return (
    PAYMENT_CHANNEL_OPTIONS.find((option) => option.value === channel)?.label ??
    channel
  );
}

export type ChannelBalances = {
  cash: number;
  om: number;
  wave: number;
};

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
  paymentChannel?: PaymentChannel;
};

export type ManualAccountingEntry = {
  id: string;
  date: string;
  label: string;
  amount: number;
  type: "income" | "expense";
  paymentChannel: PaymentChannel;
  createdAt: string;
};

export type CreateManualAccountingEntryInput = {
  date: string;
  label: string;
  amount: number;
  type: "income" | "expense";
  paymentChannel: PaymentChannel;
};

export type UpdateManualAccountingEntryInput = CreateManualAccountingEntryInput;

export type UpdateCaisseInput = {
  amount: number;
};

export type UpdateChannelBalancesInput = {
  cash: number;
  om: number;
  wave: number;
};

export type AccountingOverview = {
  /** Solde d'ouverture cash (caisse physique) */
  caisse: number;
  /** Soldes d'ouverture OM et Wave */
  openingBalances: ChannelBalances;
  /** Solde actuel par canal (ouverture + ventes payées − courses) */
  channelBalances: ChannelBalances;
  /** Caisse + revenus − dépenses (tous canaux + manuels) */
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
  paymentChannel: PaymentChannel;
  /** true = il reste après production ; false = tout utilisé ; absent = pas encore renseigné */
  hasRemaining?: boolean;
  /** Détail de ce qu'il reste (obligatoire si hasRemaining === true) */
  remainingNote?: string;
  /** Stock initial restant constaté au moment de la saisie */
  initialRemainingStock?: number;
};

export type DeliveryRunFee = {
  id: string;
  label: string;
  amount: number;
  paymentChannel: PaymentChannel;
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
  initialRemainingStock?: number;
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
  paymentChannel: PaymentChannel;
};

export type CreateDeliveryRunFeeInput = {
  label: string;
  amount: number;
  paymentChannel: PaymentChannel;
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
  initialRemainingStock?: number;
};

export function deliveryRunTotal(items: DeliveryRunLine[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}

export function deliveryRunPaymentChannels(
  run: Pick<DeliveryRun, "items" | "fees">,
): PaymentChannel[] {
  const channels = new Set<PaymentChannel>();
  for (const item of run.items) channels.add(item.paymentChannel);
  for (const fee of run.fees) channels.add(fee.paymentChannel);
  return [...channels];
}

export function deliveryRunPaymentSummary(
  run: Pick<DeliveryRun, "items" | "fees">,
): string {
  const channels = deliveryRunPaymentChannels(run);
  if (!channels.length) return "—";
  return channels.map((channel) => paymentChannelLabel(channel)).join(" + ");
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
        initialRemainingStock: item.initialRemainingStock,
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
export const SALE_PERSONALIZATION_FEE = 100;

export type SalePaymentStatus = "paid" | "unpaid";

export type SaleDeliveryStatus = "delivered" | "not_delivered";

/** Vente confirmée ou devis (sans impact stock) */
export type SaleKind = "sale" | "quote";

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
  /** +100 FCFA par bouteille */
  personalization: boolean;
  /** Remise appliquée sur le total (FCFA) */
  discountAmount: number;
  paymentStatus: SalePaymentStatus;
  paymentChannel?: PaymentChannel;
  kind: SaleKind;
  deliveryStatus: SaleDeliveryStatus;
  notes: string;
  createdAt: string;
};

export type SalesOverview = {
  sales: Sale[];
  recentSales: Sale[];
  undeliveredSales: Sale[];
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
  personalization?: boolean;
  discountAmount?: number;
  paymentStatus?: SalePaymentStatus;
  paymentChannel?: PaymentChannel;
  kind?: SaleKind;
  notes?: string;
};

export type UpdateSalePaymentInput = {
  paymentStatus: SalePaymentStatus;
  paymentChannel?: PaymentChannel;
};

export type UpdateSaleDeliveryInput = {
  deliveryStatus: SaleDeliveryStatus;
};

export type UpdateSaleInput = {
  clientId: string;
  orderedAt?: string;
  items: CreateSaleLineInput[];
  personalization?: boolean;
  discountAmount?: number;
  notes?: string;
  paymentStatus?: SalePaymentStatus;
  paymentChannel?: PaymentChannel;
};

export function saleTotal(items: SaleLineItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0);
}

export function saleBottleCount(
  items: Pick<SaleLineItem, "quantity">[],
): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function computeSaleTotalAmount(
  items: Pick<SaleLineItem, "lineTotal" | "quantity">[],
  personalization = false,
  discountAmount = 0,
): number {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const personalizationFee = personalization
    ? SALE_PERSONALIZATION_FEE * saleBottleCount(items)
    : 0;
  const total = subtotal + personalizationFee - Math.max(0, discountAmount);
  return Math.max(0, Math.round(total));
}
