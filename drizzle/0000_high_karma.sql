CREATE TYPE "public"."booking_status" AS ENUM('pending', 'accepted', 'declined', 'expired', 'paid', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."hall_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."hall_type" AS ENUM('conference_hall', 'ballroom', 'meeting_room', 'auditorium', 'exhibition_hall');--> statement-breakpoint
CREATE TYPE "public"."inquiry_kind" AS ENUM('contact', 'brief');--> statement-breakpoint
CREATE TYPE "public"."inquiry_status" AS ENUM('new', 'handled');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('whatsapp', 'email');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('pending', 'sent', 'failed', 'dead');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."price_unit" AS ENUM('hour', 'half_day', 'day');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('none', 'trial', 'active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."time_of_day" AS ENUM('morning', 'afternoon', 'evening', 'full_day');--> statement-breakpoint
CREATE TYPE "public"."venue_status" AS ENUM('draft', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "amenities" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"hall_id" uuid NOT NULL,
	"area_id" uuid,
	"organizer_user_id" text,
	"contact_name" text NOT NULL,
	"contact_phone" text NOT NULL,
	"contact_email" text NOT NULL,
	"event_type" text NOT NULL,
	"event_date" date NOT NULL,
	"time_of_day" time_of_day DEFAULT 'full_day' NOT NULL,
	"guests" integer NOT NULL,
	"message" text,
	"status" "booking_status" DEFAULT 'pending' NOT NULL,
	"quoted_total_tetri" integer,
	"deposit_tetri" integer,
	"decline_reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cities" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_types" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_amenities" (
	"hall_id" uuid NOT NULL,
	"amenity_slug" text NOT NULL,
	CONSTRAINT "hall_amenities_hall_id_amenity_slug_pk" PRIMARY KEY("hall_id","amenity_slug")
);
--> statement-breakpoint
CREATE TABLE "hall_areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hall_id" uuid NOT NULL,
	"name" jsonb NOT NULL,
	"capacity_theatre" integer,
	"capacity_classroom" integer,
	"capacity_banquet" integer,
	"capacity_reception" integer,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_event_types" (
	"hall_id" uuid NOT NULL,
	"event_type_slug" text NOT NULL,
	CONSTRAINT "hall_event_types_hall_id_event_type_slug_pk" PRIMARY KEY("hall_id","event_type_slug")
);
--> statement-breakpoint
CREATE TABLE "hall_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hall_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt" jsonb,
	"is_cover" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "halls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"venue_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"hall_type" "hall_type" DEFAULT 'conference_hall' NOT NULL,
	"price_from_tetri" integer NOT NULL,
	"price_unit" "price_unit" DEFAULT 'day' NOT NULL,
	"capacity_min" integer NOT NULL,
	"capacity_max" integer NOT NULL,
	"indoor" boolean DEFAULT true NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "hall_status" DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "inquiry_kind" NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text NOT NULL,
	"message" text,
	"city_slug" text,
	"event_type" text,
	"guests" integer,
	"event_date" date,
	"status" "inquiry_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"recipient" text NOT NULL,
	"locale" text DEFAULT 'ka' NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" "outbox_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_request_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_order_id" text NOT NULL,
	"amount_tetri" integer NOT NULL,
	"currency" text DEFAULT 'GEL' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"checkout_url" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "venues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb,
	"city_slug" text NOT NULL,
	"address" jsonb,
	"lat" double precision,
	"lng" double precision,
	"phone" text,
	"email" text,
	"whatsapp" text,
	"website" text,
	"status" "venue_status" DEFAULT 'draft' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"subscription_status" "subscription_status" DEFAULT 'none' NOT NULL,
	"subscription_until" date,
	"deposit_percent" integer,
	"owner_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_area_id_hall_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."hall_areas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_event_type_event_types_slug_fk" FOREIGN KEY ("event_type") REFERENCES "public"."event_types"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_amenities" ADD CONSTRAINT "hall_amenities_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_amenities" ADD CONSTRAINT "hall_amenities_amenity_slug_amenities_slug_fk" FOREIGN KEY ("amenity_slug") REFERENCES "public"."amenities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_areas" ADD CONSTRAINT "hall_areas_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_event_types" ADD CONSTRAINT "hall_event_types_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_event_types" ADD CONSTRAINT "hall_event_types_event_type_slug_event_types_slug_fk" FOREIGN KEY ("event_type_slug") REFERENCES "public"."event_types"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hall_images" ADD CONSTRAINT "hall_images_hall_id_halls_id_fk" FOREIGN KEY ("hall_id") REFERENCES "public"."halls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "halls" ADD CONSTRAINT "halls_venue_id_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."venues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_request_id_booking_requests_id_fk" FOREIGN KEY ("booking_request_id") REFERENCES "public"."booking_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "venues" ADD CONSTRAINT "venues_city_slug_cities_slug_fk" FOREIGN KEY ("city_slug") REFERENCES "public"."cities"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "booking_requests_reference_uq" ON "booking_requests" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "booking_requests_status_idx" ON "booking_requests" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "booking_requests_hall_idx" ON "booking_requests" USING btree ("hall_id");--> statement-breakpoint
CREATE INDEX "booking_requests_organizer_idx" ON "booking_requests" USING btree ("organizer_user_id");--> statement-breakpoint
CREATE INDEX "hall_areas_hall_idx" ON "hall_areas" USING btree ("hall_id");--> statement-breakpoint
CREATE INDEX "hall_images_hall_idx" ON "hall_images" USING btree ("hall_id");--> statement-breakpoint
CREATE UNIQUE INDEX "halls_slug_uq" ON "halls" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "halls_venue_idx" ON "halls" USING btree ("venue_id");--> statement-breakpoint
CREATE INDEX "halls_listing_idx" ON "halls" USING btree ("status","featured");--> statement-breakpoint
CREATE INDEX "inquiries_status_idx" ON "inquiries" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_events_dedupe_uq" ON "notification_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "notification_events_due_idx" ON "notification_events" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_uq" ON "payment_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_order_uq" ON "payments" USING btree ("provider","provider_order_id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "venues_slug_uq" ON "venues" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "venues_city_idx" ON "venues" USING btree ("city_slug");