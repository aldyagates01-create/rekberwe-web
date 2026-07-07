import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import { createRemoteJWKSet, jwtVerify } from "jose";
import multer from "multer";

import {
  addAdminTransactionMessage,
  addStoredTransactionUpload,
  addSupportThreadMessage,
  addTransactionMessage,
  createTransaction,
  deleteTransactionByCode,
  completePendingSellerJoinsForUser,
  getAdminFeeSettings,
  getAllSupportThreads,
  getAllTransactions,
  getAllUsers,
  getAnalyticsSummary,
  getSupportThreadForGuest,
  getSupportThreadForUser,
  removePushSubscription,
  reviewUserVerification,
  upsertPushSubscription,
  getLinkedProvidersForUser,
  saveUserLocation,
  getTransactionByCode,
  getTransactionsForUser,
  updateUserAdminStatus,
  getUserById,
  getUserByProviderSocial,
  joinTransaction,
  linkProviderToUser,
  markPendingSellerJoinNotified,
  recordAnalyticsEvent,
  saveAdminFeeSettings,
  updateTransactionStatus,
  updateTransactionWorkflow,
  updateSellerPayoutDetails,
  updateUserProfile,
  updateUserVerification,
  updateUserVerificationFiles,
  upsertPendingSellerJoin,
  upsertUser,
} from "./database.js";
import { createRateLimiter, getRequestRateLimitKey } from "./rate-limit.js";
import { canAccessLocalUpload } from "./upload-access.js";
import {
  getViewerFromSession,
  sanitizeTransactionForViewer,
  sanitizeTransactionsForViewer,
} from "./user-privacy.js";
import { dispatchPushForEvent, getVapidPublicKey, initPushService, isPushEnabled } from "./push-service.js";
import {
  ANALYTICS_EVENT_TYPES,
  classifyReferrerSource,
  detectDeviceType,
  isValidVisitorId,
} from "./analytics-utils.js";
import {
  dispatchEmail,
  sendAdminVerifiedEmail,
  sendBuyerFundsSecuredEmail,
  sendDisputeOpenedEmail,
  sendFundsReleasedEmail,
  sendItemDeliveredEmail,
  sendRegistrationSuccessEmail,
  sendSellerFundsReceivedEmail,
  sendTestEmail,
  sendTransactionCreatedEmail,
} from "../lib/email/sendEmail.ts";
import {
  getWhatsappOtpStatus,
  resetWhatsappOtpPhone,
  sendWhatsappOtp,
  verifyWhatsappOtp,
} from "./whatsapp-otp-service.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, "..");

const app = express();
app.set("trust proxy", 1);
const isProduction = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 3000);
const webNextDir = path.resolve(__dirname, "..", "web");
const useNextFrontend = String(process.env.USE_NEXT_FRONTEND || "true").trim().toLowerCase() !== "false";
let nextHandler = null;
const appBaseUrl = (process.env.APP_BASE_URL || `http://localhost:${port}`).replace(/\/$/, "");
const adminUserIds = new Set(
  String(process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);
const uploadsDir = path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
const cloudinaryFolder = String(process.env.CLOUDINARY_FOLDER || "rekberwe").trim() || "rekberwe";

function getRequestBaseUrl(req) {
  const forwardedProto = String(req.get("x-forwarded-proto") || "").split(",")[0].trim();
  const forwardedHost = String(req.get("x-forwarded-host") || "").split(",")[0].trim();
  const protocol = forwardedProto || req.protocol || "https";
  const host = forwardedHost || req.get("host");
  if (!host) return appBaseUrl;
  return `${protocol}://${host}`.replace(/\/$/, "");
}

async function getEmailReadyUser(userOrId) {
  if (!userOrId) return null;
  if (typeof userOrId === "string") return getUserById(userOrId);
  if (userOrId.id) {
    const fresh = await getUserById(userOrId.id);
    return fresh || userOrId;
  }
  return userOrId;
}

async function getEmailReadyTransaction(transaction) {
  if (!transaction) return { transaction: null, buyer: null, seller: null };
  const buyer = transaction.buyer?.id ? await getUserById(transaction.buyer.id) : transaction.buyer;
  const seller = transaction.seller?.id ? await getUserById(transaction.seller.id) : transaction.seller;
  return {
    transaction,
    buyer: buyer || transaction.buyer || null,
    seller: seller || transaction.seller || null,
  };
}

const cloudinaryEnabled = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET,
);
fs.mkdirSync(uploadsDir, { recursive: true });

if (cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const telegramJwks = createRemoteJWKSet(new URL(`${TELEGRAM_ISSUER}/.well-known/jwks.json`));
const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const uploadStorage = multer.memoryStorage();
const uploadLimits = { fileSize: 10 * 1024 * 1024, files: 5 };
const ALLOWED_WARRANTY_DAY_VALUES = new Set([0, 3, 7, 14, 30]);
const ALLOWED_TRANSACTION_ROLES = new Set(["buyer", "seller"]);
const ALLOWED_TRANSACTION_TYPES = new Set(["akun", "gold", "power leveling"]);
const ALLOWED_FEE_PAYERS = new Set(["buyer", "seller", "split"]);
const MAX_TRANSACTION_TITLE_LENGTH = 200;
const MAX_TRANSACTION_PRICE = 2_000_000_000;
const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/mp4": ".m4a",
};

function createUploadMiddleware({ allowedMimeTypes, maxFiles = 5 }) {
  const allowed = new Set(allowedMimeTypes);
  return multer({
    storage: uploadStorage,
    limits: { ...uploadLimits, files: maxFiles },
    fileFilter: (_req, file, callback) => {
      const mime = String(file.mimetype || "").toLowerCase().split(";")[0].trim();
      if (allowed.has(mime)) {
        callback(null, true);
        return;
      }
      callback(new Error("Tipe file tidak diizinkan."));
    },
  });
}

const upload = createUploadMiddleware({
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ],
});
const avatarUpload = createUploadMiddleware({
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  maxFiles: 1,
});
const verificationUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: uploadLimits.fileSize, files: 2 },
  fileFilter: (_req, file, callback) => {
    const mime = String(file.mimetype || "").toLowerCase().split(";")[0].trim();
    const field = String(file.fieldname || "");
    const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
    const videoTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
    if (field === "ktpPhoto" && imageTypes.has(mime)) {
      callback(null, true);
      return;
    }
    if (field === "ktpVideo" && videoTypes.has(mime)) {
      callback(null, true);
      return;
    }
    callback(new Error("File verifikasi harus foto KTP (gambar) dan video KTP (mp4/webm/mov)."));
  },
});
const audioUpload = createUploadMiddleware({
  allowedMimeTypes: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"],
  maxFiles: 2,
});
const eventClients = new Set();
const presenceState = new Map();
const presenceOnlineSnapshot = new Map();
const typingState = new Map();
const PRESENCE_ONLINE_MS = 30000;
const PRESENCE_SWEEP_MS = 5000;
const TYPING_ACTIVE_MS = 5000;
const analyticsRateLimits = new Map();

const otpSendLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 12,
  keyFn: (req) => getRequestRateLimitKey(req, "otp-send"),
});
const otpVerifyLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyFn: (req) => getRequestRateLimitKey(req, "otp-verify"),
});
const publicSupportLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 25,
  keyFn: (req) => getRequestRateLimitKey(req, "public-support"),
});
const uploadPostLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  keyFn: (req) => getRequestRateLimitKey(req, "upload-post"),
});

