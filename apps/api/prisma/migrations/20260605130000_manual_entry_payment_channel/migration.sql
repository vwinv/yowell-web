-- Canal de paiement obligatoire sur les écritures comptables manuelles.

ALTER TABLE "ManualAccountingEntry" ADD COLUMN "paymentChannel" "PaymentChannel" NOT NULL DEFAULT 'CASH';
ALTER TABLE "ManualAccountingEntry" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "ManualAccountingEntry_paymentChannel_idx" ON "ManualAccountingEntry"("paymentChannel");
