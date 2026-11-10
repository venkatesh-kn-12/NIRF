import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DepartmentConfig } from "@/models/DepartmentConfig";
import {
  extractTokenFromRequest,
  getSessionUser,
  getClientIp,
  getClientUserAgent,
} from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

/**
 * GET /api/settings/department
 * Retrieve department & reporting configuration for MCA.
 * Accessible to authenticated users.
 */
export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    await connectDB();

    let config = await DepartmentConfig.findOne({ department: "MCA" });
    if (!config) {
      config = await DepartmentConfig.create({
        institutionName: "Dayananda Sagar Academy of Technology & Management",
        department: "MCA",
        programmeName: "Master of Computer Applications",
        homeState: "Karnataka",
        selectedAcademicYear: "2024-25",
        reportingPeriod: "ANNUAL",
        cycleStartDate: "2025-11-01",
        cycleEndDate: "2026-02-28",
        referenceDate: "2024-12-31",
        sanctionedIntake: 120,
        notifications: {
          inAppAlerts: true,
          highDiscrepancyAlerts: true,
          calculationAlerts: true,
          emailAlerts: false,
          smsAlerts: false,
        },
      });
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("GET /api/settings/department error:", error);
    return NextResponse.json(
      { error: "Failed to fetch department settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings/department
 * Update department & reporting configuration for MCA.
 * Restricted to DEPARTMENT_ADMIN.
 */
export async function PUT(req: NextRequest) {
  const ipAddress = getClientIp(req);
  const userAgent = getClientUserAgent(req);

  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const authData = await getSessionUser(token);
    if (!authData) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { user } = authData;
    if (!hasRole(user.role, ["DEPARTMENT_ADMIN"])) {
      return NextResponse.json(
        { error: "Access denied. Only Department Admins can update settings." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      institutionName,
      programmeName,
      homeState,
      selectedAcademicYear,
      reportingPeriod,
      cycleStartDate,
      cycleEndDate,
      referenceDate,
      sanctionedIntake,
      notifications,
    } = body;

    // Validation
    if (sanctionedIntake !== undefined && (typeof sanctionedIntake !== "number" || sanctionedIntake < 1)) {
      return NextResponse.json(
        { error: "Sanctioned intake must be a positive integer (minimum 1)." },
        { status: 400 }
      );
    }

    await connectDB();

    let config = await DepartmentConfig.findOne({ department: "MCA" });
    if (!config) {
      config = new DepartmentConfig({ department: "MCA" });
    }

    const oldValues = {
      institutionName: config.institutionName,
      programmeName: config.programmeName,
      homeState: config.homeState,
      selectedAcademicYear: config.selectedAcademicYear,
      sanctionedIntake: config.sanctionedIntake,
    };

    if (institutionName !== undefined) config.institutionName = institutionName.trim();
    if (programmeName !== undefined) config.programmeName = programmeName.trim();
    if (homeState !== undefined) config.homeState = homeState.trim();
    if (selectedAcademicYear !== undefined) config.selectedAcademicYear = selectedAcademicYear.trim();
    if (reportingPeriod !== undefined) config.reportingPeriod = reportingPeriod.trim();
    if (cycleStartDate !== undefined) config.cycleStartDate = cycleStartDate;
    if (cycleEndDate !== undefined) config.cycleEndDate = cycleEndDate;
    if (referenceDate !== undefined) config.referenceDate = referenceDate;
    if (sanctionedIntake !== undefined) config.sanctionedIntake = sanctionedIntake;

    if (notifications) {
      config.notifications = {
        inAppAlerts: notifications.inAppAlerts !== undefined ? !!notifications.inAppAlerts : config.notifications?.inAppAlerts ?? true,
        highDiscrepancyAlerts: notifications.highDiscrepancyAlerts !== undefined ? !!notifications.highDiscrepancyAlerts : config.notifications?.highDiscrepancyAlerts ?? true,
        calculationAlerts: notifications.calculationAlerts !== undefined ? !!notifications.calculationAlerts : config.notifications?.calculationAlerts ?? true,
        emailAlerts: false, // Unsupported in deployment
        smsAlerts: false,   // Unsupported in deployment
      };
    }

    config.updatedBy = user._id;
    await config.save();

    // Log audit event
    await logAuditEvent({
      action: "settings update" as any,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      department: "MCA",
      resourceType: "DepartmentConfig",
      resourceId: config._id.toString(),
      details: {
        oldValues,
        newValues: {
          institutionName: config.institutionName,
          programmeName: config.programmeName,
          homeState: config.homeState,
          selectedAcademicYear: config.selectedAcademicYear,
          sanctionedIntake: config.sanctionedIntake,
        },
      },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: "Department settings updated successfully",
      config,
    });
  } catch (error) {
    console.error("PUT /api/settings/department error:", error);
    return NextResponse.json(
      { error: "Failed to update department settings" },
      { status: 500 }
    );
  }
}

