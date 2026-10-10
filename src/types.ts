export type UserRole = 'student' | 'parent' | 'warden' | 'watchman';

export type Gender = 'Male' | 'Female' | 'Other';

export type StudyYear = '1st Year' | '2nd Year' | '3rd Year' | '4th Year' | 'PG / Research';

export type HostelBlock = 
  | 'Boys hostel-1'
  | 'Boys hostel-2'
  | 'Boys hostel (seniors)-3'
  | 'Girl hostel';

export interface StudentProfile {
  id: string;
  name: string;
  rollNumber: string; // College Roll Number
  email: string; // College official email
  collegeName: string;
  password?: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string; // Linking key to parent
  profilePic: string; // Base64 or image URL
  dob: string;
  year: StudyYear;
  course: string;
  gender: Gender;
  hostelBlock: HostelBlock;
  roomNumber: string;
  studentPhone: string;
  createdAt: string;
  campusStatus: 'IN_CAMPUS' | 'OUT_ON_OUTING' | 'OUT_ON_LEAVE' | 'OVERDUE';
}

export interface ParentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  relation: 'Father' | 'Mother' | 'Guardian';
  password?: string;
  linkedStudentRoll: string;
  linkedStudentName: string;
  createdAt: string;
}

export interface WardenProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  assignedBlocks: HostelBlock[];
  activeRequestCount: number; // max 100 requests per warden
  maxCapacity: number; // 100
  shift: 'Morning (06:00 - 14:00)' | 'Evening (14:00 - 22:00)' | 'Night (22:00 - 06:00)' | 'General Shift';
  createdAt: string;
}

export interface WatchmanProfile {
  id: string;
  name: string;
  phone: string;
  collegeProofId: string; // e.g. ID card or document base64
  gatePost: string; // e.g. "Main Gate 1", "South Campus Gate"
  createdAt: string;
}

export type RequestType = 'Outing' | 'Home Leave';

export type RequestStatus = 
  | 'PENDING_PARENT'
  | 'REJECTED_BY_PARENT'
  | 'PENDING_WARDEN'
  | 'REJECTED_BY_WARDEN'
  | 'APPROVED_PASS_GENERATED'
  | 'STUDENT_EXITED_CAMPUS' // Scanned OUT by watchman
  | 'COMPLETED_RETURNED';   // Scanned IN by watchman (pass closed)

export interface LeaveRequest {
  id: string;
  passNumber: string; // e.g., HP-2026-8942
  studentId: string;
  studentRollNumber: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  profilePic: string;
  collegeName: string;
  hostelBlock: HostelBlock;
  roomNumber: string;
  course: string;
  year: StudyYear;
  
  parentName: string;
  parentEmail: string;
  parentPhone: string;
  
  requestType: RequestType;
  leavingDateTime: string;
  returnDateTime: string;
  reason: string;
  destination: string;
  emergencyContact: string;
  
  status: RequestStatus;
  createdAt: string;
  
  // Parent Approval details
  parentApprovedAt?: string;
  parentRemarks?: string;
  parentRejectedAt?: string;
  parentRejectionReason?: string;
  
  // Warden Approval details
  assignedWardenId?: string;
  assignedWardenName?: string;
  wardenApprovedAt?: string;
  wardenRemarks?: string;
  wardenRejectedAt?: string;
  wardenRejectionReason?: string;
  
  // Gate Security / Watchman Verification details
  exitScanTime?: string;
  exitWatchmanName?: string;
  exitGate?: string;
  
  returnScanTime?: string;
  returnWatchmanName?: string;
  returnGate?: string;
  
  // QR Code payload
  qrToken?: string;
}

export interface GateLog {
  id: string;
  requestId: string;
  passNumber: string;
  studentRollNumber: string;
  studentName: string;
  hostelBlock: string;
  roomNumber: string;
  scanType: 'OUT' | 'IN';
  timestamp: string;
  watchmanName: string;
  gatePost: string;
  remarks?: string;
}

export interface AppNotification {
  id: string;
  recipientRole: UserRole;
  recipientIdentifier: string; // email, rollNumber, or 'all'
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success' | 'emergency';
  requestId?: string;
  urgentBypass?: boolean;
}

export interface OtpSession {
  targetPhone: string;
  targetRole: UserRole;
  code: string;
  expiresAt: number;
  secondaryPhone?: string;
  secondaryCode?: string;
  messagePreview: string;
  pendingUser?: any;
}

