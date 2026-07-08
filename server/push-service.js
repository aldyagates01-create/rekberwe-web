import fs from "node:fs";
import path from "node:path";

import webpush from "web-push";

import {
  getAdminPushSubscriptions,
  getPushSubscriptionsForUser,
  removePushSubscriptionByEndpoint,
} from "./database.js";

const dataDir = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
const vapidSubject = String(process.env.VAPID_SUBJECT || "mailto:admin@rekberwe.id").trim();
let vapidKeys = null;
let pushReady = false;

function loadVapidKeys() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
  if (publicKey && privateKey) {
    return { publicKey, privateKey };
  }
  fs.mkdirSync(dataDir, { recursive: true });
  const vapidPath = path.join(dataDir, "vapid.json");
  if (fs.existsSync(vapidPath)) {
    try {
      const saved = JSON.parse(fs.readFileSync(vapidPath, "utf8"));
      if (saved?.publicKey && saved?.privateKey) return saved;
    } catch {
      // fall through to regenerate
    }
  }
  const generated = webpush.generateVAPIDKeys();
  fs.writeFileSync(vapidPath, JSON.stringify(generated, null, 2));
  console.log("VAPID keys generated and saved to", vapidPath);
  return generated;
}

export function initPushService() {
  try {
    vapidKeys = loadVapidKeys();
    webpush.setVapidDetails(vapidSubject, vapidKeys.publicKey, vapidKeys.privateKey);
    pushReady = true;
  } catch (error) {
    pushReady = false;
    console.warn("Web Push tidak aktif:", error.message);
  }
}

export function getVapidPublicKey() {
  return pushReady ? vapidKeys.publicKey : "";
}

export function isPushEnabled() {
  return pushReady;
}

function truncateText(value, max = 120) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function getTransactionDisplayTitle(transaction) {
  const title = String(transaction?.title || "").trim();
  const code = String(transaction?.code || "").trim();
  return title || code || "Transaksi";
}

async function sendPushToSubscription(subscription, payload) {
  if (!pushReady || !subscription?.endpoint) return;
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );
  } catch (error) {
    const status = error?.statusCode || error?.status;
    if (status === 404 || status === 410) {
      await removePushSubscriptionByEndpoint(subscription.endpoint).catch(() => {});
    }
  }
}

async function sendPushToUser(userId, audience, payload) {
  if (!userId || !pushReady) return;
  const subscriptions = await getPushSubscriptionsForUser(userId, audience);
  await Promise.all(subscriptions.map((item) => sendPushToSubscription(item, payload)));
}

async function sendPushToAdmins(adminUserIds, payload) {
  if (!pushReady) return;
  const subscriptions = await getAdminPushSubscriptions(adminUserIds);
  await Promise.all(subscriptions.map((item) => sendPushToSubscription(item, payload)));
}

export async function dispatchPushForEvent(type, code, payload = {}, { adminUserIds = new Set(), appBaseUrl = "" } = {}) {
  if (!pushReady || !payload.pushTrigger) return;
  const base = String(appBaseUrl || "").replace(/\/$/, "");

  if (type === "transaction_updated" && payload.transaction) {
    await handleTransactionPush(payload, adminUserIds, base);
    return;
  }
  if (type === "support_updated" && payload.thread) {
    await handleSupportPush(payload, adminUserIds, base);
    return;
  }
  if (type === "verification_updated" && payload.user) {
    await handleVerificationPush(payload, adminUserIds, base);
    return;
  }
  if (type === "voucher_order_updated" && payload.order) {
    await handleVoucherOrderPush(payload, adminUserIds, base);
  }
}

async function handleTransactionPush(payload, adminUserIds, base) {
  const transaction = payload.transaction;
  const trigger = payload.pushTrigger;
  const code = transaction.code;
  const displayTitle = getTransactionDisplayTitle(transaction);
  const recipients = new Set();
  let title = `RekberWE.id — ${displayTitle}`;
  let body = "Ada pembaruan transaksi.";
  let url = `${base}/?trx=${encodeURIComponent(code)}`;
  let tag = `trx-${code}`;
  let notifyAdmins = false;

  if (trigger === "new_message") {
    const message = payload.pushMeta?.message || transaction.messages?.[transaction.messages.length - 1];
    if (!message) return;
    const senderUserId = message.senderUserId || null;
    const senderTitle = message.senderTitle || message.sender || "Pengguna";
    const isAdmin = !senderUserId || senderTitle === "Admin";
    body = truncateText(`${senderTitle}: ${message.text || message.message || ""}`) || `${senderTitle} mengirim pesan.`;
    title = `Pesan baru — ${displayTitle}`;
    if (isAdmin) {
      if (transaction.buyer?.id) recipients.add(transaction.buyer.id);
      if (transaction.seller?.id) recipients.add(transaction.seller.id);
    } else if (transaction.buyer?.id === senderUserId) {
      if (transaction.seller?.id) recipients.add(transaction.seller.id);
      notifyAdmins = true;
    } else if (transaction.seller?.id === senderUserId) {
      if (transaction.buyer?.id) recipients.add(transaction.buyer.id);
      notifyAdmins = true;
    } else {
      notifyAdmins = true;
    }
  } else if (trigger === "new_upload") {
    const upload = payload.pushMeta?.upload || transaction.uploads?.[transaction.uploads.length - 1];
    if (!upload) return;
    const senderUserId = upload.senderUserId || null;
    const senderTitle = upload.senderTitle || upload.sender || upload.senderName || "Pengguna";
    const isAdmin = !senderUserId || senderTitle === "Admin";
    body = `${senderTitle} mengirim lampiran.`;
    title = `Lampiran baru — ${displayTitle}`;
    if (isAdmin) {
      if (transaction.buyer?.id) recipients.add(transaction.buyer.id);
      if (transaction.seller?.id) recipients.add(transaction.seller.id);
    } else {
      if (transaction.buyer?.id && transaction.buyer.id !== senderUserId) recipients.add(transaction.buyer.id);
      if (transaction.seller?.id && transaction.seller.id !== senderUserId) recipients.add(transaction.seller.id);
      notifyAdmins = true;
    }
  } else if (trigger === "status_change") {
    body = payload.pushMeta?.body || `Status transaksi ${displayTitle} diperbarui.`;
    title = payload.pushMeta?.title || `Update transaksi — ${displayTitle}`;
    if (transaction.buyer?.id) recipients.add(transaction.buyer.id);
    if (transaction.seller?.id) recipients.add(transaction.seller.id);
  } else {
    return;
  }

  const pushPayload = { title, body, url, tag };
  await Promise.all([...recipients].map((userId) => sendPushToUser(userId, "user", pushPayload)));
  if (notifyAdmins) {
    await sendPushToAdmins(adminUserIds, {
      ...pushPayload,
      title: title.replace("—", "· Admin ·"),
      url: `${base}/admin`,
      tag: `admin-${tag}`,
    });
  }
}

