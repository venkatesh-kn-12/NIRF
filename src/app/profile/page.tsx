"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ShieldCheck,
  Mail,
  Building,
  Phone,
  Calendar,
  Award,
  Download,
  KeyRound,
  CheckCircle2,
  Clock,
  ChevronRight,
  ArrowLeft,
  User,
  FileCheck,
  BookOpen,
  Edit2,
  ExternalLink,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight">MCA NIRF Assist</div>
              <div className="text-[11px] text-slate-500">
                Department of Computer Applications • Faculty Profile
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Breadcrumb & Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hover:text-[#1D4ED8] cursor-pointer" onClick={() => router.push("/dashboard")}>
                Compliance &amp; System
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-900 font-semibold">My Profile</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Institutional Profile</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                SSO Verified (Google Workspace)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Last active: Today, 10:14 AM IST
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition">
              <Download className="h-3.5 w-3.5 text-slate-500" />
              <span>Export Profile Audit (PDF)</span>
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1D4ED8] hover:bg-blue-800 text-white text-xs font-semibold shadow-sm transition">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Re-Authenticate SSO</span>
            </button>
          </div>
        </div>

        {/* Main Grid Layout: Sticky Left Profile Rail + Right Extensive Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Sticky Profile & ID Card */}
          <div className="lg:col-span-4 flex flex-col gap-4 sticky top-20">
            {/* Primary Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-[#1D4ED8] text-[11px] font-bold border border-blue-200">
                  AY 2025-26
                </span>
              </div>

              {/* Avatar */}
              <div className="mt-2 mb-4 h-24 w-24 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#1D4ED8] text-white flex items-center justify-center font-bold text-3xl shadow-md ring-4 ring-slate-100">
                RK
              </div>

              <h2 className="text-base font-bold text-slate-900 tracking-tight">Prof. Rajesh Kumar</h2>
              <span className="text-xs text-slate-500 mt-0.5">EMP-MCA-0104</span>

              {/* Role Badge */}
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#1D4ED8] text-xs font-bold border border-blue-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Dept Admin &amp; NIRF Coordinator</span>
              </div>

              {/* Academic Affiliation Details */}
              <div className="w-full mt-4 pt-4 flex flex-col gap-2.5 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-slate-400" /> Dept:
                  </span>
                  <span className="font-semibold text-slate-900 truncate ml-2">
                    Computer Applications (MCA)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> Email:
                  </span>
                  <span className="font-semibold text-[#1D4ED8] ml-2 truncate">
                    r.kumar@engg.edu
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" /> Office / Lab:
                  </span>
                  <span className="font-medium text-slate-800 ml-2">Ext. 4209 • Lab 302</span>
                </div>
              </div>

              {/* NIRF Mandate Summary */}
              <div className="w-full mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    NIRF Delegation Mandate
                  </span>
                  <span className="text-[11px] text-emerald-700 font-bold">Active • Level 3</span>
                </div>
                <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                  Authorized sign-off signatory for parameters: <strong>TLR</strong>, <strong>RP</strong>, <strong>GO</strong>, <strong>OI</strong> &amp; <strong>PR</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Profile Content Panels */}
          <div className="lg:col-span-8 space-y-6">
            {/* Panel 1: Personal & Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Personal &amp; Contact Information
                </h3>
                <span className="text-xs text-slate-400">Institutional Record</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">Full Name</div>
                  <div className="font-semibold text-slate-900">Prof. Rajesh Kumar Sharma</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">Designation</div>
                  <div className="font-semibold text-slate-900">Professor &amp; Head of Department</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">Date of Joining</div>
                  <div className="font-semibold text-slate-900">14 July 2012 (14 Years Experience)</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">Employment Type</div>
                  <div className="font-semibold text-emerald-700">Permanent / Regular Cadre</div>
                </div>
              </div>
            </div>

            {/* Panel 2: Academic & Research Credentials */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Academic &amp; Research Credentials (NIRF RP)
                </h3>
                <span className="text-xs text-[#1D4ED8] font-semibold">Indexed Identifiers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">Highest Qualification</div>
                  <div className="font-semibold text-slate-900">Ph.D. in Computer Science (2016)</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">Scopus Author ID</div>
                  <div className="font-mono font-semibold text-[#1D4ED8] flex items-center gap-1">
                    <span>57201948200</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">ORCID Identifier</div>
                  <div className="font-mono font-semibold text-[#1D4ED8] flex items-center gap-1">
                    <span>0000-0002-1825-0091</span>
                    <ExternalLink className="h-3 w-3" />
                  </div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-slate-500 mb-0.5">Google Scholar H-Index</div>
                  <div className="font-semibold text-slate-900">14 (38 Publications, 420 Citations)</div>
                </div>
              </div>
            </div>

            {/* Panel 3: Administrative Access & NIRF Scope */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Administrative Access &amp; NIRF Scope
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Authorized
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Full access to Department of Computer Applications NIRF data models</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Authority to approve, reject, and request revisions on verification cases</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Sign-off signatory for Data Capturing System (DCS) reports</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Full audit log inspection and export authority</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

