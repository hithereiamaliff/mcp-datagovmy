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
    await ref.set(analytics);
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
      const data = snapshot.val() as Analytics;
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