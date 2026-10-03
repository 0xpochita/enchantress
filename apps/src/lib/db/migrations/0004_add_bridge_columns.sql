ALTER TABLE "executions" ADD COLUMN "origin_chain" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "origin_asset_id" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "origin_amount_base" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "origin_tx_hash" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "aurora_deposit_address" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "aurora_deposit_memo" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "aurora_deadline" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "aurora_status" text;