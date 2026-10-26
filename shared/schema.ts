import { pgTable, serial, text, varchar, timestamp, integer, decimal, boolean, jsonb, index } from "drizzle-orm/pg-core";
  import { relations, sql } from "drizzle-orm";
  import { createInsertSchema, createSelectSchema } from "drizzle-zod";
  import { z } from "zod";

  // ==================== AUTH TABLES ====================
  export const sessions = pgTable(
    "sessions",
    {
      sid: varchar("sid").primaryKey(),
      sess: jsonb("sess").notNull(),
      expire: timestamp("expire").notNull(),
    },
    (table) => [index("IDX_session_expire").on(table.expire)]
  );

  export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").unique().notNull(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    role: varchar("role").notNull().default("client"), // client, linguist, admin
    subscriptionTier: varchar("subscription_tier").default("basic"), // basic, professional, enterprise
    stripeCustomerId: varchar("stripe_customer_id"),
    organizationId: integer("organization_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  });

  // ==================== ORGANIZATION TABLES ====================
  export const organizations = pgTable("organizations", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    settings: jsonb("settings").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  // ==================== LINGUIST PROFILES ====================
  export const linguistProfiles = pgTable("linguist_profiles", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    bio: text("bio"),
    languagePairs: jsonb("language_pairs").notNull().default([]), // [{source: 'en', target: 'es'}, ...]
    specializations: jsonb("specializations").default([]), // ['legal', 'medical', ...]
    hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
    totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0"),
    completedJobs: integer("completed_jobs").default(0),
    isAvailable: boolean("is_available").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  // ==================== TRANSLATION ORDERS ====================
  export const translationOrders = pgTable("translation_orders", {
    id: serial("id").primaryKey(),
    clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    organizationId: integer("organization_id").references(() => organizations.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    sourceLang: varchar("source_lang", { length: 10 }).notNull(),
    targetLang: varchar("target_lang", { length: 10 }).notNull(),
    status: varchar("status").notNull().default("submitted"), // submitted, assigned, in_progress, completed, delivered, cancelled
    priority: varchar("priority").default("normal"), // low, normal, high, urgent
    deadline: timestamp("deadline"),
    aiTranslationCompleted: boolean("ai_translation_completed").default(false),
    estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
    finalCost: decimal("final_cost", { precision: 10, scale: 2 }),
    specialInstructions: text("special_instructions"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  });

  // ==================== ORDER DOCUMENTS ====================
  export const orderDocuments = pgTable("order_documents", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => translationOrders.id, { onDelete: "cascade" }),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    filePath: text("file_path").notNull(),
    fileType: varchar("file_type", { length: 50 }),
    fileSize: integer("file_size"),
    documentType: varchar("document_type").default("source"), // source, translated
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  });

  // ==================== ASSIGNMENTS ====================
  export const assignments = pgTable("assignments", {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").notNull().references(() => translationOrders.id, { onDelete: "cascade" }),
    linguistId: varchar("linguist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status").notNull().default("assigned"), // assigned, accepted, in_progress, completed, rejected
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at"),
    completedAt: timestamp("completed_at"),
    notes: text("notes"),
  });

  // ==================== TRANSLATION MEMORY ====================
  export const translationMemory = pgTable("translation_memory", {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").references(() => organizations.id),
    sourceText: text("source_text").notNull(),
    targetText: text("target_text").notNull(),
    sourceLang: varchar("source_lang", { length: 10 }).notNull(),
    targetLang: varchar("target_lang", { length: 10 }).notNull(),
    context: text("context"),
    usageCount: integer("usage_count").default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  // ==================== GLOSSARIES ====================
  export const glossaries = pgTable("glossaries", {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").references(() => organizations.id),
    clientId: varchar("client_id").references(() => users.id, { onDelete: "cascade" }),
    term: varchar("term", { length: 255 }).notNull(),
    translation: varchar("translation", { length: 255 }).notNull(),
    sourceLang: varchar("source_lang", { length: 10 }).notNull(),
    targetLang: varchar("target_lang", { length: 10 }).notNull(),
    context: text("context"),
    category: varchar("category", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  // ==================== FAVORITE LINGUISTS ====================
  export const favoriteLinguists = pgTable("favorite_linguists", {
    id: serial("id").primaryKey(),
    clientId: varchar("client_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    linguistId: varchar("linguist_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  });

  
  export const favoriteLinguistsRelations = relations(favoriteLinguists, ({ one }) => ({
    client: one(users, {
      fields: [favoriteLinguists.clientId],
      references: [users.id],
    }),
    linguist: one(users, {
      fields: [favoriteLinguists.linguistId],
      references: [users.id],
    }),
  }));
  
// ==================== SUBSCRIPTIONS ====================
  export const subscriptions = pgTable("subscriptions", {
    id: serial("id").primaryKey(),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    tier: varchar("tier").notNull().default("basic"), // basic, professional, enterprise
    stripeSubscriptionId: varchar("stripe_subscription_id"),
    stripePriceId: varchar("stripe_price_id"),
    status: varchar("status").notNull().default("active"), // active, cancelled, past_due, trialing
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  });

  // ==================== RELATIONS ====================
  export const usersRelations = relations(users, ({ one, many }) => ({
    organization: one(organizations, {
      fields: [users.organizationId],
      references: [organizations.id],
    }),
    linguistProfile: one(linguistProfiles, {
      fields: [users.id],
      references: [linguistProfiles.userId],
    }),
    orders: many(translationOrders),
    assignments: many(assignments),
    subscription: one(subscriptions, {
      fields: [users.id],
      references: [subscriptions.userId],
    }),
  }));

  export const organizationsRelations = relations(organizations, ({ one, many }) => ({
    owner: one(users, {
      fields: [organizations.ownerId],
      references: [users.id],
    }),
    members: many(users),
    orders: many(translationOrders),
  }));

  export const translationOrdersRelations = relations(translationOrders, ({ one, many }) => ({
    client: one(users, {
      fields: [translationOrders.clientId],
      references: [users.id],
    }),
    organization: one(organizations, {
      fields: [translationOrders.organizationId],
      references: [organizations.id],
    }),
    documents: many(orderDocuments),
    assignments: many(assignments),
  }));

  export const assignmentsRelations = relations(assignments, ({ one }) => ({
    order: one(translationOrders, {
      fields: [assignments.orderId],
      references: [translationOrders.id],
    }),
    linguist: one(users, {
      fields: [assignments.linguistId],
      references: [users.id],
    }),
  }));

  // ==================== ZOD SCHEMAS ====================
  export const insertUserSchema = createInsertSchema(users);
  export const selectUserSchema = createSelectSchema(users);

  export const insertOrganizationSchema = createInsertSchema(organizations);
  export const selectOrganizationSchema = createSelectSchema(organizations);

  export const insertLinguistProfileSchema = createInsertSchema(linguistProfiles);
  export const selectLinguistProfileSchema = createSelectSchema(linguistProfiles);

  export const insertTranslationOrderSchema = createInsertSchema(translationOrders);
  export const selectTranslationOrderSchema = createSelectSchema(translationOrders);

  export const insertOrderDocumentSchema = createInsertSchema(orderDocuments);
  export const selectOrderDocumentSchema = createSelectSchema(orderDocuments);

  export const insertAssignmentSchema = createInsertSchema(assignments);
  export const selectAssignmentSchema = createSelectSchema(assignments);

  export const insertTranslationMemorySchema = createInsertSchema(translationMemory);
  export const selectTranslationMemorySchema = createSelectSchema(translationMemory);

  export const insertGlossarySchema = createInsertSchema(glossaries);
  export const selectGlossarySchema = createSelectSchema(glossaries);

  export const insertSubscriptionSchema = createInsertSchema(subscriptions);
  export const selectSubscriptionSchema = createSelectSchema(subscriptions);

  // ==================== TYPES ====================
  export type User = typeof users.$inferSelect;
  export type InsertUser = typeof users.$inferInsert;

  export type Organization = typeof organizations.$inferSelect;
  export type InsertOrganization = typeof organizations.$inferInsert;

  export type LinguistProfile = typeof linguistProfiles.$inferSelect;
  export type InsertLinguistProfile = typeof linguistProfiles.$inferInsert;

  export type TranslationOrder = typeof translationOrders.$inferSelect;
  export type InsertTranslationOrder = typeof translationOrders.$inferInsert;

  export type OrderDocument = typeof orderDocuments.$inferSelect;
  export type InsertOrderDocument = typeof orderDocuments.$inferInsert;

  export type Assignment = typeof assignments.$inferSelect;
  export type InsertAssignment = typeof assignments.$inferInsert;

  export type TranslationMemory = typeof translationMemory.$inferSelect;
  export type InsertTranslationMemory = typeof translationMemory.$inferInsert;

  export type Glossary = typeof glossaries.$inferSelect;
  export type InsertGlossary = typeof glossaries.$inferInsert;

  export type Subscription = typeof subscriptions.$inferSelect;
  export type InsertSubscription = typeof subscriptions.$inferInsert;
  