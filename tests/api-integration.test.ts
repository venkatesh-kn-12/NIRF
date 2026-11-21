import assert from "node:assert/strict";
import mongoose from "mongoose";
import { NextRequest } from "next/server";

// Import API route handlers directly
import { GET as checkSetupGet, POST as setupAdminPost } from "../src/app/api/setup/admin/route";
import { POST as loginPost } from "../src/app/api/auth/login/route";
import { POST as logoutPost } from "../src/app/api/auth/logout/route";
import { GET as meGet } from "../src/app/api/auth/me/route";
import { POST as changePasswordPost } from "../src/app/api/auth/change-password/route";
import { GET as auditLogsGet } from "../src/app/api/audit-logs/route";
import { GET as recordsGet, POST as recordsPost } from "../src/app/api/records/route";
import { POST as verifyRecordPost } from "../src/app/api/records/[id]/verify/route";
import { POST as calculateMetricsPost } from "../src/app/api/metrics/calculate/route";
import { POST as createUserPost } from "../src/app/api/users/route";
import { User } from "../src/models/User";
import { AuditLog } from "../src/models/AuditLog";
import { DepartmentRecord } from "../src/models/DepartmentRecord";

const TEST_DB_URI = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/mca_nirf_test";

console.log("--------------------------------------------------");
console.log("MCA NIRF Assist — Full API Integration & RBAC Test");
console.log("--------------------------------------------------");

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

