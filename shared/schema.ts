import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  extension: text("extension").notNull().unique(),
  userType: text("user_type").notNull().$type<'admin' | 'manager' | 'user'>(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callLogs = pgTable("call_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  phoneNumber: text("phone_number").notNull(),
  callType: text("call_type").notNull().$type<'inbound' | 'outbound'>(),
  status: text("status").notNull().$type<'completed' | 'missed' | 'failed'>(),
  duration: integer("duration"), // in seconds
  startedAt: timestamp("started_at").notNull(),
  endedAt: timestamp("ended_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  company: text("company"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const twilioCredentials = pgTable("twilio_credentials", {
  id: serial("id").primaryKey(),
  accountSid: text("account_sid").notNull(),
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret").notNull(),
  twimlAppSid: text("twiml_app_sid").notNull(),
  phoneNumber: text("phone_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(userSessions),
  callLogs: many(callLogs),
  contacts: many(contacts),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  user: one(users, {
    fields: [callLogs.userId],
    references: [users.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  createdByUser: one(users, {
    fields: [contacts.createdBy],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  phone: z.string().min(10),
  extension: z.string().min(3),
  userType: z.enum(['admin', 'manager', 'user']),
}).omit({
  id: true,
  passwordHash: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  password: z.string().min(8),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const insertTwilioCredentialsSchema = createInsertSchema(twilioCredentials, {
  accountSid: z.string().min(34).max(34),
  apiKey: z.string().min(34).max(34),
  apiSecret: z.string().min(32),
  twimlAppSid: z.string().min(34).max(34),
  phoneNumber: z.string().min(10),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
export type CallLog = typeof callLogs.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type TwilioCredentials = typeof twilioCredentials.$inferSelect;
export type InsertTwilioCredentials = z.infer<typeof insertTwilioCredentialsSchema>;
export type LoginData = z.infer<typeof loginSchema>;
