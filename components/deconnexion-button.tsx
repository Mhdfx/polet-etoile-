"use client";

import { useRouter } from "next/navigation";
import { journaliserDeconnexion } from "@/app/auth/actions";
import { signOut } from "@/lib/auth-client";

export function DeconnexionButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="rounded-full bg-[#0f66d5] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0d58b8] disabled:cursor-not-allowed disabled:opacity-60"
      onClick={async () => {
        await journaliserDeconnexion();
        await signOut();
        router.push("/connexion");
        router.refresh();
      }}
    >
      Deconnexion
    </button>
  );
}
