"use client";

import { useEffect } from "react";

export function ProfileClient() {
  useEffect(() => {
    window.location.replace("/?returnTo=profile");
  }, []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6">
      <p className="text-sm text-white/60">Mengalihkan ke halaman profil...</p>
    </main>
  );
}
