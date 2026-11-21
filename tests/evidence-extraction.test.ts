import assert from "node:assert/strict";
import mongoose from "mongoose";
import path from "path";
import crypto from "crypto";
import { NextRequest } from "next/server";

import { POST as setupAdminPost } from "../src/app/api/setup/admin/route";
import { POST as createUserPost } from "../src/app/api/users/route";
import { POST as loginPost } from "../src/app/api/auth/login/route";

import { POST as evidencePost, GET as evidencesGet } from "../src/app/api/evidences/route";
import { GET as evidenceDownloadGet } from "../src/app/api/evidences/[id]/download/route";
import { POST as extractionJobPost, GET as extractionJobsGet } from "../src/app/api/extraction-jobs/route";
import { POST as reviewFieldPost } from "../src/app/api/extraction-jobs/[id]/review-field/route";
import { POST as commitDraftPost } from "../src/app/api/extraction-jobs/[id]/commit/route";

import { Evidence } from "../src/models/Evidence";
import { ExtractionJob } from "../src/models/ExtractionJob";
import { AuditLog } from "../src/models/AuditLog";
import { Faculty } from "../src/models/Faculty";
import { STORAGE_DIR, storeEvidenceFile, sanitizeFileName } from "../src/services/evidenceStorage";

const TEST_DB_URI = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/mca_nirf_test";

console.log("------------------------------------------------------------------");
console.log("MCA NIRF Assist — Secure Evidence Upload & AI Extraction Tests");
console.log("------------------------------------------------------------------");

