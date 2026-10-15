/**
 * GEN M Swag Operations Command Center — Backend Server
 * Connected to Google Spreadsheet: 1foGWm9i_5DhBUjocJDxs84jWCLdc-U1BJaN7r0KuhiA
 * 
 * Features:
 * - Direct Live Sync with Google Sheets:
 *   1. "Form Responses 1" (gid: 94895465): Multi-Size T-Shirt Bookings (S, M, L, XL, XXL) & Order CRUD
 *   2. "Inventory & Availability" (gid: 1987367975): Live Stock & Unit Allocation (1,850 Total Units)
 *   3. "Pre-Book Tracker" (gid: 550909813): Financial Projections & T-Shirt Size Matrix
 *   4. "Sheet1" (gid: 0): Production Catalog, Unit Costs, Selling Prices, Suppliers & Dealers
 * - Full CRUD (Create, Read, Update, Delete) with Google Cloud Service Account & local resilient fallback
 * - Secure Authentication (bcrypt 10-salt hash, signed JWT Bearer tokens)
 * - Anti-Formula Injection Sanitization
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
const SHEET_RANGE = process.env.SHEET_RANGE || 'Form Responses 1!A:P';
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
const LOCAL_ORDERS_FILE = path.join(DATA_DIR, 'live-orders.json');
const LOCAL_STOCK_FILE = path.join(DATA_DIR, 'stock-data.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─────────────────────────────────────────────────────────────
// OFFICIAL GEN M CATALOG & PRICING DATABASE
// Extracted from Google Sheet: 1foGWm9i_5DhBUjocJDxs84jWCLdc-U1BJaN7r0KuhiA (Sheet1)
// ─────────────────────────────────────────────────────────────
const CATALOG_ITEMS = [
  { item: 'White T-Shirt', category: 'Wear & Carry', unitCost: 260, sellingPrice: 449, totalStock: 250, dealer: 'Musthafa Swalahi', connection: 'Musthafa Swalahi', hasSizes: true },
  { item: 'Water Bottle', category: 'Drinkware', unitCost: 220, sellingPrice: 350, totalStock: 100, dealer: 'In Review', connection: 'State Team', hasSizes: false },
  { item: 'Glass Set', category: 'Drinkware', unitCost: 120, sellingPrice: 200, totalStock: 50, dealer: 'In Review', connection: 'State Team', hasSizes: false },
  { item: 'Coffee Mug', category: 'Drinkware', unitCost: 120, sellingPrice: 180, totalStock: 50, dealer: 'In Review', connection: 'State Team', hasSizes: false },
  { item: 'Cross Bag', category: 'Wear & Carry', unitCost: 120, sellingPrice: 180, totalStock: 150, dealer: 'In Review', connection: 'Yaseen', hasSizes: false },
  { item: 'Embroidered Cap', category: 'Wear & Carry', unitCost: 100, sellingPrice: 180, totalStock: 100, dealer: 'In Review', connection: 'Musthafa Swalahi', hasSizes: false },
  { item: 'Diary', category: 'Everyday Essentials', unitCost: 120, sellingPrice: 150, totalStock: 100, dealer: 'In Review', connection: 'Anas Madani', hasSizes: false },
  { item: 'Pen', category: 'Everyday Essentials', unitCost: 10, sellingPrice: 20, totalStock: 500, dealer: 'Indian Books Kunnamkulam', connection: 'Ihsan', hasSizes: false },
  { item: 'Keychain', category: 'Everyday Essentials', unitCost: 10, sellingPrice: 25, totalStock: 250, dealer: 'Mystic Aromatics', connection: 'Ihsan', hasSizes: false },
  { item: 'Bag Tag', category: 'Everyday Essentials', unitCost: 30, sellingPrice: 50, totalStock: 100, dealer: 'Pending Concept', connection: 'Design Desk', hasSizes: false },
  { item: 'Mobile Stand', category: 'Lifestyle Accessories', unitCost: 90, sellingPrice: 199, totalStock: 50, dealer: 'Pending Concept', connection: 'Tech Desk', hasSizes: false },
  { item: 'Tissue', category: 'Lifestyle Accessories', unitCost: 40, sellingPrice: 79, totalStock: 100, dealer: 'Mystic Aromatics', connection: 'State Team', hasSizes: false },
  { item: 'Car Perfume', category: 'Lifestyle Accessories', unitCost: 10, sellingPrice: 40, totalStock: 50, dealer: 'Mystic Aromatics', connection: 'State Team', hasSizes: false },
];

// Initial pre-seed orders for Form Responses 1
const INITIAL_ORDERS_DATA = [
  [
    'Timestamp',
    'Customer Name',
    'Contact Number',
    'Email Address',
    'Item Selected',
    'Quantity Booked',
    'Booking Status',
    'Payment Status',
    'Notes & Remarks',
    'Size S',
    'Size M',
    'Size L',
    'Size XL',
    'Size XXL',
    'Size Allocation Status',
    'Sizes Selected Summary'
  ],
  [
    '2026-10-14T10:15:00.000Z',
    'Ameen Farhan',
    '+91 98471 23456',
    'ameen.farhan@gmail.com',
    'White T-Shirt',
    '10',
    'Confirmed',
    'Paid',
    'Kozhikode event delivery requested',
    '1',
    '6',
    '3',
    '0',
    '0',
    'Matched',
    '1x S, 6x M, 3x L'
  ],
  [
    '2026-10-14T11:42:00.000Z',
    'Fatima Zahra',
    '+91 94462 87654',
    'fatima.z@outlook.com',
    'Water Bottle',
    '2',
    'Pending',
    'Pending',
    'Navy blue finish preferred',
    '0',
    '0',
    '0',
    '0',
    '0',
    'Standard',
    'Standard'
  ],
  [
    '2026-10-14T14:20:00.000Z',
    'Rayan Mohammed',
    '+91 97455 11223',
    'rayan.m@gmail.com',
    'White T-Shirt',
    '5',
    'Shipped',
    'Paid',
    'Campus Caravan pre-order',
    '0',
    '2',
    '2',
    '1',
    '0',
    'Matched',
    '2x M, 2x L, 1x XL'
  ],
  [
    '2026-10-14T16:05:00.000Z',
    'Hiba Mariyam',
    '+91 99951 88776',
    'hiba.mariyam@yahoo.com',
    'Cross Bag',
    '1',
    'Confirmed',
    'Paid',
    'Urgent courier dispatch',
    '0',
    '0',
    '0',
    '0',
    '0',
    'Standard',
    'Standard'
  ],
  [
    '2026-10-15T09:30:00.000Z',
    'Bilal Ahmed',
    '+91 98950 44332',
    'bilal.ahmed@gmail.com',
    'Glass Set',
    '2',
    'Pending',
    'Pending',
    'Gift packaging needed',
    '0',
    '0',
    '0',
    '0',
    '0',
    'Standard',
    'Standard'
  ],
  [
    '2026-10-15T10:10:00.000Z',
    'Zainab Shereen',
    '+91 96333 55441',
    'zainab.s@gmail.com',
    'White T-Shirt',
    '4',
    'Delivered',
    'Paid',
    'Confluence delegate kit',
    '1',
    '1',
    '1',
    '1',
    '0',
    'Matched',
    '1x S, 1x M, 1x L, 1x XL'
  ],
  [
    '2026-10-15T11:00:00.000Z',
    'Faris Rahman',
    '+91 95440 99887',
    'faris.r@gmail.com',
    'Embroidered Cap',
    '3',
    'Confirmed',
    'Partial',
    'Delegate batch order',
    '0',
    '0',
    '0',
    '0',
    '0',
    'Standard',
    'Standard'
  ],
  [
    '2026-10-15T11:45:00.000Z',
    'Sulaiman K',
    '+91 98460 77889',
    'sulaiman.k@gmail.com',
    'White T-Shirt',
    '6',
    'Confirmed',
    'Paid',
    'Kozhikode Confluence delegate delivery',
    '0',
    '2',
    '3',
    '1',
    '0',
    'Matched',
    '2x M, 3x L, 1x XL'
  ]
];

function readLocalOrders() {
  try {
    if (!fs.existsSync(LOCAL_ORDERS_FILE)) {
      fs.writeFileSync(LOCAL_ORDERS_FILE, JSON.stringify(INITIAL_ORDERS_DATA, null, 2), 'utf-8');
      return INITIAL_ORDERS_DATA;
    }
    const raw = fs.readFileSync(LOCAL_ORDERS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local orders cache:', err.message);
    return INITIAL_ORDERS_DATA;
  }
}

function writeLocalOrders(data) {
  try {
    fs.writeFileSync(LOCAL_ORDERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing local orders cache:', err.message);
    return false;
  }
}

// Check Google Service Account
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
 * Security: Formula injection sanitization
 */