const providers = {
  Telegram: {
    label: "Telegram",
    authUrl: `${TELEGRAM_ISSUER}/auth`,
    tokenUrl: `${TELEGRAM_ISSUER}/token`,
    clientId: process.env.TELEGRAM_CLIENT_ID || "",
    clientSecret: process.env.TELEGRAM_CLIENT_SECRET || "",
    scopes: ["openid", "profile", "phone"],
    usePkce: true,
    profile: async ({ tokens }) => {
      if (!tokens.id_token) throw new Error("Telegram tidak mengembalikan id_token.");
      const { payload } = await jwtVerify(tokens.id_token, telegramJwks, {
        issuer: TELEGRAM_ISSUER,
        audience: process.env.TELEGRAM_CLIENT_ID,
      });
      return {
        provider: "Telegram",
        socialId: String(payload.sub),
        username: payload.preferred_username || payload.username || payload.phone_number || String(payload.sub),
        displayName: payload.name || [payload.given_name, payload.family_name].filter(Boolean).join(" ") || "Pengguna Telegram",
        email: payload.email || "",
        avatar: payload.picture || "",
        profileUrl: "",
        verifiedProvider: true,
      };
    },
  },
  Google: {
    label: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    scopes: ["openid", "email", "profile"],
    usePkce: false,
    profile: async ({ tokens }) => {
      if (!tokens.id_token) throw new Error("Google tidak mengembalikan id_token.");
      const { payload } = await jwtVerify(tokens.id_token, googleJwks, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      return {
        provider: "Google",
        socialId: String(payload.sub),
        username: payload.email || String(payload.sub),
        displayName: payload.name || payload.email || "Pengguna Google",
        email: payload.email || "",
        avatar: payload.picture || "",
        profileUrl: "",
        verifiedProvider: true,
      };
    },
  },
  Facebook: {
    label: "Facebook",
    authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
    clientId: process.env.FACEBOOK_CLIENT_ID || "",
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || "",
    scopes: ["email", "public_profile"],
    usePkce: false,
    profile: async ({ tokens }) => {
      const response = await fetch("https://graph.facebook.com/me?fields=id,name,email,picture,link", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await response.json();
      if (!response.ok) throw new Error(profile.error?.message || "Gagal mengambil profil Facebook.");
      return {
        provider: "Facebook",
        socialId: String(profile.id),
        username: profile.email || profile.id,
        displayName: profile.name || "Pengguna Facebook",
        email: profile.email || "",
        avatar: profile.picture?.data?.url || "",
        profileUrl: profile.link || "",
        verifiedProvider: true,
      };
    },
  },
  Discord: {
    label: "Discord",
    authUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    clientId: process.env.DISCORD_CLIENT_ID || "",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    scopes: ["identify", "email"],
    usePkce: false,
    profile: async ({ tokens }) => {
      const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const profile = await response.json();
      if (!response.ok) throw new Error(profile.message || "Gagal mengambil profil Discord.");
      const discordHandle = profile.discriminator && profile.discriminator !== "0"
        ? `${profile.username}#${profile.discriminator}`
        : profile.global_name || profile.username;
      return {
        provider: "Discord",
        socialId: String(profile.id),
        username: discordHandle,
        displayName: profile.global_name || profile.username || "Pengguna Discord",
        email: profile.email || "",
        avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : "",
        profileUrl: "",
        verifiedProvider: true,
      };
    },
  },
};

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=()");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

const sessionSecret = String(process.env.SESSION_SECRET || "").trim();
if (!sessionSecret && isProduction) {
  throw new Error("SESSION_SECRET wajib diset di production.");
}

app.use(
  session({
    name: "rekberwe.sid",
    secret: sessionSecret || crypto.randomBytes(32).toString("hex"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);

app.get("/uploads/:filename", async (req, res) => {
  try {
    const filename = path.basename(String(req.params.filename || ""));
    if (!filename || filename !== req.params.filename) {
      res.status(400).json({ message: "Nama file tidak valid." });
      return;
    }
    const allowed = await canAccessLocalUpload(req, filename);
    if (!allowed) {
      res.status(403).json({ message: "Akses file ditolak." });
      return;
    }
    const target = path.join(uploadsDir, filename);
    if (!fs.existsSync(target)) {
      res.status(404).json({ message: "File tidak ditemukan." });
      return;
    }
    res.sendFile(target);
  } catch (error) {
    res.status(500).json({ message: "Gagal mengambil file." });
  }
});

function respondWithTransaction(res, req, transaction, statusCode = 200) {
  const viewer = getViewerFromSession(req.session.user);
  const payload = enrichTransactionPresence(sanitizeTransactionForViewer(transaction, viewer));
  if (statusCode === 201) {
    res.status(201).json({ transaction: payload });
    return;
  }
  res.json({ transaction: payload });
}

function respondWithTransactions(res, req, transactions) {
  const viewer = getViewerFromSession(req.session.user);
  res.json({ transactions: sanitizeTransactionsForViewer(transactions, viewer) });
}

function isValidNik(value) {
  return /^\d{16}$/.test(String(value || "").replace(/\s/g, ""));
}

function validateTransactionInput(body) {
  const title = String(body.title || "").trim();
  const price = Number(body.price);
  const role = String(body.role || "").trim();
  const type = String(body.type || "").trim();
  const feePayer = String(body.feePayer || "").trim();
  if (!title || title.length > MAX_TRANSACTION_TITLE_LENGTH) {
    return { ok: false, message: `Judul transaksi wajib diisi (maks. ${MAX_TRANSACTION_TITLE_LENGTH} karakter).` };
  }
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, message: "Harga transaksi harus lebih dari 0." };
  }
  if (price > MAX_TRANSACTION_PRICE) {
    return { ok: false, message: "Harga transaksi melebihi batas maksimum." };
  }
  if (!ALLOWED_TRANSACTION_ROLES.has(role)) {
    return { ok: false, message: "Peran transaksi tidak valid." };
  }
  if (!ALLOWED_TRANSACTION_TYPES.has(type)) {
    return { ok: false, message: "Jenis rekber tidak valid." };
  }
  if (!ALLOWED_FEE_PAYERS.has(feePayer)) {
    return { ok: false, message: "Pilihan pembayar fee tidak valid." };
  }
  return { ok: true, title, price, role, type, feePayer };
}

app.get("/api/config", async (_req, res) => {
  const feeSettings = await getAdminFeeSettings();
  res.json({
    appBaseUrl,
    brandLogoUrl: "/assets/rekberwe-logo-shield.png?v=7",
    providers: Object.entries(providers).map(([name, provider]) => ({
      name,
      label: provider.label,
      enabled: Boolean(provider.clientId),
      authPath: `/auth/${name.toLowerCase()}`,
    })),
    publicFeeSettings: {
      goldFlatFee: Number(feeSettings.goldFlatFee || 0),
      accountFeeTiers: Array.isArray(feeSettings.accountFeeTiers) ? feeSettings.accountFeeTiers : [],
    },
    customerCare: {
      telegram: String(feeSettings.customerCareTelegram || "").trim(),
      gmail: String(feeSettings.customerCareGmail || "").trim(),
    },
    officeAddress: String(feeSettings.officeAddress || "").trim(),
    termsAndConditions: String(feeSettings.termsAndConditions || "").trim(),
    accountSecurityGuide: String(feeSettings.accountSecurityGuide || "").trim(),
    notificationSounds: feeSettings.notificationSounds || {},
  });
});

app.get("/api/session", async (req, res) => {
  let user = null;
  if (req.session.user?.id) {
    const freshUser = await getUserById(req.session.user.id);
    user = freshUser ? await withAdminFlag(freshUser) : null;
    req.session.user = user;
  }
  res.json({
    authenticated: Boolean(user),
    user,
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("rekberwe.sid");
    res.json({ ok: true });
  });
});

app.post("/api/analytics/collect", async (req, res) => {
  try {
    const visitorId = String(req.body.visitorId || "").trim();
    const eventType = String(req.body.eventType || "").trim();
    if (!isValidVisitorId(visitorId)) {
      res.status(400).json({ message: "Visitor ID tidak valid." });
      return;
    }
    if (!ANALYTICS_EVENT_TYPES.has(eventType)) {
      res.status(400).json({ message: "Event analytics tidak dikenali." });
      return;
    }
    if (isAnalyticsRateLimited(visitorId)) {
      res.status(429).json({ message: "Terlalu banyak event analytics." });
      return;
    }
    const referrerUrl = String(req.body.referrer || "").trim().slice(0, 500);
    await recordAnalyticsEvent({
      visitorId,
      eventType,
      path: String(req.body.path || "").trim().slice(0, 500),
      referrerSource: classifyReferrerSource(referrerUrl),
      referrerUrl,
      transactionCode: String(req.body.transactionCode || "").trim().toUpperCase(),
      userId: req.session.user?.id || null,
      deviceType: detectDeviceType(req.get("user-agent") || ""),
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error.message || "Gagal menyimpan analytics." });
  }
});

app.get("/api/events", requireAuth, (req, res) => {
  setupEventStream(req, res, req.session.user.isAdmin ? "admin" : "user", req.session.user.id);
});

app.post("/api/presence/heartbeat", requireAuth, async (req, res) => {
  const activeTransactionCode = String(req.body.activeTransactionCode || "").trim().toUpperCase();
  const activeSupportThreadId = Number(req.body.activeSupportThreadId || 0) || null;
  const offline = Boolean(req.body.offline);
  if (offline) {
    markUserAway(req.session.user.id);
  } else {
    setUserPresence(
      req.session.user.id,
      req.session.user.isAdmin ? "admin" : "user",
      activeTransactionCode,
      activeSupportThreadId,
    );
  }
  await broadcastPresenceUpdate(req.session.user.id);
  res.json({ presence: getUserPresence(req.session.user.id) });
});

app.get("/api/push/public-key", (_req, res) => {
  res.json({
    enabled: isPushEnabled(),
    publicKey: getVapidPublicKey(),
  });
});

app.post("/api/push/subscribe", requireAuth, async (req, res) => {
  if (!isPushEnabled()) {
    res.status(503).json({ message: "Web Push belum dikonfigurasi di server." });
    return;
  }
  const audience = String(req.body.audience || "user").trim() === "admin" ? "admin" : "user";
  if (audience === "admin" && !req.session.user.isAdmin) {
    res.status(403).json({ message: "Hanya admin yang bisa mendaftarkan notifikasi admin." });
    return;
  }
  const subscription = req.body.subscription;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ message: "Data subscription push tidak valid." });
    return;
  }
  const saved = await upsertPushSubscription(
    req.session.user.id,
    audience,
    subscription,
    String(req.headers["user-agent"] || "").trim(),
  );
  res.json({ ok: true, subscription: saved });
});

app.post("/api/push/unsubscribe", requireAuth, async (req, res) => {
  const endpoint = String(req.body.endpoint || "").trim();
  if (!endpoint) {
    res.status(400).json({ message: "Endpoint push wajib diisi." });
    return;
  }
  await removePushSubscription(req.session.user.id, endpoint);
  res.json({ ok: true });
});

app.post("/api/transactions/:code/typing", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const isTyping = Boolean(req.body.isTyping);
  const current = await getTransactionByCode(code);
  if (!current) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }
  const isParticipant = current.buyer?.id === req.session.user.id || current.seller?.id === req.session.user.id || req.session.user.isAdmin;
  if (!isParticipant) {
    res.status(403).json({ message: "Tidak punya akses ke transaksi ini." });
    return;
  }
  setUserPresence(req.session.user.id, req.session.user.isAdmin ? "admin" : "user", code);
  setTypingState(code, req.session.user.id, isTyping);
  await broadcastEvent("typing_updated", code, {
    typing: buildTypingPayload(code),
  });
  res.json({ ok: true });
});

app.get("/api/me/dashboard", requireAuth, async (req, res) => {
  const transactions = await getTransactionsForUser(req.session.user.id);
  const viewer = getViewerFromSession(req.session.user);
  const activeTransactions = sanitizeTransactionsForViewer(
    transactions.filter((item) => item.paymentStatus !== "Selesai"),
    viewer,
  );
  const completedTransactions = sanitizeTransactionsForViewer(
    transactions.filter((item) => item.paymentStatus === "Selesai"),
    viewer,
  );
  const chatHistory = transactions
    .flatMap((item) => item.messages.map((message) => ({
      transactionCode: item.code,
      transactionTitle: item.title,
      sender: message.sender,
      senderTitle: message.senderTitle,
      senderVerified: message.senderVerified,
      text: message.text,
      time: message.time,
    })))
    .sort((a, b) => new Date(b.time) - new Date(a.time));

  res.json({
    profile: req.session.user,
    linkedProviders: await getLinkedProvidersForUser(req.session.user.id),
    activeTransactions,
    completedTransactions,
    chatHistory,
  });
});

app.get("/api/support-thread", requireAuth, async (req, res) => {
  const thread = await getSupportThreadForUser(req.session.user.id);
  res.json({ thread: enrichSupportThread(thread, { forUser: true }) });
});

app.get("/api/public-support-thread", publicSupportLimiter, async (req, res) => {
  const thread = await getSupportThreadForGuest(getGuestSupportKey(req));
  res.json({ thread: enrichSupportThread(thread, { forUser: true }) });
});

app.post("/api/support-thread/typing", requireAuth, async (req, res) => {
  const thread = await getSupportThreadForUser(req.session.user.id);
  const isTyping = Boolean(req.body.isTyping);
  setUserPresence(req.session.user.id, "user", "", thread.id);
  setSupportTypingState(thread.id, req.session.user.id, isTyping);
  await broadcastSupportTypingUpdated(thread);
  res.json({ ok: true });
});

app.post("/api/public-support-thread/typing", publicSupportLimiter, async (req, res) => {
  const guestKey = getGuestSupportKey(req);
  const thread = await getSupportThreadForGuest(guestKey);
  const isTyping = Boolean(req.body.isTyping);
  setSupportTypingState(thread.id, `guest:${guestKey}`, isTyping);
  await broadcastSupportTypingUpdated(thread);
  res.json({ ok: true });
});

app.post("/api/public-support-thread/presence", publicSupportLimiter, async (req, res) => {
  const guestKey = getGuestSupportKey(req);
  const thread = await getSupportThreadForGuest(guestKey);
  const userId = `guest:${guestKey}`;
  setUserPresence(userId, "guest", "", thread?.id || null);
  await broadcastPresenceUpdate(userId);
  res.json({ presence: getUserPresence(userId) });
});

app.post("/api/support-thread/messages", requireAuth, async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) {
    res.status(400).json({ message: "Pesan live chat tidak boleh kosong." });
    return;
  }
  const thread = await getSupportThreadForUser(req.session.user.id);
  const updated = await addSupportThreadMessage(thread.id, req.session.user.id, req.session.user.displayName, "user", text);
  await broadcastEvent("support_updated", null, {
    thread: enrichSupportThread(updated, { forUser: true }),
    userId: req.session.user.id,
    ...buildSupportPushExtras(updated),
  });
  res.json({ thread: enrichSupportThread(updated, { forUser: true }) });
});

app.post("/api/public-support-thread/messages", publicSupportLimiter, async (req, res) => {
  const text = String(req.body.text || "").trim();
  if (!text) {
    res.status(400).json({ message: "Pesan live chat tidak boleh kosong." });
    return;
  }
  const guestKey = getGuestSupportKey(req);
  const thread = await getSupportThreadForGuest(guestKey);
  const updated = await addSupportThreadMessage(thread.id, `guest:${guestKey}`, "Guest", "guest", text);
  await broadcastEvent("support_updated", null, {
    thread: enrichSupportThread(updated, { forUser: true }),
    userId: `guest:${guestKey}`,
    ...buildSupportPushExtras(updated),
  });
  res.json({ thread: enrichSupportThread(updated, { forUser: true }) });
});

app.post("/api/support-thread/uploads", requireAuth, uploadPostLimiter, upload.array("supportFiles", 5), async (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    res.status(400).json({ message: "File live chat wajib diisi." });
    return;
  }
  const thread = await getSupportThreadForUser(req.session.user.id);
  let updated = thread;
  for (const file of files) {
    const stored = await persistUploadFile(file, `SUPPORT-${thread.id}`, req.session.user.id);
    updated = await addSupportThreadMessage(thread.id, req.session.user.id, req.session.user.displayName, "user", "", {
      attachmentName: file.originalname,
      attachmentUrl: stored.fileUrl,
      attachmentType: file.mimetype || "",
    });
  }
  await broadcastEvent("support_updated", null, {
    thread: enrichSupportThread(updated, { forUser: true }),
    userId: req.session.user.id,
    ...buildSupportPushExtras(updated),
  });
  res.json({ thread: enrichSupportThread(updated, { forUser: true }) });
});

