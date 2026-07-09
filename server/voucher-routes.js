import {
  addVoucherOrderMessage,
  createVoucherOrder,
  createManualVoucherOrder,
  createVoucherProduct,
  deleteVoucherOrder,
  deleteVoucherProduct,
  getActiveVoucherProducts,
  getAllVoucherOrders,
  getAllVoucherProducts,
  getVoucherOrderByCode,
  getVoucherOrdersByUserId,
  getVoucherProductById,
  getVoucherSalesReport,
  updateVoucherOrderFields,
  updateVoucherOrderAccounts,
  updateVoucherProduct,
  getAdminFeeSettings,
  saveAdminFeeSettings,
} from "./database.js";
import {
  getVoucherStatusLabel,
  stripPublicVoucherOrder,
  stripPublicVoucherOrders,
  stripPublicVoucherProduct,
  stripPublicVoucherProducts,
  stripVoucherOrderSummaries,
  validateVoucherOrderAction,
  isManualVoucherOrder,
  voucherOrderForViewer,
  formatVoucherAccountSubmissionMessage,
  normalizeVoucherExpenses,
  filterVoucherExpensesByDateRange,
  createVoucherExpenseId,
} from "./voucher-utils.js";
import { resolveUploadAccessUrl, resolveVoucherOrderMediaUrls } from "./upload-url.js";
import { resolveVoucherProductCostInput } from "./voucher-product-cost.js";
import { convertCurrencyToIdr, listSupportedCostCurrencies } from "./currency-rates.js";
import {
  dispatchEmail,
  sendVoucherAccountRevisionEmail,
  sendVoucherOrderCompletedEmail,
  sendVoucherOrderProcessingEmail,
  sendVoucherVerificationRequestEmail,
} from "../lib/email/sendEmail.ts";

function getVoucherViewer(req) {
  return {
    id: req.session.user?.id,
    isAdmin: Boolean(req.session.user?.isAdmin),
  };
}

function assertVoucherOrderAccess(req, res, order) {
  if (!order) {
    res.status(404).json({ message: "Order voucher tidak ditemukan." });
    return false;
  }
  if (req.session.user?.isAdmin) return true;
  if (isManualVoucherOrder(order) || order.userId !== req.session.user?.id) {
    res.status(404).json({ message: "Order voucher tidak ditemukan." });
    return false;
  }
  return true;
}

function respondWithVoucherOrder(res, req, order, statusCode = 200) {
  const resolved = resolveVoucherOrderMediaUrls(order);
  const payload = { order: voucherOrderForViewer(resolved, getVoucherViewer(req)) };
  if (statusCode === 201) {
    res.status(201).json(payload);
    return;
  }
  res.status(statusCode).json(payload);
}

async function buildVoucherProductPayload(body = {}) {
  const cost = await resolveVoucherProductCostInput(body);
  return {
    name: body.name,
    description: body.description,
    price: body.price,
    ...cost,
    readyMode: body.readyMode,
    readyStart: body.readyStart,
    readyEnd: body.readyEnd,
    isActive: body.isActive,
    stock: body.stock,
    sortOrder: body.sortOrder,
    imageUrl: body.imageUrl,
    imageName: body.imageName,
    requiresAccountLogin: body.requiresAccountLogin,
  };
}

