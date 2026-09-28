CREATE TYPE "public"."note_entity" AS ENUM('inquiry', 'booking_request', 'venue');--> statement-breakpoint
CREATE TYPE "public"."note_kind" AS ENUM('note', 'stage', 'owner', 'follow_up');--> statement-breakpoint
CREATE TABLE "admin_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "note_entity" NOT NULL,
	"entity_id" uuid NOT NULL,
	"kind" "note_kind" DEFAULT 'note' NOT NULL,
	"body" text NOT NULL,
	"author_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DEFAULT 'new'::text;--> statement-breakpoint
-- Hand-added: the old "handled" stage no longer exists; those leads were acted on, so they become "contacted".
UPDATE "inquiries" SET "status" = 'contacted' WHERE "status" = 'handled';--> statement-breakpoint
DROP TYPE "public"."inquiry_status";--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'contacted', 'offered', 'won', 'lost');--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DEFAULT 'new'::"public"."inquiry_status";--> statement-breakpoint
ALTER TABLE "inquiries" ALTER COLUMN "status" SET DATA TYPE "public"."inquiry_status" USING "status"::"public"."inquiry_status";--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "owner_user_id" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "follow_up_on" date;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "lost_reason" text;--> statement-breakpoint
ALTER TABLE "inquiries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "admin_notes" ADD CONSTRAINT "admin_notes_author_user_id_user_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_notes_entity_idx" ON "admin_notes" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inquiries_owner_idx" ON "inquiries" USING btree ("owner_user_id");