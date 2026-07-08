import crypto from "node:crypto";

const ENCRYPTED_PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;

let cachedKey = null;

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getEncryptionKey() {
  if (cachedKey) return cachedKey;
  const secret = String(process.env.VOUCHER_CREDENTIALS_KEY || "").trim();
  if (!secret && isProduction()) {
    throw new Error("VOUCHER_CREDENTIALS_KEY wajib diset di production untuk enkripsi kredensial voucher.");
  }
  const source = secret || String(process.env.SESSION_SECRET || "").trim() || "rekberwe-dev-voucher-key";
  if (!secret && !isProduction()) {
    console.warn("[voucher-crypto] VOUCHER_CREDENTIALS_KEY tidak diset — memakai kunci dev. Jangan dipakai di production.");
  }
  cachedKey = crypto.scryptSync(source, "rekberwe-voucher-credentials-v1", 32);
  return cachedKey;
}

export function isEncryptedVoucherValue(value) {
  return String(value || "").startsWith(ENCRYPTED_PREFIX);
}

export function encryptVoucherField(plaintext) {
  const value = String(plaintext ?? "");
  if (!value) return "";
  if (isEncryptedVoucherValue(value)) return value;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptVoucherField(stored) {
  const value = String(stored ?? "");
  if (!value) return "";
  if (!isEncryptedVoucherValue(value)) return value;

  const payload = value.slice(ENCRYPTED_PREFIX.length);
  const [ivPart, tagPart, dataPart] = payload.split(":");
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error("Format kredensial voucher tidak valid.");
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function encryptVoucherCredentialFields({ accountEmail = "", accountPassword = "", accountAccounts = [] } = {}) {
  const accounts = Array.isArray(accountAccounts) ? accountAccounts : [];
  const accountsJson = accounts.length ? JSON.stringify(accounts) : "[]";
  return {
    account_email: accountEmail ? encryptVoucherField(accountEmail) : "",
    account_password: accountPassword ? encryptVoucherField(accountPassword) : "",
    account_accounts: accountsJson !== "[]" ? encryptVoucherField(accountsJson) : "[]",
  };
}

export function decryptVoucherCredentialFields(row = {}) {
  const accountEmail = row.account_email ? decryptVoucherField(row.account_email) : "";
  const accountPassword = row.account_password ? decryptVoucherField(row.account_password) : "";
  let accountAccountsJson = "[]";
  const rawAccounts = String(row.account_accounts || "[]");
  if (rawAccounts && rawAccounts !== "[]") {
    accountAccountsJson = isEncryptedVoucherValue(rawAccounts)
      ? decryptVoucherField(rawAccounts)
      : rawAccounts;
  }
  return {
    accountEmail,
    accountPassword,
    accountAccountsJson,
  };
}

export async function migratePlaintextVoucherCredentials(updateRow, listRows) {
  const rows = await listRows();
  let migrated = 0;
  for (const row of rows) {
    const needsEmail = row.account_email && !isEncryptedVoucherValue(row.account_email);
    const needsPassword = row.account_password && !isEncryptedVoucherValue(row.account_password);
    const needsAccounts = row.account_accounts
      && row.account_accounts !== "[]"
      && !isEncryptedVoucherValue(row.account_accounts);
    if (!needsEmail && !needsPassword && !needsAccounts) continue;

    const plain = decryptVoucherCredentialFields(row);
    let accounts = [];
    try {
      const parsed = JSON.parse(plain.accountAccountsJson || "[]");
      accounts = Array.isArray(parsed) ? parsed : [];
    } catch {
      accounts = [];
    }

    const encrypted = encryptVoucherCredentialFields({
      accountEmail: plain.accountEmail,
      accountPassword: plain.accountPassword,
      accountAccounts: accounts,
    });

    await updateRow(row.order_code, encrypted);
    migrated += 1;
  }
  return migrated;
}
