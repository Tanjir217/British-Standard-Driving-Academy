export type UserRole = "visitor" | "student" | "instructor" | "admin" | "super_admin";

export type Transmission = "manual" | "automatic" | "either";

export type RecordStatus = "active" | "inactive" | "archived";

export interface Package {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
  lessonHours: number;
  transmission: Transmission;
  features: string[];
  status: RecordStatus;
}

export interface Instructor {
  id: string;
  name: string;
  role: string;
  bio?: string;
  photoUrl?: string;
  specialty: string[];
  experienceYears?: number;
  languages: string[];
  transmission: Transmission;
  status: RecordStatus;
}

export interface Student {
  id: string;
  memberId: string;
  fullName: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  transmission: Transmission;
  assignedInstructorId?: string;
  enrolledPackageId?: string;
  lessonsCompleted: number;
  lessonsRemaining: number;
  progressPercent: number;
  status: "active" | "paused" | "completed" | "inactive";
}

export type BookingStatus =
  | "requested"
  | "pending_payment"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentStatus =
  | "unpaid"
  | "pending_verification"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded";

export interface Booking {
  id: string;
  studentId: string;
  instructorId?: string;
  packageId?: string;
  lessonType: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
}

export interface LessonRecord {
  id: string;
  bookingId: string;
  studentId: string;
  instructorId: string;
  lessonType: string;
  startedAt: string;
  durationMinutes: number;
  objectives: string[];
  strengths: string[];
  improvements: string[];
  instructorNotes?: string;
  progressScore?: number;
}

export interface Payment {
  id: string;
  studentId: string;
  bookingId?: string;
  amountMinor: number;
  currency: string;
  method: "bank_transfer" | "pay_by_bank" | "other";
  status: PaymentStatus;
  reference?: string;
  paidAt?: string;
}

export interface TrainingVideo {
  id: string;
  studentId: string;
  instructorId?: string;
  lessonId?: string;
  title: string;
  description?: string;
  mediaUrl: string;
  uploadedAt: string;
  visibility: "student" | "instructor" | "admin";
}
