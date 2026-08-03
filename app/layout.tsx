import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ChunkReloadGuard } from "@/components/chunk-reload-guard";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coq Plus",
  description: "Application de gestion commerciale Coq Plus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('coq-plus-theme');var v=['bleu','rouge','vert','ardoise','sombre'].includes(t)?t:'bleu';var r=document.documentElement;r.classList.toggle('dark',v==='sombre');r.dataset.palette=v==='sombre'?'bleu':v;r.style.colorScheme=v==='sombre'?'dark':'light'}catch(e){}})();`,
          }}
        />
      </head>
      <body className="antialiased">
        <ChunkReloadGuard />
        {children}
      </body>
    </html>
  );
}