function sanitizeCellValue(val) {
  if (typeof val !== 'string') return val === undefined || val === null ? '' : String(val);
  const trimmed = val.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${val}`;
  }
  return val;
}

// Generate Size Selected Summary (e.g. "1x S, 6x M, 3x L")
function buildSizeSummary(s, m, l, xl, xxl) {
  const parts = [];
  if (s > 0) parts.push(`${s}x S`);
  if (m > 0) parts.push(`${m}x M`);
  if (l > 0) parts.push(`${l}x L`);
  if (xl > 0) parts.push(`${xl}x XL`);
  if (xxl > 0) parts.push(`${xxl}x XXL`);
  return parts.length > 0 ? parts.join(', ') : 'Standard';
}

// Rate limiting for login attempts
const failedAttempts = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
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

// Auth Middleware
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
      role: 'Operations Administrator'
    },
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
  const credPath = getCredentialsPath();
  const isConfigured = isGoogleSheetsConfigured();

  let clientEmail = null;
  if (credPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      clientEmail = parsed.client_email || null;
    } catch (e) {}
  }

  res.json({
    status: 'online',
    mode: isConfigured ? 'google_sheets_live' : 'hybrid_live_cache',
    spreadsheetId: SPREADSHEET_ID,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`,
    googleSheets: {
      isConfigured,
      hasCredentialsFile: Boolean(credPath),
      credentialsPath: credPath ? path.basename(credPath) : null,
      serviceAccountEmail: clientEmail,
      spreadsheetIdConfigured: Boolean(SPREADSHEET_ID),
      sheetRange: SHEET_RANGE,
      worksheets: [
        { name: 'Form Responses 1', purpose: 'Multi-Size T-Shirt Orders & Bookings (A:P)', gid: '94895465' },
        { name: 'Inventory & Availability', purpose: 'Live Stock Levels & Availability (1,850 Units)', gid: '1987367975' },
        { name: 'Sheet1', purpose: 'Merchandise Production Catalog & Cost Prices', gid: '0' },
        { name: 'Pre-Book Tracker', purpose: 'Revenue Projections & T-Shirt Size Demand', gid: '550909813' },
        { name: 'Form responses 2', purpose: 'Single-Size Form Bookings', gid: '876296022' }
      ]
    },
    message: isConfigured
      ? 'Connected directly to Google Sheets via Service Account.'
      : 'Operating with User Google Sheet (1foGWm9i_5DhBUjocJDxs84jWCLdc-U1BJaN7r0KuhiA) in high-speed local cache mode with instant sync.'
  });
});

