export interface AuditLog {
  id: string;
  category: string;
  action: string;
  outcome: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  actorRole?: string | null;
  requestId?: string | null;
  details?: string | null;
  createdAt?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
  school?: { name?: string | null } | null;
}

export interface ActivitySummary {
  days: number;
  totals: {
    events: number;
    recentEvents: number;
    verificationEvents: number;
    failedEvents: number;
    schools: number;
    schoolsWithEvents: number;
    schoolsWithoutEvents: number;
  };
  actionBreakdown: { category: string; action: string; summary: string; count: number; events: string[]; eventPrefixes: string[] }[];
  trend: { date: string; count: number }[];
  schoolActivity: {
    id: string;
    name: string;
    status?: string | null;
    eventCount: number;
    lastActivity?: string | null;
  }[];
}
