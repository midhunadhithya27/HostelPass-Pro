import { 
  StudentProfile, 
  ParentProfile, 
  WardenProfile, 
  WatchmanProfile, 
  LeaveRequest, 
  GateLog, 
  AppNotification, 
  UserRole,
  OtpSession,
  HostelBlock
} from '../types';
import { soundService } from './soundService';

const STORAGE_KEYS = {
  PURGE_FLAG: 'hostelpass_v4_purged_flag',
  STUDENTS: 'hostelpass_v4_students',
  PARENTS: 'hostelpass_v4_parents',
  WARDENS: 'hostelpass_v4_wardens',
  WATCHMEN: 'hostelpass_v4_watchmen',
  REQUESTS: 'hostelpass_v4_requests',
  GATE_LOGS: 'hostelpass_v4_gatelogs',
  NOTIFICATIONS: 'hostelpass_v4_notifications',
  CURRENT_USER: 'hostelpass_v4_current_user',
  CURRENT_ROLE: 'hostelpass_v4_current_role',
  ACTIVE_OTP: 'hostelpass_v4_active_otp',
};

// 100% clean initial state: zero pre-existing students, parents, wardens, or requests
const INITIAL_STUDENTS: StudentProfile[] = [];
const INITIAL_PARENTS: ParentProfile[] = [];
const INITIAL_WARDENS: WardenProfile[] = [];
const INITIAL_WATCHMEN: WatchmanProfile[] = [];
const INITIAL_REQUESTS: LeaveRequest[] = [];
const INITIAL_GATE_LOGS: GateLog[] = [];
const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Helper to broadcast state changes across tabs
const broadcastChannel = typeof window !== 'undefined' && 'BroadcastChannel' in window 
  ? new BroadcastChannel('hostelpass_sync_channel') 
  : null;

