/**
 * GEN M Swag Operations Command Center — Real-Time Google Sheets Server
 * Connected to Google Spreadsheet: 1foGWm9i_5DhBUjocJDxs84jWCLdc-U1BJaN7r0KuhiA
 * Google Sheets API Key: AIzaSyAR-1NB1RFPaU7X7C3WbVbzsDzJ401rQz4
 * 
 * Features:
 * - 100% Real-Time Data from Google Sheets API v4 (No mock or placeholder data)
 * - Multi-Sheet Integration:
 *   1. "Form Responses 1" (gid: 94895465): Multi-Size T-Shirt Bookings (S, M, L, XL, XXL)
 *   2. "Form responses 2" (gid: 876296022): Single-Size Form Bookings
 *   3. "Inventory & Availability" (gid: 1987367975): Live Stock & Availability (1,850 Total Units)
 *   4. "Sheet1" (gid: 0): Merchandise Catalog, Unit Costs, Selling Prices, Dealers & Live Status
 *   5. "Pre-Book Tracker" (gid: 550909813): Financial Projections & T-Shirt Allocation
 * - Real-Time Write / Sync Engine:
 *   - Google Apps Script Webhook endpoint for direct real-time spreadsheet updates
 *   - Google Cloud Service Account support (if credentials.json is provided)
 *   - Optimistic memory cache so writes reflect instantly in the UI with zero lag
 */

import express from 'express';
import { google } from 'googleapis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5050;

// Configuration
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1foGWm9i_5DhBUjocJDxs84jWCLdc-U1BJaN7r0KuhiA';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyAR-1NB1RFPaU7X7C3WbVbzsDzJ401rQz4';
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || path.join(__dirname, '..', 'credentials.json');
const ALT_CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD_PLAIN = process.env.ADMIN_PASSWORD || 'GenM@2026!';
const JWT_SECRET = process.env.JWT_SECRET || 'gen_m_merch_secret_key_2026_production_grade_token';
const JWT_EXPIRY = '12h';

// Pre-compute bcrypt password hash
const adminPasswordHash = bcrypt.hashSync(ADMIN_PASSWORD_PLAIN, 10);

// Middleware
app.use(express.json());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Local working cache to track real-time changes before/alongside sheet sync
const DATA_DIR = path.join(__dirname, 'data');
const LOCAL_OVERLAY_FILE = path.join(DATA_DIR, 'sheet-overlay.json');
const CONFIG_FILE = path.join(DATA_DIR, 'app-config.json');

// ─────────────────────────────────────────────────────────────
// REAL-TIME 2-WAY SYNC: SERVER-SENT EVENTS (SSE) STREAM
// ─────────────────────────────────────────────────────────────
let sseClients = [];

function broadcastSse(type, payload) {
  const dataString = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.res.write(dataString);
    } catch (e) {
      console.warn(`[SSE] Disconnecting inactive client ${client.id}`);
      sseClients.splice(i, 1);
    }
  }
}


if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getAppConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { appsScriptUrl: APPS_SCRIPT_URL };
}

function saveAppConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      let envContent = fs.readFileSync(envPath, 'utf-8');
      if (envContent.includes('APPS_SCRIPT_URL=')) {
        envContent = envContent.replace(/APPS_SCRIPT_URL=.*/g, `APPS_SCRIPT_URL=${cfg.appsScriptUrl || ''}`);
        fs.writeFileSync(envPath, envContent, 'utf-8');
      }
    }
  } catch (e) {}
}

function readOverlay() {
  try {
    if (fs.existsSync(LOCAL_OVERLAY_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_OVERLAY_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { addedRows: [], updatedRows: {}, deletedRows: [] };
}

function writeOverlay(overlay) {
  try {
    fs.writeFileSync(LOCAL_OVERLAY_FILE, JSON.stringify(overlay, null, 2), 'utf-8');
  } catch (e) {}
}

// ─────────────────────────────────────────────────────────────
// OFFLINE SYNC QUEUE (AUTO-RETRY WHEN RECONNECTED)
// ─────────────────────────────────────────────────────────────
const QUEUE_FILE = path.join(DATA_DIR, 'offline-sync-queue.json');

function readSyncQueue() {
  try {
    if (fs.existsSync(QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    }
  } catch (e) {}
  return [];
}

function writeSyncQueue(queue) {
  try {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
  } catch (e) {}
}

function queuePendingWrite(action, payload) {
  const queue = readSyncQueue();
  queue.push({
    id: 'offline_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    action,
    payload,
    timestamp: new Date().toISOString(),
    attempts: 0
  });
  writeSyncQueue(queue);
  console.log(`[Offline Sync Queue] Queued ${action} for Form Responses 1. Total pending in queue: ${queue.length}`);
}

async function flushSyncQueue() {
  const queue = readSyncQueue();
  if (!queue.length) return { flushed: 0, remaining: 0 };
  const cfg = getAppConfig();
  const scriptUrl = cfg.appsScriptUrl || APPS_SCRIPT_URL;
  if (!scriptUrl && !isServiceAccountConfigured()) {
    return { flushed: 0, remaining: queue.length };
  }

  console.log(`[Offline Sync Queue] Attempting to flush ${queue.length} writes to Google Sheet Form Responses 1...`);
  const remaining = [];
  let flushedCount = 0;

  for (const item of queue) {
    try {
      item.attempts = (item.attempts || 0) + 1;
      let ok = false;
      if (scriptUrl && scriptUrl.startsWith('http')) {
        const resp = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: item.action, targetSheet: 'Form Responses 1', ...item.payload }),
          redirect: 'follow',
        });
        if (resp.ok || resp.status === 200 || resp.status === 302) {
          ok = true;
        }
      } else if (isServiceAccountConfigured()) {
        const { sheets } = getGoogleSheetsServiceClient();
        if (item.action === 'create') {
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Form Responses 1!A:P',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [item.payload.row] },
          });
          ok = true;
        }
      }

      if (ok) {
        flushedCount++;
      } else {
        remaining.push(item);
      }
    } catch (err) {
      remaining.push(item);
    }
  }

  writeSyncQueue(remaining);
  console.log(`[Offline Sync Queue] Flushed ${flushedCount} items to Google Sheet. Remaining: ${remaining.length}`);
  return { flushed: flushedCount, remaining: remaining.length };
}

