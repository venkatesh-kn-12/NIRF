"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, BarChart3, ArrowRight } from "lucide-react";

export default function VerificationPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
        <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={28} />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Approval Queue Retired
        </h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          MCA NIRF Assist is operating as a <strong>Department Score Simulator</strong>.
          Contributor and Admin records are saved directly as active (<strong>RECORDED</strong>) and are immediately computable without a reviewer gate.
        </p>

        <div className="space-y-3">
          <Link
            href="/metrics"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            <BarChart3 size={16} />
            Run Department Simulator
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