export function registerVoucherRoutes(app, {
  requireAuth,
  requireAdmin,
  upload,
  paymentProofUpload,
  uploadPostLimiter,
  voucherOrderCreateLimiter,
  voucherOrderLookupLimiter,
  persistUploadFile,
  broadcastEvent,
  getRequestBaseUrl,
}) {
  app.get("/api/voucher/products", requireAuth, async (_req, res) => {
    const products = stripPublicVoucherProducts(await getActiveVoucherProducts());
    res.json({ products });
  });

  app.get("/api/voucher/products/:id", requireAuth, async (req, res) => {
    const product = await getVoucherProductById(Number(req.params.id));
    if (!product || !product.isActive) {
      res.status(404).json({ message: "Produk tidak ditemukan." });
      return;
    }
    res.json({ product: stripPublicVoucherProduct(product) });
  });

  app.get("/api/voucher/orders", requireAuth, async (req, res) => {
    const viewer = getVoucherViewer(req);
    const orders = req.session.user.isAdmin
      ? await getAllVoucherOrders()
      : stripVoucherOrderSummaries(await getVoucherOrdersByUserId(req.session.user.id));
    res.json({
      orders: orders.map((order) => voucherOrderForViewer(
        resolveVoucherOrderMediaUrls(order),
        viewer,
      )),
    });
  });

  app.get("/api/voucher/orders/:code", requireAuth, voucherOrderLookupLimiter, async (req, res) => {
    const code = String(req.params.code || "").toUpperCase();
    const order = await getVoucherOrderByCode(code);
    if (!assertVoucherOrderAccess(req, res, order)) return;
    respondWithVoucherOrder(res, req, order);
  });

  app.post("/api/voucher/orders", requireAuth, voucherOrderCreateLimiter, async (req, res) => {
    try {
      const productId = Number(req.body.productId || 0);
      if (!productId) {
        res.status(400).json({ message: "Produk wajib dipilih." });
        return;
      }
      const order = await createVoucherOrder(req.session.user.id, productId, {
        quantity: Number(req.body.quantity || 1),
      });
      await broadcastEvent("voucher_order_updated", order.orderCode, { order });
      respondWithVoucherOrder(res, req, order, 201);
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal membuat order voucher." });
    }
  });

  app.post("/api/voucher/orders/:code/payment-proof", requireAuth, uploadPostLimiter, paymentProofUpload.single("paymentProof"), async (req, res) => {
    const code = String(req.params.code || "").toUpperCase();
    const order = await getVoucherOrderByCode(code);
    if (!assertVoucherOrderAccess(req, res, order)) return;
    const validation = validateVoucherOrderAction(order, "submit_payment", false);
    if (!validation.ok) {
      res.status(400).json({ message: validation.message });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: "Bukti pembayaran wajib diupload." });
      return;
    }
    const isReplacement = order.status === "awaiting_confirmation";
    const stored = await persistUploadFile(file, code, req.session.user.id, { sensitive: true });
    await updateVoucherOrderFields(code, {
      ...(isReplacement ? {} : { status: "awaiting_confirmation" }),
      paymentProofUrl: stored.fileUrl,
      paymentProofName: file.originalname,
      proofRevisionRequested: false,
    });
    const latest = await addVoucherOrderMessage(
      code,
      req.session.user.id,
      req.session.user.displayName,
      "user",
      isReplacement
        ? "Bukti pembayaran telah diperbarui. Menunggu konfirmasi admin."
        : "Bukti pembayaran telah dikirim. Menunggu konfirmasi admin.",
      {
        attachmentName: file.originalname,
        attachmentUrl: stored.fileUrl,
        attachmentType: file.mimetype,
      },
    );
    await broadcastEvent("voucher_order_updated", code, { order: latest });
    respondWithVoucherOrder(res, req, latest);
  });

  app.post("/api/voucher/orders/:code/accounts", requireAuth, async (req, res) => {
    const code = String(req.params.code || "").toUpperCase();
    const order = await getVoucherOrderByCode(code);
    if (!assertVoucherOrderAccess(req, res, order)) return;
    if (!order.product?.requiresAccountLogin) {
      res.status(400).json({ message: "Produk ini tidak membutuhkan data akun subscription." });
      return;
    }
    if (!["awaiting_confirmation", "processing", "needs_verification", "dispute"].includes(order.status)) {
      res.status(400).json({ message: "Data akun belum bisa dikirim pada status order ini." });
      return;
    }
    try {
      const accounts = Array.isArray(req.body.accounts) ? req.body.accounts : [];
      const wasRevision = Boolean(order.accountRevisionRequested);
      let updated = await updateVoucherOrderAccounts(code, accounts);
      const quantity = Math.max(1, Number(updated.quantity || 1));
      updated = await addVoucherOrderMessage(
        code,
        req.session.user.id,
        req.session.user.displayName,
        "user",
        formatVoucherAccountSubmissionMessage(accounts, quantity, wasRevision),
      );
      await broadcastEvent("voucher_order_updated", code, { order: updated });
      respondWithVoucherOrder(res, req, updated);
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal menyimpan data akun." });
    }
  });

  app.post("/api/voucher/orders/:code/messages", requireAuth, async (req, res) => {
    const code = String(req.params.code || "").toUpperCase();
    const order = await getVoucherOrderByCode(code);
    if (!assertVoucherOrderAccess(req, res, order)) return;
    if (!["processing", "needs_verification", "dispute", "awaiting_confirmation"].includes(order.status) && !req.session.user.isAdmin) {
      res.status(400).json({ message: "Chat order belum tersedia pada status ini." });
      return;
    }
    const text = String(req.body.text || "").trim();
    if (!text) {
      res.status(400).json({ message: "Pesan tidak boleh kosong." });
      return;
    }
    const senderRole = req.session.user.isAdmin ? "admin" : "user";
    const senderName = senderRole === "admin" ? "Rekberwe.id" : req.session.user.displayName;
    const updated = await addVoucherOrderMessage(
      code,
      req.session.user.id,
      senderName,
      senderRole,
      text,
    );
    await broadcastEvent("voucher_order_updated", code, { order: updated, pushTrigger: "new_message" });
    respondWithVoucherOrder(res, req, updated);
  });

  app.post("/api/voucher/orders/:code/uploads", requireAuth, uploadPostLimiter, upload.array("chatFiles", 5), async (req, res) => {
    const code = String(req.params.code || "").toUpperCase();
    const order = await getVoucherOrderByCode(code);
    if (!assertVoucherOrderAccess(req, res, order)) return;
    if (!["processing", "needs_verification", "dispute", "awaiting_confirmation"].includes(order.status)) {
      res.status(400).json({ message: "Upload chat belum tersedia pada status ini." });
      return;
    }
    const files = Array.isArray(req.files) ? req.files : [];
    if (!files.length) {
      res.status(400).json({ message: "File wajib dipilih." });
      return;
    }
    let updated = order;
    const senderRole = req.session.user.isAdmin ? "admin" : "user";
    const senderName = senderRole === "admin" ? "Rekberwe.id" : req.session.user.displayName;
    for (const file of files) {
      const stored = await persistUploadFile(file, code, req.session.user.id, { sensitive: true });
      updated = await addVoucherOrderMessage(
        code,
        req.session.user.id,
        senderName,
        senderRole,
        file.originalname,
        {
          attachmentName: file.originalname,
          attachmentUrl: stored.fileUrl,
          attachmentType: file.mimetype,
        },
      );
    }
    await broadcastEvent("voucher_order_updated", code, { order: updated, pushTrigger: "new_message" });
    respondWithVoucherOrder(res, req, updated);
  });

  app.post("/api/voucher/orders/:code/actions", requireAuth, async (req, res) => {
    const code = String(req.params.code || "").toUpperCase();
    const action = String(req.body.action || "").trim();
    const note = String(req.body.note || "").trim();
    const order = await getVoucherOrderByCode(code);
    if (!assertVoucherOrderAccess(req, res, order)) return;

    const validation = validateVoucherOrderAction(order, action, Boolean(req.session.user.isAdmin));
    if (!validation.ok) {
      res.status(400).json({ message: validation.message });
      return;
    }

    if (action === "submit_payment") {
      res.status(400).json({ message: "Upload bukti pembayaran melalui endpoint payment-proof." });
      return;
    }

    let nextStatus = order.status;
    const patch = {};
    switch (action) {
      case "process":
        nextStatus = "processing";
        break;
      case "manual_process":
        nextStatus = "processing";
        break;
      case "needs_verification":
        nextStatus = "needs_verification";
        break;
      case "request_account_revision":
        patch.accountRevisionRequested = true;
        break;
      case "request_proof_revision":
        patch.proofRevisionRequested = true;
        break;
      case "complete":
        nextStatus = "completed";
        patch.completedAt = new Date().toISOString();
        break;
      case "dispute":
        if (!note) {
          res.status(400).json({ message: "Alasan sengketa wajib diisi." });
          return;
        }
        nextStatus = "dispute";
        patch.disputeReason = note;
        // Keluarkan dari laporan profit sampai admin menyelesaikan ulang.
        patch.completedAt = null;
        break;
      case "cancel":
        if (!note && !req.session.user.isAdmin) {
          res.status(400).json({ message: "Alasan pembatalan wajib diisi." });
          return;
        }
        nextStatus = "cancelled";
        patch.cancelReason = note || "Dibatalkan admin.";
        break;
      default:
        res.status(400).json({ message: "Aksi tidak dikenali." });
        return;
    }

    patch.status = nextStatus;
    let updated = await updateVoucherOrderFields(code, patch);
    const actionLabel = {
      process: "Order sedang diproses admin.",
      manual_process: "Order manual sedang diproses. Gunakan tombol salin order untuk menyalin data ke pembeli.",
      needs_verification: "Admin meminta kode verifikasi yang masuk ke email akun terkait. Silakan cek email Anda dan kirimkan kode verifikasi di chat ini.",
      request_account_revision: "Admin meminta perbaikan data akun. Silakan perbarui email dan password akun subscription lalu kirim ulang melalui formulir di bawah.",
      request_proof_revision: "Admin meminta ganti bukti transfer. Silakan upload bukti pembayaran yang benar melalui formulir di bawah.",
      complete: "Order sudah selesai diproses. Silakan cek akun Anda dan ajukan sengketa jika terjadi masalah pada akun.",
      dispute: `Sengketa diajukan: ${note}`,
      cancel: `Order dibatalkan: ${patch.cancelReason}`,
    }[action];
    if (actionLabel) {
      updated = await addVoucherOrderMessage(
        code,
        req.session.user.id,
        req.session.user.isAdmin ? "Rekberwe.id" : req.session.user.displayName,
        req.session.user.isAdmin ? "admin" : "user",
        actionLabel,
      );
    }
    const baseUrl = typeof getRequestBaseUrl === "function" ? getRequestBaseUrl(req) : "";
    if (action === "process" && order.status === "awaiting_confirmation") {
      dispatchEmail(() => sendVoucherOrderProcessingEmail(updated, baseUrl));
    } else if (action === "needs_verification") {
      dispatchEmail(() => sendVoucherVerificationRequestEmail(updated, baseUrl));
    } else if (action === "request_account_revision") {
      dispatchEmail(() => sendVoucherAccountRevisionEmail(updated, baseUrl));
    } else if (action === "complete") {
      if (!isManualVoucherOrder(updated)) {
        dispatchEmail(() => sendVoucherOrderCompletedEmail(updated, baseUrl));
      }
    }
    await broadcastEvent("voucher_order_updated", code, {
      order: updated,
      pushTrigger: "status_change",
      pushMeta: { body: actionLabel || `Status order diperbarui: ${getVoucherStatusLabel(updated.status)}` },
    });
    const viewerOrder = voucherOrderForViewer(
      resolveVoucherOrderMediaUrls(updated),
      getVoucherViewer(req),
    );
    res.json({ order: viewerOrder, statusLabel: getVoucherStatusLabel(updated.status) });
  });

  app.get("/api/admin/voucher/products", requireAdmin, async (_req, res) => {
    res.json({ products: await getAllVoucherProducts() });
  });

  app.get("/api/admin/voucher/currencies", requireAdmin, async (_req, res) => {
    res.json({ currencies: listSupportedCostCurrencies() });
  });

  app.get("/api/admin/voucher/fx-preview", requireAdmin, async (req, res) => {
    try {
      const currency = String(req.query.currency || "IDR").trim();
      const amount = Number(req.query.amount || 0);
      const sellPrice = Number(req.query.sellPrice || 0);
      const converted = await convertCurrencyToIdr(amount, currency);
      res.json({
        ...converted,
        profit: Math.max(0, Math.round(sellPrice) - converted.idrAmount),
      });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal menghitung konversi mata uang." });
    }
  });

  app.post("/api/admin/voucher/products", requireAdmin, async (req, res) => {
    const name = String(req.body.name || "").trim();
    const price = Number(req.body.price || 0);
    if (!name || price <= 0) {
      res.status(400).json({ message: "Nama dan harga produk wajib diisi." });
      return;
    }
    try {
      const product = await createVoucherProduct(await buildVoucherProductPayload({
        ...req.body,
        name,
        price,
        isActive: req.body.isActive !== false,
        requiresAccountLogin: req.body.requiresAccountLogin === true,
      }));
      res.status(201).json({ product });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal menyimpan produk." });
    }
  });

  app.put("/api/admin/voucher/products/:id", requireAdmin, async (req, res) => {
    const productId = Number(req.params.id || 0);
    try {
      const product = await updateVoucherProduct(productId, await buildVoucherProductPayload({
        ...req.body,
        requiresAccountLogin: req.body.requiresAccountLogin === true,
      }));
      if (!product) {
        res.status(404).json({ message: "Produk tidak ditemukan." });
        return;
      }
      res.json({ product });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal memperbarui produk." });
    }
  });

  app.delete("/api/admin/voucher/products/:id", requireAdmin, async (req, res) => {
    const productId = Number(req.params.id || 0);
    const deleted = await deleteVoucherProduct(productId);
    if (!deleted) {
      res.status(404).json({ message: "Produk tidak ditemukan." });
      return;
    }
    res.json({ ok: true });
  });

  app.post("/api/admin/voucher/products/:id/image", requireAdmin, uploadPostLimiter, upload.single("productImage"), async (req, res) => {
    const productId = Number(req.params.id || 0);
    const current = await getVoucherProductById(productId);
    if (!current) {
      res.status(404).json({ message: "Produk tidak ditemukan." });
      return;
    }
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: "Foto produk wajib diupload." });
      return;
    }
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.mimetype)) {
      res.status(400).json({ message: "Format foto harus JPG, PNG, atau WEBP." });
      return;
    }
    const stored = await persistUploadFile(file, `VPRODUCT-${productId}`, req.session.user.id);
    const product = await updateVoucherProduct(productId, {
      imageUrl: stored.fileUrl,
      imageName: file.originalname,
    });
    res.json({ product });
  });

  app.get("/api/admin/voucher/orders", requireAdmin, async (_req, res) => {
    const orders = (await getAllVoucherOrders()).map((order) => resolveVoucherOrderMediaUrls(order));
    res.json({ orders });
  });

  app.post("/api/admin/voucher/orders/manual", requireAdmin, uploadPostLimiter, paymentProofUpload.single("paymentProof"), async (req, res) => {
    try {
      let order = await createManualVoucherOrder(req.session.user.id, {
        buyerTelegram: req.body.buyerTelegram,
        accountEmail: req.body.accountEmail,
        accountPassword: req.body.accountPassword,
        productId: Number(req.body.productId || 0),
      });
      if (req.file) {
        const stored = await persistUploadFile(req.file, order.orderCode, req.session.user.id, { sensitive: true });
        order = await updateVoucherOrderFields(order.orderCode, {
          paymentProofUrl: stored.fileUrl,
          paymentProofName: req.file.originalname,
        });
        order = await addVoucherOrderMessage(
          order.orderCode,
          req.session.user.id,
          "Rekberwe.id",
          "admin",
          "Bukti transfer order manual diunggah admin.",
          {
            attachmentName: req.file.originalname,
            attachmentUrl: stored.fileUrl,
            attachmentType: req.file.mimetype,
          },
        );
      }
      await broadcastEvent("voucher_order_updated", order.orderCode, { order });
      res.json({
        order: resolveVoucherOrderMediaUrls(order),
        statusLabel: getVoucherStatusLabel(order.status),
      });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal menyimpan order manual." });
    }
  });

  app.get("/api/admin/voucher/reports", requireAdmin, async (req, res) => {
    try {
      const fromDate = String(req.query.from || "").trim();
      const toDate = String(req.query.to || "").trim();
      const report = await getVoucherSalesReport(fromDate, toDate);
      const settings = await getAdminFeeSettings();
      const expenses = filterVoucherExpensesByDateRange(
        normalizeVoucherExpenses(settings.voucherExpenses),
        fromDate,
        toDate,
      );
      const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const totalProfit = Number(report.summary?.totalProfit || 0);
      const securedReport = {
        ...report,
        expenses,
        summary: {
          ...report.summary,
          totalExpenses,
          netProfit: totalProfit - totalExpenses,
        },
        products: (report.products || []).map((product) => ({
          ...product,
          orders: (product.orders || []).map((order) => ({
            ...order,
            paymentProofUrl: resolveUploadAccessUrl(order.paymentProofUrl),
          })),
        })),
      };
      res.json({ report: securedReport });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal memuat laporan voucher." });
    }
  });

  app.delete("/api/admin/voucher/orders/:code", requireAdmin, async (req, res) => {
    const code = String(req.params.code || "").trim().toUpperCase();
    const deleted = await deleteVoucherOrder(code);
    if (!deleted) {
      res.status(404).json({ message: "Order voucher tidak ditemukan." });
      return;
    }
    await broadcastEvent("voucher_order_updated", code, { deleted: true, orderCode: code });
    res.json({ ok: true, orderCode: code });
  });

  app.post("/api/admin/voucher/expenses", requireAdmin, async (req, res) => {
    try {
      const expenseDate = String(req.body?.expenseDate || req.body?.date || "").trim().slice(0, 10);
      const amount = Math.round(Number(req.body?.amount || 0));
      const description = String(req.body?.description || req.body?.note || "").trim();
      if (!expenseDate) {
        res.status(400).json({ message: "Tanggal pengeluaran wajib diisi." });
        return;
      }
      if (amount <= 0) {
        res.status(400).json({ message: "Nominal pengeluaran harus lebih dari 0." });
        return;
      }
      const settings = await getAdminFeeSettings();
      const expenses = normalizeVoucherExpenses(settings.voucherExpenses);
      const entry = {
        id: createVoucherExpenseId(),
        expenseDate,
        amount,
        description,
      };
      expenses.push(entry);
      await saveAdminFeeSettings({ ...settings, voucherExpenses: expenses });
      res.json({ expense: entry, expenses });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal menyimpan pengeluaran." });
    }
  });

  app.delete("/api/admin/voucher/expenses/:id", requireAdmin, async (req, res) => {
    try {
      const expenseId = String(req.params.id || "").trim();
      if (!expenseId) {
        res.status(400).json({ message: "ID pengeluaran tidak valid." });
        return;
      }
      const settings = await getAdminFeeSettings();
      const expenses = normalizeVoucherExpenses(settings.voucherExpenses);
      const nextExpenses = expenses.filter((item) => item.id !== expenseId);
      if (nextExpenses.length === expenses.length) {
        res.status(404).json({ message: "Pengeluaran tidak ditemukan." });
        return;
      }
      await saveAdminFeeSettings({ ...settings, voucherExpenses: nextExpenses });
      res.json({ ok: true, expenses: nextExpenses });
    } catch (error) {
      res.status(400).json({ message: error.message || "Gagal menghapus pengeluaran." });
    }
  });
}