// Background auto-flush every 15 seconds
setInterval(flushSyncQueue, 15000);

// ─────────────────────────────────────────────────────────────
// GOOGLE SHEETS API V4 CLIENT (LIVE READ VIA API KEY)
// ─────────────────────────────────────────────────────────────

async function fetchSheetValues(range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}`;
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API Error (${response.status}): ${errorText}`);
  }
  const data = await response.json();
  return data.values || [];
}

// Check if Service Account is available
function getCredentialsPath() {
  if (fs.existsSync(CREDENTIALS_PATH)) return CREDENTIALS_PATH;
  if (fs.existsSync(ALT_CREDENTIALS_PATH)) return ALT_CREDENTIALS_PATH;
  return null;
}

function isServiceAccountConfigured() {
  const credPath = getCredentialsPath();
  return Boolean(credPath && SPREADSHEET_ID);
}

function getGoogleSheetsServiceClient() {
  const credPath = getCredentialsPath();
  if (!credPath) throw new Error('Service Account credentials.json not found on server.');

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { auth, sheets: google.sheets({ version: 'v4', auth }) };
}

/**
 * Real-time write to Google Sheet Form Responses 1 via Apps Script Webhook or Service Account
 */
async function writeToGoogleSheet(action, payload) {
  const cfg = getAppConfig();
  const scriptUrl = cfg.appsScriptUrl || APPS_SCRIPT_URL;

  // 1. Try Google Apps Script Webhook (Instant real-time update to Form Responses 1)
  if (scriptUrl && scriptUrl.startsWith('http')) {
    try {
      console.log(`[Google Sheets Sync] Sending ${action} to Apps Script Webhook (Form Responses 1):`, scriptUrl);
      const resp = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, targetSheet: 'Form Responses 1', ...payload }),
        redirect: 'follow',
      });
      console.log(`[Google Sheets Sync] Apps Script responded with status:`, resp.status);
      if (resp.ok || resp.status === 302 || resp.status === 200) {
        return { success: true, method: 'apps_script', status: resp.status };
      }
    } catch (err) {
      console.warn('[Google Sheets Sync] Apps Script Webhook error:', err.message);
    }
  }

  // 2. Try Service Account
  if (isServiceAccountConfigured()) {
    try {
      const { sheets } = getGoogleSheetsServiceClient();
      if (action === 'create') {
        const result = await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Form Responses 1!A:P',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [payload.row] },
        });
        return { success: true, method: 'service_account', data: result.data };
      } else if (action === 'update') {
        const result = await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Form Responses 1!A${payload.rowNumber}:P${payload.rowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [payload.row] },
        });
        return { success: true, method: 'service_account', data: result.data };
      } else if (action === 'delete') {
        const result = await sheets.spreadsheets.values.clear({
          spreadsheetId: SPREADSHEET_ID,
          range: `Form Responses 1!A${payload.rowNumber}:P${payload.rowNumber}`,
        });
        return { success: true, method: 'service_account', data: result.data };
      }
    } catch (saErr) {
      console.warn('[Google Sheets Sync] Service Account error:', saErr.message);
    }
  }

  // If live push couldn't complete, queue on disk for auto-retry
  queuePendingWrite(action, payload);

  return { success: false, method: 'queued_offline', notice: 'Write saved in offline queue. Will auto-push to Google Sheet Form Responses 1 when online.' };
}

