/**
 * GEN M Swag Dashboard — Secure Backend Server
 * 
 * Features:
 * - Google Sheets API integration via Google Cloud Service Account (No API Key exposure)
 * - Username & Password authentication with bcrypt salt & hash
 * - JSON Web Token (JWT) session authorization
 * - Formula/CSV injection sanitization for all sheet cell writes
 * - Fallback local storage cache so the dashboard functions out-of-the-box before GCP credentials are provided
 * - Rate limiting on login attempts to thwart brute force
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
const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '';
const SHEET_RANGE = process.env.SHEET_RANGE || 'Form responses 2!A:I';
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

// Local file storage fallback path
const DATA_DIR = path.join(__dirname, 'data');
const LOCAL_CACHE_FILE = path.join(DATA_DIR, 'local-orders.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data if local cache doesn't exist
const INITIAL_SEED_DATA = [
  ['Timestamp', 'Name', 'Phone', 'Email', 'Item', 'Size', 'Qty', 'Notes', 'Status'],
  ['2026-10-14T10:15:00.000Z', 'Ameen Farhan', '+91 98471 23456', 'ameen.farhan@gmail.com', 'White T-Shirt', 'L', '2', 'Kozhikode event delivery requested', 'Confirmed'],
  ['2026-10-14T11:42:00.000Z', 'Fatima Zahra', '+91 94462 87654', 'fatima.z@outlook.com', 'Water Bottle', 'Standard', '1', 'Navy blue finish preferred', 'Pending'],
  ['2026-10-14T14:20:00.000Z', 'Rayan Mohammed', '+91 97455 11223', 'rayan.m@gmail.com', 'Embroidered Cap', 'Adjustable', '3', 'Campus Caravan pre-order', 'Shipped'],
  ['2026-10-14T16:05:00.000Z', 'Hiba Mariyam', '+91 99951 88776', 'hiba.mariyam@yahoo.com', 'Cross Bag', 'Standard', '1', 'Urgent courier dispatch', 'Confirmed'],
  ['2026-10-15T09:30:00.000Z', 'Bilal Ahmed', '+91 98950 44332', 'bilal.ahmed@gmail.com', 'Glass Set', 'Pack of 2', '2', 'Gift packaging needed', 'Pending'],
  ['2026-10-15T10:10:00.000Z', 'Zainab Shereen', '+91 96333 55441', 'zainab.s@gmail.com', 'Diary', 'A5 Hardbound', '1', 'Confluence delegate kit', 'Delivered']
];

function readLocalData() {
  try {
    if (!fs.existsSync(LOCAL_CACHE_FILE)) {
      fs.writeFileSync(LOCAL_CACHE_FILE, JSON.stringify(INITIAL_SEED_DATA, null, 2), 'utf-8');
      return INITIAL_SEED_DATA;
    }
    const raw = fs.readFileSync(LOCAL_CACHE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local cache:', err.message);
    return INITIAL_SEED_DATA;
  }
}

function writeLocalData(data) {
  try {
    fs.writeFileSync(LOCAL_CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing local cache:', err.message);
    return false;
  }
}

// Determine if Google Service Account is configured
function getCredentialsPath() {
  if (fs.existsSync(CREDENTIALS_PATH)) return CREDENTIALS_PATH;
  if (fs.existsSync(ALT_CREDENTIALS_PATH)) return ALT_CREDENTIALS_PATH;
  return null;
}

function isGoogleSheetsConfigured() {
  const credPath = getCredentialsPath();
  return Boolean(credPath && SPREADSHEET_ID && SPREADSHEET_ID.trim().length > 10);
}

function getGoogleSheetsClient() {
  const credPath = getCredentialsPath();
  if (!credPath) throw new Error('Service Account credentials.json not found on server.');
  if (!SPREADSHEET_ID) throw new Error('SPREADSHEET_ID environment variable is missing.');

  const auth = new google.auth.GoogleAuth({
    keyFile: credPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return { auth, sheets: google.sheets({ version: 'v4', auth }) };
}

/**
 * Security: Sanitize cell values against Spreadsheet / CSV Formula Injection.
 * Prefixes strings beginning with =, +, -, @, tab, or carriage return with a single quote.
 */
