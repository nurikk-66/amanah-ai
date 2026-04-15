"use client";

import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  url: string;
  batchId: string;
}

export function QrCard({ url, batchId }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR code */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0a1020] p-4 shadow-xl shadow-black/40">
        <QRCodeSVG
          value={url}
          size={160}
          level="H"
          fgColor="#00c67a"
          bgColor="#0a1020"
          includeMargin={false}
        />
      </div>

      {/* Batch ID chip */}
      <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2">
        <span className="font-mono text-sm font-bold text-white tracking-widest">{batchId}</span>
        <button
          onClick={copy}
          className="text-slate-500 hover:text-emerald-400 transition-colors"
          title="Copy batch ID"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>

      <p className="text-[10px] text-slate-600 text-center">
        Scan to verify product authenticity
      </p>
    </div>
  );
}