app.post("/api/public-support-thread/uploads", publicSupportLimiter, uploadPostLimiter, upload.array("supportFiles", 5), async (req, res) => {
  const files = req.files || [];
  if (!files.length) {
    res.status(400).json({ message: "File live chat wajib diisi." });
    return;
  }
  const guestKey = getGuestSupportKey(req);
  const thread = await getSupportThreadForGuest(guestKey);
  let updated = thread;
  for (const file of files) {
    const stored = await persistUploadFile(file, `SUPPORT-GUEST-${thread.id}`, `guest:${guestKey}`);
    updated = await addSupportThreadMessage(thread.id, `guest:${guestKey}`, "Guest", "guest", "", {
      attachmentName: file.originalname,
      attachmentUrl: stored.fileUrl,
      attachmentType: file.mimetype || "",
    });
  }
  await broadcastEvent("support_updated", null, {
    thread: enrichSupportThread(updated, { forUser: true }),
    userId: `guest:${guestKey}`,
    ...buildSupportPushExtras(updated),
  });
  res.json({ thread: enrichSupportThread(updated, { forUser: true }) });
});

app.post("/api/me/profile", requireAuth, async (req, res) => {
  const displayName = String(req.body.displayName || "").trim();
  const legalName = String(req.body.legalName || "").trim();
  const whatsapp = String(req.body.whatsapp || "").trim();
  if (!displayName || !legalName) {
    res.status(400).json({ message: "Nama pengguna dan nama sesuai KTP wajib diisi." });
    return;
  }

  if (req.session.user.verificationStatus === "verified") {
    res.status(400).json({ message: "Data identitas yang sudah diverifikasi tidak bisa diubah langsung. Hubungi admin melalui live chat." });
    return;
  }

  const updated = await updateUserProfile(req.session.user.id, displayName, legalName, whatsapp);
  req.session.user = await withAdminFlag(updated);
  res.json({ user: req.session.user });
});

app.post("/api/me/profile/avatar", requireAuth, avatarUpload.single("avatar"), async (req, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ message: "File foto profil wajib dipilih." });
    return;
  }
  const stored = await persistUploadFile(file, `AVATAR-${req.session.user.id}`, "profile-avatar");
  const updated = await upsertUser({
    ...req.session.user,
    avatar: stored.fileUrl,
  });
  req.session.user = await withAdminFlag(updated);
  res.json({ user: req.session.user });
});

app.post("/api/me/verification", requireAuth, uploadPostLimiter, verificationUpload.fields([
  { name: "ktpPhoto", maxCount: 1 },
  { name: "ktpVideo", maxCount: 1 },
]), async (req, res) => {
  const legalName = String(req.body.legalName || "").trim();
  const ktp = String(req.body.ktp || "").trim();
  const whatsapp = String(req.body.whatsapp || "").trim();
  if (!legalName || !ktp || !whatsapp) {
    res.status(400).json({ message: "Nama sesuai KTP, nomor KTP, dan WhatsApp wajib diisi." });
    return;
  }
  if (!isValidNik(ktp)) {
    res.status(400).json({ message: "Nomor KTP harus 16 digit angka." });
    return;
  }

  if (!req.session.user.phoneVerified) {
    res.status(400).json({ message: "Nomor WhatsApp harus diverifikasi via OTP terlebih dahulu." });
    return;
  }

  if (req.session.user.verificationStatus === "verified") {
    res.status(400).json({ message: "Data yang sudah diverifikasi tidak bisa diajukan ulang. Hubungi admin bila perlu perubahan." });
    return;
  }

  if (req.session.user.verificationStatus === "pending") {
    res.status(400).json({ message: "Verifikasi sedang ditinjau admin. Tunggu hasil review terlebih dahulu." });
    return;
  }

  const files = req.files || {};
  const ktpPhoto = files.ktpPhoto?.[0];
  const ktpVideo = files.ktpVideo?.[0];
  if (!ktpPhoto || !ktpVideo) {
    res.status(400).json({ message: "Foto KTP dan video selfie memegang KTP wajib diunggah." });
    return;
  }

  const latitude = Number(req.body.latitude || 0);
  const longitude = Number(req.body.longitude || 0);
  const accuracy = Number(req.body.accuracy || 0);
  const locationTimestamp = String(req.body.locationTimestamp || "").trim();
  const consentText = String(req.body.consentText || "").trim();
  const consentTime = String(req.body.consentTime || "").trim();
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !latitude || !longitude || !locationTimestamp || !consentText || !consentTime) {
    res.status(400).json({ message: "Izin lokasi wajib disetujui sebelum verifikasi dikirim." });
    return;
  }

  await saveUserLocation(req.session.user.id, {
    latitude,
    longitude,
    accuracy,
    locationTimestamp,
    consentText,
    consentTime,
    ipAddress: getRequestIp(req),
    userAgent: String(req.headers["user-agent"] || "").trim(),
  });

  const photoUpload = await persistUploadFile(ktpPhoto, `VERIF-${req.session.user.id}`, "verification-photo");
  const videoUpload = await persistUploadFile(ktpVideo, `VERIF-${req.session.user.id}`, "verification-video");
  const updated = await updateUserVerification(req.session.user.id, legalName, ktp, whatsapp, {
    ktpPhotoUrl: photoUpload.fileUrl,
    ktpVideoUrl: videoUpload.fileUrl,
    ktpPhotoName: ktpPhoto.originalname,
    ktpVideoName: ktpVideo.originalname,
  });
  req.session.user = await withAdminFlag(updated);
  await broadcastEvent("verification_updated", null, {
    user: req.session.user,
    userId: req.session.user.id,
    pushTrigger: "verification_submitted",
  });
  res.json({ user: req.session.user });
});

app.get("/api/me/whatsapp/status", requireAuth, async (req, res) => {
  try {
    const payload = await getWhatsappOtpStatus(req.session.user.id);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ message: error.message || "Gagal memuat status WhatsApp." });
  }
});

app.post("/api/me/whatsapp/send-otp", requireAuth, otpSendLimiter, async (req, res) => {
  try {
    const payload = await sendWhatsappOtp(req.session.user.id, req.body.phoneNumber, {
      forceResend: Boolean(req.body.forceResend),
    });
    req.session.user = await withAdminFlag(payload.user);
    res.json(payload);
  } catch (error) {
    const status = error.code === "OTP_COOLDOWN" ? 429 : error.code === "OTP_LOCKED" || error.code === "OTP_MAX_RESEND" ? 423 : 400;
    res.status(status).json({
      message: error.message || "Gagal mengirim OTP WhatsApp.",
      state: error.state || null,
    });
  }
});

app.post("/api/me/whatsapp/verify-otp", requireAuth, otpVerifyLimiter, async (req, res) => {
  try {
    const payload = await verifyWhatsappOtp(req.session.user.id, req.body.otp);
    req.session.user = await withAdminFlag(payload.user);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ message: error.message || "Verifikasi OTP gagal." });
  }
});

app.post("/api/me/whatsapp/change-number", requireAuth, async (req, res) => {
  try {
    const payload = await resetWhatsappOtpPhone(req.session.user.id, req.body.phoneNumber);
    req.session.user = await withAdminFlag(payload.user);
    res.json(payload);
  } catch (error) {
    res.status(400).json({ message: error.message || "Gagal mengganti nomor WhatsApp." });
  }
});

app.get("/api/transactions", requireAuth, async (req, res) => {
  const transactions = req.session.user.isAdmin
    ? await getAllTransactions()
    : await getTransactionsForUser(req.session.user.id);
  if (req.session.user.isAdmin) {
    res.json({ transactions });
    return;
  }
  respondWithTransactions(res, req, transactions);
});

app.get("/api/transactions/:code", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const transaction = await getTransactionByCode(code);
  const accessible = await resolveTransactionAccess(req, res, transaction, { allowJoinPreview: true });
  if (!accessible) return;
  if (req.session.user.isAdmin) {
    res.json({ transaction: enrichTransactionPresence(accessible) });
    return;
  }
  respondWithTransaction(res, req, accessible);
});

app.post("/api/transactions", requireAuth, async (req, res) => {
  const validation = validateTransactionInput(req.body);
  if (!validation.ok) {
    res.status(400).json({ message: validation.message });
    return;
  }
  const { title, price, role, type, feePayer } = validation;
  const { warranty, sellerPayoutAccount, sellerBankName, sellerBankNumber, sellerBankHolder } = req.body;

  if (role === "seller" && req.session.user.verificationStatus !== "verified") {
    res.status(400).json({ message: "Penjual wajib verifikasi KTP dan WhatsApp terlebih dahulu." });
    return;
  }

  if (role === "seller" && !String(sellerPayoutAccount || "").trim()) {
    res.status(400).json({ message: "Nomor rekening penjual wajib diisi jika membuat transaksi sebagai penjual." });
    return;
  }

  const feeSettings = await getAdminFeeSettings();
  const normalizedWarranty = normalizeWarrantyInput(warranty);
  if (!normalizedWarranty) {
    res.status(400).json({ message: "Masa garansi tidak valid. Hanya boleh angka 3, 7, 14, 30, atau kosongkan untuk tanpa garansi." });
    return;
  }
  const code = generateTransactionCode();
  const shareLink = `${getRequestBaseUrl(req)}/?trx=${encodeURIComponent(code)}`;
  const transaction = await createTransaction({
    code,
    title,
    price,
    type,
    warranty: normalizedWarranty.label,
    sellerPayoutAccount: String(sellerPayoutAccount || "").trim(),
    sellerBankName: String(sellerBankName || "").trim(),
    sellerBankNumber: String(sellerBankNumber || "").trim(),
    sellerBankHolder: String(sellerBankHolder || "").trim(),
    feePayer,
    feeAmount: calculateTransactionFee(price, type, feeSettings),
    paymentStatus: "Menunggu pembayaran",
    createdByRole: role,
    buyerUserId: role === "buyer" ? req.session.user.id : null,
    sellerUserId: role === "seller" ? req.session.user.id : null,
    shareLink,
  });

  await broadcastEvent("transaction_updated", transaction.code, { transaction });

  dispatchEmail(async () => {
    const { buyer, seller } = await getEmailReadyTransaction(transaction);
    const creator = await getEmailReadyUser(req.session.user);
    await sendTransactionCreatedEmail(
      transaction,
      buyer || (role === "buyer" ? creator : null),
      seller || (role === "seller" ? creator : null),
      getRequestBaseUrl(req),
    );
  });

  respondWithTransaction(res, req, transaction, 201);
});

app.post("/api/transactions/:code/seller-bank", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const current = await getTransactionByCode(code);
  if (!current) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }
  if (current.seller?.id !== req.session.user.id) {
    res.status(403).json({ message: "Hanya penjual yang bisa mengisi data rekening ini." });
    return;
  }
  if (!current.buyerConfirmedReceived) {
    res.status(400).json({ message: "Data rekening baru bisa dikirim setelah pembeli menekan item diterima." });
    return;
  }
  const bankName = String(req.body.bankName || "").trim();
  const bankNumber = String(req.body.bankNumber || "").trim();
  const bankHolder = String(req.body.bankHolder || "").trim();
  if (!bankName || !bankNumber || !bankHolder) {
    res.status(400).json({ message: "Nama bank, nomor rekening, dan atas nama wajib diisi." });
    return;
  }
  const updated = await updateSellerPayoutDetails(code, { bankName, bankNumber, bankHolder });
  await broadcastEvent("transaction_updated", code, { transaction: updated });
  respondWithTransaction(res, req, updated);
});