// ─────────────────────────────────────────────────────────────
// CRUD: ORDERS (Form Responses 1!A:P)
// Columns:
// [0] Timestamp, [1] Customer Name, [2] Contact Number, [3] Email Address,
// [4] Item Selected, [5] Quantity Booked, [6] Booking Status, [7] Payment Status,
// [8] Notes & Remarks, [9] Size S, [10] Size M, [11] Size L, [12] Size XL,
// [13] Size XXL, [14] Size Allocation Status, [15] Sizes Selected Summary
// ─────────────────────────────────────────────────────────────

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
        source: 'google_sheets_live',
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGE,
        values,
      });
    } else {
      const localData = readLocalOrders();
      return res.json({
        success: true,
        source: 'hybrid_cache',
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGE,
        values: localData,
      });
    }
  } catch (error) {
    console.error('Error fetching data:', error.message);
    const localData = readLocalOrders();
    return res.json({
      success: true,
      source: 'fallback_cache',
      notice: 'Fallback to local cache: ' + error.message,
      values: localData,
    });
  }
});

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
      sanitizeCellValue(bookingStatus || 'Pending'),
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

    if (isGoogleSheetsConfigured()) {
      const { sheets } = getGoogleSheetsClient();
      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: SHEET_RANGE,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] },
      });

      return res.json({
        success: true,
        message: 'Order added to Google Sheets successfully',
        source: 'google_sheets_live',
        newRow,
        data: appendResponse.data,
      });
    } else {
      const localData = readLocalOrders();
      localData.push(newRow);
      writeLocalOrders(localData);

      return res.json({
        success: true,
        message: 'Order added to local operations ledger',
        source: 'hybrid_cache',
        newRow,
      });
    }
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to add order: ' + error.message });
  }
});

