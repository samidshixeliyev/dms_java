export interface User {
  id: number
  username: string
  name: string
  surname: string
  email: string
  userRole: 'admin' | 'manager' | 'user' | 'executor'
  executorId?: number
  departmentId?: number
  forcePasswordChange: boolean
  deleted: boolean
}

export interface AuthUser {
  id: number
  username: string
  role: string
  mustChangePassword: boolean
  executorId?: number
  departmentId?: number
}

export interface Department {
  id: number
  name: string
  parentId?: number
  canAssign: boolean
  children?: Department[]
}

export interface Executor {
  id: number
  name: string
  position?: string
  departmentId: number
  department?: Department
}

export interface ActType {
  id: number
  name: string
}

export interface IssuingAuthority {
  id: number
  name: string
}

export interface ExecutionNote {
  id: number
  note: string
}

export interface LegalActExecutorLink {
  id: number
  legalActId: number
  executorId: number
  executor?: Executor
  role: 'main' | 'helper'
  taskDescription?: string
}

export interface ExecutorStatusLog {
  id: number
  legalAct?: LegalAct
  user?: User
  executionNote?: ExecutionNote
  customNote?: string
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'partial'
  approvedBy?: number
  approvalNote?: string
  approvedAt?: string
  createdAt: string
  attachments?: ExecutionAttachment[]
}

export interface ExecutionAttachment {
  id: number
  originalName: string
  mimeType?: string
  fileSize: number
  createdAt: string
}

export interface LegalAct {
  id: number
  organizationId?: number
  organization?: Department
  actTypeId?: number
  actType?: ActType
  issuedById?: number
  issuedBy?: IssuingAuthority
  legalActNumber: string
  legalActDate: string
  summary?: string
  taskNumber?: string
  taskDescription?: string
  executionDeadline?: string
  relatedDocumentNumber?: string
  relatedDocumentDate?: string
  proofRequired: boolean
  insertedUserId?: number
  insertedUser?: User
  createdAt: string
  statusLogs?: ExecutorStatusLog[]
  executorLinks?: LegalActExecutorLink[]
  attachments?: ExecutionAttachment[]
}

export interface Announcement {
  id: number
  title: string
  message: string
  active: boolean
  createdBy?: number
  createdAt: string
}

export interface ActivityLog {
  id: number
  userId?: number
  user?: User
  action: string
  subjectType?: string
  subjectId?: number
  description: string
  ipAddress?: string
  createdAt: string
}

export interface PageResponse<T> {
  data: T[]
  total: number
  page: number
  size: number
  totalPages: number
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data?: T
}

export interface ReportStat {
  executorId: number
  executorName: string
  departmentName: string
  total: number
  executed: number
  pendingApproval: number
  rejected: number
  inProgress: number
  notStarted: number
  overdue: number
  executionRate: number
}