app.post("/api/transactions/:code/join", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const transaction = await getTransactionByCode(code);
  if (!transaction) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }

  const allowedRole = transaction.createdByRole === "buyer" ? "seller" : "buyer";
  const requestedRole = String(req.body.role || "").trim();
  const role = requestedRole || allowedRole;

  if (role !== allowedRole) {
    res.status(400).json({ message: `Role yang tersedia untuk link ini hanya ${allowedRole === "buyer" ? "pembeli" : "penjual"}.` });
    return;
  }

  if (role === "buyer" && transaction.buyer) {
    res.status(400).json({ message: "Role pembeli sudah terisi." });
    return;
  }

  if (role === "seller" && transaction.seller) {
    res.status(400).json({ message: "Role penjual sudah terisi." });
    return;
  }

  if (role === "seller" && req.session.user.verificationStatus !== "verified") {
    res.status(400).json({ message: "Penjual wajib verifikasi KTP dan WhatsApp sebelum masuk rekber." });
    return;
  }

  const updated = await joinTransaction(code, req.session.user.id, role);
  await broadcastEvent("transaction_updated", code, { transaction: updated });
  dispatchEmail(async () => {
    const { buyer, seller } = await getEmailReadyTransaction(updated);
    const joiner = await getEmailReadyUser(req.session.user);
    await sendTransactionCreatedEmail(
      updated,
      buyer || (role === "buyer" ? joiner : null),
      seller || (role === "seller" ? joiner : null),
      getRequestBaseUrl(req),
    );
  });
  respondWithTransaction(res, req, updated);
});

app.post("/api/transactions/:code/seller-verification-intent", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const transaction = await getTransactionByCode(code);
  if (!transaction) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }

  const allowedRole = transaction.createdByRole === "buyer" ? "seller" : "buyer";
  if (allowedRole !== "seller") {
    res.status(400).json({ message: "Intent verifikasi penjual hanya untuk transaksi yang membutuhkan penjual." });
    return;
  }

  if (transaction.seller) {
    res.status(400).json({ message: "Role penjual sudah terisi." });
    return;
  }

  if (transaction.buyer?.id === req.session.user.id || transaction.seller?.id === req.session.user.id) {
    res.status(400).json({ message: "Anda sudah terdaftar di transaksi ini." });
    return;
  }

  if (req.session.user.verificationStatus === "verified") {
    res.status(400).json({ message: "Akun penjual sudah terverifikasi. Silakan masuk transaksi langsung." });
    return;
  }

  const pending = await upsertPendingSellerJoin(req.session.user.id, code);
  let adminMessageSent = false;
  if (!pending?.adminNotified) {
    const sellerName = req.session.user.displayName || req.session.user.legalName || "Penjual";
    const updated = await addAdminTransactionMessage(
      code,
      `${sellerName} telah membuka link transaksi dan sedang melalui proses verifikasi identitas. Mohon menunggu hingga verifikasi selesai ditinjau admin.`,
    );
    await markPendingSellerJoinNotified(req.session.user.id, code);
    adminMessageSent = true;
    await broadcastEvent("transaction_updated", code, { transaction: updated });
  }

  res.json({
    ok: true,
    adminMessageSent,
    verificationStatus: req.session.user.verificationStatus,
    transactionCode: code,
  });
});

app.post("/api/transactions/:code/messages", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const current = await getTransactionByCode(code);
  if (!assertTransactionParticipant(req, res, current)) return;
  const text = String(req.body.text || "").trim();
  if (!text) {
    res.status(400).json({ message: "Pesan tidak boleh kosong." });
    return;
  }
  const updated = await addTransactionMessage(code, req.session.user.id, req.session.user.displayName, text);
  const lastMessage = updated.messages?.[updated.messages.length - 1] || null;
  await broadcastEvent("transaction_updated", code, {
    transaction: updated,
    pushTrigger: "new_message",
    pushMeta: { message: lastMessage },
  });
  respondWithTransaction(res, req, updated);
});

app.post("/api/transactions/:code/uploads", requireAuth, uploadPostLimiter, upload.array("proofFiles", 5), async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const current = await getTransactionByCode(code);
  if (!assertTransactionParticipant(req, res, current)) return;
  const files = req.files || [];
  if (!files.length) {
    res.status(400).json({ message: "File upload wajib diisi." });
    return;
  }

  try {
    let updated = await getTransactionByCode(code);
    for (const file of files) {
      const storedFile = await persistUploadFile(file, code, req.session.user.id);
      updated = await addStoredTransactionUpload(
        code,
        req.session.user.id,
        req.session.user.displayName,
        file.originalname,
        storedFile.storedName,
        storedFile.fileUrl,
      );
    }
    const lastUpload = updated.uploads?.[updated.uploads.length - 1] || null;
    await broadcastEvent("transaction_updated", code, {
      transaction: updated,
      pushTrigger: "new_upload",
      pushMeta: { upload: lastUpload },
    });
    respondWithTransaction(res, req, updated);
  } catch (error) {
    res.status(500).json({ message: error.message || "Upload file gagal." });
  }
});

app.delete("/api/transactions/:code", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const transaction = await getTransactionByCode(code);
  if (!transaction) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }

  const isParticipant = transaction.buyer?.id === req.session.user.id || transaction.seller?.id === req.session.user.id;
  if (!isParticipant && !req.session.user.isAdmin) {
    res.status(403).json({ message: "Hanya pihak transaksi atau admin yang bisa menghapus transaksi ini." });
    return;
  }

  const deleted = await deleteTransactionByCode(code);
  cleanupTransactionFiles(deleted);
  await broadcastEvent("transaction_deleted", code, { code });
  res.json({ ok: true });
});

app.post("/api/transactions/:code/status", requireAdmin, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const paymentStatus = String(req.body.paymentStatus || "").trim();
  const systemMessage = String(req.body.systemMessage || "").trim();
  if (!paymentStatus) {
    res.status(400).json({ message: "Status wajib diisi." });
    return;
  }
  const current = await getTransactionByCode(code);
  if (!current) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }
  const updated = await updateTransactionStatus(code, paymentStatus, systemMessage);
  res.json({ transaction: updated });
});

app.post("/api/transactions/:code/actions", requireAuth, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const action = String(req.body.action || "").trim();
  const current = await getTransactionByCode(code);
  if (!current) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }

  const isBuyer = current.buyer?.id === req.session.user.id;
  const isSeller = current.seller?.id === req.session.user.id;
  const isParticipant = isBuyer || isSeller;
  if (!isParticipant) {
    res.status(403).json({ message: "Hanya pembeli atau penjual yang boleh menjalankan aksi transaksi ini." });
    return;
  }

  let updated = null;
  if (action === "mark_paid") {
    if (!isBuyer) {
      res.status(403).json({ message: "Hanya pembeli yang bisa menandai pembayaran." });
      return;
    }
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Pembayaran dikirim pembeli",
      systemMessage: "Pembeli memberi konfirmasi bahwa pembayaran sudah dikirim ke admin.",
    });
  } else if (action === "account_delivered") {
    if (!isSeller) {
      res.status(403).json({ message: "Hanya penjual yang bisa mengonfirmasi data / item diserahkan." });
      return;
    }
    if (!current.adminFundsReceived) {
      res.status(400).json({ message: "Tombol data / item diserahkan belum bisa dipakai karena admin belum mengonfirmasi dana diterima." });
      return;
    }
    if (current.buyerConfirmedReceived || current.sellerPayoutSent) {
      res.status(400).json({ message: "Tahap penyerahan item sudah lewat." });
      return;
    }
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Akun sudah diserahkan",
      systemMessage: "Penjual memberi konfirmasi bahwa data akun / item sudah diserahkan. Pembeli, segera cek dan amankan data/item Anda sekarang juga. Baca panduan pengamanan akun di /security-guide sebelum transaksi dilanjutkan. jika sudah diamankan , klik tombol akun sudah diterima",
    });
  } else if (action === "goods_received") {
    if (!isBuyer) {
      res.status(403).json({ message: "Hanya pembeli yang bisa mengonfirmasi item diterima." });
      return;
    }
    if (!current.adminFundsReceived) {
      res.status(400).json({ message: "Tombol item diterima belum bisa dipakai karena admin belum mengonfirmasi dana diterima." });
      return;
    }
    if (current.paymentStatus !== "Akun sudah diserahkan" && !current.buyerConfirmedReceived && !current.sellerPayoutSent) {
      res.status(400).json({ message: "Tombol item diterima belum bisa dipakai karena penjual belum menekan data / item sudah diserahkan." });
      return;
    }
    if (current.buyerConfirmedReceived) {
      res.status(400).json({ message: "Tombol item diterima sudah pernah diklik." });
      return;
    }
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: current.sellerPayoutSent ? "Selesai" : "Item diterima pembeli",
      buyerConfirmedReceived: 1,
      systemMessage: current.sellerPayoutSent
        ? "Pembeli mengonfirmasi item diterima, transaksi selesai."
        : "Pembeli mengonfirmasi item diterima. Penjual, mohon kirim / pastikan nomor rekening Anda di ruang chat ini agar admin bisa meneruskan dana setelah proses selesai.",
    });
  } else if (action === "open_dispute") {
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Sengketa dibuka",
      systemMessage: "Sengketa diajukan dan admin RekberWE.id diminta turun tangan.",
    });
  } else if (action === "cancel_transaction") {
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Transaksi dibatalkan",
      systemMessage: `${req.session.user.displayName} membatalkan transaksi dan meminta admin meninjau penutupan transaksi.`,
    });
  } else {
    res.status(400).json({ message: "Aksi transaksi tidak dikenali." });
    return;
  }

  await broadcastEvent("transaction_updated", code, {
    transaction: updated,
    ...buildStatusPushExtras(updated, `Update transaksi — ${getTransactionDisplayTitle(updated)}`, updated.paymentStatus),
  });
  if (action === "open_dispute") {
    dispatchEmail(async () => {
      const { buyer, seller, transaction } = await getEmailReadyTransaction(updated);
      await sendDisputeOpenedEmail(
        transaction,
        buyer,
        seller,
        null,
        getRequestBaseUrl(req),
      );
    });
  } else if (action === "account_delivered") {
    dispatchEmail(async () => {
      const { buyer, transaction } = await getEmailReadyTransaction(updated);
      await sendItemDeliveredEmail(transaction, buyer, getRequestBaseUrl(req));
    });
  }
  respondWithTransaction(res, req, updated);
});

app.get("/api/admin/transactions", requireAdmin, async (_req, res) => {
  const transactions = (await getAllTransactions()).map((transaction) => ({
    ...enrichTransactionPresence(transaction),
    hasDispute: transaction.paymentStatus === "Sengketa dibuka",
  }));
  res.json({ transactions });
});

app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
  res.json({
    settings: {
      ...(await getAdminFeeSettings()),
      storageInfo: await buildStorageInfo(),
    },
  });
});

app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  const settings = await saveAdminFeeSettings(req.body || {});
  res.json({ settings });
});

app.post("/api/admin/email/test", requireAdmin, async (req, res) => {
  const email = String(req.body.email || "").trim();
  if (!email || !email.includes("@")) {
    res.status(400).json({ message: "Alamat email test wajib diisi dengan format yang valid." });
    return;
  }
  try {
    await sendTestEmail(email);
    res.json({ message: `Test email berhasil dikirim ke ${email}.` });
  } catch (error) {
    res.status(500).json({ message: error.message || "Gagal mengirim test email." });
  }
});

app.get("/terms", async (_req, res) => {
  const settings = await getAdminFeeSettings();
  res.type("html").send(renderSimpleContentPage("Syarat & Ketentuan", "Syarat dan ketentuan RekberWE.id", String(settings.termsAndConditions || "").trim()));
});

app.get("/security-guide", async (_req, res) => {
  const settings = await getAdminFeeSettings();
  res.type("html").send(renderSimpleContentPage("Panduan Pengamanan Akun", "Panduan pengamanan akun / rekber gold", String(settings.accountSecurityGuide || "").trim()));
});

app.get("/jaminan-rekber", (_req, res) => {
  res.type("html").send(renderRekberWarrantyPage());
});

app.post("/api/admin/settings/notification-sounds", requireAdmin, audioUpload.fields([
  { name: "userNotificationSound", maxCount: 1 },
  { name: "adminNotificationSound", maxCount: 1 },
]), async (req, res) => {
  const current = await getAdminFeeSettings();
  const nextSounds = {
    user: { ...(current.notificationSounds?.user || {}) },
    admin: { ...(current.notificationSounds?.admin || {}) },
  };
  const userFile = req.files?.userNotificationSound?.[0];
  const adminFile = req.files?.adminNotificationSound?.[0];

  if (userFile) {
    const stored = await persistUploadFile(userFile, "SETTINGS", "admin-sound-user");
    nextSounds.user = { url: stored.fileUrl, name: userFile.originalname };
  }
  if (adminFile) {
    const stored = await persistUploadFile(adminFile, "SETTINGS", "admin-sound-admin");
    nextSounds.admin = { url: stored.fileUrl, name: adminFile.originalname };
  }

  const settings = await saveAdminFeeSettings({
    ...current,
    notificationSounds: nextSounds,
  });
  res.json({ settings });
});

