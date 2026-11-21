import assert from "node:assert/strict";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

import { POST as setupAdminPost } from "../src/app/api/setup/admin/route";
import { POST as createUserPost } from "../src/app/api/users/route";
import { POST as loginPost } from "../src/app/api/auth/login/route";

import { GET as studentsGet, POST as studentsPost } from "../src/app/api/students/route";
import { GET as studentIdGet, PUT as studentIdPut, DELETE as studentIdDelete } from "../src/app/api/students/[id]/route";
import { POST as studentVerifyPost } from "../src/app/api/students/[id]/verify/route";

import { GET as facultyGet, POST as facultyPost } from "../src/app/api/faculty/route";
import { GET as facultyIdGet, PUT as facultyIdPut, DELETE as facultyIdDelete } from "../src/app/api/faculty/[id]/route";
import { POST as facultyVerifyPost } from "../src/app/api/faculty/[id]/verify/route";

import { POST as uploadEvidencePost } from "../src/app/api/upload/evidence/route";
import { AuditLog } from "../src/models/AuditLog";
import { Student } from "../src/models/Student";
import { Faculty } from "../src/models/Faculty";

const TEST_DB_URI = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/mca_nirf_test";

console.log("------------------------------------------------------------------");
console.log("MCA NIRF Assist — Student & Faculty API, RBAC & Evidence Tests");
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
  let reviewerCookie: string | undefined;
  let viewerCookie: string | undefined;

  // 1. Setup Admin
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
  }

  // 2. Create Contributor, Reviewer, Viewer users
  {
    const users = [
      { name: "Dr. Faculty", email: "faculty@dsatm.edu.in", password: "User@Pass123!", role: "FACULTY_CONTRIBUTOR", employeeId: "FAC-01" },
      { name: "Prof. Reviewer", email: "reviewer@dsatm.edu.in", password: "User@Pass123!", role: "REVIEWER", employeeId: "REV-01" },
      { name: "Observer Viewer", email: "viewer@dsatm.edu.in", password: "User@Pass123!", role: "VIEWER", studentId: "STU-01" },
    ];
    for (const u of users) {
      const req = createReq("http://localhost:3000/api/users", "POST", u, adminCookie);
      const res = await createUserPost(req);
      assert.equal(res.status, 201);
    }

    // Login each to obtain cookies
    const login = async (email: string) => {
      const req = createReq("http://localhost:3000/api/auth/login", "POST", { email, password: "User@Pass123!" });
      const res = await loginPost(req);
      return extractCookie(res);
    };
    contributorCookie = await login("faculty@dsatm.edu.in");
    reviewerCookie = await login("reviewer@dsatm.edu.in");
    viewerCookie = await login("viewer@dsatm.edu.in");
  }

  console.log("✓ Test users & sessions created");

  let createdStudentId = "";

  // 3. Contributor creates a Student record
  console.log("\n--- STEP 1: Student Creation by FACULTY_CONTRIBUTOR ---");
  {
    const req = createReq("http://localhost:3000/api/students", "POST", {
      studentId: "MCA2024001",
      prn: "1DS24MC001",
      name: "Aarav Sharma",
      email: "aarav.mca@dsatm.edu.in",
      programme: "Master of Computer Applications",
      batch: "2024-2026",
      admissionYear: 2024,
      gender: "MALE",
      dateOfBirth: "2001-05-15",
      domicileState: "Karnataka",
      domicileType: "HOME_STATE",
      category: "General",
      currentStatus: "ACTIVE",
      currentSemester: 1,
      expectedGraduationYear: 2026,
      department: "MCA",
      academicYear: "2024-25",
    }, contributorCookie);

    const res = await studentsPost(req);
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.status, "DRAFT");
    createdStudentId = data.data._id;
    console.log("✓ Student record created with DRAFT status");
  }

  // 4. Viewer cannot view unapproved student record
  console.log("\n--- STEP 2: Viewer Scoping (Rule 7 & 8) ---");
  {
    const req = createReq("http://localhost:3000/api/students", "GET", undefined, viewerCookie);
    const res = await studentsGet(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.total, 0, "Viewer must NOT see DRAFT records");
    console.log("✓ Viewer cannot see unapproved DRAFT records");
  }

  // 5. Reviewer approves student record
  console.log("\n--- STEP 3: Reviewer Approves Student ---");
  {
    const req = createReq(`http://localhost:3000/api/students/${createdStudentId}/verify`, "POST", {
      decision: "APPROVE",
      comment: "All admission credentials verified against Karnataka PGCET allotment letter.",
    }, reviewerCookie);

    const res = await studentVerifyPost(req, { params: Promise.resolve({ id: createdStudentId }) });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.status, "APPROVED");
    console.log("✓ Reviewer successfully approved student record");
  }

  // 6. Viewer CAN now view approved student record
  {
    const req = createReq("http://localhost:3000/api/students", "GET", undefined, viewerCookie);
    const res = await studentsGet(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.total, 1, "Viewer must see APPROVED record");
    console.log("✓ Viewer now sees approved student record");
  }

  // 7. Attach Evidence to Student
  console.log("\n--- STEP 4: Attach Evidence Document ---");
  {
    const req = createReq("http://localhost:3000/api/upload/evidence", "POST", {
      recordId: createdStudentId,
      recordType: "Student",
      fileName: "PGCET_Allotment_Aarav.pdf",
      fileUrl: "https://dsatm.edu.in/evidence/pgcet_aarav.pdf",
      fileSize: 204800,
    }, contributorCookie);

    const res = await uploadEvidencePost(req);
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);

    const updatedDoc = await Student.findById(createdStudentId);
    assert.equal(updatedDoc?.evidenceReferences.length, 1);
    assert.equal(updatedDoc?.evidenceReferences[0].fileName, "PGCET_Allotment_Aarav.pdf");
    console.log("✓ Evidence successfully attached to Student record");
  }

  let createdFacultyId = "";

  // 8. Contributor creates a Faculty record
  console.log("\n--- STEP 5: Faculty Creation by Contributor ---");
  {
    const req = createReq("http://localhost:3000/api/faculty", "POST", {
      facultyId: "FAC-MCA-001",
      name: "Dr. Sunita Rao",
      email: "sunita.rao@dsatm.edu.in",
      designation: "Associate Professor",
      employmentType: "PERMANENT",
      department: "MCA",
      highestQualification: "Ph.D. Computer Applications",
      phdStatus: "AWARDED",
      phdAwardYear: 2018,
      experienceYears: 12,
      joiningDate: "2015-08-01",
      researchDomains: ["Machine Learning", "Cloud Computing"],
      academicYear: "2024-25",
    }, contributorCookie);

    const res = await facultyPost(req);
    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.data.status, "DRAFT");
    createdFacultyId = data.data._id;
    console.log("✓ Faculty record created with DRAFT status");
  }

  // 9. Reviewer requests correction on Faculty record
  console.log("\n--- STEP 6: Reviewer Requests Correction ---");
  {
    const req = createReq(`http://localhost:3000/api/faculty/${createdFacultyId}/verify`, "POST", {
      decision: "REQUEST_CORRECTION",
      comment: "Please attach PhD degree certificate copy.",
    }, reviewerCookie);

    const res = await facultyVerifyPost(req, { params: Promise.resolve({ id: createdFacultyId }) });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.data.status, "CORRECTION_REQUESTED");
    assert.equal(data.data.reviewerComment, "Please attach PhD degree certificate copy.");
    console.log("✓ Correction requested successfully logged on Faculty record");
  }

  // 10. AuditLog Verification
  console.log("\n--- STEP 7: Comprehensive AuditLog Verification ---");
  {
    const audits = await AuditLog.find().sort({ createdAt: -1 });
    const actions = audits.map((a) => a.action);
    console.log("Logged Audit Actions:", actions);

    assert.ok(actions.includes("record creation"), "AuditLog must contain 'record creation'");
    assert.ok(actions.includes("approval"), "AuditLog must contain 'approval'");
    assert.ok(actions.includes("correction request"), "AuditLog must contain 'correction request'");
    assert.ok(actions.includes("file upload"), "AuditLog must contain 'file upload'");
    console.log("✓ All mutation audit events verified in AuditLog");
  }

  console.log("\n==================================================================");
  console.log("All Student & Faculty API, RBAC & Evidence Tests Passed Cleanly!");
  console.log("==================================================================");
}

run().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});

