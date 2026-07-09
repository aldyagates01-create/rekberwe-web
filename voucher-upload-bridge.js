(function initVoucherUploadBridge(global) {
  const DB_NAME = "rekber-voucher-upload";
  const STORE = "pending";
  const MAX_AGE_MS = 15 * 60 * 1000;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Gagal membuka penyimpanan upload."));
    });
  }

  function runTx(db, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      fn(store, resolve, reject);
      tx.onerror = () => reject(tx.error || new Error("Transaksi upload gagal."));
    });
  }

  async function storePendingPaymentProof(orderCode, file) {
    const key = String(orderCode || "").trim().toUpperCase();
    if (!key || !file) throw new Error("File atau kode order tidak valid.");
    const db = await openDb();
    try {
      await runTx(db, "readwrite", (store, resolve, reject) => {
        const request = store.put({
          blob: file,
          name: file.name || "bukti.jpg",
          type: file.type || "application/octet-stream",
          size: file.size || 0,
          time: Date.now(),
        }, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async function consumePendingPaymentProof(orderCode) {
    const key = String(orderCode || "").trim().toUpperCase();
    if (!key) return null;
    const db = await openDb();
    try {
      const record = await runTx(db, "readonly", (store, resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      if (!record?.blob) return null;
      if (Date.now() - Number(record.time || 0) > MAX_AGE_MS) {
        await runTx(db, "readwrite", (store, resolve, reject) => {
          const request = store.delete(key);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
        return null;
      }
      await runTx(db, "readwrite", (store, resolve, reject) => {
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      return new File([record.blob], record.name || "bukti.jpg", {
        type: record.type || "application/octet-stream",
      });
    } finally {
      db.close();
    }
  }

  function buildChatroomUrl(orderCode, options = {}) {
    const code = encodeURIComponent(String(orderCode || "").trim().toUpperCase());
    const params = new URLSearchParams();
    if (options.upload) params.set("upload", "1");
    if (options.replace) params.set("replace", "1");
    const qs = params.toString();
    return `/chatroom/${code}${qs ? `?${qs}` : ""}`;
  }

  function openVoucherChatroom(orderCode, options = {}) {
    const url = buildChatroomUrl(orderCode, options);
    if (options.sameWindow) {
      global.location.href = url;
      return null;
    }
    const popup = global.open(url, "_blank");
    if (!popup) {
      global.location.href = url;
    }
    return popup;
  }

  global.VoucherUploadBridge = {
    storePendingPaymentProof,
    consumePendingPaymentProof,
    buildChatroomUrl,
    openVoucherChatroom,
  };
})(window);
