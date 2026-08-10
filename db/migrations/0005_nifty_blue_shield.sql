CREATE TABLE "card_dependencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"blocker_card_id" uuid NOT NULL,
	"blocked_card_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "public_token" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "start_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "parent_card_id" uuid;--> statement-breakpoint
ALTER TABLE "card_dependencies" ADD CONSTRAINT "card_dependencies_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_dependencies" ADD CONSTRAINT "card_dependencies_blocker_card_id_cards_id_fk" FOREIGN KEY ("blocker_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_dependencies" ADD CONSTRAINT "card_dependencies_blocked_card_id_cards_id_fk" FOREIGN KEY ("blocked_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_dependencies_pair_idx" ON "card_dependencies" USING btree ("blocker_card_id","blocked_card_id");--> statement-breakpoint
CREATE INDEX "card_dependencies_blocked_idx" ON "card_dependencies" USING btree ("blocked_card_id");--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_parent_card_id_cards_id_fk" FOREIGN KEY ("parent_card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "boards_public_token_idx" ON "boards" USING btree ("public_token");--> statement-breakpoint
CREATE INDEX "cards_parent_idx" ON "cards" USING btree ("parent_card_id");