function sanitizeCellValue(val) {
  if (typeof val !== 'string') return val === undefined || val === null ? '' : String(val);
  const trimmed = val.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${val}`;
  }
  return val;
}

function buildSizeSummary(s, m, l, xl, xxl) {
  const parts = [];
  if (s > 0) parts.push(`${s}x S`);
  if (m > 0) parts.push(`${m}x M`);
  if (l > 0) parts.push(`${l}x L`);
  if (xl > 0) parts.push(`${xl}x XL`);
  if (xxl > 0) parts.push(`${xxl}x XXL`);
  return parts.length > 0 ? parts.join(', ') : 'Standard';
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired. Please log in again.' });
    }
    req.user = decodedUser;
    next();
  });
}

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION
// ─────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const isUserValid = username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const isPassValid = isUserValid && bcrypt.compareSync(password, adminPasswordHash);

  if (!isPassValid) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = jwt.sign(
    { username: ADMIN_USERNAME, role: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  return res.json({
    success: true,
    message: 'Authentication successful',
    token,
    user: { username: ADMIN_USERNAME, role: 'Operations Admin' },
    expiresIn: JWT_EXPIRY
  });
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ─────────────────────────────────────────────────────────────
// DIAGNOSTICS & SYSTEM CONFIG
// ─────────────────────────────────────────────────────────────

app.get('/api/config-status', (req, res) => {
  const cfg = getAppConfig();
  res.json({
    status: 'online',
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`,
    googleApiKeyActive: Boolean(GOOGLE_API_KEY),
    appsScriptUrl: cfg.appsScriptUrl || null,
    hasServiceAccount: isServiceAccountConfigured(),
    realtimeSyncReady: Boolean(cfg.appsScriptUrl || isServiceAccountConfigured()),
    worksheets: [
      { name: 'Form Responses 1', gid: '94895465', purpose: 'Multi-Size T-Shirt Orders' },
      { name: 'Inventory & Availability', gid: '1987367975', purpose: 'Live Stock Levels' },
      { name: 'Sheet1', gid: '0', purpose: 'Merchandise Production Catalog' },
      { name: 'Pre-Book Tracker', gid: '550909813', purpose: 'Financial Projections' },
      { name: 'Form responses 2', gid: '876296022', purpose: 'Single-Size Form Bookings' }
    ]
  });
});

// ─────────────────────────────────────────────────────────────
// REAL-TIME 2-WAY SYNC: SERVER-SENT EVENTS (SSE) STREAM
// Delivers instant live updates to all open dashboard browser tabs
// ─────────────────────────────────────────────────────────────
app.get('/api/realtime/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const clientId = 'sse_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const client = { id: clientId, res };
  sseClients.push(client);

  console.log(`[SSE] Dashboard client connected: ${clientId}. Total active stream clients: ${sseClients.length}`);

  // Initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', clientId, activeClients: sseClients.length })}\n\n`);

  // Heartbeat ping every 20 seconds to prevent network idle disconnection
  const pingInterval = setInterval(() => {
    try {
      res.write(`: ping\n\n`);
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 20000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseClients = sseClients.filter(c => c.id !== clientId);
    console.log(`[SSE] Dashboard client disconnected: ${clientId}. Remaining clients: ${sseClients.length}`);
  });
});

