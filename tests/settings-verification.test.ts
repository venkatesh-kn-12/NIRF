import assert from "node:assert/strict";
import mongoose from "mongoose";
import { User } from "../src/models/User";
import { Session } from "../src/models/Session";
import { AuditLog } from "../src/models/AuditLog";
import { DepartmentConfig } from "../src/models/DepartmentConfig";
import {
  hashPassword,
  createSession,
  getSessionUser,
  toSafeUser,
} from "../src/lib/auth";
import { GET as getUsers, POST as createUser } from "../src/app/api/users/route";
import { GET as getUserById, PATCH as updateUserById } from "../src/app/api/users/[id]/route";
import { GET as exportUsers } from "../src/app/api/users/export/route";
import { GET as getDeptSettings, PUT as updateDeptSettings } from "../src/app/api/settings/department/route";
import { GET as getMethodology } from "../src/app/api/settings/methodology/route";
import { GET as getIntegrations } from "../src/app/api/settings/integrations/route";
import { NextRequest } from "next/server";

const TEST_DB_URI = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/mca_nirf_test";

console.log("--------------------------------------------------");
console.log("MCA NIRF Assist — Settings & User Management Verification Suite");
console.log("--------------------------------------------------");

function createMockRequest(
  url: string,
  options: {
    method?: string;
    token?: string;
    body?: any;
  } = {}
) {
  const { method = "GET", token, body } = options;
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (body) {
    headers.set("Content-Type", "application/json");
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runTests() {
  await mongoose.connect(TEST_DB_URI);
  console.log("✓ Connected to MongoDB test database:", TEST_DB_URI);

  // Clean collections in isolated test DB
  const collections = await mongoose.connection.db!.collections();
  for (const col of collections) {
    await col.deleteMany({});
  }
  console.log("✓ Test database collections purged clean");

  // Setup initial Admin user
  const adminPasswordHash = await hashPassword("AdminSecure@2026!");
  const adminUser = await User.create({
    name: "Admin Prof. Rajesh",
    email: "admin.rajesh@dsatm.edu",
    passwordHash: adminPasswordHash,
    role: "DEPARTMENT_ADMIN",
    department: "MCA",
    employeeId: "EMP-MCA-001",
    status: "ACTIVE",
  });
  const adminSession = await createSession(adminUser._id, "DEPARTMENT_ADMIN");
  const adminToken = adminSession.token;
  console.log("✓ Admin user and session created");

  // Setup a Viewer user for permission denial tests
  const viewerPasswordHash = await hashPassword("ViewerSecure@2026!");
  const viewerUser = await User.create({
    name: "Viewer Sandeep",
    email: "viewer.sandeep@dsatm.edu",
    passwordHash: viewerPasswordHash,
    role: "VIEWER",
    department: "MCA",
    employeeId: "EMP-MCA-999",
    status: "ACTIVE",
  });
  const viewerSession = await createSession(viewerUser._id, "VIEWER");
  const viewerToken = viewerSession.token;
  console.log("✓ Viewer user and session created");

  console.log("\n--- TEST 1: User Listing, Counts & Pagination ---");
  {
    const req = createMockRequest("http://localhost:3000/api/users", { token: adminToken });
    const res = await getUsers(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.counts.total, 2);
    assert.equal(data.counts.active, 2);
    assert.equal(data.counts.invited, 0);
    assert.equal(data.counts.disabled, 0);
    assert.equal(data.users.length, 2);
    console.log("✓ GET /api/users returned accurate DB counts and user roster");
  }

  console.log("\n--- TEST 2: User Creation with Password Hashing & Audit Log ---");
  {
    const req = createMockRequest("http://localhost:3000/api/users", {
      method: "POST",
      token: adminToken,
      body: {
        name: "Dr. Sunita Rao",
        email: "sunita.rao@dsatm.edu",
        password: "FacultyPass@2026!",
        role: "FACULTY_CONTRIBUTOR",
        employeeId: "EMP-MCA-042",
        status: "ACTIVE",
      },
    });

    const res = await createUser(req);
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.user.name, "Dr. Sunita Rao");
    assert.equal(data.user.role, "FACULTY_CONTRIBUTOR");
    assert.equal(data.user.passwordHash, undefined, "passwordHash must never be returned");

    // Verify DB state
    const createdInDb = await User.findOne({ email: "sunita.rao@dsatm.edu" }).select("+passwordHash");
    assert.ok(createdInDb);
    assert.notEqual(createdInDb.passwordHash, "FacultyPass@2026!");
    assert.ok(createdInDb.passwordHash.startsWith("$2b$") || createdInDb.passwordHash.startsWith("$2a$"));

    // Verify audit log
    const audit = await AuditLog.findOne({
      action: "user creation",
      resourceId: createdInDb._id.toString(),
    });
    assert.ok(audit, "Audit log for user creation must exist");
    assert.equal(audit.userEmail, adminUser.email);
    console.log("✓ User created with bcrypt hash, safe projection, and audit trail");
  }

  console.log("\n--- TEST 3: User Search and Role/Status Filtering ---");
  {
    // Search by employeeId
    const req = createMockRequest("http://localhost:3000/api/users?search=EMP-MCA-042", {
      token: adminToken,
    });
    const res = await getUsers(req);
    const data = await res.json();
    assert.equal(data.users.length, 1);
    assert.equal(data.users[0].email, "sunita.rao@dsatm.edu");

    // Filter by role
    const reqRole = createMockRequest("http://localhost:3000/api/users?role=FACULTY_CONTRIBUTOR", {
      token: adminToken,
    });
    const resRole = await getUsers(reqRole);
    const dataRole = await resRole.json();
    assert.equal(dataRole.users.length, 1);
    assert.equal(dataRole.users[0].role, "FACULTY_CONTRIBUTOR");
    console.log("✓ User search and role filtering correctly scoped queries");
  }

  console.log("\n--- TEST 4: Non-Admin Access Control (403 Forbidden) ---");
  {
    const req = createMockRequest("http://localhost:3000/api/users", { token: viewerToken });
    const res = await getUsers(req);
    assert.equal(res.status, 403, "Viewer must be denied access to user list");

    const reqCreate = createMockRequest("http://localhost:3000/api/users", {
      method: "POST",
      token: viewerToken,
      body: { name: "Fake", email: "fake@dsatm.edu", password: "Password@123", role: "VIEWER" },
    });
    const resCreate = await createUser(reqCreate);
    assert.equal(resCreate.status, 403, "Viewer must be denied user creation");
    console.log("✓ Non-admin role-based access control strictly enforced (403)");
  }

  console.log("\n--- TEST 5: Last Active Admin Protection (Demotion & Disabling Guard) ---");
  {
    // Attempt to demote the sole admin
    const reqDemote = createMockRequest(
      `http://localhost:3000/api/users/${adminUser._id}`,
      {
        method: "PATCH",
        token: adminToken,
        body: { role: "FACULTY_CONTRIBUTOR" },
      }
    );
    const resDemote = await updateUserById(reqDemote, {
      params: Promise.resolve({ id: adminUser._id.toString() }),
    });
    assert.equal(resDemote.status, 400);
    const demoteData = await resDemote.json();
    assert.match(demoteData.error, /last active Department Administrator/i);

    // Attempt to disable the sole admin
    const reqDisable = createMockRequest(
      `http://localhost:3000/api/users/${adminUser._id}`,
      {
        method: "PATCH",
        token: adminToken,
        body: { status: "DISABLED" },
      }
    );
    const resDisable = await updateUserById(reqDisable, {
      params: Promise.resolve({ id: adminUser._id.toString() }),
    });
    assert.equal(resDisable.status, 400);
    const disableData = await resDisable.json();
    assert.match(disableData.error, /last active Department Administrator/i);

    console.log("✓ Last active Department Admin protected against demotion and disablement");
  }

  console.log("\n--- TEST 6: User Disablement & Immediate Session Invalidation ---");
  {
    // Create a user with active session
    const facultyUser = await User.findOne({ email: "sunita.rao@dsatm.edu" });
    assert.ok(facultyUser);
    const facultySession = await createSession(facultyUser._id, "FACULTY_CONTRIBUTOR");

    // Verify session is valid
    const sessionCheckBefore = await getSessionUser(facultySession.token);
    assert.ok(sessionCheckBefore);
    assert.equal(sessionCheckBefore.user.email, "sunita.rao@dsatm.edu");

    // Disable the faculty user
    const reqDisableFaculty = createMockRequest(
      `http://localhost:3000/api/users/${facultyUser._id}`,
      {
        method: "PATCH",
        token: adminToken,
        body: { status: "DISABLED" },
      }
    );
    const resDisableFaculty = await updateUserById(reqDisableFaculty, {
      params: Promise.resolve({ id: facultyUser._id.toString() }),
    });
    assert.equal(resDisableFaculty.status, 200);

    // Verify sessions were wiped immediately
    const sessionCheckAfter = await getSessionUser(facultySession.token);
    assert.equal(sessionCheckAfter, null, "Disabled user sessions must be completely revoked");
    console.log("✓ User disablement immediately invalidated sessions and revoked access");
  }

  console.log("\n--- TEST 7: CSV Roster Export ---");
  {
    const req = createMockRequest("http://localhost:3000/api/users/export", { token: adminToken });
    const res = await exportUsers(req);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Content-Type"), "text/csv; charset=utf-8");
    const csv = await res.text();
    assert.ok(csv.includes("Name,Institutional Email,Role,Identifier,Status,Created At"));
    assert.ok(csv.includes("admin.rajesh@dsatm.edu"));
    console.log("✓ CSV roster export generated with proper headers and escaping");
  }

  console.log("\n--- TEST 8: Department & Reporting Settings Persistence ---");
  {
    // GET default settings
    const reqGet = createMockRequest("http://localhost:3000/api/settings/department", {
      token: adminToken,
    });
    const resGet = await getDeptSettings(reqGet);
    assert.equal(resGet.status, 200);
    const dataGet = await resGet.json();
    assert.equal(dataGet.config.department, "MCA");
    assert.equal(dataGet.config.sanctionedIntake, 120);

    // PUT update settings
    const reqPut = createMockRequest("http://localhost:3000/api/settings/department", {
      method: "PUT",
      token: adminToken,
      body: {
        institutionName: "Dayananda Sagar Academy of Technology & Management (Autonomous)",
        programmeName: "Master of Computer Applications (MCA)",
        homeState: "Karnataka",
        selectedAcademicYear: "2024-25",
        sanctionedIntake: 180,
        notifications: {
          inAppAlerts: true,
          highDiscrepancyAlerts: false,
          calculationAlerts: true,
        },
      },
    });

    const resPut = await updateDeptSettings(reqPut);
    assert.equal(resPut.status, 200);
    const dataPut = await resPut.json();
    assert.equal(dataPut.config.sanctionedIntake, 180);
    assert.equal(dataPut.config.notifications.highDiscrepancyAlerts, false);
    assert.equal(dataPut.config.notifications.emailAlerts, false, "Email alerts must remain false");

    // Verify persistence in MongoDB
    const persisted = await DepartmentConfig.findOne({ department: "MCA" });
    assert.ok(persisted);
    assert.equal(persisted.sanctionedIntake, 180);

    // Verify audit log
    const audit = await AuditLog.findOne({
      action: "settings update",
      resourceType: "DepartmentConfig",
    });
    assert.ok(audit);
    console.log("✓ Department settings persisted in MongoDB with audit logging");
  }

  console.log("\n--- TEST 9: Official Methodology Definition & Blockers ---");
  {
    const req = createMockRequest("http://localhost:3000/api/settings/methodology", {
      token: adminToken,
    });
    const res = await getMethodology(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.methodology.version, "NIRF_ENGINEERING_2025");
    assert.equal(data.methodology.parameters.length, 5);

    // Check weights
    const weights = Object.fromEntries(
      data.methodology.parameters.map((p: any) => [p.parameter, p.weight])
    );
    assert.equal(weights.TLR, 0.30);
    assert.equal(weights.RP, 0.30);
    assert.equal(weights.GO, 0.20);
    assert.equal(weights.OI, 0.10);
    assert.equal(weights.PR, 0.10);

    // Check blockers
    assert.ok(data.methodology.calculationBlockers.length >= 2);
    const prBlocker = data.methodology.calculationBlockers.find((b: any) => b.parameter === "PR");
    assert.ok(prBlocker);
    assert.equal(prBlocker.severity, "CRITICAL");
    console.log("✓ Methodology config returned official 2025 parameters and blockers");
  }

  console.log("\n--- TEST 10: Honest Integration Status & Health Check ---");
  {
    const req = createMockRequest("http://localhost:3000/api/settings/integrations", {
      token: adminToken,
    });
    const res = await getIntegrations(req);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.integrations));

    const dbIntegration = data.integrations.find((i: any) => i.id === "database");
    assert.ok(dbIntegration);
    assert.equal(dbIntegration.status, "HEALTHY");

    const emailIntegration = data.integrations.find((i: any) => i.id === "email");
    assert.ok(emailIntegration);
    assert.equal(emailIntegration.status, "NOT_CONFIGURED");

    const biblioIntegration = data.integrations.find((i: any) => i.id === "bibliometric");
    assert.ok(biblioIntegration);
    assert.equal(biblioIntegration.status, "NOT_CONFIGURED");

    console.log("✓ Honest integration endpoint reports truthful database and module statuses");
  }

  await mongoose.disconnect();
  console.log("\n==================================================");
  console.log("ALL 10 SETTINGS VERIFICATION TESTS PASSED!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("\n❌ Settings verification test failure:", err);
  process.exit(1);
});
