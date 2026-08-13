export type AgentType = "grading" | "lesson-plan" | "reporting";

export type DraftStatus = "pending" | "approved" | "rejected";

export interface Draft {
  id: string;
  agent: AgentType;
  input: string;
  output: string;
  status: DraftStatus;
  warnings: string[];
  createdAt: string;
  engine?: "backend" | "mock";
  teacherId?: string;
}

export const AGENT_LABEL: Record<AgentType, string> = {
  grading: "Grading & Feedback",
  "lesson-plan": "Lesson-Plan",
  reporting: "Reporting & Communication",
};