class HostelStore {
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      // Purge all legacy and existing data about students, parents, and wardens
      try {
        if (!localStorage.getItem(STORAGE_KEYS.PURGE_FLAG)) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('hostelpass_')) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
          localStorage.setItem(STORAGE_KEYS.PURGE_FLAG, 'true');
        }
      } catch (e) {
        console.warn('LocalStorage initial purge error:', e);
      }

      window.addEventListener('storage', (e) => {
        if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
          this.notifyListeners();
        }
      });

      if (broadcastChannel) {
        broadcastChannel.onmessage = (msg) => {
          if (msg.data?.type === 'STATE_CHANGE') {
            this.notifyListeners();
            if (msg.data?.sound === 'ping') soundService.playNotificationPing();
            if (msg.data?.sound === 'success') soundService.playSuccessChime();
            if (msg.data?.sound === 'scan') soundService.playGateScanBeep();
            if (msg.data?.sound === 'emergency') soundService.playEmergencyBypassSiren();
          }
        };
      }
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(soundType?: 'ping' | 'success' | 'scan' | 'emergency') {
    this.listeners.forEach((fn) => fn());
    if (broadcastChannel && typeof window !== 'undefined') {
      broadcastChannel.postMessage({ type: 'STATE_CHANGE', sound: soundType });
    }
    if (soundType === 'ping') soundService.playNotificationPing();
    if (soundType === 'success') soundService.playSuccessChime();
    if (soundType === 'scan') soundService.playGateScanBeep();
    if (soundType === 'emergency') soundService.playEmergencyBypassSiren();
  }

  // Generic getter & setter with defaults
  private get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage write error:', e);
    }
  }

  // --- ENTITY GETTERS ---
  getStudents(): StudentProfile[] {
    return this.get(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  }

  getParents(): ParentProfile[] {
    return this.get(STORAGE_KEYS.PARENTS, INITIAL_PARENTS);
  }

  getWardens(): WardenProfile[] {
    return this.get(STORAGE_KEYS.WARDENS, INITIAL_WARDENS);
  }

  getWatchmen(): WatchmanProfile[] {
    return this.get(STORAGE_KEYS.WATCHMEN, INITIAL_WATCHMEN);
  }

  getRequests(): LeaveRequest[] {
    return this.get(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS);
  }

  getGateLogs(): GateLog[] {
    return this.get(STORAGE_KEYS.GATE_LOGS, INITIAL_GATE_LOGS);
  }

  getNotifications(): AppNotification[] {
    return this.get(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
  }

  getCurrentRole(): UserRole {
    return this.get<UserRole>(STORAGE_KEYS.CURRENT_ROLE, 'student');
  }

  setCurrentRole(role: UserRole) {
    // If a person is logged into any role, do NOT allow them to switch roles!
    if (this.getCurrentUser()) {
      return;
    }
    this.set(STORAGE_KEYS.CURRENT_ROLE, role);
    this.notifyListeners();
  }

  getCurrentUser(): StudentProfile | ParentProfile | WardenProfile | WatchmanProfile | null {
    // Return exclusively the actual authenticated session user - zero fake/mock user fallbacks
    return this.get<any>(STORAGE_KEYS.CURRENT_USER, null);
  }

  setCurrentUser(user: any) {
    this.set(STORAGE_KEYS.CURRENT_USER, user);
    this.notifyListeners();
  }

  getActiveOtp(): OtpSession | null {
    return this.get<OtpSession | null>(STORAGE_KEYS.ACTIVE_OTP, null);
  }

  setActiveOtp(otp: OtpSession | null) {
    this.set(STORAGE_KEYS.ACTIVE_OTP, otp);
    this.notifyListeners('ping');
  }

  // --- REGISTRATIONS ---

  // 1. Student Registration
  registerStudent(data: Omit<StudentProfile, 'id' | 'createdAt' | 'campusStatus'>): { success: boolean; message: string; student?: StudentProfile } {
    const students = this.getStudents();
    
    // Check if roll number already registered
    if (students.some(s => s.rollNumber.trim().toUpperCase() === data.rollNumber.trim().toUpperCase())) {
      return { success: false, message: `Roll Number ${data.rollNumber} is already registered!` };
    }

    // Check if official email already used
    if (students.some(s => s.email.trim().toLowerCase() === data.email.trim().toLowerCase())) {
      return { success: false, message: `Official email ${data.email} is already in use!` };
    }

    const newStudent: StudentProfile = {
      ...data,
      id: `stud-${Date.now()}`,
      rollNumber: data.rollNumber.trim().toUpperCase(),
      email: data.email.trim().toLowerCase(),
      parentEmail: data.parentEmail.trim().toLowerCase(),
      createdAt: new Date().toISOString(),
      campusStatus: 'IN_CAMPUS',
    };

    const updated = [newStudent, ...students];
    this.set(STORAGE_KEYS.STUDENTS, updated);
    this.setCurrentUser(newStudent);
    this.setCurrentRole('student');

    // Add welcoming notification
    this.addNotification({
      recipientRole: 'student',
      recipientIdentifier: newStudent.rollNumber,
      title: '🎓 Welcome to HostelPass Pro!',
      message: `Your account has been registered under ${newStudent.hostelBlock}, Room ${newStudent.roomNumber}.`,
      type: 'info'
    });

    this.notifyListeners('success');
    return { success: true, message: 'Student registered successfully!', student: newStudent };
  }

  // 2. Parent Registration
  // User Prompt: "allow only one registration either for their mother or father. Except password everything should match with the respective student"
  registerParent(data: {
    name: string;
    email: string;
    phone: string;
    relation: 'Father' | 'Mother' | 'Guardian';
    password?: string;
  }): { success: boolean; message: string; parent?: ParentProfile } {
    const students = this.getStudents();
    const parents = this.getParents();

    const normalizedEmail = data.email.trim().toLowerCase();
    const cleanPhone = data.phone.replace(/[\s-]/g, '');

    // Match with student's parentEmail & parentPhone
    const matchedStudent = students.find(s => {
      const sParentEmail = s.parentEmail.trim().toLowerCase();
      const sParentPhone = s.parentPhone.replace(/[\s-]/g, '');
      return sParentEmail === normalizedEmail || sParentPhone === cleanPhone;
    });

    if (!matchedStudent) {
      return {
        success: false,
        message: `No student record found matching parent email (${data.email}) and phone (${data.phone}). Please ensure your child has registered first with exact matching parent details.`
      };
    }

    // Verify name matches loosely or strictly
    const parentNameClean = data.name.trim().toLowerCase();
    const studentParentNameClean = matchedStudent.parentName.trim().toLowerCase();
    const matchesName = studentParentNameClean.includes(parentNameClean) || parentNameClean.includes(studentParentNameClean);

    if (!matchesName) {
      return {
        success: false,
        message: `Parent name "${data.name}" does not match the name recorded by student "${matchedStudent.parentName}".`
      };
    }

    // Constraint: Allow only ONE registration per student (either mother or father)
    const existingParent = parents.find(p => p.linkedStudentRoll === matchedStudent.rollNumber);
    if (existingParent) {
      return {
        success: false,
        message: `A parent account (${existingParent.relation} - ${existingParent.name}) is already registered for student ${matchedStudent.name} (${matchedStudent.rollNumber}). Only one parent registration is permitted per student.`
      };
    }

    const newParent: ParentProfile = {
      id: `parent-${Date.now()}`,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone.trim(),
      relation: data.relation,
      password: data.password || 'password123',
      linkedStudentRoll: matchedStudent.rollNumber,
      linkedStudentName: matchedStudent.name,
      createdAt: new Date().toISOString(),
    };

    const updated = [newParent, ...parents];
    this.set(STORAGE_KEYS.PARENTS, updated);
    this.setCurrentUser(newParent);
    this.setCurrentRole('parent');

    this.addNotification({
      recipientRole: 'parent',
      recipientIdentifier: newParent.email,
      title: '🏡 Parent Portal Connected!',
      message: `Your account is securely linked with student ${matchedStudent.name} (${matchedStudent.rollNumber}).`,
      type: 'success'
    });

    this.notifyListeners('success');
    return { success: true, message: 'Parent account registered and linked successfully!', parent: newParent };
  }

  // 3. Warden Registration
  // Prompt: "link wardens and every students to help them to approve the leave request after parents approval, also allow maximum 100 request to one warden if it exceeds push next 100 requests to another warden"
  registerWarden(data: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    assignedBlocks?: HostelBlock[];
  }): { success: boolean; message: string; warden?: WardenProfile } {
    const wardens = this.getWardens();
    const normalizedEmail = data.email.trim().toLowerCase();

    if (wardens.some(w => w.email.trim().toLowerCase() === normalizedEmail)) {
      return { success: false, message: `Warden with email ${data.email} already exists!` };
    }

    const newWarden: WardenProfile = {
      id: `warden-${Date.now()}`,
      name: data.name.trim(),
      email: normalizedEmail,
      phone: data.phone.trim(),
      password: data.password || 'password123',
      assignedBlocks: data.assignedBlocks || ['Thamarai Block (Men)', 'Kurunji Block (Women)'],
      activeRequestCount: 0,
      maxCapacity: 100,
      shift: 'General Shift',
      createdAt: new Date().toISOString(),
    };

    const updated = [newWarden, ...wardens];
    this.set(STORAGE_KEYS.WARDENS, updated);
    this.setCurrentUser(newWarden);
    this.setCurrentRole('warden');

    this.notifyListeners('success');
    return { success: true, message: 'Warden registered successfully!', warden: newWarden };
  }

  // 4. Watchman Registration
  // Prompt: "The registration should ask the following details from the watchman, his name , phone number, college working proof id/or something else as a photo or a file."
  registerWatchman(data: {
    name: string;
    phone: string;
    collegeProofId: string;
    gatePost?: string;
  }): { success: boolean; message: string; watchman?: WatchmanProfile } {
    const watchmen = this.getWatchmen();
    const cleanPhone = data.phone.replace(/[\s-]/g, '');

    if (watchmen.some(w => w.phone.replace(/[\s-]/g, '') === cleanPhone)) {
      return { success: false, message: `Watchman with phone ${data.phone} is already registered!` };
    }

    const newWatchman: WatchmanProfile = {
      id: `watchman-${Date.now()}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      collegeProofId: data.collegeProofId || 'AU-SECURITY-VERIFIED',
      gatePost: data.gatePost || 'Main Gate 1 - CEG Campus',
      createdAt: new Date().toISOString(),
    };

    const updated = [newWatchman, ...watchmen];
    this.set(STORAGE_KEYS.WATCHMEN, updated);
    this.setCurrentUser(newWatchman);
    this.setCurrentRole('watchman');

    this.notifyListeners('success');
    return { success: true, message: 'Security Officer registered successfully!', watchman: newWatchman };
  }

  // --- OTP GENERATION & VERIFICATION DISPATCH ---

  // Dispatches OTP simulation
  sendOtp(targetRole: UserRole, targetPhone: string, previewMessage: string, secondaryPhone?: string, pendingUser?: any): OtpSession {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const secondaryCode = secondaryPhone ? Math.floor(100000 + Math.random() * 900000).toString() : undefined;

    const otpSession: OtpSession = {
      targetRole,
      targetPhone,
      code,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      secondaryPhone,
      secondaryCode,
      messagePreview: previewMessage,
      pendingUser,
    };

    this.setActiveOtp(otpSession);
    return otpSession;
  }

  verifyOtp(enteredCode: string, secondaryEnteredCode?: string): boolean {
    const active = this.getActiveOtp();
    if (!active) return false;
    if (Date.now() > active.expiresAt) return false;

    // Check primary code
    const primaryValid = active.code === enteredCode.trim();
    if (!primaryValid) return false;

    // If secondary was required (Parent dual OTP)
    if (active.secondaryCode) {
      if (!secondaryEnteredCode || active.secondaryCode !== secondaryEnteredCode.trim()) {
        return false;
      }
    }

    // Authenticate and lock into session
    if (active.pendingUser) {
      this.set(STORAGE_KEYS.CURRENT_USER, active.pendingUser);
      this.set(STORAGE_KEYS.CURRENT_ROLE, active.targetRole);
    }

    this.setActiveOtp(null);
    this.notifyListeners();
    return true;
  }

  // --- LEAVE / OUTING REQUESTS LIFECYCLE ---

  // Student Submits New Request
  createLeaveRequest(data: {
    studentRollNumber: string;
    requestType: 'Outing' | 'Home Leave';
    leavingDateTime: string;
    returnDateTime: string;
    reason: string;
    destination: string;
    emergencyContact: string;
  }): { success: boolean; message: string; request?: LeaveRequest } {
    const students = this.getStudents();
    const student = students.find(s => s.rollNumber === data.studentRollNumber);

    if (!student) {
      return { success: false, message: 'Student profile not found!' };
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const passNumber = `HP-${new Date().getFullYear()}-${randomSuffix}`;

    const newRequest: LeaveRequest = {
      id: `req-${Date.now()}`,
      passNumber,
      studentId: student.id,
      studentRollNumber: student.rollNumber,
      studentName: student.name,
      studentEmail: student.email,
      studentPhone: student.studentPhone,
      profilePic: student.profilePic,
      collegeName: student.collegeName,
      hostelBlock: student.hostelBlock,
      roomNumber: student.roomNumber,
      course: student.course,
      year: student.year,
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      parentPhone: student.parentPhone,
      requestType: data.requestType,
      leavingDateTime: data.leavingDateTime,
      returnDateTime: data.returnDateTime,
      reason: data.reason,
      destination: data.destination,
      emergencyContact: data.emergencyContact || student.parentPhone,
      status: 'PENDING_PARENT',
      createdAt: new Date().toISOString(),
    };

    const requests = [newRequest, ...this.getRequests()];
    this.set(STORAGE_KEYS.REQUESTS, requests);

    // Prompt Requirement: "The parent should get the approval request from their student at real-time and they need to approve it, notify them every 5 minutes even though they ignored the msg from the app, allow emergency bypass"
    this.addNotification({
      recipientRole: 'parent',
      recipientIdentifier: student.parentEmail,
      title: `🚨 Urgent: New ${data.requestType} Approval Request`,
      message: `${student.name} (${student.rollNumber}) submitted an approval request for ${data.requestType} to ${data.destination}. Parent approval is strictly required before warden dispatch.`,
      type: 'emergency',
      requestId: newRequest.id,
      urgentBypass: true,
    });

    this.notifyListeners('emergency');
    return { success: true, message: 'Request submitted successfully! Dispatched to parent for real-time authorization.', request: newRequest };
  }

  // Parent Approves Request
  // Prompt: "note that warden should only get the approval request if and only if parent approves the students leave request otherwise don't send the request to the warden at all."
  // Prompt: "also allow maximum 100 request to one warden if it exceeds push next 100 requests to another warden don't send the same requests to more than one warden don't repeat the requests!!"
  parentApproveRequest(requestId: string, remarks: string = 'Approved by Parent'): { success: boolean; message: string } {
    const requests = this.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);

    if (reqIndex === -1) {
      return { success: false, message: 'Request not found' };
    }

    const req = requests[reqIndex];
    if (req.status !== 'PENDING_PARENT') {
      return { success: false, message: `Cannot approve request with current status: ${req.status}` };
    }

    // Intelligent Load Balancing for Wardens:
    // Select warden matching the block with activeRequestCount < 100, or lowest load
    const wardens = this.getWardens();
    if (wardens.length === 0) {
      return { success: false, message: 'No registered hostel wardens available in system' };
    }

    // Find wardens who have capacity (< 100)
    let eligibleWardens = wardens.filter(w => (w.activeRequestCount || 0) < 100);
    if (eligibleWardens.length === 0) {
      // If all are at 100, take the one with least load
      eligibleWardens = [...wardens].sort((a, b) => (a.activeRequestCount || 0) - (b.activeRequestCount || 0));
    }

    // Prefer warden assigned to the student's hostel block
    let assignedWarden = eligibleWardens.find(w => w.assignedBlocks?.includes(req.hostelBlock));
    if (!assignedWarden) {
      // Otherwise route to the warden with minimum queue
      assignedWarden = eligibleWardens.sort((a, b) => (a.activeRequestCount || 0) - (b.activeRequestCount || 0))[0];
    }

    // Increment selected warden's count
    assignedWarden.activeRequestCount = (assignedWarden.activeRequestCount || 0) + 1;
    this.set(STORAGE_KEYS.WARDENS, wardens);

    // Update Request
    const updatedRequest: LeaveRequest = {
      ...req,
      status: 'PENDING_WARDEN',
      parentApprovedAt: new Date().toISOString(),
      parentRemarks: remarks,
      assignedWardenId: assignedWarden.id,
      assignedWardenName: assignedWarden.name,
    };

    requests[reqIndex] = updatedRequest;
    this.set(STORAGE_KEYS.REQUESTS, requests);

    // Send Real-Time push notifications:
    // 1. Notify Student
    this.addNotification({
      recipientRole: 'student',
      recipientIdentifier: req.studentRollNumber,
      title: '✅ Parent Authorization Received!',
      message: `Your parent approved your ${req.requestType} request. It has now moved to Warden ${assignedWarden.name} for final pass authorization.`,
      type: 'success',
      requestId: req.id,
    });

    // 2. Notify ONLY the single Assigned Warden (no duplicates!)
    this.addNotification({
      recipientRole: 'warden',
      recipientIdentifier: assignedWarden.id,
      title: `📋 Leave Request Queued (#${req.passNumber})`,
      message: `Parent approved ${req.requestType} for ${req.studentName} (${req.studentRollNumber} - ${req.hostelBlock}). Assigned to your queue (${assignedWarden.activeRequestCount}/100 slots).`,
      type: 'info',
      requestId: req.id,
    });

    this.notifyListeners('ping');
    return { success: true, message: `Approved! Dispatched to Warden ${assignedWarden.name}.` };
  }

  // Parent Rejects Request
  parentRejectRequest(requestId: string, reason: string): { success: boolean; message: string } {
    const requests = this.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);

    if (reqIndex === -1) return { success: false, message: 'Request not found' };
    const req = requests[reqIndex];

    const updatedRequest: LeaveRequest = {
      ...req,
      status: 'REJECTED_BY_PARENT',
      parentRejectedAt: new Date().toISOString(),
      parentRejectionReason: reason || 'Parent declined outing/leave.',
    };

    requests[reqIndex] = updatedRequest;
    this.set(STORAGE_KEYS.REQUESTS, requests);

    // Notify Student
    this.addNotification({
      recipientRole: 'student',
      recipientIdentifier: req.studentRollNumber,
      title: '❌ Leave Request Declined by Parent',
      message: `Your parent declined the ${req.requestType} request. Reason: "${reason}". The request has NOT been sent to the warden.`,
      type: 'warning',
      requestId: req.id,
    });

    this.notifyListeners('ping');
    return { success: true, message: 'Request rejected. Warden will not be notified.' };
  }

  // Warden Approves Request
  // Prompt: "Once warden approved the request the student should get the approval accepted msg from the app at that time a one-time useable qr should be generated separately for each student."
  wardenApproveRequest(requestId: string, remarks: string = 'Approved by Hostel Warden'): { success: boolean; message: string } {
    const requests = this.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);

    if (reqIndex === -1) return { success: false, message: 'Request not found' };
    const req = requests[reqIndex];

    if (req.status !== 'PENDING_WARDEN') {
      return { success: false, message: `Cannot approve request with status: ${req.status}` };
    }

    const qrToken = `PASS-TOKEN-${req.passNumber}-${req.studentRollNumber}-${Date.now().toString(36).toUpperCase()}`;

    const updatedRequest: LeaveRequest = {
      ...req,
      status: 'APPROVED_PASS_GENERATED',
      wardenApprovedAt: new Date().toISOString(),
      wardenRemarks: remarks,
      qrToken,
    };

    requests[reqIndex] = updatedRequest;
    this.set(STORAGE_KEYS.REQUESTS, requests);

    // Decrement warden active count
    const wardens = this.getWardens();
    const warden = wardens.find(w => w.id === req.assignedWardenId);
    if (warden && (warden.activeRequestCount || 0) > 0) {
      warden.activeRequestCount -= 1;
      this.set(STORAGE_KEYS.WARDENS, wardens);
    }

    // Notify Student with celebratory fanfare
    this.addNotification({
      recipientRole: 'student',
      recipientIdentifier: req.studentRollNumber,
      title: '🎉 Gatepass Approved & QR Generated!',
      message: `Your ${req.requestType} request #${req.passNumber} has been officially approved by the Warden! Your one-time secure QR gatepass is now active. Present it to the gate security officer upon exiting.`,
      type: 'success',
      requestId: req.id,
    });

    // Notify Parent
    this.addNotification({
      recipientRole: 'parent',
      recipientIdentifier: req.parentEmail,
      title: '✅ Outpass Approved by Warden',
      message: `Warden has approved the gatepass for ${req.studentName}. Active QR generated for departure.`,
      type: 'info',
      requestId: req.id,
    });

    this.notifyListeners('success');
    return { success: true, message: 'Gatepass approved! QR code generated for student.' };
  }

  // Warden Rejects Request
  wardenRejectRequest(requestId: string, reason: string): { success: boolean; message: string } {
    const requests = this.getRequests();
    const reqIndex = requests.findIndex(r => r.id === requestId);

    if (reqIndex === -1) return { success: false, message: 'Request not found' };
    const req = requests[reqIndex];

    const updatedRequest: LeaveRequest = {
      ...req,
      status: 'REJECTED_BY_WARDEN',
      wardenRejectedAt: new Date().toISOString(),
      wardenRejectionReason: reason || 'Declined by Warden due to institutional policy.',
    };

    requests[reqIndex] = updatedRequest;
    this.set(STORAGE_KEYS.REQUESTS, requests);

    // Decrement warden active count
    const wardens = this.getWardens();
    const warden = wardens.find(w => w.id === req.assignedWardenId);
    if (warden && (warden.activeRequestCount || 0) > 0) {
      warden.activeRequestCount -= 1;
      this.set(STORAGE_KEYS.WARDENS, wardens);
    }

    // Notify Student
    this.addNotification({
      recipientRole: 'student',
      recipientIdentifier: req.studentRollNumber,
      title: '❌ Pass Declined by Warden',
      message: `Your ${req.requestType} request #${req.passNumber} was declined by the Warden. Reason: "${reason}".`,
      type: 'warning',
      requestId: req.id,
    });

    this.notifyListeners('ping');
    return { success: true, message: 'Request rejected by warden.' };
  }

  // --- WATCHMAN / SECURITY GATE SCANNING (IN & OUT) ---
  // Prompt: "he is one who scans the qr shown by the student and once he scanned it should update in the server that the student is now officially out of the campus(college). The server should contain these details separately for each student and their parents and wardens, it should also keep in count of how many students are leaving the campus. This qr should be valid until the student scans it when he again enters the campus. The watchman should have both in and out qr scanning option such that the count of student who enter the college and enters balances."

  processGateScan(
    scanInput: string, 
    scanType: 'OUT' | 'IN', 
    watchmanName: string, 
    gatePost: string
  ): { success: boolean; message: string; request?: LeaveRequest; student?: StudentProfile } {
    const requests = this.getRequests();
    const students = this.getStudents();
    const query = scanInput.trim().toUpperCase();

    // Match either by passNumber, qrToken, or rollNumber
    const reqIndex = requests.findIndex(r => 
      r.passNumber.toUpperCase() === query ||
      (r.qrToken && r.qrToken.toUpperCase() === query) ||
      (r.studentRollNumber.toUpperCase() === query && ['APPROVED_PASS_GENERATED', 'STUDENT_EXITED_CAMPUS'].includes(r.status))
    );

    if (reqIndex === -1) {
      return { 
        success: false, 
        message: `Invalid or unapproved pass! No active authorized gatepass found for code "${scanInput}".` 
      };
    }

    const req = requests[reqIndex];
    const studentIndex = students.findIndex(s => s.rollNumber === req.studentRollNumber);
    const student = studentIndex !== -1 ? students[studentIndex] : null;

    if (scanType === 'OUT') {
      if (req.status !== 'APPROVED_PASS_GENERATED') {
        if (req.status === 'STUDENT_EXITED_CAMPUS') {
          return { success: false, message: `Student ${req.studentName} is ALREADY recorded as OUT of campus since ${new Date(req.exitScanTime || '').toLocaleTimeString()}!` };
        }
        if (req.status === 'COMPLETED_RETURNED') {
          return { success: false, message: `This pass #${req.passNumber} was already completed & closed on ${new Date(req.returnScanTime || '').toLocaleDateString()}. Cannot be reused.` };
        }
        return { success: false, message: `Pass #${req.passNumber} is currently ${req.status} and cannot be used for exit!` };
      }

      // Mark student OUT
      const now = new Date().toISOString();
      const updatedReq: LeaveRequest = {
        ...req,
        status: 'STUDENT_EXITED_CAMPUS',
        exitScanTime: now,
        exitWatchmanName: watchmanName,
        exitGate: gatePost,
      };

      requests[reqIndex] = updatedReq;
      this.set(STORAGE_KEYS.REQUESTS, requests);

      // Update student profile status
      if (student) {
        student.campusStatus = req.requestType === 'Outing' ? 'OUT_ON_OUTING' : 'OUT_ON_LEAVE';
        this.set(STORAGE_KEYS.STUDENTS, students);
      }

      // Add to Gate Log
      const gateLog: GateLog = {
        id: `log-${Date.now()}`,
        requestId: req.id,
        passNumber: req.passNumber,
        studentRollNumber: req.studentRollNumber,
        studentName: req.studentName,
        hostelBlock: req.hostelBlock,
        roomNumber: req.roomNumber,
        scanType: 'OUT',
        timestamp: now,
        watchmanName,
        gatePost,
        remarks: `EXIT VERIFIED: Student departed campus via ${gatePost}. Destination: ${req.destination}.`,
      };
      this.set(STORAGE_KEYS.GATE_LOGS, [gateLog, ...this.getGateLogs()]);

      // Notify Parent in Real-Time
      this.addNotification({
        recipientRole: 'parent',
        recipientIdentifier: req.parentEmail,
        title: '🚶 Child Departed Campus Gate',
        message: `Security Update: ${req.studentName} has checked OUT through ${gatePost} at ${new Date().toLocaleTimeString()} on ${req.requestType} pass.`,
        type: 'info',
        requestId: req.id,
      });

      // Notify Student
      this.addNotification({
        recipientRole: 'student',
        recipientIdentifier: req.studentRollNumber,
        title: 'Gate Pass Scanned: Exit Recorded',
        message: `You have successfully checked OUT of campus at ${gatePost}. Ensure you return and scan IN before ${new Date(req.returnDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        type: 'info',
        requestId: req.id,
      });

      this.notifyListeners('scan');
      return { 
        success: true, 
        message: `EXIT GRANTED: ${req.studentName} (${req.studentRollNumber}) officially recorded OUT of campus!`,
        request: updatedReq,
        student: student || undefined,
      };
    } else {
      // IN SCAN (Student returns to campus)
      if (req.status !== 'STUDENT_EXITED_CAMPUS') {
        if (req.status === 'COMPLETED_RETURNED') {
          return { success: false, message: `Student has already checked IN. Pass #${req.passNumber} is closed.` };
        }
        if (req.status === 'APPROVED_PASS_GENERATED') {
          return { success: false, message: `Student ${req.studentName} has not exited campus yet! Please scan OUT first.` };
        }
        return { success: false, message: `Pass status is ${req.status}. Invalid for return entry.` };
      }

      // Mark student IN (Pass Completed!)
      const now = new Date().toISOString();
      const updatedReq: LeaveRequest = {
        ...req,
        status: 'COMPLETED_RETURNED',
        returnScanTime: now,
        returnWatchmanName: watchmanName,
        returnGate: gatePost,
      };

      requests[reqIndex] = updatedReq;
      this.set(STORAGE_KEYS.REQUESTS, requests);

      // Update student profile status back to IN_CAMPUS
      if (student) {
        student.campusStatus = 'IN_CAMPUS';
        this.set(STORAGE_KEYS.STUDENTS, students);
      }

      // Add to Gate Log
      const gateLog: GateLog = {
        id: `log-${Date.now()}`,
        requestId: req.id,
        passNumber: req.passNumber,
        studentRollNumber: req.studentRollNumber,
        studentName: req.studentName,
        hostelBlock: req.hostelBlock,
        roomNumber: req.roomNumber,
        scanType: 'IN',
        timestamp: now,
        watchmanName,
        gatePost,
        remarks: `RETURN VERIFIED: Student safely re-entered campus through ${gatePost}. Pass closed.`,
      };
      this.set(STORAGE_KEYS.GATE_LOGS, [gateLog, ...this.getGateLogs()]);

      // Notify Parent in Real-Time
      this.addNotification({
        recipientRole: 'parent',
        recipientIdentifier: req.parentEmail,
        title: '🏠 Child Safely Returned to Campus',
        message: `Security Update: ${req.studentName} has returned and scanned IN at ${gatePost} at ${new Date().toLocaleTimeString()}. Campus pass completed.`,
        type: 'success',
        requestId: req.id,
      });

      // Notify Student
      this.addNotification({
        recipientRole: 'student',
        recipientIdentifier: req.studentRollNumber,
        title: '✅ Re-entry Completed: Welcome Back!',
        message: `Your return scan has been recorded at ${gatePost}. Pass #${req.passNumber} has been safely completed.`,
        type: 'success',
        requestId: req.id,
      });

      this.notifyListeners('scan');
      return { 
        success: true, 
        message: `RETURN CONFIRMED: ${req.studentName} (${req.studentRollNumber}) safely logged back IN campus!`,
        request: updatedReq,
        student: student || undefined,
      };
    }
  }

  // --- CAMPUS HEADCOUNT BALANCER ---
  getCampusHeadcount() {
    const students = this.getStudents();
    const requests = this.getRequests();
    
    // Active students currently out
    const outStudents = requests.filter(r => r.status === 'STUDENT_EXITED_CAMPUS');
    const totalOut = outStudents.length;

    // Estimated total hostel campus population
    const baseHostelPopulation = 1850;
    const totalIn = Math.max(0, baseHostelPopulation - totalOut);

    return {
      totalRegisteredStudents: students.length,
      baseHostelPopulation,
      totalStudentsCurrentlyOut: totalOut,
      totalStudentsCurrentlyIn: totalIn,
      activeOutPasses: outStudents,
    };
  }

  // --- NOTIFICATION MANAGEMENT ---
  addNotification(data: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) {
    const notifs = this.getNotifications();
    const newNotif: AppNotification = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.set(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifs]);
  }

  markNotificationAsRead(id: string) {
    const notifs = this.getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
    this.notifyListeners();
  }

  markAllNotificationsRead(role: UserRole) {
    const notifs = this.getNotifications().map(n => n.recipientRole === role ? { ...n, read: true } : n);
    this.set(STORAGE_KEYS.NOTIFICATIONS, notifs);
    this.notifyListeners();
  }

  logout() {
    this.set(STORAGE_KEYS.CURRENT_USER, null);
    this.set(STORAGE_KEYS.ACTIVE_OTP, null);
    this.notifyListeners('ping');
  }

  // Reset and purge all records in the application to completely clean zero-data state
  resetToSampleData() {
    this.clearAllData();
  }

  clearAllData() {
    this.set(STORAGE_KEYS.STUDENTS, []);
    this.set(STORAGE_KEYS.PARENTS, []);
    this.set(STORAGE_KEYS.WARDENS, []);
    this.set(STORAGE_KEYS.WATCHMEN, []);
    this.set(STORAGE_KEYS.REQUESTS, []);
    this.set(STORAGE_KEYS.GATE_LOGS, []);
    this.set(STORAGE_KEYS.NOTIFICATIONS, []);
    this.set(STORAGE_KEYS.CURRENT_USER, null);
    this.set(STORAGE_KEYS.ACTIVE_OTP, null);
    this.set(STORAGE_KEYS.CURRENT_ROLE, 'student');
    this.notifyListeners('ping');
  }
}

export const hostelStore = new HostelStore();
