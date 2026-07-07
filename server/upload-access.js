import path from "node:path";

import {
  getAdminFeeSettings,
  getLocalUploadAccessContext,
  getSupportThreadForGuest,
  getSupportThreadForUser,
  getTransactionByCode,
  usersShareAnyTransaction,
} from "./database.js";

function extractUploadFilename(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/uploads/")) return "";
  return path.basename(raw);
}

export async function isPublicNotificationSound(filename) {
  const settings = await getAdminFeeSettings();
  const urls = [
    settings.notificationSounds?.user?.url,
    settings.notificationSounds?.admin?.url,
  ];
  return urls.some((url) => extractUploadFilename(url) === filename);
}

export async function canAccessLocalUpload(req, filename) {
  const safeName = path.basename(String(filename || ""));
  if (!safeName || safeName !== filename) return false;

  if (await isPublicNotificationSound(safeName)) return true;

  const user = req.session?.user;
  if (!user) return false;
  if (user.isAdmin) return true;

  const uploadPath = `/uploads/${safeName}`;
  const context = await getLocalUploadAccessContext(uploadPath);
  if (!context) return false;

  if (context.ktpOwnerUserIds.includes(user.id)) return true;
  if (context.avatarOwnerUserIds.includes(user.id)) return true;

  for (const ownerId of context.avatarOwnerUserIds) {
    if (ownerId !== user.id && await usersShareAnyTransaction(user.id, ownerId)) {
      return true;
    }
  }

  for (const code of context.transactionCodes) {
    const transaction = await getTransactionByCode(code);
    if (
      transaction
      && (transaction.buyer?.id === user.id || transaction.seller?.id === user.id)
    ) {
      return true;
    }
  }

  for (const threadId of context.supportThreadIds) {
    const userThread = await getSupportThreadForUser(user.id);
    if (userThread?.id === threadId) return true;
  }

  const guestKey = req.session?.guestSupportKey;
  if (guestKey) {
    const guestThread = await getSupportThreadForGuest(guestKey);
    if (guestThread && context.supportThreadIds.includes(guestThread.id)) return true;
  }

  return false;
}