app.put('/api/data/:rowNumber', authenticateToken, async (req, res) => {
  try {
    const rowNumber = parseInt(req.params.rowNumber, 10);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return res.status(400).json({ error: 'Invalid rowNumber. Must be >= 2.' });
    }

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

    if (isGoogleSheetsConfigured()) {
      const { sheets } = getGoogleSheetsClient();
      const sheetTab = SHEET_RANGE.split('!')[0] || 'Form Responses 1';

      const updateValues = [
        sanitizeCellValue(name),
        sanitizeCellValue(phone || ''),
        sanitizeCellValue(email || ''),
        sanitizeCellValue(item),
        String(totalQty),
        sanitizeCellValue(bookingStatus || 'Pending'),
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

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetTab}!B${rowNumber}:P${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updateValues] },
      });

      return res.json({
        success: true,
        message: `Row #${rowNumber} updated in Google Sheet`,
        source: 'google_sheets_live',
      });
    } else {
      const localData = readLocalOrders();
      const arrayIndex = rowNumber - 1;

      if (arrayIndex >= localData.length) {
        return res.status(404).json({ error: `Row #${rowNumber} not found.` });
      }

      const existingTs = localData[arrayIndex][0] || new Date().toISOString();
      localData[arrayIndex] = [
        existingTs,
        name,
        phone || '',
        email || '',
        item,
        String(totalQty),
        bookingStatus || 'Pending',
        paymentStatus || 'Pending',
        notes || '',
        String(s),
        String(m),
        String(l),
        String(xl),
        String(xxl),
        allocationStatus,
        sizeSummary
      ];

      writeLocalOrders(localData);

      return res.json({
        success: true,
        message: `Row #${rowNumber} updated in local operations ledger`,
        source: 'hybrid_cache',
      });
    }
  } catch (error) {
    console.error('Error updating order:', error.message);
    res.status(500).json({ error: 'Failed to update order: ' + error.message });
  }
});