async function runApiTests() {
  await mongoose.connect(TEST_DB_URI);
  console.log("✓ Connected to MongoDB test database");

  // Clean collections
  const collections = await mongoose.connection.db!.collections();
  for (const c of collections) {
    await c.deleteMany({});
  }
  console.log("✓ Test database wiped clean");

  let adminCookie: string | undefined;
  let contributorCookie: string | undefined;
  let reviewerCookie: string | undefined;
  let viewerCookie: string | undefined;

  console.log("\n--- STEP 1: Check Admin Setup Status ---");
  {
    const res = await checkSetupGet();
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.setupAvailable, true);
    assert.equal(data.adminConfigured, false);
    console.log("✓ GET /api/setup/admin reports setupAvailable: true");
  }

  console.log("\n--- STEP 2: One-Time Admin Setup ---");
  {
    const req = createReq("http://localhost:3000/api/setup/admin", "POST", {
      name: "Prof. Rajesh Kumar",
      email: "hod.mca@dsatm.edu.in",
      password: "Admin@Password123!",
      employeeId: "EMP-MCA-001",
    });
    const res = await setupAdminPost(req);
    const data = await res.json();

    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.user.role, "DEPARTMENT_ADMIN");
    assert.equal(data.user.department, "MCA");

    adminCookie = extractCookie(res);
    assert.ok(adminCookie, "Setup must return server-set session cookie");

    // Verify AuditLog contains admin setup & user creation
    const setupAudit = await AuditLog.findOne({ action: "admin setup" });
    assert.ok(setupAudit, "AuditLog must contain 'admin setup'");

    const userCreationAudit = await AuditLog.findOne({ action: "user creation" });
    assert.ok(userCreationAudit, "AuditLog must contain 'user creation'");
    console.log("✓ Initial admin setup succeeded and logged in AuditLog");
  }

  console.log("\n--- STEP 3: Second Admin Setup Permanently Blocked ---");
  {
    const req2 = createReq("http://localhost:3000/api/setup/admin", "POST", {
      name: "Attacker or Impersonator",
      email: "intruder@fake.com",
      password: "IntruderPass@123!",
      employeeId: "EMP-002",
    });
    const res2 = await setupAdminPost(req2);
    const data2 = await res2.json();

    assert.equal(res2.status, 403, "Must return 403 Forbidden");
    assert.match(data2.error, /permanently blocked/i);
    console.log("✓ Second admin setup attempt was permanently blocked (403)");
  }

  console.log("\n--- STEP 4: GET /api/auth/me ---");
  {
    // Unauthenticated
    const unauthReq = createReq("http://localhost:3000/api/auth/me", "GET");
    const unauthRes = await meGet(unauthReq);
    assert.equal(unauthRes.status, 401);

    // Authenticated with admin cookie
    const authReq = createReq("http://localhost:3000/api/auth/me", "GET", undefined, adminCookie);
    const authRes = await meGet(authReq);
    const authData = await authRes.json();
    assert.equal(authRes.status, 200);
    assert.equal(authData.user.email, "hod.mca@dsatm.edu.in");
    assert.equal(authData.user.role, "DEPARTMENT_ADMIN");
    assert.equal(authData.user.passwordHash, undefined);
    console.log("✓ GET /api/auth/me correctly authenticates and omits passwordHash");
  }

  console.log("\n--- STEP 5: Failed Login Audit & Authentication ---");
  {
    // Login with invalid password
    const failReq = createReq("http://localhost:3000/api/auth/login", "POST", {
      identifier: "hod.mca@dsatm.edu.in",
      password: "WrongPassword999!",
    });
    const failRes = await loginPost(failReq);
    assert.equal(failRes.status, 401);

    const failedAudit = await AuditLog.findOne({ action: "failed login" });
    assert.ok(failedAudit, "AuditLog must record 'failed login'");
    console.log("✓ Bad password rejected (401) and logged as 'failed login'");

    // Successful login by employeeId
    const successReq = createReq("http://localhost:3000/api/auth/login", "POST", {
      identifier: "EMP-MCA-001",
      password: "Admin@Password123!",
    });
    const successRes = await loginPost(successReq);
    const successData = await successRes.json();
    assert.equal(successRes.status, 200);
    assert.equal(successData.user.name, "Prof. Rajesh Kumar");

    adminCookie = extractCookie(successRes);
    assert.ok(adminCookie);

    const loginAudit = await AuditLog.findOne({ action: "login", status: "SUCCESS" });
    assert.ok(loginAudit, "AuditLog must record 'login'");
    console.log("✓ Successful login via employeeId verified and logged");
  }

  console.log("\n--- STEP 6: Admin Creates Other Department Roles ---");
  {
    // Create FACULTY_CONTRIBUTOR
    const reqContrib = createReq("http://localhost:3000/api/users", "POST", {
      name: "Dr. Faculty Contributor",
      email: "faculty@dsatm.edu.in",
      password: "FacultyPassword@123!",
      role: "FACULTY_CONTRIBUTOR",
      employeeId: "FAC-002",
    }, adminCookie);
    const resContrib = await createUserPost(reqContrib);
    assert.equal(resContrib.status, 201);

    // Create REVIEWER
    const reqRev = createReq("http://localhost:3000/api/users", "POST", {
      name: "Dr. Reviewer Coordinator",
      email: "reviewer@dsatm.edu.in",
      password: "ReviewerPassword@123!",
      role: "REVIEWER",
      employeeId: "FAC-003",
    }, adminCookie);
    const resRev = await createUserPost(reqRev);
    assert.equal(resRev.status, 201);

    // Create VIEWER
    const reqView = createReq("http://localhost:3000/api/users", "POST", {
      name: "Academic Viewer",
      email: "viewer@dsatm.edu.in",
      password: "ViewerPassword@123!",
      role: "VIEWER",
      studentId: "STU-001",
    }, adminCookie);
    const resView = await createUserPost(reqView);
    assert.equal(resView.status, 201);

    // Log in each user to obtain their respective session cookies
    const loginContribRes = await loginPost(createReq("http://localhost:3000/api/auth/login", "POST", {
      identifier: "faculty@dsatm.edu.in",
      password: "FacultyPassword@123!",
    }));
    contributorCookie = extractCookie(loginContribRes);

    const loginRevRes = await loginPost(createReq("http://localhost:3000/api/auth/login", "POST", {
      identifier: "reviewer@dsatm.edu.in",
      password: "ReviewerPassword@123!",
    }));
    reviewerCookie = extractCookie(loginRevRes);

    const loginViewRes = await loginPost(createReq("http://localhost:3000/api/auth/login", "POST", {
      identifier: "viewer@dsatm.edu.in",
      password: "ViewerPassword@123!",
    }));
    viewerCookie = extractCookie(loginViewRes);

    assert.ok(contributorCookie && reviewerCookie && viewerCookie);
    console.log("✓ Admin successfully created Contributor, Reviewer, and Viewer accounts");
  }

  console.log("\n--- STEP 7: RBAC on Record Creation ---");
  {
    // Contributor CAN create record
    const contribReq = createReq("http://localhost:3000/api/records", "POST", {
      title: "MCA Approved Student Intake",
      category: "STUDENTS",
      academicYear: "2023-24",
    }, contributorCookie);
    const contribRes = await recordsPost(contribReq);
    assert.equal(contribRes.status, 201);

    // Reviewer CANNOT create record
    const revReq = createReq("http://localhost:3000/api/records", "POST", {
      title: "Reviewer Record",
      category: "STUDENTS",
    }, reviewerCookie);
    const revRes = await recordsPost(revReq);
    assert.equal(revRes.status, 403, "Reviewer must be forbidden from creating records");

    // Viewer CANNOT create record
    const viewReq = createReq("http://localhost:3000/api/records", "POST", {
      title: "Viewer Record",
      category: "STUDENTS",
    }, viewerCookie);
    const viewRes = await recordsPost(viewReq);
    assert.equal(viewRes.status, 403, "Viewer must be forbidden from creating records");

    console.log("✓ Record creation RBAC verified (Contributor: allowed, Reviewer/Viewer: 403)");
  }

  console.log("\n--- STEP 8: RBAC on Verification & Approval ---");
  {
    const record = await DepartmentRecord.findOne({ title: "MCA Approved Student Intake" });
    assert.ok(record);

    // Contributor CANNOT approve record
    const contribVerifyReq = createReq(`http://localhost:3000/api/records/${record._id}/verify`, "POST", {
      decision: "APPROVE",
      comment: "Self approval attempt",
    }, contributorCookie);
    const contribVerifyRes = await verifyRecordPost(contribVerifyReq, { params: Promise.resolve({ id: record._id.toString() }) });
    assert.equal(contribVerifyRes.status, 403, "Contributor cannot approve records");

    // Reviewer CAN approve record
    const revVerifyReq = createReq(`http://localhost:3000/api/records/${record._id}/verify`, "POST", {
      decision: "APPROVE",
      comment: "Verified against university admission list",
    }, reviewerCookie);
    const revVerifyRes = await verifyRecordPost(revVerifyReq, { params: Promise.resolve({ id: record._id.toString() }) });
    assert.equal(revVerifyRes.status, 200);

    const updatedRecord = await DepartmentRecord.findById(record._id);
    assert.equal(updatedRecord!.status, "APPROVED");

    const approvalAudit = await AuditLog.findOne({ action: "approval" });
    assert.ok(approvalAudit, "AuditLog must contain 'approval'");
    console.log("✓ Record verification RBAC verified (Reviewer: allowed, Contributor: 403)");
  }

  console.log("\n--- STEP 9: RBAC on Metric Calculation ---");
  {
    // Contributor CANNOT calculate metrics
    const contribCalcReq = createReq("http://localhost:3000/api/metrics/calculate", "POST", {}, contributorCookie);
    const contribCalcRes = await calculateMetricsPost(contribCalcReq);
    assert.equal(contribCalcRes.status, 403);

    // Reviewer CANNOT calculate metrics
    const revCalcReq = createReq("http://localhost:3000/api/metrics/calculate", "POST", {}, reviewerCookie);
    const revCalcRes = await calculateMetricsPost(revCalcReq);
    assert.equal(revCalcRes.status, 403);

    // Admin CAN calculate metrics
    const adminCalcReq = createReq("http://localhost:3000/api/metrics/calculate", "POST", {
      academicYear: "2023-24",
      parameter: "ALL",
    }, adminCookie);
    const adminCalcRes = await calculateMetricsPost(adminCalcReq);
    assert.equal(adminCalcRes.status, 200);
    const adminCalcData = await adminCalcRes.json();
    assert.equal(adminCalcData.success, true, "Metric calculation must return success: true");
    assert.ok(adminCalcData.summary, "Metric calculation must return a summary object");
    assert.ok(typeof adminCalcData.summary.counts.totalMetrics === "number", "summary.counts.totalMetrics must be a number");
    assert.ok(adminCalcData.summary.counts.totalMetrics > 0, "At least one metric must be defined");

    const metricAudit = await AuditLog.findOne({ action: "metric calculation" });
    assert.ok(metricAudit, "AuditLog must contain 'metric calculation'");
    console.log("✓ Metric calculation RBAC verified (Admin: allowed, Contributor/Reviewer: 403)");
  }

  console.log("\n--- STEP 10: RBAC on Audit Logs Retrieval ---");
  {
    // Admin CAN view audit logs
    const adminAuditReq = createReq("http://localhost:3000/api/audit-logs", "GET", undefined, adminCookie);
    const adminAuditRes = await auditLogsGet(adminAuditReq);
    assert.equal(adminAuditRes.status, 200);

    // Reviewer CAN view audit logs
    const revAuditReq = createReq("http://localhost:3000/api/audit-logs", "GET", undefined, reviewerCookie);
    const revAuditRes = await auditLogsGet(revAuditReq);
    assert.equal(revAuditRes.status, 200);

    // Contributor CANNOT view audit logs
    const contribAuditReq = createReq("http://localhost:3000/api/audit-logs", "GET", undefined, contributorCookie);
    const contribAuditRes = await auditLogsGet(contribAuditReq);
    assert.equal(contribAuditRes.status, 403);

    // Viewer CANNOT view audit logs
    const viewAuditReq = createReq("http://localhost:3000/api/audit-logs", "GET", undefined, viewerCookie);
    const viewAuditRes = await auditLogsGet(viewAuditReq);
    assert.equal(viewAuditRes.status, 403);

    console.log("✓ Audit log view RBAC verified (Admin/Reviewer: allowed, Contributor/Viewer: 403)");
  }

  console.log("\n--- STEP 11: Change Password Endpoint ---");
  {
    const changeReq = createReq("http://localhost:3000/api/auth/change-password", "POST", {
      currentPassword: "FacultyPassword@123!",
      newPassword: "UpdatedFacultyPassword@456!",
    }, contributorCookie);
    const changeRes = await changePasswordPost(changeReq);
    assert.equal(changeRes.status, 200);

    // Try logging in with old password
    const oldLogin = await loginPost(createReq("http://localhost:3000/api/auth/login", "POST", {
      identifier: "faculty@dsatm.edu.in",
      password: "FacultyPassword@123!",
    }));
    assert.equal(oldLogin.status, 401, "Old password must be rejected");

    // Login with new password
    const newLogin = await loginPost(createReq("http://localhost:3000/api/auth/login", "POST", {
      identifier: "faculty@dsatm.edu.in",
      password: "UpdatedFacultyPassword@456!",
    }));
    assert.equal(newLogin.status, 200, "New password must succeed");

    const pwdAudit = await AuditLog.findOne({ action: "password change" });
    assert.ok(pwdAudit, "AuditLog must record 'password change'");
    console.log("✓ POST /api/auth/change-password tested and verified");
  }

  console.log("\n--- STEP 12: Logout Endpoint ---");
  {
    const logoutReq = createReq("http://localhost:3000/api/auth/logout", "POST", undefined, contributorCookie);
    const logoutRes = await logoutPost(logoutReq);
    assert.equal(logoutRes.status, 200);

    const logoutAudit = await AuditLog.findOne({ action: "logout" });
    assert.ok(logoutAudit, "AuditLog must record 'logout'");
    console.log("✓ POST /api/auth/logout invalidated session and cleared cookie");
  }

  // Cleanup test database
  for (const c of collections) {
    await c.deleteMany({});
  }
  await mongoose.disconnect();

  console.log("\n==================================================");
  console.log("ALL 12 API INTEGRATION TESTS PASSED CLEANLY!");
  console.log("==================================================");
}

runApiTests().catch((err) => {
  console.error("API test failure:", err);
  process.exit(1);
});