app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
  const from = String(req.query.from || "").trim();
  const to = String(req.query.to || "").trim();
  res.json({ analytics: await getAnalyticsSummary(from || null, to || null) });
});

app.get("/api/admin/users", requireAdmin, async (_req, res) => {
  const transactions = await getAllTransactions();
  const users = (await getAllUsers()).map((user) => {
    const transactionCount = transactions.filter(
      (transaction) => transaction.buyer?.id === user.id || transaction.seller?.id === user.id,
    ).length;
    return {
      ...user,
      presence: getUserPresence(user.id),
      transactionCount,
      interestedInRekber: transactionCount > 0,
      needsVerificationReview: user.verificationStatus === "pending",
    };
  });
  res.json({ users });
});

app.get("/api/admin/support-threads", requireAdmin, async (_req, res) => {
  const threads = await getAllSupportThreads();
  res.json({ threads: threads.map((thread) => enrichSupportThread(thread, { forUser: false })) });
});

app.post("/api/admin/support-threads/:id/typing", requireAdmin, async (req, res) => {
  const threadId = Number(req.params.id || 0);
  if (!threadId) {
    res.status(400).json({ message: "Live chat tidak ditemukan." });
    return;
  }
  const thread = (await getAllSupportThreads()).find((item) => item.id === threadId) || null;
  if (!thread) {
    res.status(404).json({ message: "Live chat tidak ditemukan." });
    return;
  }
  const isTyping = Boolean(req.body.isTyping);
  setUserPresence(req.session.user.id, "admin", "", threadId);
  setSupportTypingState(threadId, req.session.user.id, isTyping);
  await broadcastSupportTypingUpdated(thread);
  res.json({ ok: true });
});

app.post("/api/admin/support-threads/:id/messages", requireAdmin, async (req, res) => {
  const threadId = Number(req.params.id || 0);
  const text = String(req.body.text || "").trim();
  if (!threadId || !text) {
    res.status(400).json({ message: "Pesan live chat admin wajib diisi." });
    return;
  }
  const updated = await addSupportThreadMessage(threadId, null, "RekberWE.id", "admin", text);
  if (!updated) {
    res.status(404).json({ message: "Live chat tidak ditemukan." });
    return;
  }
  await broadcastEvent("support_updated", null, {
    thread: enrichSupportThread(updated, { forUser: false }),
    userId: updated.user?.id || null,
    ...buildSupportPushExtras(updated),
  });
  res.json({ thread: enrichSupportThread(updated, { forUser: false }) });
});

app.post("/api/admin/support-threads/:id/uploads", requireAdmin, upload.array("supportFiles", 5), async (req, res) => {
  const threadId = Number(req.params.id || 0);
  const files = req.files || [];
  if (!threadId || !files.length) {
    res.status(400).json({ message: "File live chat admin wajib diisi." });
    return;
  }
  let thread = (await getAllSupportThreads()).find((item) => item.id === threadId) || null;
  if (!thread) {
    res.status(404).json({ message: "Live chat tidak ditemukan." });
    return;
  }
  for (const file of files) {
    const stored = await persistUploadFile(file, `SUPPORT-${thread.id}`, "admin-support");
    thread = await addSupportThreadMessage(thread.id, null, "RekberWE.id", "admin", "", {
      attachmentName: file.originalname,
      attachmentUrl: stored.fileUrl,
      attachmentType: file.mimetype || "",
    });
  }
  await broadcastEvent("support_updated", null, {
    thread: enrichSupportThread(thread, { forUser: false }),
    userId: thread.user?.id || null,
    ...buildSupportPushExtras(thread),
  });
  res.json({ thread: enrichSupportThread(thread, { forUser: false }) });
});

app.post("/api/admin/users/:id/verification", requireAdmin, async (req, res) => {
  const userId = String(req.params.id || "").trim();
  const action = String(req.body.action || "").trim();
  if (!["approve", "reject"].includes(action)) {
    res.status(400).json({ message: "Aksi verifikasi tidak dikenali." });
    return;
  }

  const note = String(req.body.note || "").trim();
  if (action === "reject" && !note) {
    res.status(400).json({ message: "Alasan perbaikan wajib diisi." });
    return;
  }

  const updated = await reviewUserVerification(userId, action, note);
  if (!updated) {
    res.status(404).json({ message: "Pengguna tidak ditemukan." });
    return;
  }

  let autoJoinedTransactions = [];
  if (action === "approve" && updated.verificationStatus === "verified") {
    autoJoinedTransactions = await completePendingSellerJoinsForUser(userId);
    for (const transaction of autoJoinedTransactions) {
      await broadcastEvent("transaction_updated", transaction.code, { transaction });
      dispatchEmail(async () => {
        const { buyer, seller } = await getEmailReadyTransaction(transaction);
        const joiner = await getEmailReadyUser(updated);
        await sendTransactionCreatedEmail(
          transaction,
          buyer,
          seller || joiner,
          getRequestBaseUrl(req),
        );
      });
    }
  }

  await broadcastEvent("verification_updated", null, {
    user: updated,
    userId: userId,
    pushTrigger: "verification_reviewed",
    autoJoinedTransactionCodes: autoJoinedTransactions.map((item) => item.code),
  });
  if (action === "approve" && updated.verificationStatus === "verified") {
    dispatchEmail(async () => {
      const freshUser = await getEmailReadyUser(updated);
      await sendAdminVerifiedEmail(freshUser || updated, getRequestBaseUrl(req));
    });
  }
  res.json({
    user: updated,
    autoJoinedTransactionCodes: autoJoinedTransactions.map((item) => item.code),
  });
});

app.post("/api/admin/users/:id/status", requireAdmin, async (req, res) => {
  const userId = String(req.params.id || "").trim();
  const action = String(req.body.action || "").trim();
  const reason = String(req.body.reason || "").trim();
  if (!["ban", "unban", "unverify"].includes(action)) {
    res.status(400).json({ message: "Aksi status user tidak dikenali." });
    return;
  }
  if ((action === "ban" || action === "unverify") && !reason) {
    res.status(400).json({ message: "Alasan wajib diisi." });
    return;
  }
  const updated = await updateUserAdminStatus(userId, action, reason);
  if (!updated) {
    res.status(404).json({ message: "Pengguna tidak ditemukan." });
    return;
  }
  await broadcastEvent("verification_updated", null, { user: updated, userId });
  res.json({ user: updated });
});

app.post("/api/admin/transactions/:code/messages", requireAdmin, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const text = String(req.body.text || "").trim();
  const current = await getTransactionByCode(code);
  if (!current) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }
  if (!text) {
    res.status(400).json({ message: "Pesan admin tidak boleh kosong." });
    return;
  }

  const updated = await addAdminTransactionMessage(code, text);
  const lastMessage = updated.messages?.[updated.messages.length - 1] || null;
  await broadcastEvent("transaction_updated", code, {
    transaction: updated,
    pushTrigger: "new_message",
    pushMeta: { message: lastMessage },
  });
  res.json({ transaction: updated });
});

app.post("/api/admin/transactions/:code/uploads", requireAdmin, upload.array("proofFiles", 5), async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const current = await getTransactionByCode(code);
  if (!current) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }
  if (isWarrantyStillActive(current) && current.adminFundsReceived && current.buyerConfirmedReceived) {
    res.status(400).json({ message: `Upload transfer belum bisa dilakukan karena masa garansi masih aktif sampai ${formatDateId(current.warrantyEndsAt)}.` });
    return;
  }

  const files = req.files || [];
  if (!files.length) {
    res.status(400).json({ message: "File upload admin wajib diisi." });
    return;
  }

  try {
    let updated = current;
    for (const file of files) {
      const storedFile = await persistUploadFile(file, code, "admin");
      updated = await addStoredTransactionUpload(
        code,
        null,
        "RekberWE.id",
        file.originalname,
        storedFile.storedName,
        storedFile.fileUrl,
      );
    }

    const lastUpload = updated.uploads?.[updated.uploads.length - 1] || null;
    await broadcastEvent("transaction_updated", code, {
      transaction: updated,
      pushTrigger: "new_upload",
      pushMeta: { upload: lastUpload },
    });
    res.json({ transaction: updated });
  } catch (error) {
    res.status(500).json({ message: error.message || "Upload file admin gagal." });
  }
});

app.post("/api/admin/transactions/:code/actions", requireAdmin, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const action = String(req.body.action || "").trim();
  const current = await getTransactionByCode(code);
  if (!current) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }

  let updated = null;
  if (action === "request_buyer_payment") {
    const account = String(req.body.account || current.adminPayoutAccount || "").trim();
    const buyerAmount = String(req.body.buyerAmount || "").trim();
    if (!account) {
      res.status(400).json({ message: "Rekening admin belum diatur di Pengaturan Fee." });
      return;
    }
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: current.paymentStatus || "Menunggu pembayaran",
      systemMessage: `Admin meminta pembeli transfer ${buyerAmount || "sesuai nominal transaksi"} ke rekening admin: ${account || "-"}.`,
    });
  } else if (action === "funds_received") {
    if (!current.adminPayoutAccount) {
      res.status(400).json({ message: "Admin harus mengatur rekening penerimaan dulu sebelum mengonfirmasi dana diterima." });
      return;
    }
    if (current.adminFundsReceived) {
      res.status(400).json({ message: "Dana sudah pernah dikonfirmasi diterima admin." });
      return;
    }
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Dana diterima admin",
      adminFundsReceived: 1,
      systemMessage: "Dana sudah diterima admin. Penjual, silakan kirim data akun / item ke pembeli sekarang. Setelah data / item benar-benar terkirim, klik tombol data / item sudah diserahkan di ruang transaksi.",
    });
  } else if (action === "send_payout") {
    if (current.paymentStatus === "Transaksi dibatalkan" || current.paymentStatus === "Sengketa dibuka") {
      res.status(400).json({ message: "Transaksi dibatalkan / sengketa belum bisa dimasukkan ke antrian transfer." });
      return;
    }
    if (!current.adminFundsReceived) {
      res.status(400).json({ message: "Dana pembeli belum dikonfirmasi diterima admin." });
      return;
    }
    if (!current.buyerConfirmedReceived) {
      res.status(400).json({ message: "Pembeli belum menekan tombol item diterima." });
      return;
    }
    if (!current.sellerBankName || !current.sellerBankNumber || !current.sellerBankHolder) {
      res.status(400).json({ message: "Penjual belum mengirim data rekening penerimaan dana." });
      return;
    }
    if (isWarrantyStillActive(current)) {
      res.status(400).json({ message: `Dana belum bisa dikirim ke penjual karena masa garansi masih aktif sampai ${formatDateId(current.warrantyEndsAt)}.` });
      return;
    }
    const sellerFee = Number(current.settlement?.sellerFeeShare || 0);
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Antrian transfer",
      adminFundsReceived: 1,
      buyerConfirmedReceived: 1,
      sellerPayoutSent: 0,
      systemMessage: `Admin akan segera transfer dana ke penjual. Saat ini sedang masuk ke antrian transfer.\nJumlah transfer: ${formatCurrencyId(current.settlement.sellerReceiveAmount)}\nBank: ${current.sellerBankName}\nNo rekening: ${current.sellerBankNumber}\nAtas nama: ${current.sellerBankHolder}${sellerFee > 0 ? `\nFee dari penjual: ${formatCurrencyId(sellerFee)}` : ""}`,
    });
  } else if (action === "complete_transaction") {
    if (current.paymentStatus !== "Antrian transfer") {
      res.status(400).json({ message: "Transaksi belum masuk antrian transfer." });
      return;
    }
    if (isWarrantyStillActive(current)) {
      res.status(400).json({ message: `Transfer belum bisa diselesaikan karena masa garansi masih aktif sampai ${formatDateId(current.warrantyEndsAt)}.` });
      return;
    }
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Selesai",
      adminFundsReceived: current.adminFundsReceived ? 1 : 0,
      buyerConfirmedReceived: current.buyerConfirmedReceived ? 1 : 0,
      sellerPayoutSent: 1,
      systemMessage: "Admin sudah meneruskan dana ke penjual. Terimakasih sudah menggunakan jasa RekberWe.id.",
    });
    updated = await addAdminTransactionMessage(
      code,
      "Admin sudah meneruskan dana ke penjual. Terimakasih sudah menggunakan jasa RekberWe.id.",
    );
  } else if (action === "cancel_transaction") {
    updated = await updateTransactionWorkflow(code, {
      paymentStatus: "Transaksi dibatalkan",
      systemMessage: "Admin membatalkan transaksi ini.",
    });
  } else {
    res.status(400).json({ message: "Aksi admin tidak dikenali." });
    return;
  }

  await broadcastEvent("transaction_updated", code, {
    transaction: updated,
    ...buildStatusPushExtras(updated, `Update admin — ${getTransactionDisplayTitle(updated)}`, updated.paymentStatus),
  });
  if (action === "funds_received") {
    dispatchEmail(async () => {
      const { buyer, seller, transaction } = await getEmailReadyTransaction(updated);
      await sendBuyerFundsSecuredEmail(transaction, buyer, getRequestBaseUrl(req));
      await sendSellerFundsReceivedEmail(transaction, seller, getRequestBaseUrl(req));
    });
  } else if (action === "complete_transaction") {
    dispatchEmail(async () => {
      const { buyer, seller, transaction } = await getEmailReadyTransaction(updated);
      await sendFundsReleasedEmail(transaction, buyer, seller, getRequestBaseUrl(req));
    });
  }
  res.json({ transaction: updated });
});