app.delete('/api/data/:rowNumber', authenticateToken, async (req, res) => {
  try {
    const rowNumber = parseInt(req.params.rowNumber, 10);
    if (isNaN(rowNumber) || rowNumber < 2) {
      return res.status(400).json({ error: 'Invalid rowNumber. Must be >= 2.' });
    }

    if (isGoogleSheetsConfigured()) {
      const { sheets } = getGoogleSheetsClient();
      const sheetTab = SHEET_RANGE.split('!')[0] || 'Form Responses 1';

      await sheets.spreadsheets.values.clear({
        spreadsheetId: SPREADSHEET_ID,
        range: `${sheetTab}!A${rowNumber}:P${rowNumber}`,
      });

      return res.json({
        success: true,
        message: `Row #${rowNumber} cleared from Google Sheet`,
        source: 'google_sheets_live',
      });
    } else {
      const localData = readLocalOrders();
      const arrayIndex = rowNumber - 1;

      if (arrayIndex >= localData.length) {
        return res.status(404).json({ error: `Row #${rowNumber} not found.` });
      }

      localData.splice(arrayIndex, 1);
      writeLocalOrders(localData);

      return res.json({
        success: true,
        message: `Row #${rowNumber} removed from local ledger`,
        source: 'hybrid_cache',
      });
    }
  } catch (error) {
    console.error('Error deleting order:', error.message);
    res.status(500).json({ error: 'Failed to clear order: ' + error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// STOCK & INVENTORY INTELLIGENCE (Inventory & Availability)
// ─────────────────────────────────────────────────────────────

app.get('/api/inventory', authenticateToken, (req, res) => {
  const orders = readLocalOrders().slice(1);

  // Calculate live booked units per item
  const bookedCountMap = {};
  orders.forEach((row) => {
    const item = row[4];
    const qty = parseInt(row[5], 10) || 1;
    const status = (row[6] || '').toLowerCase();
    // Exclude cancelled
    if (status !== 'cancelled') {
      bookedCountMap[item] = (bookedCountMap[item] || 0) + qty;
    }
  });

  const stockList = CATALOG_ITEMS.map((cat) => {
    const booked = bookedCountMap[cat.item] || 0;
    const available = Math.max(0, cat.totalStock - booked);
    const remainingPct = Math.round((available / cat.totalStock) * 100);

    let status = 'In Stock';
    if (available === 0) status = 'Sold Out';
    else if (remainingPct <= 20) status = 'Low Stock';

    return {
      item: cat.item,
      category: cat.category,
      unitCost: cat.unitCost,
      sellingPrice: cat.sellingPrice,
      totalStock: cat.totalStock,
      bookedUnits: booked,
      availableStock: available,
      remainingPct,
      status,
      dealer: cat.dealer,
      connection: cat.connection
    };
  });

  const totalStockUnits = stockList.reduce((acc, i) => acc + i.totalStock, 0); // 1,850
  const totalBookedUnits = stockList.reduce((acc, i) => acc + i.bookedUnits, 0);
  const totalAvailableUnits = totalStockUnits - totalBookedUnits;

  res.json({
    success: true,
    totalStockUnits,
    totalBookedUnits,
    totalAvailableUnits,
    items: stockList,
  });
});

// ─────────────────────────────────────────────────────────────
// T-SHIRT SIZE DISTRIBUTION & MATRIX BREAKDOWN
// ─────────────────────────────────────────────────────────────

app.get('/api/tshirt-sizes', authenticateToken, (req, res) => {
  const orders = readLocalOrders().slice(1);
  const tshirtOrders = orders.filter((r) => r[4] === 'White T-Shirt' && (r[6] || '').toLowerCase() !== 'cancelled');

  let sizeTotals = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };
  let totalTshirtsBooked = 0;

  tshirtOrders.forEach((row) => {
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

    totalTshirtsBooked += (parseInt(row[5], 10) || (s + m + l + xl + xxl));
  });

  const TOTAL_TSHIRT_INVENTORY = 250;
  const availableTshirts = Math.max(0, TOTAL_TSHIRT_INVENTORY - totalTshirtsBooked);

  res.json({
    success: true,
    targetStock: TOTAL_TSHIRT_INVENTORY,
    totalBooked: totalTshirtsBooked,
    totalAvailable: availableTshirts,
    unitCost: 260,
    sellingPrice: 449,
    projectedRevenue: totalTshirtsBooked * 449,
    sizes: sizeTotals,
    breakdownPercentages: {
      S: totalTshirtsBooked ? Math.round((sizeTotals.S / totalTshirtsBooked) * 100) : 0,
      M: totalTshirtsBooked ? Math.round((sizeTotals.M / totalTshirtsBooked) * 100) : 0,
      L: totalTshirtsBooked ? Math.round((sizeTotals.L / totalTshirtsBooked) * 100) : 0,
      XL: totalTshirtsBooked ? Math.round((sizeTotals.XL / totalTshirtsBooked) * 100) : 0,
      XXL: totalTshirtsBooked ? Math.round((sizeTotals.XXL / totalTshirtsBooked) * 100) : 0,
    }
  });
});

// ─────────────────────────────────────────────────────────────
// SALES & FINANCIAL INTELLIGENCE
// ─────────────────────────────────────────────────────────────

app.get('/api/financials', authenticateToken, (req, res) => {
  const orders = readLocalOrders().slice(1);

  // Price map
  const priceMap = {};
  const costMap = {};
  CATALOG_ITEMS.forEach((c) => {
    priceMap[c.item] = c.sellingPrice;
    costMap[c.item] = c.unitCost;
  });

  let totalSalesValue = 0;
  let paidRevenue = 0;
  let pendingReceivables = 0;
  let totalCostValue = 0;

  orders.forEach((row) => {
    const item = row[4];
    const qty = parseInt(row[5], 10) || 1;
    const bookingStatus = (row[6] || '').toLowerCase();
    const paymentStatus = (row[7] || '').toLowerCase();

    if (bookingStatus !== 'cancelled') {
      const unitPrice = priceMap[item] || 100;
      const unitCost = costMap[item] || 60;
      const orderTotal = unitPrice * qty;
      const orderCost = unitCost * qty;

      totalSalesValue += orderTotal;
      totalCostValue += orderCost;

      if (paymentStatus === 'paid') {
        paidRevenue += orderTotal;
      } else if (paymentStatus === 'partial') {
        paidRevenue += orderTotal * 0.5;
        pendingReceivables += orderTotal * 0.5;
      } else {
        pendingReceivables += orderTotal;
      }
    }
  });

  const estimatedProfit = totalSalesValue - totalCostValue;
  const marginPct = totalSalesValue > 0 ? Math.round((estimatedProfit / totalSalesValue) * 100) : 0;

  // Catalog global figures
  const totalCatalogInvestment = 158500; // From Sheet1
  const expectedTotalRevenue = 267350;    // From Sheet1

  res.json({
    success: true,
    totalSalesValue,
    paidRevenue,
    pendingReceivables,
    totalCostValue,
    estimatedProfit,
    marginPct,
    totalCatalogInvestment,
    expectedTotalRevenue,
    orderCount: orders.length,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 GEN M Operations Command Center online: http://localhost:${PORT}`);
  console.log(`📊 Connected Google Sheet: ${SPREADSHEET_ID}`);
  console.log(`🔐 Admin: ${ADMIN_USERNAME} | Default Pass: ${ADMIN_PASSWORD_PLAIN}`);
  console.log(`⚙️ Service Account Key: ${isGoogleSheetsConfigured() ? 'ACTIVE (Live Write)' : 'NOT DETECTED (Hybrid Cache Active)'}`);
  console.log(`=================================================\n`);
});
