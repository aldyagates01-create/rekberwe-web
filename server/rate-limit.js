const buckets = new Map();

export function createRateLimiter({ windowMs = 60_000, max = 30, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req);
    if (!key) {
      next();
      return;
    }
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.status(429).json({ message: "Terlalu banyak permintaan. Coba lagi nanti." });
      return;
    }
    next();
  };
}

export function getRequestRateLimitKey(req, suffix = "") {
  const ip = String(req.headers["x-forwarded-for"] || req.ip || "unknown")
    .split(",")[0]
    .trim();
  const userId = req.session?.user?.id || "";
  return `${suffix}:${userId || ip}`;
}
