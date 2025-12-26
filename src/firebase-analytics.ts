import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import fs from 'fs';
import path from 'path';

const SERVER_NAME = 'mcp-datagovmy';

interface ToolCall {
  tool: string;
  timestamp: string;
  clientIp: string;
  userAgent: string;
}

interface Analytics {
  serverStartTime: string;
  totalRequests: number;
  totalToolCalls: number;
  requestsByMethod: Record<string, number>;
  requestsByEndpoint: Record<string, number>;
  toolCalls: Record<string, number>;
  recentToolCalls: ToolCall[];
  clientsByIp: Record<string, number>;
  clientsByUserAgent: Record<string, number>;
  hourlyRequests: Record<string, number>;
}

let firebaseInitialized = false;
let database: ReturnType<typeof getDatabase> | null = null;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    const credentialsPath = path.join(process.cwd(), '.credentials', 'firebase-service-account.json');
    
    if (!fs.existsSync(credentialsPath)) {
      console.warn(`⚠️  Firebase credentials not found at ${credentialsPath}`);
      console.warn('   Analytics will only be saved locally');
      return;
    }

    const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8')) as ServiceAccount;

    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: 'https://mcp-analytics-49b45-default-rtdb.asia-southeast1.firebasedatabase.app'
    });

    database = getDatabase();
    firebaseInitialized = true;
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase:', error);
  }
}

/**
 * Sanitize keys for Firebase - replace invalid characters with safe alternatives
 * Firebase keys cannot contain: . # $ / [ ]
 */
function sanitizeKey(key: string): string {
  return key
    .replace(/\./g, '_dot_')
    .replace(/#/g, '_hash_')
    .replace(/\$/g, '_dollar_')
    .replace(/\//g, '_slash_')
    .replace(/\[/g, '_lbracket_')
    .replace(/\]/g, '_rbracket_');
}

/**
 * Sanitize an object's keys recursively for Firebase compatibility
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeKey(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Desanitize keys when loading from Firebase
 */
function desanitizeKey(key: string): string {
  return key
    .replace(/_dot_/g, '.')
    .replace(/_hash_/g, '#')
    .replace(/_dollar_/g, '$')
    .replace(/_slash_/g, '/')
    .replace(/_lbracket_/g, '[')
    .replace(/_rbracket_/g, ']');
}

/**
 * Desanitize an object's keys recursively
 */
function desanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => desanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const desanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const desanitizedKey = desanitizeKey(key);
      desanitized[desanitizedKey] = desanitizeObject(value);
    }
    return desanitized;
  }

  return obj;
}

export async function saveAnalyticsToFirebase(analytics: Analytics): Promise<void> {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  if (!database) {
    console.log('📝 Firebase not available, skipping cloud save');
    return;
  }

  try {
    const ref = database.ref(`mcp-analytics/${SERVER_NAME}`);
    
    // Sanitize the analytics object before saving
    const sanitizedAnalytics = sanitizeObject(analytics);
    
    await ref.set(sanitizedAnalytics);
    console.log(`📊 Analytics saved to Firebase: ${SERVER_NAME}`);
  } catch (error) {
    console.error('Failed to save to Firebase:', error);
  }
}

export async function loadAnalyticsFromFirebase(): Promise<Analytics | null> {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  if (!database) {
    console.log('Firebase not available for loading');
    return null;
  }

  try {
    const ref = database.ref(`mcp-analytics/${SERVER_NAME}`);
    const snapshot = await ref.get();
    
    if (snapshot.exists()) {
      const sanitizedData = snapshot.val();
      
      // Desanitize the data when loading
      const data = desanitizeObject(sanitizedData) as Analytics;
      
      console.log(`📊 Loaded analytics from Firebase: ${SERVER_NAME}`);
      console.log(`   Total requests: ${data.totalRequests.toLocaleString()}, Tool calls: ${data.totalToolCalls}`);
      return data;
    }
    
    console.log('No existing analytics in Firebase');
    return null;
  } catch (error) {
    console.error('Failed to load from Firebase:', error);
    return null;
  }
}