import {
  AccountingEntryType as PrismaAccountingEntryType,
  JuiceVolume as PrismaJuiceVolume,
  type Prisma,
  PaymentChannel as PrismaPaymentChannel,
  SalePaymentStatus as PrismaSalePaymentStatus,
  SaleKind as PrismaSaleKind,
  UserRole as PrismaUserRole,
} from "@prisma/client";
import type {
  ActivityLogEntry,
  AppUser,
  Client,
  DeliveryRun,
  DeliveryRunFee,
  DeliveryRunLine,
  JuiceFormat,
  JuiceProduct,
  JuiceVolume,
  ManualAccountingEntry,
  PaymentChannel,
  ProductionRecord,
  Sale,
  SaleKind,
  SaleLineItem,
  SalePaymentStatus,
  UserRole,
} from "@yowell/shared";

type PrismaUserRecord = Prisma.UserGetPayload<Record<string, never>>;
type PrismaActivityLogRecord = Prisma.ActivityLogGetPayload<Record<string, never>>;
type PrismaClientRecord = Prisma.ClientGetPayload<Record<string, never>>;
type PrismaSaleRecord = Prisma.SaleGetPayload<{
  include: { items: true };
}>;
type PrismaProductRecord = Prisma.ProductGetPayload<{
  include: { formats: true; photos: true };
}>;
type PrismaProductionRecord = Prisma.ProductionRecordGetPayload<Record<string, never>>;
type PrismaManualAccountingEntryRecord = Prisma.ManualAccountingEntryGetPayload<
  Record<string, never>
>;
type PrismaDeliveryRunRecord = Prisma.DeliveryRunGetPayload<{
  include: { items: true; fees: true };
}>;

function dateToIso(date: Date): string {
  return date.toISOString();
}

export function toPrismaUserRole(role: UserRole): PrismaUserRole {
  return role === "admin" ? PrismaUserRole.ADMIN : PrismaUserRole.STAFF;
}

export function toSharedUserRole(role: PrismaUserRole): UserRole {
  return role === PrismaUserRole.ADMIN ? "admin" : "staff";
}

export function toPrismaJuiceVolume(volume: JuiceVolume): PrismaJuiceVolume {
  return volume === "1L" ? PrismaJuiceVolume.ONE_L : PrismaJuiceVolume.ML_250;
}

export function toSharedJuiceVolume(volume: PrismaJuiceVolume): JuiceVolume {
  return volume === PrismaJuiceVolume.ONE_L ? "1L" : "250ml";
}

export function toPrismaSalePaymentStatus(
  status: SalePaymentStatus,
): PrismaSalePaymentStatus {
  return status === "paid"
    ? PrismaSalePaymentStatus.PAID
    : PrismaSalePaymentStatus.UNPAID;
}

export function toSharedSalePaymentStatus(
  status: PrismaSalePaymentStatus,
): SalePaymentStatus {
  return status === PrismaSalePaymentStatus.PAID ? "paid" : "unpaid";
}

export function toPrismaSaleKind(kind: SaleKind): PrismaSaleKind {
  return kind === "quote" ? PrismaSaleKind.QUOTE : PrismaSaleKind.SALE;
}

export function toSharedSaleKind(kind: PrismaSaleKind): SaleKind {
  return kind === PrismaSaleKind.QUOTE ? "quote" : "sale";
}

export function toPrismaPaymentChannel(
  channel: PaymentChannel,
): PrismaPaymentChannel {
  switch (channel) {
    case "om":
      return PrismaPaymentChannel.OM;
    case "wave":
      return PrismaPaymentChannel.WAVE;
    default:
      return PrismaPaymentChannel.CASH;
  }
}

export function toSharedPaymentChannel(
  channel: PrismaPaymentChannel,
): PaymentChannel {
  switch (channel) {
    case PrismaPaymentChannel.OM:
      return "om";
    case PrismaPaymentChannel.WAVE:
      return "wave";
    default:
      return "cash";
  }
}

export function toPrismaAccountingEntryType(
  type: "income" | "expense",
): PrismaAccountingEntryType {
  return type === "income"
    ? PrismaAccountingEntryType.INCOME
    : PrismaAccountingEntryType.EXPENSE;
}

export function toSharedAccountingEntryType(
  type: PrismaAccountingEntryType,
): "income" | "expense" {
  return type === PrismaAccountingEntryType.INCOME ? "income" : "expense";
}

