import {
  DEFAULT_VOUCHER_PRODUCT_IMAGE,
  generateVoucherOrderCode,
  getProductReadyState,
  getVoucherBuyerDisplayName,
  getVoucherOrderStockQuantity,
  getVoucherStatusLabel,
  normalizeVoucherAccountPayload,
  parseVoucherAccountAccounts,
  applyVoucherBestsellerFlags,
  shouldRestoreVoucherProductStock,
} from "./voucher-utils.js";

import {
  decryptVoucherCredentialFields,
  encryptVoucherCredentialFields,
  migratePlaintextVoucherCredentials,
} from "./voucher-credentials-crypto.js";

async function restoreVoucherProductStock(queryOneFn, queryFn, productId, quantity) {
  const productRow = await queryOneFn("SELECT stock FROM voucher_products WHERE id = $1", [productId]);
  const stock = Number(productRow?.stock ?? -1);
  if (stock < 0) return;
  const now = new Date().toISOString();
  await queryFn(
    "UPDATE voucher_products SET stock = stock + $2, updated_at = $3 WHERE id = $1",
    [productId, quantity, now],
  );
}

export function createVoucherPgApi({ query, queryOne, queryRows, queryValue, getUserById, withTransaction }) {
  function mapProduct(row) {
    if (!row) return null;
    const product = {
      id: Number(row.id),
      name: row.name,
      description: row.description || "",
      price: Number(row.price || 0),
      costPrice: Number(row.cost_price || 0),
      costCurrency: String(row.cost_currency || "IDR").toUpperCase(),
      costAmountOriginal: Number(row.cost_amount_original ?? row.cost_price ?? 0),
      costFxRate: Number(row.cost_fx_rate || 1),
      costFxFetchedAt: row.cost_fx_fetched_at || "",
      imageUrl: row.image_url || "",
      imageName: row.image_name || "",
      readyMode: row.ready_mode === "schedule" ? "schedule" : "24h",
      readyStart: row.ready_start || "",
      readyEnd: row.ready_end || "",
      isActive: Boolean(row.is_active),
      stock: Number(row.stock ?? -1),
      sortOrder: Number(row.sort_order || 0),
      requiresAccountLogin: Boolean(row.requires_account_login),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    product.readyState = getProductReadyState(product);
    product.displayImage = product.imageUrl || DEFAULT_VOUCHER_PRODUCT_IMAGE;
    return product;
  }

  async function hydrateOrder(row) {
    if (!row) return null;
    const credentials = decryptVoucherCredentialFields(row);
    const credentialRow = {
      ...row,
      account_email: credentials.accountEmail,
      account_password: credentials.accountPassword,
      account_accounts: credentials.accountAccountsJson,
    };
    const product = mapProduct(await queryOne("SELECT * FROM voucher_products WHERE id = $1", [row.product_id]));
    const user = await getUserById(row.user_id);
    const messages = (await queryRows(
      "SELECT * FROM voucher_order_messages WHERE order_code = $1 ORDER BY id ASC",
      [row.order_code],
    )).map((item) => ({
      id: Number(item.id),
      senderUserId: item.sender_user_id || null,
      senderName: item.sender_name,
      senderRole: item.sender_role,
      text: item.message_text || "",
      attachmentName: item.attachment_name || "",
      attachmentUrl: item.attachment_url || "",
      attachmentType: item.attachment_type || "",
      time: item.created_at,
    }));
    return {
      id: Number(row.id),
      orderCode: row.order_code,
      productId: Number(row.product_id),
      userId: row.user_id,
      price: Number(row.price || 0),
      costPrice: Number(row.cost_price || 0),
      status: row.status,
      statusLabel: getVoucherStatusLabel(row.status),
      paymentProofUrl: row.payment_proof_url || "",
      paymentProofName: row.payment_proof_name || "",
      accountEmail: credentials.accountEmail,
      accountPassword: credentials.accountPassword,
      quantity: Math.max(1, Number(row.quantity || 1)),
      accountAccounts: parseVoucherAccountAccounts(credentialRow),
      accountRevisionRequested: Boolean(row.account_revision_requested),
      orderSource: row.order_source || "platform",
      buyerTelegram: row.buyer_telegram || "",
      disputeReason: row.dispute_reason || "",
      cancelReason: row.cancel_reason || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at || "",
      product,
      user: user ? {
        id: user.id,
        displayName: user.displayName,
        email: user.email || "",
        avatar: user.avatar || "",
        verified: Boolean(user.verified),
      } : null,
      messages,
    };
  }

  return {
    async getActiveVoucherProducts() {
      const salesRows = await queryRows(
        `
          SELECT product_id, COUNT(*)::int AS sales_count
          FROM voucher_orders
          WHERE status = 'completed'
          GROUP BY product_id
        `,
      );
      const salesByProductId = new Map(
        salesRows.map((row) => [Number(row.product_id), Number(row.sales_count || 0)]),
      );
      const rows = await queryRows(
        "SELECT * FROM voucher_products WHERE is_active = TRUE ORDER BY sort_order ASC, id DESC",
      );
      return applyVoucherBestsellerFlags(rows.map(mapProduct), salesByProductId);
    },
    async getAllVoucherProducts() {
      const rows = await queryRows("SELECT * FROM voucher_products ORDER BY sort_order ASC, id DESC");
      return rows.map(mapProduct);
    },
    async getVoucherProductById(productId) {
      return mapProduct(await queryOne("SELECT * FROM voucher_products WHERE id = $1", [productId]));
    },
    async createVoucherProduct(input = {}) {
      const now = new Date().toISOString();
      const row = await queryOne(
        `
          INSERT INTO voucher_products (
            name, description, price, cost_price, cost_currency, cost_amount_original, cost_fx_rate, cost_fx_fetched_at,
            image_url, image_name, ready_mode, ready_start, ready_end,
            is_active, stock, sort_order, requires_account_login, created_at, updated_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$18)
          RETURNING *
        `,
        [
          String(input.name || "").trim(),
          String(input.description || "").trim(),
          Math.max(0, Number(input.price || 0)),
          Math.max(0, Number(input.costPrice || 0)),
          String(input.costCurrency || "IDR").toUpperCase(),
          Number(input.costAmountOriginal ?? input.costPrice ?? 0),
          Number(input.costFxRate || 1),
          String(input.costFxFetchedAt || "").trim(),
          String(input.imageUrl || "").trim(),
          String(input.imageName || "").trim(),
          input.readyMode === "schedule" ? "schedule" : "24h",
          String(input.readyStart || "").trim(),
          String(input.readyEnd || "").trim(),
          input.isActive === false ? false : true,
          Number.isFinite(Number(input.stock)) ? Number(input.stock) : -1,
          Number(input.sortOrder || 0),
          input.requiresAccountLogin ? true : false,
          now,
        ],
      );
      return mapProduct(row);
    },
    async updateVoucherProduct(productId, input = {}) {
      const current = await this.getVoucherProductById(productId);
      if (!current) return null;
      const now = new Date().toISOString();
      const row = await queryOne(
        `
          UPDATE voucher_products
          SET name = $2, description = $3, price = $4, cost_price = $5, cost_currency = $6, cost_amount_original = $7,
              cost_fx_rate = $8, cost_fx_fetched_at = $9, image_url = $10, image_name = $11,
              ready_mode = $12, ready_start = $13, ready_end = $14, is_active = $15, stock = $16,
              sort_order = $17, requires_account_login = $18, updated_at = $19
          WHERE id = $1
          RETURNING *
        `,
        [
          productId,
          String(input.name ?? current.name).trim(),
          String(input.description ?? current.description).trim(),
          Math.max(0, Number(input.price ?? current.price)),
          Math.max(0, Number(input.costPrice ?? current.costPrice)),
          String(input.costCurrency ?? current.costCurrency ?? "IDR").toUpperCase(),
          Number(input.costAmountOriginal ?? current.costAmountOriginal ?? input.costPrice ?? current.costPrice ?? 0),
          Number(input.costFxRate ?? current.costFxRate ?? 1),
          String(input.costFxFetchedAt ?? current.costFxFetchedAt ?? "").trim(),
          String(input.imageUrl ?? current.imageUrl).trim(),
          String(input.imageName ?? current.imageName).trim(),
          (input.readyMode ?? current.readyMode) === "schedule" ? "schedule" : "24h",
          String(input.readyStart ?? current.readyStart).trim(),
          String(input.readyEnd ?? current.readyEnd).trim(),
          (input.isActive ?? current.isActive) ? true : false,
          Number.isFinite(Number(input.stock ?? current.stock)) ? Number(input.stock ?? current.stock) : -1,
          Number(input.sortOrder ?? current.sortOrder),
          (input.requiresAccountLogin ?? current.requiresAccountLogin) ? true : false,
          now,
        ],
      );
      return mapProduct(row);
    },
    async deleteVoucherProduct(productId) {
      const current = await this.getVoucherProductById(productId);
      if (!current) return false;
      await query("DELETE FROM voucher_products WHERE id = $1", [productId]);
      return true;
    },
    async deleteVoucherOrder(orderCode) {
      const normalized = String(orderCode || "").trim().toUpperCase();
      if (!normalized) return false;
      const current = await this.getVoucherOrderByCode(normalized);
      if (!current) return false;
      if (shouldRestoreVoucherProductStock(current)) {
        await restoreVoucherProductStock(queryOne, query, current.productId, getVoucherOrderStockQuantity(current));
      }
      await query("DELETE FROM voucher_order_messages WHERE order_code = $1", [normalized]);
      await query("DELETE FROM voucher_orders WHERE order_code = $1", [normalized]);
      return true;
    },
    async createVoucherOrder(userId, productId, options = {}) {
      const product = await this.getVoucherProductById(productId);
      if (!product || !product.isActive) throw new Error("Produk tidak ditemukan atau tidak aktif.");
      if (!product.readyState?.canPurchase) {
        throw new Error(product.readyState?.scheduleLabel
          ? `Produk belum ready. ${product.readyState.scheduleLabel}.`
          : "Produk belum tersedia untuk dibeli.");
      }

      const quantity = Math.max(1, Math.min(20, Number(options.quantity || 1)));
      const totalPrice = Number(product.price || 0) * quantity;
      const totalCost = Number(product.costPrice || 0) * quantity;

      const orderCode = await withTransaction(async (tx) => {
        const freshRow = await tx.queryOne("SELECT * FROM voucher_products WHERE id = $1", [productId]);
        if (!freshRow || !freshRow.is_active) throw new Error("Produk tidak ditemukan atau tidak aktif.");
        const stock = Number(freshRow.stock ?? -1);
        if (stock === 0) throw new Error("Stok produk habis.");
        if (stock > 0 && stock < quantity) {
          throw new Error(`Stok produk hanya tersedia ${stock} pcs.`);
        }

        const now = new Date().toISOString();
        if (stock > 0) {
          const stockUpdate = await tx.query(
            "UPDATE voucher_products SET stock = stock - $2, updated_at = $3 WHERE id = $1 AND stock >= $2",
            [productId, quantity, now],
          );
          if (!stockUpdate.rowCount) {
            throw new Error("Stok produk tidak mencukupi. Silakan coba lagi.");
          }
        }

        let code = generateVoucherOrderCode();
        while (await tx.queryValue("SELECT 1 FROM voucher_orders WHERE order_code = $1", [code])) {
          code = generateVoucherOrderCode();
        }

        await tx.query(
          `
            INSERT INTO voucher_orders (
              order_code, product_id, user_id, price, cost_price, quantity, status,
              account_email, account_password, account_accounts, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'awaiting_payment', '', '', '[]', $7, $7)
          `,
          [code, productId, userId, totalPrice, totalCost, quantity, now],
        );
        await tx.query(
          `
            INSERT INTO voucher_order_messages (
              order_code, sender_user_id, sender_name, sender_role, message_text, created_at
            ) VALUES ($1, NULL, 'Admin', 'admin', $2, $3)
          `,
          [code, `Order voucher ${product.name} (${quantity} pcs) dibuat. Silakan transfer sesuai total harga lalu upload bukti pembayaran.`, now],
        );
        return code;
      });

      return hydrateOrder(await queryOne("SELECT * FROM voucher_orders WHERE order_code = $1", [orderCode]));
    },
    async createManualVoucherOrder(adminUserId, payload = {}) {
      const productId = Number(payload.productId || 0);
      const product = await this.getVoucherProductById(productId);
      if (!product || !product.isActive) throw new Error("Produk tidak ditemukan atau tidak aktif.");

      const buyerTelegram = String(payload.buyerTelegram || "").trim().replace(/^@+/, "");
      if (!buyerTelegram) throw new Error("Username Telegram pembeli wajib diisi.");

      const accountEmail = String(payload.accountEmail || "").trim();
      const accountPassword = String(payload.accountPassword || "").trim();
      if (!accountEmail || !accountEmail.includes("@")) {
        throw new Error("Email akun wajib diisi dengan format yang benar.");
      }
      if (!accountPassword) throw new Error("Password akun wajib diisi.");

      const quantity = 1;
      const totalPrice = Number(product.price || 0) * quantity;
      const totalCost = Number(product.costPrice || 0) * quantity;
      const accounts = [{ email: accountEmail, password: accountPassword, label: "Akun 1" }];
      const encrypted = encryptVoucherCredentialFields({
        accountEmail,
        accountPassword,
        accountAccounts: accounts,
      });

      const orderCode = await withTransaction(async (tx) => {
        const freshRow = await tx.queryOne("SELECT * FROM voucher_products WHERE id = $1", [productId]);
        if (!freshRow || !freshRow.is_active) throw new Error("Produk tidak ditemukan atau tidak aktif.");
        const stock = Number(freshRow.stock ?? -1);
        if (stock === 0) throw new Error("Stok produk habis.");
        if (stock > 0 && stock < quantity) {
          throw new Error(`Stok produk hanya tersedia ${stock} pcs.`);
        }

        const now = new Date().toISOString();
        if (stock > 0) {
          const stockUpdate = await tx.query(
            "UPDATE voucher_products SET stock = stock - $2, updated_at = $3 WHERE id = $1 AND stock >= $2",
            [productId, quantity, now],
          );
          if (!stockUpdate.rowCount) {
            throw new Error("Stok produk tidak mencukupi. Silakan coba lagi.");
          }
        }

        let code = generateVoucherOrderCode();
        while (await tx.queryValue("SELECT 1 FROM voucher_orders WHERE order_code = $1", [code])) {
          code = generateVoucherOrderCode();
        }

        await tx.query(
          `
            INSERT INTO voucher_orders (
              order_code, product_id, user_id, price, cost_price, quantity, status,
              account_email, account_password, account_accounts, order_source, buyer_telegram,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'manual_pending', $7, $8, $9, 'manual', $10, $11, $11)
          `,
          [
            code,
            productId,
            adminUserId,
            totalPrice,
            totalCost,
            quantity,
            encrypted.account_email,
            encrypted.account_password,
            encrypted.account_accounts,
            buyerTelegram,
            now,
          ],
        );
        await tx.query(
          `
            INSERT INTO voucher_order_messages (
              order_code, sender_user_id, sender_name, sender_role, message_text, created_at
            ) VALUES ($1, NULL, 'Admin', 'admin', $2, $3)
          `,
          [code, `Order manual @${buyerTelegram} — ${product.name}. Menunggu proses admin.`, now],
        );
        return code;
      });

      return hydrateOrder(await queryOne("SELECT * FROM voucher_orders WHERE order_code = $1", [orderCode]));
    },
    async updateVoucherOrderAccounts(orderCode, accounts = []) {
      const current = await this.getVoucherOrderByCode(orderCode);
      if (!current) return null;
      if (!current.product?.requiresAccountLogin) {
        throw new Error("Produk ini tidak membutuhkan data akun subscription.");
      }
      const normalized = normalizeVoucherAccountPayload(accounts, Math.max(1, Number(current.quantity || 1)));
      const now = new Date().toISOString();
      const first = normalized[0] || { email: "", password: "" };
      const encrypted = encryptVoucherCredentialFields({
        accountEmail: first.email,
        accountPassword: first.password,
        accountAccounts: normalized,
      });
      await query(
        `
          UPDATE voucher_orders
          SET account_accounts = $2, account_email = $3, account_password = $4,
              account_revision_requested = FALSE, updated_at = $5
          WHERE order_code = $1
        `,
        [orderCode, encrypted.account_accounts, encrypted.account_email, encrypted.account_password, now],
      );
      return this.getVoucherOrderByCode(orderCode);
    },
    async getVoucherOrderByCode(orderCode) {
      return hydrateOrder(await queryOne("SELECT * FROM voucher_orders WHERE order_code = $1", [String(orderCode || "").toUpperCase()]));
    },
    async getVoucherOrdersByUserId(userId) {
      const rows = await queryRows(
        `
          SELECT * FROM voucher_orders
          WHERE user_id = $1 AND COALESCE(order_source, 'platform') != 'manual'
          ORDER BY created_at DESC
        `,
        [userId],
      );
      const orders = [];
      for (const row of rows) orders.push(await hydrateOrder(row));
      return orders;
    },
    async getAllVoucherOrders() {
      const rows = await queryRows("SELECT * FROM voucher_orders ORDER BY created_at DESC");
      const orders = [];
      for (const row of rows) orders.push(await hydrateOrder(row));
      return orders;
    },
    async updateVoucherOrderFields(orderCode, fields = {}) {
      const current = await this.getVoucherOrderByCode(orderCode);
      if (!current) return null;
      const now = new Date().toISOString();
      const nextStatus = fields.status ?? current.status;
      if (nextStatus === "cancelled" && current.status !== "cancelled" && shouldRestoreVoucherProductStock(current)) {
        await restoreVoucherProductStock(queryOne, query, current.productId, getVoucherOrderStockQuantity(current));
      }
      await query(
        `
          UPDATE voucher_orders
          SET status = $2, payment_proof_url = $3, payment_proof_name = $4,
              dispute_reason = $5, cancel_reason = $6, account_revision_requested = $7,
              completed_at = $8, updated_at = $9
          WHERE order_code = $1
        `,
        [
          orderCode,
          nextStatus,
          fields.paymentProofUrl ?? current.paymentProofUrl,
          fields.paymentProofName ?? current.paymentProofName,
          fields.disputeReason ?? current.disputeReason,
          fields.cancelReason ?? current.cancelReason,
          fields.accountRevisionRequested !== undefined
            ? Boolean(fields.accountRevisionRequested)
            : Boolean(current.accountRevisionRequested),
          fields.completedAt !== undefined ? fields.completedAt : (current.completedAt || null),
          now,
        ],
      );
      return this.getVoucherOrderByCode(orderCode);
    },
    async addVoucherOrderMessage(orderCode, senderUserId, senderName, senderRole, messageText, attachment = {}) {
      const current = await this.getVoucherOrderByCode(orderCode);
      if (!current) return null;
      const now = new Date().toISOString();
      await query(
        `
          INSERT INTO voucher_order_messages (
            order_code, sender_user_id, sender_name, sender_role, message_text,
            attachment_name, attachment_url, attachment_type, created_at
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          orderCode,
          senderUserId || null,
          senderName,
          senderRole,
          messageText || "",
          attachment.attachmentName || "",
          attachment.attachmentUrl || "",
          attachment.attachmentType || "",
          now,
        ],
      );
      await query("UPDATE voucher_orders SET updated_at = $2 WHERE order_code = $1", [orderCode, now]);
      return this.getVoucherOrderByCode(orderCode);
    },
    async getVoucherOrderOwnerUserId(orderCode) {
      const row = await queryOne("SELECT user_id FROM voucher_orders WHERE order_code = $1", [orderCode]);
      return row?.user_id || null;
    },
    async getVoucherSalesReport(fromDate = "", toDate = "") {
      const from = String(fromDate || "").trim();
      const to = String(toDate || "").trim();
      if (!from || !to) {
        throw new Error("Rentang tanggal wajib diisi.");
      }
      const rows = await queryRows(
        `
          SELECT * FROM voucher_orders
          WHERE status = 'completed'
            AND COALESCE(completed_at, updated_at)::date >= $1::date
            AND COALESCE(completed_at, updated_at)::date <= $2::date
          ORDER BY COALESCE(completed_at, updated_at) DESC
        `,
        [from, to],
      );
      const productMap = new Map();
      let summary = { totalOrders: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
      for (const row of rows) {
        const order = await hydrateOrder(row);
        const sellPrice = Number(order.price || 0);
        const costPrice = Number(order.costPrice || order.product?.costPrice || 0);
        const profit = sellPrice - costPrice;
        const key = order.productId;
        if (!productMap.has(key)) {
          productMap.set(key, {
            productId: order.productId,
            productName: order.product?.name || `Produk #${order.productId}`,
            imageUrl: order.product?.displayImage || "",
            orderCount: 0,
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            orders: [],
          });
        }
        const group = productMap.get(key);
        group.orderCount += 1;
        group.totalRevenue += sellPrice;
        group.totalCost += costPrice;
        group.totalProfit += profit;
        group.orders.push({
          orderCode: order.orderCode,
          userName: getVoucherBuyerDisplayName(order),
          orderSource: order.orderSource || "platform",
          paymentProofUrl: order.paymentProofUrl || "",
          paymentProofName: order.paymentProofName || "",
          sellPrice,
          costPrice,
          profit,
          completedAt: order.completedAt || order.updatedAt,
        });
        summary = {
          totalOrders: summary.totalOrders + 1,
          totalRevenue: summary.totalRevenue + sellPrice,
          totalCost: summary.totalCost + costPrice,
          totalProfit: summary.totalProfit + profit,
        };
      }
      return {
        fromDate: from,
        toDate: to,
        summary,
        products: Array.from(productMap.values()).sort((a, b) => b.totalProfit - a.totalProfit),
      };
    },
  };
}