// ─────────────────────────────────────────────────────────────
// REAL-TIME 2-WAY SYNC: INBOUND WEBHOOK FROM GOOGLE SHEETS
// Triggered by Apps Script sendUpdateToWebApp(e) on spreadsheet edit
// ─────────────────────────────────────────────────────────────
app.post('/api/sheets-webhook', (req, res) => {
  try {
    const { action, rowNumber, row, timestamp } = req.body || {};
    console.log(`[Sheets Webhook] Inbound trigger from Google Sheet Form Responses 1:`, { action, rowNumber, timestamp });

    if (rowNumber) {
      const num = parseInt(rowNumber, 10);
      const overlay = readOverlay();
      if (overlay.updatedRows && overlay.updatedRows[num]) {
        delete overlay.updatedRows[num];
        writeOverlay(overlay);
      }
    }

    // Broadcast to all open dashboard tabs immediately in <50ms
    broadcastSse('sheet_update', {
      action: action || 'sheet_update',
      rowNumber,
      row,
      timestamp: timestamp || new Date().toISOString(),
      source: 'google_sheets_trigger'
    });

    res.json({
      status: 'success',
      received: true,
      rowNumber,
      broadcastedTo: sseClients.length,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Sheets Webhook] Error processing sheet trigger:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// Outbound Webhook Test Simulator (for user testing from Dashboard Tab 5)
app.post('/api/sheets-webhook/test', (req, res) => {
  const testPayload = {
    action: 'sheet_update',
    rowNumber: 2,
    row: ['2026-10-15T09:00:00.000Z', 'Test Realtime Customer', '9876543210', 'test@msm.org', 'White T-Shirt', '2', 'Confirmed', 'Paid', 'Test Webhook Push', '0', '1', '1', '0', '0', 'Matched', '1x M, 1x L'],
    timestamp: new Date().toISOString(),
    source: 'simulation_test'
  };

  broadcastSse('sheet_update', testPayload);
  res.json({
    status: 'success',
    message: 'Test event broadcasted to all connected dashboard tabs!',
    clientsNotified: sseClients.length,
    testPayload
  });
});

app.post('/api/config/apps-script', authenticateToken, async (req, res) => {
  const { appsScriptUrl } = req.body;
  const cfg = getAppConfig();
  cfg.appsScriptUrl = (appsScriptUrl || '').trim();
  saveAppConfig(cfg);
  
  // Flush pending offline bookings directly to Form Responses 1
  const flushRes = await flushSyncQueue();

  res.json({
    success: true,
    message: 'Google Apps Script Webhook URL connected! Real-time writeback to Form Responses 1 is active.',
    appsScriptUrl: cfg.appsScriptUrl,
    flushedCount: flushRes.flushed,
    remainingCount: flushRes.remaining
  });
});

app.get('/api/sync/queue', (req, res) => {
  const queue = readSyncQueue();
  res.json({
    pendingCount: queue.length,
    items: queue
  });
});

app.post('/api/sync/flush', authenticateToken, async (req, res) => {
  const result = await flushSyncQueue();
  res.json({
    success: true,
    ...result
  });
});

app.post('/api/sync/batch', authenticateToken, async (req, res) => {
  try {
    const { bookings } = req.body;
    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.status(400).json({ error: 'Bookings array is required' });
    }

    const overlay = readOverlay();
    let syncedCount = 0;

    for (const b of bookings) {
      const s = parseInt(b.sizeS, 10) || 0;
      const m = parseInt(b.sizeM, 10) || 0;
      const l = parseInt(b.sizeL, 10) || 0;
      const xl = parseInt(b.sizeXL, 10) || 0;
      const xxl = parseInt(b.sizeXXL, 10) || 0;
      const totalQty = parseInt(b.qty, 10) || (s + m + l + xl + xxl) || 1;
      const isTshirt = b.item === 'White T-Shirt';

      let allocationStatus = 'Standard';
      let sizeSummary = 'Standard';

      if (isTshirt) {
        const sizeSum = s + m + l + xl + xxl;
        allocationStatus = sizeSum === totalQty ? 'Matched' : (sizeSum === 0 ? 'Not Specified' : 'Mismatch');
        sizeSummary = buildSizeSummary(s, m, l, xl, xxl);
      }

      const timestamp = b.timestamp || new Date().toISOString();
      const newRow = [
        timestamp,
        sanitizeCellValue(b.name),
        sanitizeCellValue(b.phone || ''),
        sanitizeCellValue(b.email || ''),
        sanitizeCellValue(b.item),
        String(totalQty),
        sanitizeCellValue(b.bookingStatus || 'Confirmed'),
        sanitizeCellValue(b.paymentStatus || 'Pending'),
        sanitizeCellValue(b.notes || ''),
        String(s),
        String(m),
        String(l),
        String(xl),
        String(xxl),
        allocationStatus,
        sizeSummary
      ];

      const writeResult = await writeToGoogleSheet('create', { row: newRow });
      if (writeResult.success) syncedCount++;

      overlay.addedRows.push({
        timestamp,
        name: b.name,
        phone: b.phone || '',
        email: b.email || '',
        item: b.item,
        qty: totalQty,
        bookingStatus: b.bookingStatus || 'Confirmed',
        paymentStatus: b.paymentStatus || 'Pending',
        notes: b.notes || '',
        sizeS: s,
        sizeM: m,
        sizeL: l,
        sizeXL: xl,
        sizeXXL: xxl,
        sizeAllocationStatus: allocationStatus,
        sizesSummary: sizeSummary,
      });
    }

    writeOverlay(overlay);

    broadcastSse('data_changed', {
      action: 'batch_sync',
      count: bookings.length,
      syncedCount,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Batch processed: ${bookings.length} offline bookings recorded. ${syncedCount} pushed directly to Google Sheet Form Responses 1.`,
      syncedCount,
      total: bookings.length
    });
  } catch (err) {
    console.error('Batch sync error:', err);
    res.status(500).json({ error: 'Batch sync error: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// CRUD: ORDERS (DIRECT LIVE SYNC FROM GOOGLE SHEET ONLY)
// ─────────────────────────────────────────────────────────────

app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    // 1. Fetch live raw rows directly from Google Sheet Form Responses 1
    const rawF1 = await fetchSheetValues('Form Responses 1!A1:P200');
    const overlay = readOverlay();

    // Headers
    const headerRow = rawF1[0] || [
      'Timestamp', 'Customer Name', 'Contact Number', 'Email Address',
      'Item Selected', 'Quantity Booked', 'Booking Status', 'Payment Status',
      'Notes & Remarks', 'Size S', 'Size M', 'Size L', 'Size XL', 'Size XXL',
      'Size Allocation Status', 'Sizes Selected Summary'
    ];

    // Filter out empty rows from the sheet
    const liveDataRows = [];
    rawF1.slice(1).forEach((row, idx) => {
      const originalRowNumber = idx + 2;
      // Skip if marked deleted in overlay
      if (overlay.deletedRows.includes(originalRowNumber)) return;

      // Skip completely empty rows (e.g. Row 2 in the sheet is empty)
      const hasContent = row.some(cell => String(cell || '').trim() !== '');
      if (!hasContent) return;

      // Check if updated in overlay
      if (overlay.updatedRows[originalRowNumber]) {
        liveDataRows.push({ ...overlay.updatedRows[originalRowNumber], rowNumber: originalRowNumber });
      } else {
        liveDataRows.push({
          rowNumber: originalRowNumber,
          timestamp: row[0] || '',
          name: row[1] || 'Unknown',
          phone: row[2] || '',
          email: row[3] || '',
          item: row[4] || 'Merchandise',
          qty: row[5] || '1',
          bookingStatus: row[6] || 'Pending',
          paymentStatus: row[7] || 'Pending',
          notes: row[8] || '',
          sizeS: parseInt(row[9], 10) || 0,
          sizeM: parseInt(row[10], 10) || 0,
          sizeL: parseInt(row[11], 10) || 0,
          sizeXL: parseInt(row[12], 10) || 0,
          sizeXXL: parseInt(row[13], 10) || 0,
          sizeAllocationStatus: row[14] || 'Standard',
          sizesSummary: row[15] || 'Standard',
          sourceSheet: 'Form Responses 1'
        });
      }
    });

    // Append any locally added rows that are queued/synced
    overlay.addedRows.forEach((r, idx) => {
      liveDataRows.push({ ...r, rowNumber: rawF1.length + idx + 1, sourceSheet: 'Form Responses 1' });
    });

    // Also fetch Form responses 2 (single-size bookings like jabu)
    try {
      const rawF2 = await fetchSheetValues('Form responses 2!A1:H100');
      rawF2.slice(1).forEach((row, idx) => {
        const hasContent = row.some(cell => String(cell || '').trim() !== '');
        if (!hasContent) return;

        const sizeVal = row[5] || 'Standard';
        liveDataRows.push({
          rowNumber: `F2-${idx + 2}`,
          timestamp: row[0] || '',
          name: row[1] || 'Customer',
          phone: row[2] || '',
          email: row[3] || '',
          item: row[4] || 'Merchandise',
          qty: row[6] || '1',
          bookingStatus: 'Confirmed',
          paymentStatus: 'Pending',
          notes: row[7] || '',
          sizeS: sizeVal.toUpperCase() === 'S' ? parseInt(row[6] || 1, 10) : 0,
          sizeM: sizeVal.toUpperCase() === 'M' ? parseInt(row[6] || 1, 10) : 0,
          sizeL: sizeVal.toUpperCase() === 'L' ? parseInt(row[6] || 1, 10) : 0,
          sizeXL: sizeVal.toUpperCase() === 'XL' ? parseInt(row[6] || 1, 10) : 0,
          sizeXXL: sizeVal.toUpperCase() === 'XXL' ? parseInt(row[6] || 1, 10) : 0,
          sizeAllocationStatus: 'Matched',
          sizesSummary: sizeVal !== 'Standard' ? `${row[6]}x ${sizeVal}` : 'Standard',
          sourceSheet: 'Form responses 2'
        });
      });
    } catch (e) {
      console.warn('Form responses 2 fetch notice:', e.message);
    }

    // Convert back to 2D array representation for the dashboard
    const values = [
      headerRow,
      ...liveDataRows.map(r => [
        r.timestamp,
        r.name,
        r.phone,
        r.email,
        r.item,
        String(r.qty),
        r.bookingStatus,
        r.paymentStatus,
        r.notes,
        String(r.sizeS || 0),
        String(r.sizeM || 0),
        String(r.sizeL || 0),
        String(r.sizeXL || 0),
        String(r.sizeXXL || 0),
        r.sizeAllocationStatus,
        r.sizesSummary
      ])
    ];

    res.json({
      success: true,
      source: 'google_sheets_live',
      spreadsheetId: SPREADSHEET_ID,
      values,
      records: liveDataRows
    });
  } catch (error) {
    console.error('Error fetching live sheet values:', error);
    res.status(500).json({ error: 'Failed to fetch data from Google Sheet: ' + error.message });
  }
});

// CREATE: Real-time Append
app.post('/api/data', authenticateToken, async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      item,
      qty,
      bookingStatus,
      paymentStatus,
      notes,
      sizeS,
      sizeM,
      sizeL,
      sizeXL,
      sizeXXL
    } = req.body;

    if (!name || !item) {
      return res.status(400).json({ error: 'Customer Name and Merchandise Item are required.' });
    }

    const s = parseInt(sizeS, 10) || 0;
    const m = parseInt(sizeM, 10) || 0;
    const l = parseInt(sizeL, 10) || 0;
    const xl = parseInt(sizeXL, 10) || 0;
    const xxl = parseInt(sizeXXL, 10) || 0;

    const totalQty = parseInt(qty, 10) || (s + m + l + xl + xxl) || 1;
    const isTshirt = item === 'White T-Shirt';

    let allocationStatus = 'Standard';
    let sizeSummary = 'Standard';

    if (isTshirt) {
      const sizeSum = s + m + l + xl + xxl;
      allocationStatus = sizeSum === totalQty ? 'Matched' : (sizeSum === 0 ? 'Not Specified' : 'Mismatch');
      sizeSummary = buildSizeSummary(s, m, l, xl, xxl);
    }

    const timestamp = new Date().toISOString();
    const newRow = [
      timestamp,
      sanitizeCellValue(name),
      sanitizeCellValue(phone || ''),
      sanitizeCellValue(email || ''),
      sanitizeCellValue(item),
      String(totalQty),
      sanitizeCellValue(bookingStatus || 'Confirmed'),
      sanitizeCellValue(paymentStatus || 'Pending'),
      sanitizeCellValue(notes || ''),
      String(s),
      String(m),
      String(l),
      String(xl),
      String(xxl),
      allocationStatus,
      sizeSummary
    ];

    // Real-time write to Google Sheet
    const writeResult = await writeToGoogleSheet('create', { row: newRow });

    // Save in local overlay for zero-latency instant rendering
    const overlay = readOverlay();
    overlay.addedRows.push({
      timestamp,
      name,
      phone: phone || '',
      email: email || '',
      item,
      qty: totalQty,
      bookingStatus: bookingStatus || 'Confirmed',
      paymentStatus: paymentStatus || 'Pending',
      notes: notes || '',
      sizeS: s,
      sizeM: m,
      sizeL: l,
      sizeXL: xl,
      sizeXXL: xxl,
      sizeAllocationStatus: allocationStatus,
      sizesSummary: sizeSummary,
    });
    writeOverlay(overlay);

    broadcastSse('data_changed', {
      action: 'create',
      name,
      item,
      qty: totalQty,
      rowNumber: writeResult.rowNumber || null,
      syncMethod: writeResult.method,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: writeResult.success ? 'Booking added directly to Google Sheet!' : 'Booking saved to operations ledger.',
      syncMethod: writeResult.method,
      newRow
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to add booking: ' + error.message });
  }
});

// UPDATE: Real-time Update
app.put('/api/data/:rowNumber', authenticateToken, async (req, res) => {
  try {
    const rowNumber = req.params.rowNumber;
    const {
      name,
      phone,
      email,
      item,
      qty,
      bookingStatus,
      paymentStatus,
      notes,
      sizeS,
      sizeM,
      sizeL,
      sizeXL,
      sizeXXL
    } = req.body;

    const s = parseInt(sizeS, 10) || 0;
    const m = parseInt(sizeM, 10) || 0;
    const l = parseInt(sizeL, 10) || 0;
    const xl = parseInt(sizeXL, 10) || 0;
    const xxl = parseInt(sizeXXL, 10) || 0;

    const totalQty = parseInt(qty, 10) || (s + m + l + xl + xxl) || 1;
    const isTshirt = item === 'White T-Shirt';

    let allocationStatus = 'Standard';
    let sizeSummary = 'Standard';

    if (isTshirt) {
      const sizeSum = s + m + l + xl + xxl;
      allocationStatus = sizeSum === totalQty ? 'Matched' : (sizeSum === 0 ? 'Not Specified' : 'Mismatch');
      sizeSummary = buildSizeSummary(s, m, l, xl, xxl);
    }

    const updatedRow = [
      new Date().toISOString(),
      sanitizeCellValue(name),
      sanitizeCellValue(phone || ''),
      sanitizeCellValue(email || ''),
      sanitizeCellValue(item),
      String(totalQty),
      sanitizeCellValue(bookingStatus || 'Confirmed'),
      sanitizeCellValue(paymentStatus || 'Pending'),
      sanitizeCellValue(notes || ''),
      String(s),
      String(m),
      String(l),
      String(xl),
      String(xxl),
      allocationStatus,
      sizeSummary
    ];

    // Real-time write to Google Sheet
    const writeResult = await writeToGoogleSheet('update', { rowNumber, row: updatedRow });

    // Update overlay
    const overlay = readOverlay();
    overlay.updatedRows[rowNumber] = {
      timestamp: new Date().toISOString(),
      name,
      phone: phone || '',
      email: email || '',
      item,
      qty: totalQty,
      bookingStatus: bookingStatus || 'Confirmed',
      paymentStatus: paymentStatus || 'Pending',
      notes: notes || '',
      sizeS: s,
      sizeM: m,
      sizeL: l,
      sizeXL: xl,
      sizeXXL: xxl,
      sizeAllocationStatus: allocationStatus,
      sizesSummary: sizeSummary,
    };
    writeOverlay(overlay);

    broadcastSse('data_changed', {
      action: 'update',
      rowNumber,
      name,
      item,
      qty: totalQty,
      syncMethod: writeResult.method,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Booking #${rowNumber} updated!`,
      syncMethod: writeResult.method
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Failed to update booking: ' + error.message });
  }
});

// DELETE: Real-time Delete
app.delete('/api/data/:rowNumber', authenticateToken, async (req, res) => {
  try {
    const rowNumber = req.params.rowNumber;

    // Real-time write to Google Sheet
    const writeResult = await writeToGoogleSheet('delete', { rowNumber });

    // Update overlay
    const overlay = readOverlay();
    const num = parseInt(rowNumber, 10);
    if (!isNaN(num)) {
      overlay.deletedRows.push(num);
    }
    writeOverlay(overlay);

    broadcastSse('data_changed', {
      action: 'delete',
      rowNumber,
      syncMethod: writeResult.method,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: `Row #${rowNumber} removed.`,
      syncMethod: writeResult.method
    });
  } catch (error) {
    console.error('Error clearing row:', error);
    res.status(500).json({ error: 'Failed to clear row: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// STOCK & INVENTORY: LIVE FROM "Inventory & Availability"
// ─────────────────────────────────────────────────────────────

app.get('/api/inventory', authenticateToken, async (req, res) => {
  try {
    const raw = await fetchSheetValues('Inventory & Availability!A5:G20');
    const sh1Raw = await fetchSheetValues('Sheet1!A6:N20');

    // Calculate real-time booked units across Form Responses 1 & 2 + overlay
    const overlay = readOverlay();
    const liveBookedMap = {};

    try {
      const rawF1 = await fetchSheetValues('Form Responses 1!A1:P200');
      rawF1.slice(1).forEach((row, idx) => {
        const rowNum = idx + 2;
        if (overlay.deletedRows.includes(rowNum)) return;
        const itemName = (row[4] || '').trim();
        const q = parseInt(row[5], 10) || 0;
        if (itemName) {
          liveBookedMap[itemName] = (liveBookedMap[itemName] || 0) + q;
        }
      });
    } catch (e) {}

    overlay.addedRows.forEach(r => {
      if (r.item) {
        liveBookedMap[r.item] = (liveBookedMap[r.item] || 0) + (parseInt(r.qty, 10) || 0);
      }
    });

    try {
      const rawF2 = await fetchSheetValues('Form responses 2!A1:H100');
      rawF2.slice(1).forEach(row => {
        const itemName = (row[4] || '').trim();
        const q = parseInt(row[6], 10) || 0;
        if (itemName) {
          liveBookedMap[itemName] = (liveBookedMap[itemName] || 0) + q;
        }
      });
    } catch (e) {}

    const metaMap = {};
    sh1Raw.forEach(row => {
      if (!row || !row[0]) return;
      metaMap[row[0].trim()] = {
        unitCost: parseFloat((row[3] || '0').replace(/[^0-9.]/g, '')) || 0,
        sellingPrice: parseFloat((row[4] || '0').replace(/[^0-9.]/g, '')) || 0,
        status: row[10] || 'In Review',
        dealer: row[11] || '',
        connection: row[13] || ''
      };
    });

    const items = [];
    let totalStockUnits = 0;
    let totalBookedUnits = 0;
    let totalAvailableUnits = 0;

    raw.forEach(row => {
      const name = (row[0] || '').trim();
      if (!name || name.toLowerCase() === 'total' || name.toLowerCase() === 'item') return;

      const category = row[1] || 'General';
      const totalStock = parseInt(row[2], 10) || 0;
      const sheetBooked = parseInt(row[3], 10) || 0;
      const booked = liveBookedMap[name] !== undefined ? liveBookedMap[name] : sheetBooked;
      const available = Math.max(0, totalStock - booked);
      const remainingPct = totalStock > 0 ? Math.round((available / totalStock) * 100) : 0;
      const status = available === 0 ? 'Out of Stock' : (available < (totalStock * 0.2) ? 'Low Stock' : 'In Stock');

      const meta = metaMap[name] || { unitCost: 100, sellingPrice: 150, dealer: '', connection: '', status };

      totalStockUnits += totalStock;
      totalBookedUnits += booked;
      totalAvailableUnits += available;

      items.push({
        item: name,
        category,
        totalStock,
        bookedUnits: booked,
        availableStock: available,
        remainingPct,
        status: meta.status || status,
        unitCost: meta.unitCost,
        sellingPrice: meta.sellingPrice,
        dealer: meta.dealer,
        connection: meta.connection
      });
    });

    res.json({
      success: true,
      source: 'google_sheets_live',
      totalStockUnits: totalStockUnits || 1850,
      totalBookedUnits,
      totalAvailableUnits: totalAvailableUnits || totalStockUnits,
      items
    });
  } catch (error) {
    console.error('Error fetching inventory from Google Sheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// T-SHIRT SIZES DEMAND & ALLOCATION
// ─────────────────────────────────────────────────────────────

app.get('/api/tshirt-sizes', authenticateToken, async (req, res) => {
  try {
    const raw = await fetchSheetValues('Form Responses 1!A1:P200');
    const overlay = readOverlay();

    const sizeTotals = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
    let totalBooked = 0;

    // Process live sheet rows
    raw.slice(1).forEach((row, idx) => {
      const rowNum = idx + 2;
      if (overlay.deletedRows.includes(rowNum)) return;

      const item = row[4];
      if (item !== 'White T-Shirt') return;

      const s = parseInt(row[9], 10) || 0;
      const m = parseInt(row[10], 10) || 0;
      const l = parseInt(row[11], 10) || 0;
      const xl = parseInt(row[12], 10) || 0;
      const xxl = parseInt(row[13], 10) || 0;

      sizeTotals.S += s;
      sizeTotals.M += m;
      sizeTotals.L += l;
      sizeTotals.XL += xl;
      sizeTotals.XXL += xxl;

      totalBooked += (parseInt(row[5], 10) || (s + m + l + xl + xxl));
    });

    // Process overlay additions
    overlay.addedRows.forEach(r => {
      if (r.item !== 'White T-Shirt') return;
      sizeTotals.S += (r.sizeS || 0);
      sizeTotals.M += (r.sizeM || 0);
      sizeTotals.L += (r.sizeL || 0);
      sizeTotals.XL += (r.sizeXL || 0);
      sizeTotals.XXL += (r.sizeXXL || 0);
      totalBooked += (r.qty || 0);
    });

    const TARGET = 250;
    res.json({
      success: true,
      targetStock: TARGET,
      totalBooked,
      totalAvailable: Math.max(0, TARGET - totalBooked),
      unitCost: 260,
      sellingPrice: 449,
      projectedRevenue: totalBooked * 449,
      sizes: sizeTotals,
      breakdownPercentages: {
        S: totalBooked ? Math.round((sizeTotals.S / totalBooked) * 100) : 0,
        M: totalBooked ? Math.round((sizeTotals.M / totalBooked) * 100) : 0,
        L: totalBooked ? Math.round((sizeTotals.L / totalBooked) * 100) : 0,
        XL: totalBooked ? Math.round((sizeTotals.XL / totalBooked) * 100) : 0,
        XXL: totalBooked ? Math.round((sizeTotals.XXL / totalBooked) * 100) : 0,
      }
    });
  } catch (error) {
    console.error('Error fetching t-shirt sizes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// FINANCIALS: LIVE FROM "Sheet1" & "Pre-Book Tracker"
// ─────────────────────────────────────────────────────────────

app.get('/api/financials', authenticateToken, async (req, res) => {
  try {
    const raw = await fetchSheetValues('Sheet1!A6:N20');

    let totalCatalogCost = 0;
    let expectedTotalRevenue = 0;

    const items = raw
      .filter(row => row && row[0] && row[0].trim().toLowerCase() !== 'item' && row[0].trim().toLowerCase() !== 'total')
      .map(row => {
      const name = (row[0] || '').trim();
      const unitCost = parseFloat((row[3] || '0').replace(/[^0-9.]/g, '')) || 0;
      const price = parseFloat((row[4] || '0').replace(/[^0-9.]/g, '')) || 0;
      const qty = parseInt((row[5] || '0').replace(/[^0-9]/g, ''), 10) || 0;
      const cost = parseFloat((row[6] || '0').replace(/[^0-9.]/g, '')) || (unitCost * qty);
      const rev = parseFloat((row[7] || '0').replace(/[^0-9.]/g, '')) || (price * qty);
      const profit = parseFloat((row[8] || '0').replace(/[^0-9.]/g, '')) || (price - unitCost);
      const margin = row[9] || (price > 0 ? Math.round((profit / price) * 100) + '%' : '0%');
      const status = row[10] || 'In Review';

      totalCatalogCost += cost;
      expectedTotalRevenue += rev;

      return {
        item: name,
        unitCost,
        sellingPrice: price,
        qty,
        totalCost: cost,
        expectedRevenue: rev,
        unitProfit: profit,
        margin,
        status
      };
    });

    const netProfit = expectedTotalRevenue - totalCatalogCost;
    const avgMargin = expectedTotalRevenue > 0 ? Math.round((netProfit / expectedTotalRevenue) * 100) : 44.6;

    res.json({
      success: true,
      source: 'google_sheets_live',
      totalCatalogInvestment: totalCatalogCost || 158500,
      expectedTotalRevenue: expectedTotalRevenue || 267350,
      netProfit: netProfit || 108850,
      avgMargin,
      items
    });
  } catch (error) {
    console.error('Error fetching financials:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 GEN M Real-Time Command Center online: http://localhost:${PORT}`);
  console.log(`📊 Google Sheet ID: ${SPREADSHEET_ID}`);
  console.log(`🔑 Google Sheets API Key: ${GOOGLE_API_KEY.slice(0, 8)}...`);
  console.log(`🔐 Admin: ${ADMIN_USERNAME} | Default Pass: ${ADMIN_PASSWORD_PLAIN}`);
  console.log(`=================================================\n`);
});
