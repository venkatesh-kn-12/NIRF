import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ZeroActivityDeclaration, RPActivityType } from "@/models/ZeroActivityDeclaration";
import { Publication } from "@/models/Publication";
import { Patent } from "@/models/Patent";
import { ProjectConsultancy } from "@/models/ProjectConsultancy";
import { PlacementRecord } from "@/models/PlacementRecord";
import { GraduationOutcome } from "@/models/GraduationOutcome";
import { DoctoralAward } from "@/models/DoctoralAward";
import { getRPReportingWindow, getGOReportingWindow } from "@/lib/reportingWindow";
import { extractTokenFromRequest, getSessionUser, getClientIp, getClientUserAgent } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const academicYear = searchParams.get("academicYear") || "2024-25";

    await connectDB();
    const declarations = await ZeroActivityDeclaration.find({
      department: "MCA",
      academicYear,
    }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, data: declarations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch zero declarations" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    if (!hasRole(authData.user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json(
        { error: `Forbidden. Role ${authData.user.role} cannot declare zero activity.` },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { activityType, academicYear = "2024-25", reason } = body;

    const validTypes: RPActivityType[] = [
      "PUBLICATIONS",
      "PATENTS_PUBLISHED",
      "PATENTS_GRANTED",
      "RESEARCH_FUNDING",
      "CONSULTANCY",
      "PLACEMENTS",
      "HIGHER_STUDIES",
      "DOCTORAL_AWARDS",
    ];

    if (!activityType || !validTypes.includes(activityType)) {
      return NextResponse.json(
        { error: `Invalid activityType. Must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();

    // Conflict check: Ensure a zero declaration does not hide actual existing in-window records
    const rpWindow = getRPReportingWindow(academicYear);

    if (activityType === "PUBLICATIONS") {
      const pubCount = await Publication.countDocuments({
        department: "MCA",
        status: { $in: ["RECORDED", "APPROVED"] },
        publicationYear: { $gte: rpWindow.startCalendarYear, $lte: rpWindow.endCalendarYear },
        retractionStatus: { $ne: true },
      });
      if (pubCount > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Cannot declare zero publications because ${pubCount} active publication(s) exist within the ${rpWindow.startCalendarYear}–${rpWindow.endCalendarYear} reporting window. Archive or delete records before declaring zero.`,
            existingCount: pubCount,
          },
          { status: 409 }
        );
      }
    } else if (activityType === "PATENTS_GRANTED") {
      const grantedCount = await Patent.countDocuments({
        department: "MCA",
        status: { $in: ["RECORDED", "APPROVED"] },
        grantDate: { $gte: rpWindow.startDate, $lte: rpWindow.endDate },
      });
      if (grantedCount > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Cannot declare zero patents granted because ${grantedCount} active patent(s) with grant date in the window exist.`,
            existingCount: grantedCount,
          },
          { status: 409 }
        );
      }
    } else if (activityType === "PATENTS_PUBLISHED") {
      const publishedCount = await Patent.countDocuments({
        department: "MCA",
        status: { $in: ["RECORDED", "APPROVED"] },
        publicationDate: { $gte: rpWindow.startDate, $lte: rpWindow.endDate },
      });
      if (publishedCount > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Cannot declare zero patents published because ${publishedCount} active published patent(s) exist in the window.`,
            existingCount: publishedCount,
          },
          { status: 409 }
        );
      }
    } else if (activityType === "RESEARCH_FUNDING" || activityType === "CONSULTANCY") {
      const pType = activityType === "RESEARCH_FUNDING" ? "SPONSORED_PROJECT" : "CONSULTANCY";
      const prjs = await ProjectConsultancy.find({
        department: "MCA",
        type: pType,
        status: { $in: ["RECORDED", "APPROVED"] },
      }).lean();

      let activeReceiptCount = 0;
      for (const prj of prjs) {
        for (const r of (prj.receipts || [])) {
          if (r.receiptDate && r.receiptDate >= rpWindow.startDate && r.receiptDate <= rpWindow.endDate) {
            activeReceiptCount++;
          } else if (r.financialYear && rpWindow.financialYears.includes(r.financialYear)) {
            activeReceiptCount++;
          }
        }
      }
      if (activeReceiptCount > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Cannot declare zero ${activityType.toLowerCase()} because ${activeReceiptCount} receipt(s) falling within the reporting window exist.`,
            existingCount: activeReceiptCount,
          },
          { status: 409 }
        );
      }
    } else if (activityType === "PLACEMENTS") {
      const goWindow = getGOReportingWindow(academicYear);
      const placedCount = await PlacementRecord.countDocuments({
        department: "MCA",
        status: { $in: ["RECORDED", "APPROVED"] },
        ctc: { $gt: 0 },
        joiningStatus: { $in: ["JOINED", "ACCEPTED"] },
        $or: [
          { placementYear: { $in: goWindow.graduatingYears } },
          { batch: { $in: goWindow.cohortBatches } },
        ],
      });
      if (placedCount > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Cannot declare zero placements because ${placedCount} active placement record(s) exist within the reporting window.`,
            existingCount: placedCount,
          },
          { status: 409 }
        );
      }
    } else if (activityType === "HIGHER_STUDIES") {
      const goWindow = getGOReportingWindow(academicYear);
      const hsInPlacements = await PlacementRecord.countDocuments({
        department: "MCA",
        status: { $in: ["RECORDED", "APPROVED"] },
        higherStudiesStatus: { $in: ["ADMITTED", "PURSUING", "YES"] },
        $or: [
          { placementYear: { $in: goWindow.graduatingYears } },
          { batch: { $in: goWindow.cohortBatches } },
        ],
      });
      const hsInGradOutcomes = await GraduationOutcome.aggregate([
        {
          $match: {
            department: "MCA",
            status: { $in: ["RECORDED", "APPROVED"] },
            batch: { $in: goWindow.cohortBatches },
          },
        },
        { $group: { _id: null, total: { $sum: "$higherStudiesCount" } } },
      ]);
      const totalHs = hsInPlacements + (hsInGradOutcomes[0]?.total || 0);
      if (totalHs > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Cannot declare zero higher studies because ${totalHs} active record(s) indicate higher studies progression in the window.`,
            existingCount: totalHs,
          },
          { status: 409 }
        );
      }
    } else if (activityType === "DOCTORAL_AWARDS") {
      const rpWindow = getRPReportingWindow(academicYear);
      const phdAwards = await DoctoralAward.countDocuments({
        department: "MCA",
        status: { $in: ["RECORDED", "APPROVED"] },
        awardYear: { $gte: rpWindow.startCalendarYear, $lte: rpWindow.endCalendarYear },
      });
      if (phdAwards > 0) {
        return NextResponse.json(
          {
            error: `Conflict: Cannot declare zero doctoral awards because ${phdAwards} active doctoral degree award(s) exist within the reporting window.`,
            existingCount: phdAwards,
          },
          { status: 409 }
        );
      }
    }

    const declaration = await ZeroActivityDeclaration.findOneAndUpdate(
      { department: "MCA", academicYear, activityType },
      {
        department: "MCA",
        academicYear,
        activityType,
        reason: reason || "Explicit zero activity declared by authorized department faculty.",
        declaredBy: authData.user._id,
        declaredByEmail: authData.user.email,
        declaredByName: authData.user.name,
        declaredAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const ipAddress = getClientIp(req);
    const userAgent = getClientUserAgent(req);
    await logAuditEvent({
      action: "record creation",
      userId: authData.user._id,
      userEmail: authData.user.email,
      userRole: authData.user.role,
      department: "MCA",
      resourceType: "ZeroActivityDeclaration",
      resourceId: declaration._id.toString(),
      details: { activityType, academicYear, action: "DECLARED_ZERO_ACTIVITY" },
      status: "SUCCESS",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      message: `Zero activity declared for ${activityType} in ${academicYear}`,
      declaration,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to declare zero activity" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = extractTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const authData = await getSessionUser(token);
    if (!authData) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

    if (!hasRole(authData.user.role, ["DEPARTMENT_ADMIN", "FACULTY_CONTRIBUTOR"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = req.nextUrl;
    const id = searchParams.get("id");
    const activityType = searchParams.get("activityType");
    const academicYear = searchParams.get("academicYear") || "2024-25";

    await connectDB();

    let query: Record<string, any> = { department: "MCA" };
    if (id) {
      query._id = id;
    } else if (activityType) {
      query.activityType = activityType;
      query.academicYear = academicYear;
    } else {
      return NextResponse.json({ error: "Provide id or activityType" }, { status: 400 });
    }

    const deleted = await ZeroActivityDeclaration.findOneAndDelete(query);
    if (!deleted) {
      return NextResponse.json({ error: "Declaration not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Zero activity declaration revoked for ${deleted.activityType}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete zero declaration" },
      { status: 500 }
    );
  }
}
