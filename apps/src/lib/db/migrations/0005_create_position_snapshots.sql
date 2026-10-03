CREATE TABLE "position_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"taken_at" date NOT NULL,
	"total_value_usd" numeric(18, 2) NOT NULL,
	"by_index" jsonb NOT NULL,
	CONSTRAINT "position_snapshots_user_id_taken_at_unique" UNIQUE("user_id","taken_at")
);
--> statement-breakpoint
ALTER TABLE "position_snapshots" ADD CONSTRAINT "position_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;