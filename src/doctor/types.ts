export type IssueSeverity = "error" | "warning" | "info";

export interface DoctorIssue {
  severity: IssueSeverity;
  message: string;
}

export interface DoctorReport {
  file: string;
  exists: boolean;
  issues: DoctorIssue[];
}