async function handleSupportPush(payload, adminUserIds, base) {
  const thread = payload.thread;
  const message = payload.pushMeta?.message || thread.messages?.[thread.messages.length - 1];
  if (!message) return;

  if (message.senderRole === "admin") {
    const userId = thread.user?.id || thread.userId;
    if (!userId || String(userId).startsWith("guest:")) return;
    await sendPushToUser(userId, "user", {
      title: "Live Chat Admin",
      body: truncateText(message.text) || "Admin mengirim pesan live chat.",
      url: `${base}/`,
      tag: `support-${thread.id}`,
    });
    return;
  }

  const senderName = message.sender || thread.user?.displayName || "Pengguna";
  await sendPushToAdmins(adminUserIds, {
    title: "Live Chat Baru",
    body: truncateText(`${senderName}: ${message.text || "Mengirim lampiran"}`) || `${senderName} menghubungi admin.`,
    url: `${base}/admin`,
    tag: `admin-support-${thread.id}`,
  });
}

async function handleVoucherOrderPush(payload, adminUserIds, base) {
  const order = payload.order;
  const trigger = payload.pushTrigger;
  const code = order.orderCode;
  const productName = order.product?.name || code;
  const tag = `voucher-${code}`;
  const url = `${base}/?voucher=${encodeURIComponent(code)}`;

  if (trigger === "new_message") {
    const message = payload.pushMeta?.message || order.messages?.[order.messages.length - 1];
    if (!message) return;
    const isAdmin = message.senderRole === "admin";
    const body = truncateText(message.text) || "Ada pesan baru pada order voucher.";
    if (isAdmin) {
      if (order.userId) {
        await sendPushToUser(order.userId, "user", {
          title: `Pesan voucher — ${productName}`,
          body,
          url,
          tag,
        });
      }
      return;
    }
    await sendPushToAdmins(adminUserIds, {
      title: `Pesan voucher — ${productName}`,
      body: truncateText(`${message.senderName || "Pembeli"}: ${message.text || ""}`) || "Pembeli mengirim pesan voucher.",
      url: `${base}/admin`,
      tag: `admin-${tag}`,
    });
    return;
  }

  if (trigger === "status_change") {
    const body = payload.pushMeta?.body || `Status order ${productName} diperbarui.`;
    if (order.userId) {
      await sendPushToUser(order.userId, "user", {
        title: `Update voucher — ${productName}`,
        body,
        url,
        tag,
      });
    }
    if (payload.pushMeta?.notifyAdmins) {
      await sendPushToAdmins(adminUserIds, {
        title: `Update voucher — ${productName}`,
        body,
        url: `${base}/admin`,
        tag: `admin-${tag}`,
      });
    }
  }
}

async function handleVerificationPush(payload, adminUserIds, base) {
  const user = payload.user;
  if (!user?.id) return;

  if (payload.pushTrigger === "verification_submitted") {
    await sendPushToAdmins(adminUserIds, {
      title: "Verifikasi Baru",
      body: `${user.displayName || "Pengguna"} mengirim permintaan verifikasi.`,
      url: `${base}/admin`,
      tag: `verification-${user.id}`,
    });
    return;
  }

  if (payload.pushTrigger === "verification_reviewed") {
    const status = user.verificationStatus || "unverified";
    let body = "Status verifikasi akun Anda diperbarui.";
    if (status === "verified") body = "Verifikasi akun Anda sudah disetujui admin.";
    if (status === "revision_required") body = "Admin meminta perbaikan data verifikasi Anda.";
    await sendPushToUser(user.id, "user", {
      title: "Status Verifikasi",
      body,
      url: `${base}/`,
      tag: `verification-${user.id}`,
    });
  }
}
