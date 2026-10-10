import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging, MulticastMessage } from 'firebase-admin/messaging';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private firebaseApp: App | null = null;
  private messaging: Messaging | null = null;

  onModuleInit() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (getApps().length > 0) {
        this.firebaseApp = getApps()[0];
        this.messaging = getMessaging(this.firebaseApp);
        this.logger.log('Firebase Admin already initialized.');
        return;
      }

      // 1. Try env variable with JSON string
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          this.firebaseApp = initializeApp({
            credential: cert(serviceAccount),
          });
          this.messaging = getMessaging(this.firebaseApp);
          this.logger.log('Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT env.');
          return;
        } catch (e: any) {
          this.logger.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env JSON: ' + e?.message);
        }
      }

      // 2. Try file paths
      const candidatePaths = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.resolve(process.cwd(), 'src/firebase/service-account.json'),
        path.resolve(process.cwd(), 'dist/firebase/service-account.json'),
        path.resolve(process.cwd(), 'dist/src/firebase/service-account.json'),
      ].filter(Boolean) as string[];

      // Try ES module directory path as fallback
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        candidatePaths.push(path.resolve(__dirname, '../../firebase/service-account.json'));
        candidatePaths.push(path.resolve(__dirname, '../../../src/firebase/service-account.json'));
      } catch {
        // Ignore if import.meta.url is not available
      }

      for (const filePath of candidatePaths) {
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          const serviceAccount = JSON.parse(raw);
          this.firebaseApp = initializeApp({
            credential: cert(serviceAccount),
          });
          this.messaging = getMessaging(this.firebaseApp);
          this.logger.log(`Firebase Admin initialized from file: ${filePath}`);
          return;
        }
      }

      this.logger.warn(
        'Firebase service account file not found. Web push notifications via FCM will be disabled.',
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to initialize Firebase Admin SDK: ${error?.message}`,
        error?.stack,
      );
    }
  }

  /**
   * Send Web Push notification to multiple FCM device tokens.
   * Configured with webpush headers so notifications display on browser/PWA
   * even when web tab is closed or offline/background.
   */
  async sendMulticast(
    tokens: string[],
    payload: {
      title: string;
      body: string;
      data?: Record<string, any>;
      link?: string;
      icon?: string;
    },
  ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
    const invalidTokens: string[] = [];

    if (!this.messaging) {
      this.logger.warn('Firebase Messaging not initialized. Skipping push.');
      return { successCount: 0, failureCount: 0, invalidTokens };
    }

    const uniqueTokens = Array.from(new Set(tokens.filter((t) => Boolean(t && t.trim()))));
    if (uniqueTokens.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens };
    }

    // Convert data values to strings as required by FCM
    const stringData: Record<string, string> = {};
    if (payload.data) {
      for (const [key, val] of Object.entries(payload.data)) {
        stringData[key] = typeof val === 'string' ? val : JSON.stringify(val);
      }
    }

    const frontendBaseUrl =
      process.env.FRONTEND_URL?.replace(/\/$/, '') ||
      'https://fronted-khata-book.vercel.app';

    const iconUrl = payload.icon
      ? payload.icon.startsWith('http')
        ? payload.icon
        : `${frontendBaseUrl}${payload.icon.startsWith('/') ? '' : '/'}${payload.icon}`
      : `${frontendBaseUrl}/icons/icon-192x192.png`;

    const badgeUrl = `${frontendBaseUrl}/icons/icon-192x192.png`;
    const link = payload.link || '/';

    let totalSuccess = 0;
    let totalFailure = 0;

    // FCM sendEachForMulticast accepts maximum 500 tokens per batch
    const BATCH_SIZE = 500;
    for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
      const batchTokens = uniqueTokens.slice(i, i + BATCH_SIZE);

      const message: MulticastMessage = {
        tokens: batchTokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: iconUrl,
        },
        data: stringData,
        webpush: {
          headers: {
            Urgency: 'high',
            TTL: '86400', // Keep alive for 24 hours
          },
          notification: {
            title: payload.title,
            body: payload.body,
            icon: iconUrl,
            badge: badgeUrl,
            image: iconUrl,
            requireInteraction: true,
            silent: false,
            renotify: true,
            vibrate: [300, 100, 300, 100, 300],
            tag: payload.data?.type || 'khata-notification',
          },
          fcmOptions: {
            link: link,
          },
        },
      };

      try {
        const response = await this.messaging.sendEachForMulticast(message);
        totalSuccess += response.successCount;
        totalFailure += response.failureCount;

        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const code = resp.error?.code;
              const token = batchTokens[idx];
              if (
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token'
              ) {
                invalidTokens.push(token);
              }
              this.logger.warn(
                `Push notification failed for token [${token.slice(0, 10)}...]: ${resp.error?.message}`,
              );
            }
          });
        }
      } catch (err: any) {
        this.logger.error(`Batch push send error: ${err?.message}`, err?.stack);
        totalFailure += batchTokens.length;
      }
    }

    this.logger.log(
      `Push sent: ${totalSuccess} succeeded, ${totalFailure} failed out of ${uniqueTokens.length} tokens.`,
    );

    return {
      successCount: totalSuccess,
      failureCount: totalFailure,
      invalidTokens,
    };
  }
}
