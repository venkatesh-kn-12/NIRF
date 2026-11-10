import { UserRole } from "@/models/User";

export type Permission =
  | "users:manage"
  | "settings:manage"
  | "records:create"
  | "records:edit_assigned"
  | "records:edit_any"
  | "records:delete"
  | "evidence:upload"
  | "records:verify"
  | "records:approve"
  | "records:reject"
  | "records:request_correction"
  | "metrics:calculate"
  | "dashboards:view"
  | "records:view_approved"
  | "records:view_all"
  | "audit:view";

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  DEPARTMENT_ADMIN: [
    "users:manage",
    "settings:manage",
    "records:create",
    "records:edit_assigned",
    "records:edit_any",
    "records:delete",
    "evidence:upload",
    "records:verify",
    "records:approve",
    "records:reject",
    "records:request_correction",
    "metrics:calculate",
    "dashboards:view",
    "records:view_approved",
    "records:view_all",
    "audit:view",
  ],
  FACULTY_CONTRIBUTOR: [
    "records:create",
    "records:edit_assigned",
    "evidence:upload",
    "dashboards:view",
    "records:view_approved",
  ],
  REVIEWER: [
    "records:verify",
    "records:approve",
    "records:reject",
    "records:request_correction",
    "dashboards:view",
    "records:view_approved",
    "records:view_all",
    "audit:view",
  ],
  VIEWER: [
    "dashboards:view",
    "records:view_approved",
  ],
};

export const ROLE_LABELS: Record<UserRole, { label: string; badgeClass: string }> = {
  DEPARTMENT_ADMIN: {
    label: "Department Admin",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  FACULTY_CONTRIBUTOR: {
    label: "Faculty Contributor",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  REVIEWER: {
    label: "Reviewer",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
  VIEWER: {
    label: "Viewer",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-200",
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

