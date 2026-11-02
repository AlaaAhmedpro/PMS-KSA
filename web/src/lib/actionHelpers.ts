import { ROLES } from "./constants";
import type { RecordItem, User } from "./types";

/** المسمى الوظيفي المعروض بجانب اسم من أضاف الإجراء */
export function getActorTitle(user: User, record: RecordItem): string {
  if (
    user.role === "branch_manager" &&
    user.departmentId &&
    user.departmentId === record.departmentId
  ) {
    return "مدير الإدارة";
  }
  if (user.role === "employee") {
    return "موظف / مسؤول تنفيذ";
  }
  const role = ROLES.find((r) => r.id === user.role);
  return role?.name || "مستخدم";
}

/** نفس الفرع / المنطقة ونفس الأدارة / الفرع */
export function isRecordInUserBranchAndDept(
  user: User,
  record: RecordItem,
): boolean {
  if (!user.branchId || !user.departmentId) return false;
  return (
    record.branchId === user.branchId &&
    record.departmentId === user.departmentId
  );
}

/** موظف/مسؤول محال إليه على مكاتبة في فرعه وإدارته */
export function isEmployeeAssigneeOnRecord(
  user: User,
  record: RecordItem,
): boolean {
  return (
    user.role === "employee" &&
    user.name === record.assignee &&
    isRecordInUserBranchAndDept(user, record)
  );
}

/** مدير إدارة على مكاتبة في فرعه وإدارته */
export function isDeptManagerOnRecord(user: User, record: RecordItem): boolean {
  return user.role === "branch_manager" && isRecordInUserBranchAndDept(user, record);
}

/** يستطيع تنفيذ إجراءات سير العمل (إضافة إجراء / تم التنفيذ) على هذه المكاتبة */
export function canUserExecuteOnRecord(
  user: User | null,
  record: RecordItem,
): boolean {
  if (!user) return false;
  if (user.role === "planning") return false;
  return isEmployeeAssigneeOnRecord(user, record) || isDeptManagerOnRecord(user, record);
}

/** هل يرى الموظف/مدير الإدارة هذه المكاتبة في قائمته */
export function canUserViewRecordInList(
  user: User | null,
  record: RecordItem,
): boolean {
  if (!user) return true;
  if (user.role !== "employee" && user.role !== "branch_manager") return true;
  return canUserExecuteOnRecord(user, record);
}

export function canUserAddAction(
  user: User | null,
  record: RecordItem,
  status: string,
  hasExecutePermission: boolean,
): boolean {
  if (!user || !hasExecutePermission) return false;
  if (
    status === "closed" ||
    status === "info" ||
    status === "new" ||
    status === "done"
  ) {
    return false;
  }
  return canUserExecuteOnRecord(user, record);
}

export function canUserMarkRecordDone(
  user: User | null,
  record: RecordItem,
  status: string,
  hasExecutePermission: boolean,
): boolean {
  if (!user || !hasExecutePermission) return false;
  if (status !== "active" && status !== "overdue") return false;
  return canUserExecuteOnRecord(user, record);
}
