import { UserRole, ACTIVE_ROLES, ActiveRole } from "@/models/User";

export type Permission =
  | "users:manage"
  | "settings:manage"
  | "records:create"
  | "records:edit_assigned"
  | "records:edit_any"
  | "records:archive"
  | "records:archive_own"
  | "records:restore"
  | "records:delete"
  | "evidence:upload"
  | "evidence:view"
  | "metrics:calculate"
  | "dashboards:view"
  | "records:view_approved"
  | "records:view_all"
  | "reports:generate"
  | "reports:export"
  | "reports:view"
  | "audit:view";

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  DEPARTMENT_ADMIN: [
    "users:manage",
    "settings:manage",
    "records:create",
    "records:edit_assigned",
    "records:edit_any",
    "records:archive",
    "records:restore",
    "records:delete",
    "evidence:upload",
    "evidence:view",
    "metrics:calculate",
    "dashboards:view",
    "records:view_approved",
    "records:view_all",
    "reports:generate",
    "reports:export",
    "reports:view",
    "audit:view",
  ],
  FACULTY_CONTRIBUTOR: [
    "records:create",
    "records:edit_assigned",
    "records:archive_own",
    "evidence:upload",
    "evidence:view",
    "metrics:calculate",
    "dashboards:view",
    "records:view_approved",
    "records:view_all",
    "reports:view",
  ],
  VIEWER: [
    "dashboards:view",
    "records:view_approved",
    "reports:view",
  ],
  // Legacy role: fails closed for all mutations. Must be remapped by administrator.
  REVIEWER: [
    "dashboards:view",
    "records:view_approved",
  ],
};

export const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string; isActive: boolean }> = {
  DEPARTMENT_ADMIN: {
    label: "Department Admin",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    isActive: true,
  },
  FACULTY_CONTRIBUTOR: {
    label: "Faculty Contributor",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    isActive: true,
  },
  VIEWER: {
    label: "Viewer",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
    isActive: true,
  },
  REVIEWER: {
    label: "Legacy Reviewer (Inactive)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    isActive: false,
  },
};

export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return (permissions as readonly Permission[]).includes(permission);
}

export function checkRoleAccess(
  userRole: UserRole | undefined,
  allowedRoles: UserRole[]
): { allowed: boolean; message?: string } {
  if (!userRole) {
    return { allowed: false, message: "Authentication required" };
  }
  if (!allowedRoles.includes(userRole)) {
    return {
      allowed: false,
      message: `Access denied. Requires one of: [${allowedRoles.join(", ")}]. Current role: ${userRole}`,
    };
  }
  return { allowed: true };
}

/**
 * Checks if user is permitted to edit a specific record.
 * Admins can edit any departmental record.
 * Contributors can edit records they created or were explicitly assigned to.
 * Viewers and legacy reviewers cannot edit records.
 */
export function canUserEditRecord(
  user: { _id: string; role: UserRole },
  record: { createdBy?: any; assignedTo?: any; status?: string }
): boolean {
  if (user.role === "DEPARTMENT_ADMIN") return true;
  if (user.role !== "FACULTY_CONTRIBUTOR") return false;

  // Cannot edit archived records unless admin
  if (record.status === "ARCHIVED") return false;

  const userIdStr = user._id.toString();
  const creatorIdStr = (record.createdBy?._id || record.createdBy)?.toString();
  const assignedIdStr = (record.assignedTo?._id || record.assignedTo)?.toString();

  return creatorIdStr === userIdStr || assignedIdStr === userIdStr;
}

/**
 * Checks if user is permitted to archive a record.
 */
export function canUserArchiveRecord(
  user: { _id: string; role: UserRole },
  record: { createdBy?: any }
): boolean {
  if (user.role === "DEPARTMENT_ADMIN") return true;
  if (user.role !== "FACULTY_CONTRIBUTOR") return false;
  const userIdStr = user._id.toString();
  const creatorIdStr = (record.createdBy?._id || record.createdBy)?.toString();
  return creatorIdStr === userIdStr;
}