app.delete("/api/admin/transactions/:code", requireAdmin, async (req, res) => {
  const code = String(req.params.code || "").toUpperCase();
  const deleted = await deleteTransactionByCode(code);
  if (!deleted) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return;
  }

  cleanupTransactionFiles(deleted);
  await broadcastEvent("transaction_deleted", code, { code });
  res.json({ ok: true });
});

app.get("/auth/:provider", async (req, res) => {
  try {
    const providerName = normalizeProvider(req.params.provider);
    const provider = providers[providerName];
    if (!provider) return res.status(404).send("Provider tidak ditemukan.");
    if (!provider.clientId) return res.status(400).send(`Provider ${providerName} belum dikonfigurasi di file .env.`);

    const state = randomString(32);
    const nonce = randomString(32);
    const redirectUri = buildRedirectUri(providerName);
    const authParams = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: provider.scopes.join(" "),
      state,
    });

    let codeVerifier = "";
    if (provider.usePkce) {
      codeVerifier = randomString(64);
      authParams.set("code_challenge_method", "S256");
      authParams.set("code_challenge", sha256Base64Url(codeVerifier));
      authParams.set("nonce", nonce);
    }

    if (providerName === "Google") {
      authParams.set("access_type", "online");
      authParams.set("include_granted_scopes", "true");
      authParams.set("prompt", "select_account");
    }

    const mode = req.query.mode === "link" ? "link" : "login";
    const returnTo = sanitizeReturnTo(req.query.returnTo);
    if (mode === "link" && !req.session.user) {
      return res.status(401).send("Login terlebih dahulu sebelum menghubungkan akun sosial lain.");
    }

    req.session.auth = {
      providerName,
      state,
      nonce,
      codeVerifier,
      redirectUri,
      mode,
      returnTo,
      targetUserId: mode === "link" ? req.session.user.id : null,
    };
    res.redirect(`${provider.authUrl}?${authParams.toString()}`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/auth/:provider/callback", async (req, res) => {
  const providerName = normalizeProvider(req.params.provider);
  const provider = providers[providerName];
  const savedAuth = req.session.auth;

  if (!provider || !savedAuth || savedAuth.providerName !== providerName) {
    res.redirect(`/?authResult=failed&provider=${encodeURIComponent(providerName)}`);
    return;
  }

  if (req.query.error || String(req.query.state || "") !== savedAuth.state) {
    clearAuthSession(req);
    res.redirect(`/?authResult=failed&provider=${encodeURIComponent(providerName)}`);
    return;
  }

  try {
    const code = String(req.query.code || "");
    if (!code) throw new Error("Kode otorisasi tidak ditemukan.");

    const tokenParams = new URLSearchParams({
      client_id: provider.clientId,
      code,
      grant_type: "authorization_code",
      redirect_uri: savedAuth.redirectUri,
    });

    if (savedAuth.codeVerifier) tokenParams.set("code_verifier", savedAuth.codeVerifier);

    const tokenHeaders = { "Content-Type": "application/x-www-form-urlencoded" };
    if (providerName === "Telegram") {
      tokenHeaders.Authorization = `Basic ${Buffer.from(`${provider.clientId}:${provider.clientSecret}`).toString("base64")}`;
    } else {
      tokenParams.set("client_secret", provider.clientSecret);
    }

    const tokenResponse = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: tokenHeaders,
      body: tokenParams.toString(),
    });
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(readOAuthError(tokens));

    if (providerName === "Telegram" && savedAuth.nonce && tokens.id_token) {
      const { payload } = await jwtVerify(tokens.id_token, telegramJwks, {
        issuer: TELEGRAM_ISSUER,
        audience: process.env.TELEGRAM_CLIENT_ID,
      });
      if (payload.nonce !== savedAuth.nonce) {
        throw new Error("Nonce OAuth tidak valid.");
      }
    }

    const profile = await provider.profile({ tokens });

    if (savedAuth.mode === "link") {
      const existingLinkedUser = await getUserByProviderSocial(profile.provider, profile.socialId);
      if (existingLinkedUser && existingLinkedUser.id !== savedAuth.targetUserId) {
        clearAuthSession(req);
        res.redirect(buildAuthRedirectUrl(savedAuth.returnTo, providerName, "failed", "Akun sosial ini sudah terhubung ke pengguna lain."));
        return;
      }
      await linkProviderToUser(savedAuth.targetUserId, profile.provider, profile.socialId, profile.username, profile.email || "");
      const refreshed = await getUserById(savedAuth.targetUserId);
      req.session.user = await withAdminFlag(refreshed);
      clearAuthSession(req);
      res.redirect(buildAuthRedirectUrl(savedAuth.returnTo, providerName, "success"));
      return;
    }

    const existingLinkedUser = await getUserByProviderSocial(profile.provider, profile.socialId);
    const isNewUser = !existingLinkedUser;
    const user = existingLinkedUser || await upsertUser({
      id: `${profile.provider.toLowerCase()}-${profile.socialId}`,
      provider: profile.provider,
      socialId: profile.socialId,
      username: profile.username,
      displayName: profile.displayName,
      legalName: profile.displayName,
      email: profile.email || "",
      avatar: profile.avatar || "",
      profileUrl: profile.profileUrl || "",
      verifiedProvider: Boolean(profile.verifiedProvider),
      verified: false,
      ktp: "",
      whatsapp: "",
    });

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });
    req.session.user = await withAdminFlag(user);
    if (isNewUser) {
      dispatchEmail(() => sendRegistrationSuccessEmail(user, getRequestBaseUrl(req)));
    }
    clearAuthSession(req);
    res.redirect(buildAuthRedirectUrl(savedAuth.returnTo, providerName, "success"));
  } catch (error) {
    clearAuthSession(req);
    res.redirect(buildAuthRedirectUrl(savedAuth?.returnTo, providerName, "failed", error.message));
  }
});

app.get("/admin", (_req, res) => res.sendFile(path.join(webRoot, "admin.html")));
app.get("/privacy", (_req, res) => res.sendFile(path.join(webRoot, "privacy.html")));
app.get("/data-deletion", (_req, res) => res.sendFile(path.join(webRoot, "data-deletion.html")));

if (useNextFrontend) {
  app.use((req, res, nextMiddleware) => {
    if (!nextHandler) {
      nextMiddleware();
      return;
    }
    if (req.path.startsWith("/transaksi") || req.path.startsWith("/profil") || req.path.startsWith("/_next")) {
      nextHandler(req, res);
      return;
    }
    nextMiddleware();
  });
}

app.use(express.static(webRoot));

app.use((error, req, res, next) => {
  if (!error) {
    next();
    return;
  }
  if (error instanceof multer.MulterError || String(error.message || "").toLowerCase().includes("tipe file")) {
    res.status(400).json({ message: error.message || "Upload gagal." });
    return;
  }
  console.error("Unhandled server error:", error);
  if (!res.headersSent) {
    res.status(500).json({ message: "Terjadi kesalahan server." });
    return;
  }
  next(error);
});

app.get("*", (_req, res) => res.sendFile(path.join(webRoot, "index.html")));

async function startServer() {
  initPushService();
  startPresenceSweeper();
  if (useNextFrontend) {
    try {
      const nextModule = await import("next");
      const nextApp = nextModule.default({
        dev: process.env.NODE_ENV !== "production",
        dir: webNextDir,
      });
      await nextApp.prepare();
      nextHandler = nextApp.getRequestHandler();
      console.log("Next.js frontend aktif untuk /transaksi/*");
    } catch (error) {
      console.warn("Next.js tidak tersedia, fallback ke frontend legacy:", error.message);
    }
  }

  app.listen(port, () => {
    console.log(`RekberWE.id running on ${appBaseUrl}`);
    if (isPushEnabled()) {
      console.log("Web Push aktif");
    }
  });
}

startServer().catch((error) => {
  console.error("Gagal menjalankan server:", error);
  process.exit(1);
});

async function requireAuth(req, res, next) {
  if (!req.session.user) {
    res.status(401).json({ message: "Silakan login terlebih dahulu." });
    return;
  }
  const freshUser = await getUserById(req.session.user.id);
  if (!freshUser) {
    res.status(401).json({ message: "Session user tidak ditemukan." });
    return;
  }
  req.session.user = await withAdminFlag(freshUser);
  if (!req.session.user.isAdmin && req.session.user.banned) {
    res.status(403).json({ message: req.session.user.bannedReason || "Akun Anda sedang diblokir admin." });
    return;
  }
  next();
}

function requireAdmin(req, res, next) {
  Promise.resolve(requireAuth(req, res, async () => {
    if (!req.session.user.isAdmin) {
      res.status(403).json({ message: "Akses admin diperlukan." });
      return;
    }
    next();
  })).catch((error) => {
    res.status(500).json({ message: error.message || "Validasi admin gagal." });
  });
}

async function withAdminFlag(user) {
  return {
    ...user,
    linkedProviders: await getLinkedProvidersForUser(user.id),
    isAdmin: adminUserIds.has(user.id),
  };
}

function normalizeProvider(value) {
  const raw = String(value || "").toLowerCase();
  if (raw === "google") return "Google";
  if (raw === "facebook") return "Facebook";
  if (raw === "discord") return "Discord";
  if (raw === "telegram") return "Telegram";
  return "";
}

function buildRedirectUri(providerName) {
  return `${appBaseUrl}/auth/${providerName.toLowerCase()}/callback`;
}

function calculateTransactionFee(price, type, settings) {
  if (String(type).toLowerCase() === "gold") {
    return Math.max(0, Number(settings.goldFlatFee || 0));
  }

  const tiers = Array.isArray(settings.accountFeeTiers) ? settings.accountFeeTiers : [];
  const found = tiers.find((tier) => price <= Number(tier.maxAmount || 0));
  if (!found) return 0;
  if (String(found.feeType || "flat").toLowerCase() === "percent") {
    return Math.max(0, Math.round(price * (Number(found.fee || 0) / 100)));
  }
  return Math.max(0, Number(found.fee || 0));
}

