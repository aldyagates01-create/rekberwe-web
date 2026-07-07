const PUBLIC_USER_FIELDS = [
  "id",
  "provider",
  "username",
  "displayName",
  "avatar",
  "profileUrl",
  "verifiedProvider",
  "verified",
  "verificationStatus",
];

export function mapPublicUser(user) {
  if (!user) return null;
  const publicUser = {};
  PUBLIC_USER_FIELDS.forEach((field) => {
    if (user[field] !== undefined) publicUser[field] = user[field];
  });
  return publicUser;
}

export function sanitizeUserForViewer(user, viewer) {
  if (!user) return null;
  if (viewer?.isAdmin || user.id === viewer?.id) return user;
  return mapPublicUser(user);
}

export function sanitizeTransactionForViewer(transaction, viewer) {
  if (!transaction) return null;
  const sanitized = { ...transaction };
  sanitized.buyer = sanitizeUserForViewer(transaction.buyer, viewer);
  sanitized.seller = sanitizeUserForViewer(transaction.seller, viewer);
  return sanitized;
}

export function sanitizeTransactionsForViewer(transactions, viewer) {
  if (!Array.isArray(transactions)) return [];
  return transactions.map((item) => sanitizeTransactionForViewer(item, viewer));
}

export function getViewerFromSession(user) {
  if (!user) return null;
  return { id: user.id, isAdmin: Boolean(user.isAdmin) };
}
