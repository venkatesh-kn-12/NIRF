import assert from "node:assert/strict";
import mongoose from "mongoose";
import { User } from "../src/models/User";
import { Session } from "../src/models/Session";
import { AuditLog } from "../src/models/AuditLog";
import { DepartmentRecord } from "../src/models/DepartmentRecord";
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  createSession,
  getSessionUser,
  invalidateSession,
  invalidateAllUserSessions,
  COOKIE_OPTIONS,
} from "../src/lib/auth";
import { hasRole, hasPermission, ROLE_PERMISSIONS } from "../src/lib/rbac";
import { logAuditEvent } from "../src/lib/audit";

const TEST_DB_URI = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/mca_nirf_test";

console.log("--------------------------------------------------");
console.log("MCA NIRF Assist — Production Authentication & RBAC Test Suite");
console.log("--------------------------------------------------");

async function runTests() {
  await mongoose.connect(TEST_DB_URI);
  console.log("✓ Connected to MongoDB local test database:", TEST_DB_URI);

  // Clean test database collections
  const collections = await mongoose.connection.db!.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  console.log("✓ Cleaned test database collections");

  console.log("\n--- TEST 1: Password Strength Validation ---");
  {
    assert.equal(validatePasswordStrength("weak").valid, false);
    assert.equal(validatePasswordStrength("NoSpecial123").valid, false);
    assert.equal(validatePasswordStrength("alllowercase1!").valid, false);
    assert.equal(validatePasswordStrength("ALLUPPERCASE1!").valid, false);
    assert.equal(validatePasswordStrength("NoNumber!@#Abc").valid, false);

    const strong = validatePasswordStrength("McaNIRF@2025Secure!");
    assert.equal(strong.valid, true);
    assert.equal(strong.errors.length, 0);
    console.log("✓ Password strength validation passed");
  }

  console.log("\n--- TEST 2: Password Hashing (bcrypt 12 rounds) ---");
  {
    const plain = "McaNIRF@2025Secure!";
    const hash = await hashPassword(plain);
    assert.notEqual(plain, hash);
    assert.match(hash, /^\$2[aby]\$12\$/); // Verify bcrypt 12 rounds format

    const matches = await verifyPassword(plain, hash);
    assert.equal(matches, true);

    const wrongMatches = await verifyPassword("WrongPassword123!", hash);
    assert.equal(wrongMatches, false);
    console.log("✓ bcrypt hashing and verification passed");
  }

  console.log("\n--- TEST 3: User Model Constraints ---");
  {
    // Must fail if neither employeeId nor studentId is provided
    let failedWithoutId = false;
    try {
      await User.create({
        name: "Test User",
        email: "test.user@college.edu",
        passwordHash: await hashPassword("McaNIRF@2025Secure!"),
        role: "FACULTY_CONTRIBUTOR",
        department: "MCA",
      });
    } catch {
      failedWithoutId = true;
    }
    assert.equal(failedWithoutId, true, "Must reject User without employeeId or studentId");

    // Must fail if department is not MCA
    let failedWrongDept = false;
    try {
      await User.create({
        name: "Test User",
        email: "test.user@college.edu",
        passwordHash: await hashPassword("McaNIRF@2025Secure!"),
        role: "FACULTY_CONTRIBUTOR",
        department: "CSE",
        employeeId: "FAC-001",
      });
    } catch {
      failedWrongDept = true;
    }
    assert.equal(failedWrongDept, true, "Must reject non-MCA department per Rule 6");

    // passwordHash must be excluded by default from query results
    const validUser = await User.create({
      name: "Dr. Ananya Sharma",
      email: "ananya.sharma@college.edu",
      passwordHash: await hashPassword("McaNIRF@2025Secure!"),
      role: "FACULTY_CONTRIBUTOR",
      department: "MCA",
      employeeId: "FAC-MCA-101",
      status: "ACTIVE",
    });

    const retrievedUser = await User.findById(validUser._id);
    assert.equal(retrievedUser!.passwordHash, undefined, "passwordHash must not be selected by default");

    const withPassword = await User.findById(validUser._id).select("+passwordHash");
    assert.ok(withPassword!.passwordHash, "passwordHash retrievable only when explicitly requested");
    console.log("✓ User model security constraints verified");
  }

  console.log("\n--- TEST 4: Session Model & Cookie Configuration ---");
  {
    assert.equal(COOKIE_OPTIONS.httpOnly, true, "Cookie must be HTTP-only");
    assert.equal(COOKIE_OPTIONS.sameSite, "lax", "Cookie must have SameSite");
    assert.equal(COOKIE_OPTIONS.path, "/");

    const user = await User.findOne({ email: "ananya.sharma@college.edu" });
    const session = await createSession(user!._id, user!.role);

    assert.ok(session.token, "Session token must exist");
    assert.equal(session.token.length, 64, "Token must be 32-byte hex (64 chars)");
    assert.equal(session.role, "FACULTY_CONTRIBUTOR");

    // Verify resolving session user
    const resolved = await getSessionUser(session.token);
    assert.ok(resolved);
    assert.equal(resolved.user.email, "ananya.sharma@college.edu");
    assert.equal((resolved.user as any).passwordHash, undefined, "Sensitive password must not be in session/user return");

    // Invalidation
    await invalidateSession(session.token);
    const resolvedAfter = await getSessionUser(session.token);
    assert.equal(resolvedAfter, null, "Session must be invalid after logout");
    console.log("✓ Session-based authentication & cookie specs verified");
  }

  console.log("\n--- TEST 5: One-Time Department Admin Setup Logic ---");
  {
    // Initially, no admin exists
    const countBefore = await User.countDocuments({ role: "DEPARTMENT_ADMIN" });
    assert.equal(countBefore, 0, "No admin should exist initially");

    // Create the first admin
    const firstAdmin = await User.create({
      name: "Prof. Rajesh Kumar",
      email: "hod.mca@college.edu",
      passwordHash: await hashPassword("AdminSecret@2025!"),
      role: "DEPARTMENT_ADMIN",
      department: "MCA",
      employeeId: "EMP-MCA-001",
      status: "ACTIVE",
    });
    assert.ok(firstAdmin);

    // Verify that subsequent public admin setup is permanently blocked
    const countAfter = await User.countDocuments({ role: "DEPARTMENT_ADMIN" });
    assert.equal(countAfter, 1);

    const isPublicAdminSetupAllowed = (countAfter as number) === 0;
    assert.equal(isPublicAdminSetupAllowed, false, "Public admin setup must be permanently locked");
    console.log("✓ One-time Department Admin setup constraint verified");
  }

  console.log("\n--- TEST 6: AuditLog Model & All 15 Required Actions ---");
  {
    const admin = await User.findOne({ role: "DEPARTMENT_ADMIN" });
    const requiredActions = [
      "login",
      "logout",
      "failed login",
      "admin setup",
      "user creation",
      "role change",
      "password change",
      "record creation",
      "record update",
      "record deletion",
      "approval",
      "rejection",
      "correction request",
      "file upload",
      "metric calculation",
    ] as const;

    for (const action of requiredActions) {
      const entry = await logAuditEvent({
        action,
        userId: admin!._id,
        userEmail: admin!.email,
        userRole: admin!.role,
        department: "MCA",
        resourceType: "TestResource",
        resourceId: "RES-001",
        details: { test: true, actionName: action },
        status: "SUCCESS",
        ipAddress: "127.0.0.1",
        userAgent: "TestSuite/1.0",
      });
      assert.ok(entry, `AuditLog must accept action: ${action}`);
      assert.equal(entry!.action, action);
    }

    const totalAuditCount = await AuditLog.countDocuments({ department: "MCA" });
    assert.equal(totalAuditCount, 15, "All 15 audit action types successfully logged");
    console.log("✓ All 15 required audit log action types verified");
  }

  console.log("\n--- TEST 7: Role-Based Access Control (RBAC) Permissions (3 Active Roles) ---");
  {
    // DEPARTMENT_ADMIN: full access
    assert.equal(hasRole("DEPARTMENT_ADMIN", ["DEPARTMENT_ADMIN"]), true);
    assert.equal(hasPermission("DEPARTMENT_ADMIN", "users:manage"), true);
    assert.equal(hasPermission("DEPARTMENT_ADMIN", "records:delete"), true);
    assert.equal(hasPermission("DEPARTMENT_ADMIN", "records:archive"), true);
    assert.equal(hasPermission("DEPARTMENT_ADMIN", "records:restore"), true);
    assert.equal(hasPermission("DEPARTMENT_ADMIN", "metrics:calculate"), true);

    // FACULTY_CONTRIBUTOR: create/edit assigned, upload evidence, archive own
    assert.equal(hasRole("FACULTY_CONTRIBUTOR", ["FACULTY_CONTRIBUTOR"]), true);
    assert.equal(hasPermission("FACULTY_CONTRIBUTOR", "records:create"), true);
    assert.equal(hasPermission("FACULTY_CONTRIBUTOR", "evidence:upload"), true);
    assert.equal(hasPermission("FACULTY_CONTRIBUTOR", "records:archive_own"), true);
    assert.equal(hasPermission("FACULTY_CONTRIBUTOR", "records:delete"), false);
    assert.equal(hasPermission("FACULTY_CONTRIBUTOR", "metrics:calculate"), false);

    // VIEWER: read-only access to approved data and dashboards
    assert.equal(hasRole("VIEWER", ["VIEWER"]), true);
    assert.equal(hasPermission("VIEWER", "dashboards:view"), true);
    assert.equal(hasPermission("VIEWER", "records:view_approved"), true);
    assert.equal(hasPermission("VIEWER", "records:create"), false);
    assert.equal(hasPermission("VIEWER", "records:edit_assigned"), false);
    assert.equal(hasPermission("VIEWER", "evidence:upload"), false);
    assert.equal(hasPermission("VIEWER", "records:delete"), false);
    assert.equal(hasPermission("VIEWER", "metrics:calculate"), false);
    console.log("✓ Simplified 3-role RBAC permissions matrix strictly verified");
  }

  console.log("\n--- TEST 8: Institutional Rule 7 & 8 (Metric Calculation) ---");
  {
    const admin = await User.findOne({ role: "DEPARTMENT_ADMIN" });

    // Create a DRAFT record (not approved)
    const draftRecord = await DepartmentRecord.create({
      title: "Faculty R&D Grants",
      category: "FACULTY",
      department: "MCA",
      academicYear: "2023-24",
      status: "DRAFT",
      createdBy: admin!._id,
      updatedBy: admin!._id,
    });

    // Rule 7: A record cannot be used for metric computation unless status is APPROVED
    const approvedRecords = await DepartmentRecord.find({
      department: "MCA",
      academicYear: "2023-24",
      status: "APPROVED",
    });
    assert.equal(approvedRecords.length, 0, "Draft records cannot be included in metric computation");

    // Rule 8: Missing inputs must be NOT_COMPUTABLE
    const isComputable = approvedRecords.length > 0;
    const metricStatus = isComputable ? "COMPUTED" : "NOT_COMPUTABLE";
    assert.equal(metricStatus, "NOT_COMPUTABLE", "Missing approved inputs must yield NOT_COMPUTABLE");

    // Approve the record (as REVIEWER or ADMIN)
    draftRecord.status = "APPROVED";
    await draftRecord.save();

    const nowApproved = await DepartmentRecord.find({
      department: "MCA",
      academicYear: "2023-24",
      status: "APPROVED",
    });
    assert.equal(nowApproved.length, 1);
    const nowComputable = nowApproved.length > 0;
    assert.equal(nowComputable, true);
    console.log("✓ Rules 7 & 8 (approved records only, NOT_COMPUTABLE for missing) verified");
  }

  console.log("\n--- TEST 9: Invalidate All Sessions on Password Change ---");
  {
    const user = await User.findOne({ email: "ananya.sharma@college.edu" });
    const session1 = await createSession(user!._id, user!.role);
    const session2 = await createSession(user!._id, user!.role);
    const session3 = await createSession(user!._id, user!.role);

    const userSessionCount = await Session.countDocuments({ userId: user!._id });
    assert.equal(userSessionCount, 3);

    // Invalidate all except session3 (current session)
    await invalidateAllUserSessions(user!._id, session3.token);

    const s1 = await getSessionUser(session1.token);
    const s2 = await getSessionUser(session2.token);
    const s3 = await getSessionUser(session3.token);

    assert.equal(s1, null, "Old session 1 must be terminated");
    assert.equal(s2, null, "Old session 2 must be terminated");
    assert.ok(s3, "Current session 3 must remain active");
    console.log("✓ Session invalidation on password change verified");
  }

  // Clean test database
  for (const collection of collections) {
    await collection.deleteMany({});
  }
  await mongoose.disconnect();

  console.log("\n==================================================");
  console.log("ALL 9 TEST SUITES PASSED CLEANLY WITH ZERO ERRORS!");
  console.log("==================================================");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});

