import { users, userSessions, callLogs, contacts, twilioCredentials, type User, type InsertUser, type UserSession, type TwilioCredentials, type InsertTwilioCredentials } from "@shared/schema";
import { db } from "./db";
import { eq, and, gt } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByExtension(extension: string): Promise<User | undefined>;
  createUser(user: InsertUser & { passwordHash: string }): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Session methods
  createSession(userId: number, tokenHash: string, expiresAt: Date): Promise<UserSession>;
  getValidSession(tokenHash: string): Promise<UserSession | undefined>;
  deleteSession(tokenHash: string): Promise<boolean>;
  deleteUserSessions(userId: number): Promise<boolean>;
  
  // Twilio credentials methods
  getTwilioCredentials(): Promise<TwilioCredentials | undefined>;
  createTwilioCredentials(credentials: InsertTwilioCredentials): Promise<TwilioCredentials>;
  updateTwilioCredentials(id: number, credentials: Partial<InsertTwilioCredentials>): Promise<TwilioCredentials | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByExtension(extension: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.extension, extension));
    return user || undefined;
  }

  async createUser(userData: InsertUser & { passwordHash: string }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        extension: userData.extension,
        userType: userData.userType,
        passwordHash: userData.passwordHash,
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return result.length > 0;
  }

  async createSession(userId: number, tokenHash: string, expiresAt: Date): Promise<UserSession> {
    const [session] = await db
      .insert(userSessions)
      .values({
        userId,
        tokenHash,
        expiresAt,
      })
      .returning();
    return session;
  }

  async getValidSession(tokenHash: string): Promise<UserSession | undefined> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(
        eq(userSessions.tokenHash, tokenHash),
        gt(userSessions.expiresAt, new Date())
      ));
    return session || undefined;
  }

  async deleteSession(tokenHash: string): Promise<boolean> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.tokenHash, tokenHash))
      .returning();
    return result.length > 0;
  }

  async deleteUserSessions(userId: number): Promise<boolean> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.userId, userId))
      .returning();
    return result.length > 0;
  }

  async getTwilioCredentials(): Promise<TwilioCredentials | undefined> {
    const [credentials] = await db.select().from(twilioCredentials).limit(1);
    return credentials || undefined;
  }

  async createTwilioCredentials(credentialsData: InsertTwilioCredentials): Promise<TwilioCredentials> {
    // First delete any existing credentials (we only want one set)
    await db.delete(twilioCredentials);
    
    const [credentials] = await db
      .insert(twilioCredentials)
      .values(credentialsData)
      .returning();
    return credentials;
  }

  async updateTwilioCredentials(id: number, credentialsData: Partial<InsertTwilioCredentials>): Promise<TwilioCredentials | undefined> {
    const [credentials] = await db
      .update(twilioCredentials)
      .set({ ...credentialsData, updatedAt: new Date() })
      .where(eq(twilioCredentials.id, id))
      .returning();
    return credentials || undefined;
  }
}

export const storage = new DatabaseStorage();