function sanitizeCellValue(val) {
  if (typeof val !== 'string') return val === undefined || val === null ? '' : String(val);
  const trimmed = val.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${val}`;
  }
  return val;
}

// Rate limiting for login attempts
const failedAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 mins
const MAX_FAILED_ATTEMPTS = 6;

function checkRateLimit(ip) {
  const record = failedAttempts.get(ip);
  if (!record) return { allowed: true };
  if (Date.now() - record.lastAttempt > RATE_LIMIT_WINDOW_MS) {
    failedAttempts.delete(ip);
    return { allowed: true };
  }
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    const waitMins = Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - record.lastAttempt)) / 60000);
    return { allowed: false, waitMins };
  }
  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const record = failedAttempts.get(ip) || { count: 0, lastAttempt: Date.now() };
  record.count += 1;
  record.lastAttempt = Date.now();
  failedAttempts.set(ip, record);
}

function clearFailedAttempts(ip) {
  failedAttempts.delete(ip);
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
      return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    }
    req.user = decodedUser;
    next();
  });
}

// ─────────────────────────────────────────────────────────────
// AUTHENTICATION ROUTES
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const { allowed, waitMins } = checkRateLimit(ip);

  if (!allowed) {
    return res.status(429).json({
      error: `Too many failed login attempts. Please wait ${waitMins} minute(s) before trying again.`
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const isUserValid = username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase();
  const isPassValid = isUserValid && bcrypt.compareSync(password, adminPasswordHash);

  if (!isPassValid) {
    recordFailedAttempt(ip);
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  clearFailedAttempts(ip);

  // Generate JWT token
  const token = jwt.sign(
    { username: ADMIN_USERNAME, role: 'admin' },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  return res.json({
    success: true,
    message: 'Authentication successful',
    token,
    user: {
      username: ADMIN_USERNAME,
      role: 'Administrator'
    },
    expiresIn: JWT_EXPIRY
  });
});

/**
 * GET /api/auth/verify
 */
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// ─────────────────────────────────────────────────────────────
// CONFIGURATION & HEALTH STATUS ROUTE
// ─────────────────────────────────────────────────────────────

app.get('/api/config-status', (req, res) => {
  const credPath = getCredentialsPath();
  const isConfigured = isGoogleSheetsConfigured();

  let clientEmail = null;
  if (credPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      clientEmail = parsed.client_email || null;
    } catch (e) {
      // ignore
    }
  }

  res.json({
    status: 'online',
    mode: isConfigured ? 'google_sheets' : 'local_cache',
    googleSheets: {
      isConfigured,
      hasCredentialsFile: Boolean(credPath),
      credentialsPath: credPath ? path.basename(credPath) : null,
      serviceAccountEmail: clientEmail,
      spreadsheetIdConfigured: Boolean(SPREADSHEET_ID),
      spreadsheetIdMasked: SPREADSHEET_ID ? `${SPREADSHEET_ID.slice(0, 6)}...${SPREADSHEET_ID.slice(-4)}` : null,
      sheetRange: SHEET_RANGE,
    },
    message: isConfigured
      ? 'Connected directly to Google Sheets API using Service Account.'
      : 'Operating in secure Local Cache fallback mode. Supply credentials.json and SPREADSHEET_ID to enable live Google Sheets sync.'
  });
});

// ─────────────────────────────────────────────────────────────
// CRUD OPERATIONS (PROTECTED)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/data
 * Fetches all rows from Google Sheet or Local Cache
 */
app.get('/api/data', authenticateToken, async (req, res) => {
  try {
    if (isGoogleSheetsConfigured()) {
      const { sheets } = getGoogleSheetsClient();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGE,
      });

      const values = response.data.values || [];
      return res.json({
        success: true,
        source: 'google_sheets',
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGE,
        values,
      });
    } else {
      // Fallback local storage
      const localData = readLocalData();
      return res.json({
        success: true,
        source: 'local_cache',
        notice: 'Using local cache because Google Sheets Service Account is not yet configured.',
        values: localData,
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({
      error: 'Failed to fetch spreadsheet data: ' + error.message,
      hint: 'Verify that the Service Account email is added as Editor to the Google Sheet.'
    });
  }
});

/**
 * POST /api/data
 * Creates/Appends a new record to Google Sheet or Local Cache
 */
app.post('/api/data', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, item, size, qty, notes, status } = req.body;

    if (!name || !item) {
      return res.status(400).json({ error: 'Customer Name and Merchandise Item are required.' });
    }

    const timestamp = new Date().toISOString();
    const newRow = [
      timestamp,
      sanitizeCellValue(name),
      sanitizeCellValue(phone || ''),
      sanitizeCellValue(email || ''),
      sanitizeCellValue(item),
      sanitizeCellValue(size || 'Standard'),
      sanitizeCellValue(qty ? String(qty) : '1'),
      sanitizeCellValue(notes || ''),
      sanitizeCellValue(status || 'Pending')
    ];

    if (isGoogleSheetsConfigured()) {
      const { sheets } = getGoogleSheetsClient();
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [newRow],
        },
      });

      return res.json({
        success: true,
        message: 'Record appended to Google Sheet successfully',
        source: 'google_sheets',
        newRow,
        data: appendResponse.data,
      });
    } else {
      const localData = readLocalData();
      localData.push(newRow);
      writeLocalData(localData);

      return res.json({
        success: true,
        message: 'Record appended to local cache',
        source: 'local_cache',
        newRow,
      });
    }
  } catch (error) {
    console.error('Error creating record:', error.message);
    res.status(500).json({ error: 'Failed to add record: ' + error.message });
  }
});

/**
 * PUT /api/data/:rowNumber
 * Updates a specific row (e.g. row 2, 3...)
 */
app.put('/api/data/:rowNumber', authenticateToken, async (req, res) => {
  try {
    const rowNumber = parseInt(req.params.rowNumber, 10);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return res.status(400).json({ error: 'Invalid rowNumber. Must be an integer >= 2.' });
    }

    const { name, phone, email, item, size, qty, notes, status } = req.body;

    const sheetTab = SHEET_RANGE.split('!')[0] || 'Form responses 2';

    if (isGoogleSheetsConfigured()) {
      const { sheets } = getGoogleSheetsClient();

      // Range for B through I (preserving timestamp at column A)
      const updateRange = `${sheetTab}!B${rowNumber}:I${rowNumber}`;
      const updatedValues = [
        sanitizeCellValue(name),
        sanitizeCellValue(phone || ''),
        sanitizeCellValue(email || ''),
        sanitizeCellValue(item),
        sanitizeCellValue(size || 'Standard'),
        sanitizeCellValue(qty ? String(qty) : '1'),
        sanitizeCellValue(notes || ''),
        sanitizeCellValue(status || 'Pending')
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [updatedValues],
        },
      });

      return res.json({
        success: true,
        message: `Row ${rowNumber} updated in Google Sheet`,
        source: 'google_sheets',
      });
    } else {
      const localData = readLocalData();
      const arrayIndex = rowNumber - 1; // 1-indexed to 0-indexed

      if (arrayIndex >= localData.length) {
        return res.status(404).json({ error: `Row ${rowNumber} does not exist.` });
      }

      const existingTimestamp = localData[arrayIndex][0] || new Date().toISOString();
      localData[arrayIndex] = [
        existingTimestamp,
        name,
        phone || '',
        email || '',
        item,
        size || 'Standard',
        qty ? String(qty) : '1',
        notes || '',
        status || 'Pending'
      ];

      writeLocalData(localData);

      return res.json({
        success: true,
        message: `Row ${rowNumber} updated in local cache`,
        source: 'local_cache',
      });
    }
  } catch (error) {
    console.error('Error updating row:', error.message);
    res.status(500).json({ error: 'Failed to update row: ' + error.message });
  }
});

/**
 * DELETE /api/data/:rowNumber
 * Clears or removes a specific row
 */
app.delete('/api/data/:rowNumber', authenticateToken, async (req, res) => {
  try {
    const rowNumber = parseInt(req.params.rowNumber, 10);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return res.status(400).json({ error: 'Invalid rowNumber. Must be an integer >= 2.' });
    }

    const sheetTab = SHEET_RANGE.split('!')[0] || 'Form responses 2';

    if (isGoogleSheetsConfigured()) {
      const { sheets } = getGoogleSheetsClient();
      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetTab}!A${rowNumber}:I${rowNumber}`,
      });

      return res.json({
        success: true,
        message: `Row ${rowNumber} cleared from Google Sheet`,
        source: 'google_sheets',
      });
    } else {
      const localData = readLocalData();
      const arrayIndex = rowNumber - 1;

      if (arrayIndex >= localData.length) {
        return res.status(404).json({ error: `Row ${rowNumber} does not exist.` });
      }

      localData.splice(arrayIndex, 1);
      writeLocalData(localData);

      return res.json({
        success: true,
        message: `Row ${rowNumber} deleted from local cache`,
        source: 'local_cache',
      });
    }
  } catch (error) {
    console.error('Error deleting row:', error.message);
    res.status(500).json({ error: 'Failed to clear row: ' + error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 GEN M Dashboard Server running on http://localhost:${PORT}`);
  console.log(`🔐 Admin Username: ${ADMIN_USERNAME}`);
  console.log(`🔑 Default Password: ${ADMIN_PASSWORD_PLAIN}`);
  console.log(`📊 Google Sheets Configured: ${isGoogleSheetsConfigured() ? 'YES (Live)' : 'NO (Local Cache Mode)'}`);
  if (!isGoogleSheetsConfigured()) {
    console.log(`💡 To connect live Google Sheets:`);
    console.log(`   1. Save service account key as credentials.json`);
    console.log(`   2. Set SPREADSHEET_ID in .env`);
    console.log(`   3. Share the Google Sheet with the Service Account email`);
  }
  console.log(`=================================================\n`);
});
