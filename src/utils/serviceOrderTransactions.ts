import { ServiceOrder, ServiceOrderInput, TransactionInput } from '@/types';

type ServiceOrderLike = Pick<
  ServiceOrderInput,
  'id' | 'customerName' | 'value' | 'paymentMethod' | 'paymentSplits' | 'notes' | 'status'
> & {
  createdAt?: string;
  updatedAt?: string;
};

export type ServiceOrderTransactionPayload = Omit<TransactionInput, 'sessionId'>;

export interface BuildServiceOrderTransactionOptions {
  createdAt?: string;
  fallbackId?: string;
  notes?: string;
  type?: TransactionInput['type'];
  description?: string;
}

const resolveOrderId = (order: ServiceOrderLike, fallbackId?: string) => {
  return order.id ?? fallbackId;
};

const buildDefaultDescription = (
  order: ServiceOrderLike,
  orderId?: string,
) => {
  if (!orderId) {
    return `OS - ${order.customerName}`;
  }

  const suffix = orderId.slice(-4);
  return `OS ${suffix} - ${order.customerName}`;
};

const buildDefaultNotes = (orderId?: string) => {
  if (!orderId) return undefined;
  return `Lançamento automático da OS ${orderId}`;
};

const resolveCreatedAt = (order: ServiceOrderLike, provided?: string) => {
  if (provided) return provided;
  return order.updatedAt ?? order.createdAt ?? new Date().toISOString();
};

export const buildServiceOrderTransactionPayload = (
  order: ServiceOrderInput | ServiceOrder,
  options: BuildServiceOrderTransactionOptions = {},
): ServiceOrderTransactionPayload => {
  const orderLike: ServiceOrderLike = order;
  const orderId = resolveOrderId(orderLike, options.fallbackId);
  const createdAt = resolveCreatedAt(orderLike, options.createdAt);

  const description = options.description ?? buildDefaultDescription(orderLike, orderId);
  const notes = options.notes ?? buildDefaultNotes(orderId);

  return {
    type: options.type ?? 'venda',
    description,
    quantity: 1,
    unitPrice: orderLike.value,
    total: orderLike.value,
    paymentMethod: orderLike.paymentMethod,
    paymentSplits: orderLike.paymentSplits,
    notes,
    createdAt,
  };
};

export interface ServiceOrderTransactionExtras {
  transactionPayload?: ServiceOrderTransactionPayload;
}