function formatCurrencyId(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateId(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function isWarrantyStillActive(transaction) {
  if (!transaction?.warrantyEndsAt) return false;
  return new Date(transaction.warrantyEndsAt).getTime() > Date.now();
}

function sanitizeReturnTo(value) {
  const raw = String(value || "/");
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

function getGuestSupportKey(req) {
  if (!req.session.guestSupportKey) {
    req.session.guestSupportKey = crypto.randomBytes(12).toString("hex");
  }
  return req.session.guestSupportKey;
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function safePercent(used, limit) {
  const total = Number(limit || 0);
  const current = Number(used || 0);
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}

function getDirSize(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) return 0;
  const stat = fs.statSync(targetPath);
  if (stat.isFile()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(targetPath)) {
    total += getDirSize(path.join(targetPath, entry));
  }
  return total;
}

async function buildStorageInfo() {
  const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
  const uploadsUsage = getDirSize(uploadsDir);
  const dataUsage = getDirSize(dataDir);
  const uploadsLimitBytes = Math.max(1, Number(process.env.UPLOADS_LIMIT_MB || 2048)) * 1024 * 1024;
  const dataLimitBytes = Math.max(1, Number(process.env.DATA_LIMIT_MB || 2048)) * 1024 * 1024;

  const metrics = [
    {
      key: "uploads_local",
      label: "Upload file transaksi",
      usedBytes: uploadsUsage,
      limitBytes: uploadsLimitBytes,
      usedLabel: formatBytes(uploadsUsage),
      limitLabel: formatBytes(uploadsLimitBytes),
      percent: safePercent(uploadsUsage, uploadsLimitBytes),
      source: cloudinaryEnabled ? "Fallback local / Railway" : "Railway / local uploads",
    },
    {
      key: "data_local",
      label: "Data aplikasi / database",
      usedBytes: dataUsage,
      limitBytes: dataLimitBytes,
      usedLabel: formatBytes(dataUsage),
      limitLabel: formatBytes(dataLimitBytes),
      percent: safePercent(dataUsage, dataLimitBytes),
      source: "Railway volume / data dir",
    },
  ];

  if (cloudinaryEnabled) {
    try {
      const usage = await cloudinary.api.usage();
      const storageUsed = Number(usage?.storage?.usage || 0);
      const storageLimit = Number(usage?.storage?.limit || 0);
      metrics.unshift({
        key: "cloudinary_storage",
        label: "Cloudinary storage",
        usedBytes: storageUsed,
        limitBytes: storageLimit,
        usedLabel: formatBytes(storageUsed),
        limitLabel: storageLimit ? formatBytes(storageLimit) : "Tidak diketahui",
        percent: safePercent(storageUsed, storageLimit),
        source: "Cloudinary",
      });
    } catch {
      metrics.unshift({
        key: "cloudinary_storage",
        label: "Cloudinary storage",
        usedBytes: 0,
        limitBytes: 0,
        usedLabel: "Tidak terbaca",
        limitLabel: "Cek console",
        percent: 0,
        source: "Cloudinary",
      });
    }
  }

  return {
    uploadsProvider: cloudinaryEnabled ? "Cloudinary + Railway/local fallback" : "Railway / local uploads",
    cloudinaryEnabled,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    cloudinaryConsoleUrl: "https://console.cloudinary.com/",
    cloudinaryBillingUrl: "https://console.cloudinary.com/settings/billing",
    railwayConsoleUrl: "https://railway.app/dashboard",
    railwayBillingUrl: "https://railway.app/account/usage",
    note: cloudinaryEnabled
      ? "Bar di bawah menampilkan pemakaian yang bisa dibaca dari Cloudinary dan estimasi folder lokal / Railway. Isi env UPLOADS_LIMIT_MB dan DATA_LIMIT_MB agar bar lokal lebih akurat."
      : "Bar di bawah membaca pemakaian folder upload dan data lokal / Railway. Isi env UPLOADS_LIMIT_MB dan DATA_LIMIT_MB agar admin tahu kapan kapasitas mulai penuh.",
    metrics,
  };
}

function buildAuthRedirectUrl(returnTo, providerName, result, message = "") {
  const base = sanitizeReturnTo(returnTo);
  const separator = base.includes("?") ? "&" : "?";
  const messagePart = message ? `&message=${encodeURIComponent(message)}` : "";
  return `${base}${separator}authResult=${result}&provider=${encodeURIComponent(providerName)}${messagePart}`;
}

function generateTransactionCode() {
  const year = new Date().getFullYear();
  const suffix = crypto.randomBytes(6).toString("base64url").toUpperCase();
  return `RW-${year}-${suffix}`;
}

function normalizeWarrantyInput(rawWarranty) {
  const raw = String(rawWarranty || "").trim().toLowerCase();
  if (!raw || raw === "tanpa garansi" || raw === "0" || raw === "0 hari") {
    return { label: "Tanpa garansi", days: 0 };
  }
  const matched = raw.match(/(\d+)/);
  const days = matched ? Number(matched[1] || 0) : NaN;
  if (!ALLOWED_WARRANTY_DAY_VALUES.has(days)) {
    return null;
  }
  return { label: `${days} hari`, days };
}

function isTransactionParticipant(transaction, user) {
  if (!transaction || !user) return false;
  return transaction.buyer?.id === user.id || transaction.seller?.id === user.id;
}

function canPreviewTransactionForJoin(transaction) {
  if (!transaction) return false;
  if (transaction.paymentStatus === "Transaksi dibatalkan" || transaction.paymentStatus === "Selesai") return false;
  return !transaction.buyer || !transaction.seller;
}

function buildJoinPreviewTransaction(transaction) {
  return {
    ...transaction,
    sellerBankName: "",
    sellerBankNumber: "",
    sellerBankHolder: "",
    sellerPayoutAccount: "",
    adminPayoutAccount: "",
    messages: [],
    uploads: [],
    buyer: transaction.buyer
      ? {
        id: transaction.buyer.id,
        displayName: transaction.buyer.displayName,
        username: transaction.buyer.username,
        avatar: transaction.buyer.avatar,
        verificationStatus: transaction.buyer.verificationStatus,
        verified: transaction.buyer.verified,
      }
      : null,
    seller: transaction.seller
      ? {
        id: transaction.seller.id,
        displayName: transaction.seller.displayName,
        username: transaction.seller.username,
        avatar: transaction.seller.avatar,
        verificationStatus: transaction.seller.verificationStatus,
        verified: transaction.seller.verified,
      }
      : null,
  };
}

function assertTransactionParticipant(req, res, transaction) {
  if (!transaction) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return false;
  }
  const user = req.session.user;
  if (user.isAdmin || isTransactionParticipant(transaction, user)) {
    return true;
  }
  res.status(403).json({ message: "Tidak punya akses ke transaksi ini." });
  return false;
}

async function resolveTransactionAccess(req, res, transaction, { allowJoinPreview = false } = {}) {
  if (!transaction) {
    res.status(404).json({ message: "Transaksi tidak ditemukan." });
    return null;
  }
  const user = req.session.user;
  if (user.isAdmin || isTransactionParticipant(transaction, user)) {
    return transaction;
  }
  if (allowJoinPreview && canPreviewTransactionForJoin(transaction)) {
    return buildJoinPreviewTransaction(transaction);
  }
  res.status(403).json({ message: "Tidak punya akses ke transaksi ini." });
  return null;
}

function randomString(length) {
  return crypto.randomBytes(length).toString("base64url");
}

function sha256Base64Url(input) {
  return crypto.createHash("sha256").update(input).digest("base64url");
}

function clearAuthSession(req) {
  delete req.session.auth;
}

function readOAuthError(payload) {
  return payload.error_description || payload.error?.message || payload.error || "OAuth gagal.";
}

function setupEventStream(req, res, audience, userId) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const client = { res, audience, userId };
  eventClients.add(client);
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(`event: ping\ndata: {}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    eventClients.delete(client);
  });
}

function markUserAway(userId) {
  if (!userId) return;
  const previous = presenceState.get(userId) || {};
  presenceState.set(userId, {
    ...previous,
    userId,
    lastSeenAt: new Date(Date.now() - PRESENCE_ONLINE_MS - 1000).toISOString(),
  });
  presenceOnlineSnapshot.set(userId, false);
}

function startPresenceSweeper() {
  setInterval(() => {
    for (const userId of presenceState.keys()) {
      const presence = getUserPresence(userId);
      const wasOnline = presenceOnlineSnapshot.get(userId);
      if (wasOnline === true && !presence.isOnline) {
        broadcastPresenceUpdate(userId).catch(() => {});
      }
      presenceOnlineSnapshot.set(userId, presence.isOnline);
    }
  }, PRESENCE_SWEEP_MS);
}

function setUserPresence(userId, role = "user", activeTransactionCode = "", activeSupportThreadId = null) {
  if (!userId) return;
  const previous = presenceState.get(userId) || {};
  presenceState.set(userId, {
    ...previous,
    userId,
    role,
    activeTransactionCode,
    activeSupportThreadId: activeSupportThreadId || null,
    lastSeenAt: new Date().toISOString(),
  });
  presenceOnlineSnapshot.set(userId, true);
}

function getUserPresence(userId) {
  const item = presenceState.get(userId);
  if (!item?.lastSeenAt) {
    return { isOnline: false, lastSeenAt: "" };
  }
  const lastSeenTime = new Date(item.lastSeenAt).getTime();
  return {
    ...item,
    isOnline: Date.now() - lastSeenTime <= PRESENCE_ONLINE_MS,
  };
}

function getAdminPresence() {
  const adminEntries = Array.from(presenceState.values()).filter((item) => item.role === "admin");
  const latest = adminEntries
    .map((item) => getUserPresence(item.userId))
    .sort((left, right) => new Date(right.lastSeenAt || 0).getTime() - new Date(left.lastSeenAt || 0).getTime())[0];
  return latest || { isOnline: false, lastSeenAt: "" };
}

function setTypingState(code, userId, isTyping) {
  const key = String(code || "").toUpperCase();
  if (!key || !userId) return;
  const users = typingState.get(key) || {};
  if (isTyping) {
    users[userId] = new Date().toISOString();
  } else {
    delete users[userId];
  }
  typingState.set(key, users);
}

function buildTypingPayload(code) {
  const users = typingState.get(String(code || "").toUpperCase()) || {};
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(users).filter(([, value]) => now - new Date(value).getTime() <= TYPING_ACTIVE_MS),
  );
}

function getSupportTypingKey(threadId) {
  return `SUPPORT-${Number(threadId || 0)}`;
}

function setSupportTypingState(threadId, userId, isTyping) {
  setTypingState(getSupportTypingKey(threadId), userId, isTyping);
}

function buildSupportTypingPayload(threadId) {
  return buildTypingPayload(getSupportTypingKey(threadId));
}

function getAlwaysOnlineAdminPresence() {
  return {
    isOnline: true,
    lastSeenAt: new Date().toISOString(),
    role: "admin",
  };
}

function enrichSupportThread(thread, { forUser = false } = {}) {
  if (!thread) return thread;
  let user = null;
  if (thread.user) {
    user = enrichUserPresence(thread.user);
  } else if (String(thread.userId || "").startsWith("guest:")) {
    user = {
      id: thread.userId,
      displayName: "Guest",
      presence: getUserPresence(thread.userId),
    };
  }
  return {
    ...thread,
    user,
    adminPresence: forUser ? getAlwaysOnlineAdminPresence() : getAdminPresence(),
    typing: buildSupportTypingPayload(thread.id),
  };
}

async function broadcastSupportTypingUpdated(thread) {
  if (!thread?.id) return;
  await broadcastEvent("support_typing_updated", null, {
    threadId: thread.id,
    userId: thread.userId || thread.user?.id || null,
    typing: buildSupportTypingPayload(thread.id),
  });
}

function enrichUserPresence(user) {
  if (!user) return user;
  return {
    ...user,
    presence: getUserPresence(user.id),
  };
}

function enrichTransactionPresence(transaction) {
  if (!transaction) return transaction;
  return {
    ...transaction,
    buyer: enrichUserPresence(transaction.buyer),
    seller: enrichUserPresence(transaction.seller),
    adminPresence: getAdminPresence(),
    typing: buildTypingPayload(transaction.code),
  };
}

async function broadcastPresenceUpdate(userId) {
  const presence = getUserPresence(userId);
  await broadcastEvent("presence_updated", presence.activeTransactionCode || null, {
    userId,
    presence,
    adminPresence: getAdminPresence(),
  });
}

async function broadcastEvent(type, code, payload = {}) {
  let transaction = payload.transaction || null;
  if (!transaction && code) {
    transaction = await getTransactionByCode(code);
  }
  if (!transaction && type === "presence_updated" && payload.presence?.activeTransactionCode) {
    transaction = await getTransactionByCode(payload.presence.activeTransactionCode);
  }
  for (const client of eventClients) {
    if (type === "support_updated") {
      const supportVisible = client.audience === "admin" || client.userId === payload.userId;
      if (!supportVisible) continue;
    } else if (type === "support_typing_updated") {
      const supportVisible = client.audience === "admin" || client.userId === payload.userId;
      if (!supportVisible) continue;
    } else if (type === "verification_updated") {
      const verificationVisible = client.audience === "admin" || client.userId === payload.userId;
      if (!verificationVisible) continue;
    } else if (type === "presence_updated") {
      const visiblePresence = client.audience === "admin"
        || client.userId === payload.userId
        || (transaction && (transaction.buyer?.id === client.userId || transaction.seller?.id === client.userId));
      if (!visiblePresence) continue;
    } else if (type === "typing_updated") {
      if (client.audience !== "admin" && transaction) {
        const visibleToUser = transaction.buyer?.id === client.userId || transaction.seller?.id === client.userId;
        if (!visibleToUser) continue;
      }
    } else if (client.audience !== "admin" && transaction) {
      const visibleToUser = transaction.buyer?.id === client.userId || transaction.seller?.id === client.userId;
      if (!visibleToUser) continue;
    }

    const clientPayload = { ...payload };
    if (clientPayload.transaction) {
      const viewer = client.audience === "admin"
        ? { id: client.userId, isAdmin: true }
        : { id: client.userId, isAdmin: false };
      clientPayload.transaction = enrichTransactionPresence(
        sanitizeTransactionForViewer(clientPayload.transaction, viewer),
      );
    }
    client.res.write(`data: ${JSON.stringify({ type, code, ...clientPayload })}\n\n`);
  }

  const pushPayload = {
    ...payload,
    transaction: payload.transaction || transaction,
  };
  dispatchPushForEvent(type, code, pushPayload, { adminUserIds, appBaseUrl }).catch((error) => {
    console.error("Web Push dispatch gagal:", error.message);
  });
}

function buildSupportPushExtras(thread) {
  const message = thread?.messages?.[thread.messages.length - 1] || null;
  return {
    pushTrigger: "new_support_message",
    pushMeta: { message },
  };
}

function getTransactionDisplayTitle(transaction) {
  const title = String(transaction?.title || "").trim();
  const code = String(transaction?.code || "").trim();
  return title || code || "Transaksi";
}

function buildStatusPushExtras(transaction, title, body) {
  const messages = transaction?.messages || [];
  const lastMessage = messages[messages.length - 1];
  const displayTitle = getTransactionDisplayTitle(transaction);
  return {
    pushTrigger: "status_change",
    pushMeta: {
      title: title || `Update transaksi — ${displayTitle}`,
      body: body || lastMessage?.text || `Status transaksi ${displayTitle} diperbarui.`,
    },
  };
}

function cleanupTransactionFiles(transaction) {
  for (const file of transaction?.uploads || []) {
    if (isCloudinaryStoredName(file.storedName)) {
      destroyCloudinaryAsset(file.storedName).catch(() => {});
      continue;
    }
    const relative = String(file.url || "").replace(/^\/+/, "");
    const target = path.resolve(process.cwd(), relative);
    if (target.startsWith(uploadsDir) && fs.existsSync(target)) {
      try {
        fs.unlinkSync(target);
      } catch {
        // ignore cleanup failure
      }
    }
  }
}

async function persistUploadFile(file, transactionCode, senderId) {
  if (!file?.buffer?.length) {
    throw new Error("File upload kosong atau rusak.");
  }

  if (cloudinaryEnabled) {
    return uploadToCloudinary(file, transactionCode, senderId);
  }

  return storeFileLocally(file);
}

async function uploadToCloudinary(file, transactionCode, senderId) {
  const mime = String(file.mimetype || "").toLowerCase().split(";")[0].trim();
  const extension = MIME_TO_EXT[mime]?.replace(/^\./, "") || "bin";
  const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40) || "bukti";
  const publicId = `${cloudinaryFolder}/${transactionCode}/${Date.now()}-${safeBase}`;
  const resourceType = mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : "raw";

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: undefined,
        public_id: publicId,
        resource_type: resourceType,
        use_filename: false,
        unique_filename: false,
        overwrite: false,
        access_mode: "public",
        tags: ["rekberwe", transactionCode, String(senderId || "guest")],
        format: resourceType === "image" ? extension : undefined,
      },
      (error, uploaded) => {
        if (error) {
          reject(new Error(error.message || "Upload Cloudinary gagal."));
          return;
        }
        resolve(uploaded);
      },
    );
    stream.end(file.buffer);
  });

  return {
    storedName: `cloudinary:${result.resource_type}:${result.public_id}`,
    fileUrl: result.secure_url,
  };
}

function storeFileLocally(file) {
  const mime = String(file.mimetype || "").toLowerCase().split(";")[0].trim();
  const ext = MIME_TO_EXT[mime] || ".bin";
  const safeBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40) || "bukti";
  const storedName = `${Date.now()}-${safeBase}${ext}`;
  const target = path.join(uploadsDir, storedName);
  fs.writeFileSync(target, file.buffer);
  return {
    storedName,
    fileUrl: `/uploads/${storedName}`,
  };
}

function getRequestIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return forwarded[0] || req.ip || req.socket?.remoteAddress || "";
}

function isAnalyticsRateLimited(visitorId) {
  const now = Date.now();
  const entry = analyticsRateLimits.get(visitorId);
  if (!entry || now > entry.resetAt) {
    analyticsRateLimits.set(visitorId, { count: 1, resetAt: now + 60000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 120;
}

function renderRekberWarrantyPage() {
  const items = [
    "Penjual wajib verifikasi identitas di profil dengan foto KTP dan video selfie memegang KTP. NIK disarankan di-blur.",
    "Jika ada data akun yang tidak bisa di-remove / diganti, buyer berhak membatalkan transaksi. Garansi adalah kesepakatan personal antara seller dan buyer. Kami tidak bertanggung jawab setelah transaksi selesai.",
    "Jika terjadi hackback oleh penjual, buyer berhak meminta identitas penjual dan semua kontak social media melalui admin, ajukan sengketa, atau live chat.",
  ];
  const rows = items
    .map((item, index) => `<li><span class="item-index">${index + 1}</span><div class="item-copy">${escapeHtml(item)}</div></li>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Jaminan Rekber</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #07111f;
      --surface: #111c2d;
      --surface-elevated: #1a2740;
      --line: rgba(167, 190, 229, 0.12);
      --text: #eff5ff;
      --muted: #8ea2c5;
      --brand-blue: #446dff;
      --brand-gold: #dcb34d;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Plus Jakarta Sans", Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(67, 106, 255, 0.12), transparent 28%),
        radial-gradient(circle at top right, rgba(220, 179, 77, 0.1), transparent 24%),
        linear-gradient(180deg, #08111f 0%, #0b1321 100%);
      padding: 20px;
    }
    .card {
      max-width: 860px;
      margin: 0 auto;
      background: linear-gradient(180deg, rgba(26, 39, 64, 0.95), rgba(17, 28, 45, 0.98));
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 28px;
      box-shadow: 0 30px 70px rgba(0, 0, 0, 0.42);
    }
    .eyebrow {
      margin: 0 0 8px;
      color: var(--brand-gold);
      font-size: 0.78rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      font-weight: 700;
    }
    h1 {
      margin: 0 0 12px;
      font-size: clamp(1.7rem, 4vw, 2.4rem);
      line-height: 1.2;
    }
    .lead {
      margin: 0 0 22px;
      color: var(--muted);
      line-height: 1.7;
    }
    ul {
      display: grid;
      gap: 14px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: grid;
      grid-template-columns: 42px 1fr;
      gap: 14px;
      align-items: start;
      padding: 16px;
      border-radius: 18px;
      background: rgba(68, 109, 255, 0.08);
      border: 1px solid rgba(68, 109, 255, 0.16);
    }
    .item-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 42px;
      height: 42px;
      border-radius: 14px;
      background: linear-gradient(135deg, #446dff, #7a61ff);
      color: #fff;
      font-weight: 800;
      font-size: 1rem;
    }
    .item-copy {
      line-height: 1.75;
      color: var(--text);
    }
    .actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 24px;
    }
    a.btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 12px 18px;
      border-radius: 14px;
      text-decoration: none;
      font-weight: 700;
    }
    .btn-primary {
      background: linear-gradient(135deg, #446dff, #7a61ff);
      color: #fff;
    }
    .btn-ghost {
      background: rgba(255, 255, 255, 0.03);
      color: var(--text);
      border: 1px solid var(--line);
    }
    @media (max-width: 640px) {
      body { padding: 14px; }
      .card { padding: 20px; border-radius: 22px; }
      li { grid-template-columns: 36px 1fr; gap: 12px; padding: 14px; }
      .item-index { width: 36px; height: 36px; border-radius: 12px; font-size: 0.95rem; }
    }
  </style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">RekberWE.id</p>
    <h1>Jaminan Rekber</h1>
    <p class="lead">Ketentuan jaminan dan perlindungan buyer saat transaksi rekber. Baca sebelum melanjutkan transaksi.</p>
    <ul>${rows}</ul>
    <div class="actions">
      <a class="btn btn-primary" href="/">Kembali ke website</a>
      <a class="btn btn-ghost" href="/security-guide">Panduan pengamanan akun</a>
    </div>
  </div>
</body>
</html>`;
}

function renderSimpleContentPage(title, heading, bodyText) {
  const safeTitle = escapeHtml(title);
  const safeHeading = escapeHtml(heading);
  const rows = String(bodyText || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root{--blue:#1f6fb6;--gold:#e0b232;--text:#18324f;--muted:#5f7692;}
    *{box-sizing:border-box}
    body{font-family:'Plus Jakarta Sans',Arial,sans-serif;background:linear-gradient(180deg,#f8fbff 0%,#eaf3fc 100%);color:var(--text);margin:0;padding:20px}
    .card{max-width:960px;margin:0 auto;background:#fff;border-radius:28px;padding:28px;box-shadow:0 18px 54px rgba(22,56,99,.10);border:1px solid rgba(31,111,182,.1)}
    .eyebrow{margin:0 0 8px;color:var(--muted);font-size:.8rem;letter-spacing:.08em;text-transform:uppercase}
    h1{margin:0 0 10px;font-size:clamp(1.7rem,3vw,2.4rem)}
    p{margin:0 0 18px;color:var(--muted);line-height:1.7}
    ul{display:grid;gap:12px;line-height:1.7;padding-left:0;list-style:none}
    li{padding:12px 14px;border-radius:16px;background:rgba(31,111,182,.05);border:1px solid rgba(31,111,182,.08)}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:20px}
    a.btn{display:inline-flex;align-items:center;justify-content:center;padding:12px 18px;border-radius:14px;text-decoration:none;font-weight:700}
    .btn-primary{background:linear-gradient(135deg,var(--blue),var(--gold));color:#fff}
    .btn-ghost{background:#fff;color:var(--text);border:1px solid rgba(31,111,182,.15)}
  </style>
</head>
<body>
  <div class="card">
    <p class="eyebrow">RekberWE.id</p>
    <h1>${safeHeading}</h1>
    <p>Halaman resmi ini dibagikan admin agar pembeli dan penjual bisa membaca panduan dengan ringkas sebelum melanjutkan transaksi.</p>
    <ul>${rows || "<li>Konten belum diisi admin.</li>"}</ul>
    <div class="actions">
      <a class="btn btn-primary" href="/">Kembali ke website</a>
      <a class="btn btn-ghost" href="/terms">Buka syarat & ketentuan</a>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function isCloudinaryStoredName(value) {
  return String(value || "").startsWith("cloudinary:");
}

async function destroyCloudinaryAsset(storedName) {
  if (!cloudinaryEnabled || !isCloudinaryStoredName(storedName)) return;
  const parts = String(storedName).split(":");
  const resourceType = parts[1];
  const publicId = parts.slice(2).join(":");
  if (!resourceType || !publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
