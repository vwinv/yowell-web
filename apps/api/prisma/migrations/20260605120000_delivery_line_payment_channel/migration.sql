-- Moyen de paiement par ligne de course (et par frais), plus au niveau de la course entière.

ALTER TABLE "DeliveryRunItem" ADD COLUMN "paymentChannel" "PaymentChannel" NOT NULL DEFAULT 'CASH';
ALTER TABLE "DeliveryRunFee" ADD COLUMN "paymentChannel" "PaymentChannel" NOT NULL DEFAULT 'CASH';

UPDATE "DeliveryRunItem" AS item
SET "paymentChannel" = run."paymentChannel"
FROM "DeliveryRun" AS run
WHERE item."runId" = run.id;

UPDATE "DeliveryRunFee" AS fee
SET "paymentChannel" = run."paymentChannel"
FROM "DeliveryRun" AS run
WHERE fee."runId" = run.id;

DROP INDEX "DeliveryRun_paymentChannel_idx";
ALTER TABLE "DeliveryRun" DROP COLUMN "paymentChannel";

CREATE INDEX "DeliveryRunItem_paymentChannel_idx" ON "DeliveryRunItem"("paymentChannel");
CREATE INDEX "DeliveryRunFee_paymentChannel_idx" ON "DeliveryRunFee"("paymentChannel");
