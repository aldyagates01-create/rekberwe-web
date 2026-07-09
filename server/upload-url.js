import { v2 as cloudinary } from "cloudinary";

const PRIVATE_PREFIX = "cloudinary-private:";

export function isPrivateCloudinaryRef(value) {
  return String(value || "").startsWith(PRIVATE_PREFIX);
}

export function buildPrivateCloudinaryRef(resourceType, publicId) {
  return `${PRIVATE_PREFIX}${resourceType}:${publicId}`;
}

export function parsePrivateCloudinaryRef(value) {
  const raw = String(value || "");
  if (!isPrivateCloudinaryRef(raw)) return null;
  const body = raw.slice(PRIVATE_PREFIX.length);
  const separator = body.indexOf(":");
  if (separator <= 0) return null;
  return {
    resourceType: body.slice(0, separator),
    publicId: body.slice(separator + 1),
  };
}

export function signPrivateCloudinaryRef(ref, { expiresInSeconds = 3600 } = {}) {
  const parsed = parsePrivateCloudinaryRef(ref);
  if (!parsed?.publicId) return ref;
  return cloudinary.url(parsed.publicId, {
    resource_type: parsed.resourceType || "image",
    type: "authenticated",
    secure: true,
    sign_url: true,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
}

export function resolveUploadAccessUrl(url, { expiresInSeconds = 3600 } = {}) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (isPrivateCloudinaryRef(value)) {
    return signPrivateCloudinaryRef(value, { expiresInSeconds });
  }
  return value;
}

export function resolveVoucherOrderMediaUrls(order) {
  if (!order) return order;
  const paymentProofUrl = resolveUploadAccessUrl(order.paymentProofUrl);
  const messages = Array.isArray(order.messages)
    ? order.messages.map((message) => ({
      ...message,
      attachmentUrl: message.attachmentUrl
        ? resolveUploadAccessUrl(message.attachmentUrl)
        : "",
    }))
    : order.messages;
  return {
    ...order,
    paymentProofUrl,
    messages,
    user: order.user
      ? {
        ...order.user,
        avatar: resolveUploadAccessUrl(order.user.avatar),
      }
      : order.user,
  };
}
