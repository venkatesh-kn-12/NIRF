import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { DepartmentConfig } from "@/models/DepartmentConfig";
import { getRPReportingWindow, getGOReportingWindow, getScoreYearConfig } from "@/lib/reportingWindow";
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

    const rpReportingWindow = getRPReportingWindow(config.selectedAcademicYear || "2024-25");
    const goReportingWindow = getGOReportingWindow(config.selectedAcademicYear || "2024-25");
    const scoreYearConfig = getScoreYearConfig(
      config.scoringYear || 2026,
      config.simulationPolicy || "COMPLETED_BASELINE",
      config.selectedAcademicYear || "2024-25",
      config.provisionalCutoffDate || "2026-02-28"
    );

    return NextResponse.json({
      success: true,
      config,
      rpReportingWindow,
      goReportingWindow,
      scoreYearConfig,
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
      scoringYear,
      simulationPolicy,
      provisionalCutoffDate,
      surveyScale,
      facilityChecklist,
      reportingPeriod,
      cycleStartDate,
      cycleEndDate,
      referenceDate,
      sanctionedIntake,
      rpSettings,
      goSettings,
      notifications,
    } = body;

    // Validation
    if (sanctionedIntake !== undefined && (typeof sanctionedIntake !== "number" || sanctionedIntake < 1)) {
      return NextResponse.json(
        { error: "Sanctioned intake must be a positive integer (minimum 1)." },
        { status: 400 }
      );
    }

    if (rpSettings) {
      if (rpSettings.pubTargetPerFacultyPerYear !== undefined && rpSettings.pubTargetPerFacultyPerYear <= 0) {
        return NextResponse.json({ error: "Publication target per faculty must be > 0" }, { status: 400 });
      }
      if (rpSettings.citationTargetPerFacultyWindow !== undefined && rpSettings.citationTargetPerFacultyWindow <= 0) {
        return NextResponse.json({ error: "Citation target per faculty must be > 0" }, { status: 400 });
      }
      if (rpSettings.patentsPublishedTarget !== undefined && rpSettings.patentsPublishedTarget <= 0) {
        return NextResponse.json({ error: "Patents published target must be > 0" }, { status: 400 });
      }
      if (rpSettings.patentsGrantedTarget !== undefined && rpSettings.patentsGrantedTarget <= 0) {
        return NextResponse.json({ error: "Patents granted target must be > 0" }, { status: 400 });
      }
      if (rpSettings.researchFundingTargetPerFacultyYear !== undefined && rpSettings.researchFundingTargetPerFacultyYear <= 0) {
        return NextResponse.json({ error: "Research funding target must be > 0" }, { status: 400 });
      }
      if (rpSettings.consultancyTargetPerFacultyYear !== undefined && rpSettings.consultancyTargetPerFacultyYear <= 0) {
        return NextResponse.json({ error: "Consultancy target must be > 0" }, { status: 400 });
      }
    }

    if (goSettings) {
      if (goSettings.salaryTarget !== undefined && goSettings.salaryTarget <= 0) {
        return NextResponse.json({ error: "Median salary target must be > 0" }, { status: 400 });
      }
      if (goSettings.phdAwardTargetPerYear !== undefined && goSettings.phdAwardTargetPerYear <= 0) {
        return NextResponse.json({ error: "PhD award target per year must be > 0" }, { status: 400 });
      }
      if (goSettings.cohortYearsCount !== undefined && (goSettings.cohortYearsCount < 1 || goSettings.cohortYearsCount > 5)) {
        return NextResponse.json({ error: "Cohort years count must be between 1 and 5" }, { status: 400 });
      }
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
    if (scoringYear !== undefined) config.scoringYear = Number(scoringYear) || 2026;
    if (simulationPolicy !== undefined) config.simulationPolicy = simulationPolicy;
    if (provisionalCutoffDate !== undefined) config.provisionalCutoffDate = provisionalCutoffDate;
    if (surveyScale !== undefined) config.surveyScale = surveyScale;
    if (facilityChecklist !== undefined && typeof facilityChecklist === "object") {
      config.facilityChecklist = {
        ramps_walkways: Boolean(facilityChecklist.ramps_walkways),
        lifts_elevators: Boolean(facilityChecklist.lifts_elevators),
        accessible_toilets: Boolean(facilityChecklist.accessible_toilets),
        assistive_tech_labs: Boolean(facilityChecklist.assistive_tech_labs),
        directional_signage: Boolean(facilityChecklist.directional_signage),
      };
    }
    if (reportingPeriod !== undefined) config.reportingPeriod = reportingPeriod.trim();
    if (cycleStartDate !== undefined) config.cycleStartDate = cycleStartDate;
    if (cycleEndDate !== undefined) config.cycleEndDate = cycleEndDate;
    if (referenceDate !== undefined) config.referenceDate = referenceDate;
    if (sanctionedIntake !== undefined) config.sanctionedIntake = sanctionedIntake;

    if (rpSettings) {
      config.rpSettings = {
        qpModel: rpSettings.qpModel || config.rpSettings?.qpModel || "QP_CITATIONS_AND_QUARTILE_V1",
        pubTargetPerFacultyPerYear: Number(rpSettings.pubTargetPerFacultyPerYear) || config.rpSettings?.pubTargetPerFacultyPerYear || 1.0,
        citationTargetPerFacultyWindow: Number(rpSettings.citationTargetPerFacultyWindow) || config.rpSettings?.citationTargetPerFacultyWindow || 5.0,
        patentsPublishedTarget: Number(rpSettings.patentsPublishedTarget) || config.rpSettings?.patentsPublishedTarget || 6,
        patentsGrantedTarget: Number(rpSettings.patentsGrantedTarget) || config.rpSettings?.patentsGrantedTarget || 3,
        researchFundingTargetPerFacultyYear: Number(rpSettings.researchFundingTargetPerFacultyYear) || config.rpSettings?.researchFundingTargetPerFacultyYear || 50000,
        consultancyTargetPerFacultyYear: Number(rpSettings.consultancyTargetPerFacultyYear) || config.rpSettings?.consultancyTargetPerFacultyYear || 25000,
      };
    }

    if (goSettings) {
      config.goSettings = {
        gphModel: goSettings.gphModel || config.goSettings?.gphModel || "GPH_UNIQUE_OUTCOMES_V1",
        salaryTarget: Number(goSettings.salaryTarget) || config.goSettings?.salaryTarget || 800000,
        phdAwardTargetPerYear: Number(goSettings.phdAwardTargetPerYear) || config.goSettings?.phdAwardTargetPerYear || 1.0,
        cohortYearsCount: Number(goSettings.cohortYearsCount) || config.goSettings?.cohortYearsCount || 3,
      };
    }

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