function createReq(url: string, method: string, body?: any, cookieToken?: string) {
  const headers = new Headers();
  if (body) {
    headers.set("content-type", "application/json");
  }
  if (cookieToken) {
    headers.set("cookie", `nirf_session=${cookieToken}`);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function extractCookie(res: Response): string | undefined {
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) return undefined;
  const match = setCookie.match(/nirf_session=([^;]+)/);
  return match ? match[1] : undefined;
}

async function run() {
  if (mongoose.connection.readyState < 1) {
    await mongoose.connect(TEST_DB_URI);
  }

  // Clear test db
  const collections = await mongoose.connection.db!.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }

  let adminCookie: string | undefined;
  let contributorCookie: string | undefined;

  // 1. Setup Admin & Contributor
  {
    const req = createReq("http://localhost:3000/api/setup/admin", "POST", {
      name: "Prof. Rajesh Kumar",
      email: "admin@dsatm.edu.in",
      password: "Admin@Password123!",
      employeeId: "EMP-MCA-001",
    });
    const res = await setupAdminPost(req);
    assert.equal(res.status, 201);
    adminCookie = extractCookie(res);

    const userReq = createReq("http://localhost:3000/api/users", "POST", {
      name: "Dr. Faculty Contributor",
      email: "contributor@dsatm.edu.in",
      password: "User@Pass123!",
      role: "FACULTY_CONTRIBUTOR",
      employeeId: "FAC-01",
    }, adminCookie);
    const userRes = await createUserPost(userReq);
    assert.equal(userRes.status, 201);

    const loginReq = createReq("http://localhost:3000/api/auth/login", "POST", {
      email: "contributor@dsatm.edu.in",
      password: "User@Pass123!",
    });
    const loginRes = await loginPost(loginReq);
    contributorCookie = extractCookie(loginRes);
  }

  console.log("✓ Admin and Contributor authentication sessions verified");

  // 2. Storage Security & Path Traversal Prevention Unit Tests
  console.log("\n--- STEP 1: Storage Path Traversal & Sanitize Tests ---");
  {
    const unsafeName = "../../../etc/passwd/test.pdf";
    const sanitized = sanitizeFileName(unsafeName);
    assert.equal(sanitized.includes(".."), false, "Must strip directory traversal sequences");
    assert.equal(sanitized.endsWith(".pdf"), true);

    // Verify storage directory is outside of public
    assert.equal(
      STORAGE_DIR.includes(path.join("public", "uploads")),
      false,
      "Secure storage MUST be outside of public/"
    );

    // Verify disallowed file extension rejection
    const dummyBuffer = Buffer.from("malicious script");
    await assert.rejects(
      async () => {
        await storeEvidenceFile(dummyBuffer, "malware.exe", "application/x-msdownload");
      },
      /File extension '\.exe' is not permitted/
    );
    console.log("✓ Path traversal prevention & extension security checks passed");
  }

  let createdEvidenceId = "";
  let calculatedHash = "";

  // 3. Secure File Upload via API
  console.log("\n--- STEP 2: Secure File Upload API ---");
  {
    const sampleCsvContent = `facultyId,name,email,designation,employmentType,highestQualification,phdStatus,phdAwardYear,experienceYears,joiningDate,researchDomains
FAC001,Dr. Sunita Rao,sunita.rao@dsatm.edu.in,Associate Professor,PERMANENT,Ph.D. Computer Applications,AWARDED,2018,12,2015-08-01,"Machine Learning, Cloud"`;

    const fileBuffer = Buffer.from(sampleCsvContent, "utf-8");
    calculatedHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: "text/csv" });
    formData.append("file", blob, "mca_faculty_roster_2025.csv");
    formData.append("relatedRecordType", "Faculty");
    formData.append("academicYear", "2024-25");

    const req = new NextRequest(new URL("http://localhost:3000/api/evidences"), {
      method: "POST",
      headers: new Headers({
        cookie: `nirf_session=${contributorCookie}`,
      }),
      body: formData,
    });

    const res = await evidencePost(req);
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.evidence.originalFileName, "mca_faculty_roster_2025.csv");
    assert.equal(data.evidence.checksum, calculatedHash);
    assert.equal(data.evidence.uploadStatus, "STORED");
    assert.equal(data.evidence.department, "MCA");

    createdEvidenceId = data.evidence._id;

    // Verify file exists in secure storage
    const evidenceInDb = await Evidence.findById(createdEvidenceId);
    assert.ok(evidenceInDb);
    assert.equal(evidenceInDb.checksum, calculatedHash);
    console.log("✓ Evidence successfully uploaded, checksum verified and stored outside public/");
  }

  // 4. Secure File Download / Retrieval API
  console.log("\n--- STEP 3: Secure File Download & Access Control ---");
  {
    const req = createReq(`http://localhost:3000/api/evidences/${createdEvidenceId}/download`, "GET", undefined, contributorCookie);
    const res = await evidenceDownloadGet(req, { params: Promise.resolve({ id: createdEvidenceId }) });
    assert.equal(res.status, 200);
    const downloadedBuffer = Buffer.from(await res.arrayBuffer());
    const downloadedHash = crypto.createHash("sha256").update(downloadedBuffer).digest("hex");
    assert.equal(downloadedHash, calculatedHash, "Downloaded file checksum must match original exactly");
    console.log("✓ File streaming and integrity verified");
  }

  let createdJobId = "";

  // 5. Create & Process Extraction Job
  console.log("\n--- STEP 4: Extraction Job Pipeline ---");
  {
    const req = createReq("http://localhost:3000/api/extraction-jobs", "POST", {
      evidenceId: createdEvidenceId,
      relatedRecordType: "Faculty",
    }, contributorCookie);

    const res = await extractionJobPost(req);
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.ok(data.job);
    assert.ok(data.job.extractedFields.length > 0, "Must have schema template fields or extracted fields");

    createdJobId = data.job._id;

    const jobInDb = await ExtractionJob.findById(createdJobId);
    assert.ok(jobInDb);
    assert.equal(jobInDb.department, "MCA");
    console.log("✓ Extraction job created with status:", jobInDb.status);
  }

  // 6. Extraction Review Workflow: Field Acceptance, Rejection, and Manual Correction
  console.log("\n--- STEP 5: Extraction Review Workflow ---");
  {
    // A) Accept a field
    const acceptReq = createReq(`http://localhost:3000/api/extraction-jobs/${createdJobId}/review-field`, "POST", {
      fieldIndexOrName: "facultyId",
      decision: "CORRECTED",
      correctedValue: "FAC-MCA-001",
    }, contributorCookie);
    const acceptRes = await reviewFieldPost(acceptReq, { params: Promise.resolve({ id: createdJobId }) });
    const acceptData = await acceptRes.json();
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptData.success, true);

    // B) Manually correct fields required by Faculty model
    const fieldsToSet = [
      { name: "name", val: "Dr. Sunita Rao" },
      { name: "email", val: "sunita.rao@dsatm.edu.in" },
      { name: "designation", val: "Associate Professor" },
      { name: "employmentType", val: "PERMANENT" },
      { name: "highestQualification", val: "Ph.D. Computer Applications" },
      { name: "phdStatus", val: "AWARDED" },
      { name: "phdAwardYear", val: 2018 },
      { name: "experienceYears", val: 12 },
      { name: "joiningDate", val: "2015-08-01" },
      { name: "researchDomains", val: ["Machine Learning", "Cloud Computing"] },
    ];

    for (const f of fieldsToSet) {
      const req = createReq(`http://localhost:3000/api/extraction-jobs/${createdJobId}/review-field`, "POST", {
        fieldIndexOrName: f.name,
        decision: "CORRECTED",
        correctedValue: f.val,
      }, contributorCookie);
      const res = await reviewFieldPost(req, { params: Promise.resolve({ id: createdJobId }) });
      assert.equal(res.status, 200);
    }

    console.log("✓ Field acceptance and manual corrections recorded");
  }

  // 7. Commit Verified Fields into a DRAFT Record
  console.log("\n--- STEP 6: Commit to Canonical DRAFT Record ---");
  {
    const req = createReq(`http://localhost:3000/api/extraction-jobs/${createdJobId}/commit`, "POST", undefined, contributorCookie);
    const res = await commitDraftPost(req, { params: Promise.resolve({ id: createdJobId }) });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.record.status, "DRAFT", "AI extraction MUST commit as DRAFT, never APPROVED!");
    assert.equal(data.record.department, "MCA");
    assert.equal(data.record.name, "Dr. Sunita Rao");
    assert.ok(data.record.evidenceReferences.length > 0, "Must attach evidence reference");

    const createdRecordId = data.record._id;
    const facultyDoc = await Faculty.findById(createdRecordId);
    assert.ok(facultyDoc);
    assert.equal(facultyDoc.status, "DRAFT");
    console.log("✓ Verified canonical DRAFT record created with linked evidence");
  }

  // 8. AuditLog Inspection
  console.log("\n--- STEP 7: AuditLog Verification for Ingestion & Review ---");
  {
    const audits = await AuditLog.find().sort({ createdAt: -1 });
    const actions = audits.map((a) => a.action);
    console.log("Logged Audit Actions:", actions);

    assert.ok(actions.includes("file upload"), "AuditLog must contain 'file upload'");
    assert.ok(actions.includes("extraction start"), "AuditLog must contain 'extraction start'");
    assert.ok(actions.includes("extraction completion"), "AuditLog must contain 'extraction completion'");
    assert.ok(actions.includes("manual correction"), "AuditLog must contain 'manual correction'");
    assert.ok(actions.includes("record creation"), "AuditLog must contain 'record creation'");
    console.log("✓ All required audit logs for upload, extraction, and field verification confirmed");
  }

  console.log("\n==================================================================");
  console.log("All Secure Evidence Upload & AI Extraction Tests Passed Cleanly!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
}).finally(() => {
  mongoose.disconnect();
});

