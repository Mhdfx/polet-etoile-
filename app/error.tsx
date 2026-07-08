"use client";

export default function Error() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f6f5] px-6 text-[#1f241f]">
      <section className="w-full max-w-md rounded-md border border-[#cfd8d3] bg-white p-6">
        <p className="text-sm font-semibold uppercase text-[#2f6f57]">500</p>
        <h1 className="mt-3 text-2xl font-semibold">Erreur serveur</h1>
        <p className="mt-3 text-sm leading-6 text-[#596052]">
          Une erreur est survenue. Les details techniques restent cote serveur.
        </p>
      </section>
    </main>
  );
}