export function mapUser(user: PrismaUserRecord): AppUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: toSharedUserRole(user.role),
    active: user.active,
    createdAt: dateToIso(user.createdAt),
  };
}

export function mapActivityLogEntry(
  entry: PrismaActivityLogRecord,
): ActivityLogEntry {
  return {
    id: entry.id,
    userId: entry.userId ?? "unknown",
    userName: entry.userName,
    userEmail: entry.userEmail,
    action: entry.action,
    summary: entry.summary,
    method: entry.method,
    path: entry.path,
    createdAt: dateToIso(entry.createdAt),
  };
}

export function mapClient(client: PrismaClientRecord): Client {
  return {
    id: client.id,
    name: client.name,
    phone: client.phone,
    email: client.email,
    address: client.address,
    notes: client.notes,
    createdAt: dateToIso(client.createdAt),
  };
}

function sortVolume(a: JuiceFormat, b: JuiceFormat) {
  const rank = (volume: JuiceVolume) => (volume === "1L" ? 0 : 1);
  return rank(a.volume) - rank(b.volume);
}

export function mapProduct(product: PrismaProductRecord): JuiceProduct {
  const photoUrls = [...product.photos]
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .map((photo) => photo.url);

  const formats: JuiceFormat[] = product.formats
    .map((format) => ({
      volume: toSharedJuiceVolume(format.volume),
      price: format.price,
      quantity: format.quantity,
      minQuantity: format.minQuantity,
      enabled: format.enabled,
    }))
    .sort(sortVolume);

  return {
    id: product.id,
    name: product.name,
    description: product.description,
    photoUrls,
    formats,
    createdAt: dateToIso(product.createdAt),
  };
}

export function mapProductionRecord(
  record: PrismaProductionRecord,
): ProductionRecord {
  return {
    id: record.id,
    productId: record.productId,
    productName: record.productName,
    volume: toSharedJuiceVolume(record.volume),
    quantity: record.quantity,
    producedAt: dateToIso(record.producedAt),
    notes: record.notes,
    createdAt: dateToIso(record.createdAt),
  };
}

export function mapManualAccountingEntry(
  entry: PrismaManualAccountingEntryRecord,
): ManualAccountingEntry {
  return {
    id: entry.id,
    date: dateToIso(entry.date),
    label: entry.label,
    amount: entry.amount,
    type: toSharedAccountingEntryType(entry.type),
    createdAt: dateToIso(entry.createdAt),
  };
}

function mapSaleLineItem(item: PrismaSaleRecord["items"][number]): SaleLineItem {
  return {
    productId: item.productId,
    productName: item.productName,
    volume: toSharedJuiceVolume(item.volume),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
  };
}

export function mapSale(sale: PrismaSaleRecord): Sale {
  return {
    id: sale.id,
    clientId: sale.clientId,
    clientName: sale.clientName,
    orderedAt: dateToIso(sale.orderedAt),
    items: [...sale.items]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapSaleLineItem),
    totalAmount: sale.totalAmount,
    personalization: sale.personalization,
    discountAmount: sale.discountAmount,
    paymentStatus: toSharedSalePaymentStatus(sale.paymentStatus),
    paymentChannel: sale.paymentChannel
      ? toSharedPaymentChannel(sale.paymentChannel)
      : undefined,
    kind: toSharedSaleKind(sale.kind),
    notes: sale.notes,
    createdAt: dateToIso(sale.createdAt),
  };
}

function mapDeliveryRunLine(
  item: PrismaDeliveryRunRecord["items"][number],
): DeliveryRunLine {
  return {
    id: item.id,
    label: item.label,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    lineTotal: item.lineTotal,
    hasRemaining: item.hasRemaining ?? undefined,
    remainingNote: item.remainingNote ?? undefined,
    initialRemainingStock: item.initialRemainingStock ?? undefined,
  };
}

function mapDeliveryRunFee(
  fee: PrismaDeliveryRunRecord["fees"][number],
): DeliveryRunFee {
  return {
    id: fee.id,
    label: fee.label,
    amount: fee.amount,
  };
}

export function mapDeliveryRun(run: PrismaDeliveryRunRecord): DeliveryRun {
  return {
    id: run.id,
    date: dateToIso(run.date),
    items: [...run.items]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapDeliveryRunLine),
    fees: [...run.fees]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapDeliveryRunFee),
    totalAmount: run.totalAmount,
    paymentChannel: toSharedPaymentChannel(run.paymentChannel),
    createdAt: dateToIso(run.createdAt),
  };
}
