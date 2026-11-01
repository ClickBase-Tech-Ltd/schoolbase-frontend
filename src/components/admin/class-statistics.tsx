'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

const GRADE_COLOR_MAP: Record<string, string> = {
  A: '#0A66C2',
  B: '#0F766E',
  C: '#EAAB0C',
  D: '#EA580C',
  E: '#C2410C',
  F: '#BE123C',
};

interface ClassStatisticsProps {
  assessmentId: string;
  schoolId: string;
}

interface ClassStats {
  assessmentId: string;
  totalStudents: number;
  totalResults: number;
  scoredResults: number;
  statistics: {
    highestScore: number;
    lowestScore: number;
    averageScore: number;
    medianScore: number;
    standardDeviation: number;
    passCount: number;
    passRate: number;
    gradeDistribution: Record<string, number>;
  };
}

export function ClassStatistics({ assessmentId, schoolId }: ClassStatisticsProps) {
  const [stats, setStats] = useState<ClassStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    fetchStatistics();
  }, [assessmentId, schoolId]);

  const fetchStatistics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/report-cards/assessment/${assessmentId}/statistics`,
        {
          headers: { 'x-school-id': schoolId },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch statistics');

      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="border border-border bg-surface px-4 py-5 text-sm text-muted">Loading statistics...</div>;
  }

  if (error) {
    return (
      <div className="border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { statistics } = stats;
  const hasCompleteScores = stats.scoredResults > 0;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Assessment overview</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Class Statistics</h3>
        </div>
        <Button
          onClick={() => {
            const response = fetch(`/api/pdf-reports/ranking/${assessmentId}`, {
              headers: { 'x-school-id': schoolId },
            });
            response.then(async (r) => {
              const blob = await r.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `class-ranking-${assessmentId}.pdf`;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            });
          }}
          className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-hover"
        >
          <Download size={16} />
          Class Ranking PDF
        </Button>
      </div>

      {stats.scoredResults < stats.totalResults && (
        <div className="border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Statistics use complete scores only: {stats.scoredResults} of {stats.totalResults} result rows currently have all required components. Rows without a complete total are excluded from totals and grade statistics.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Average', value: hasCompleteScores ? statistics.averageScore.toFixed(1) : '—', sub: 'Class average' },
          { label: 'Pass Rate', value: hasCompleteScores ? `${statistics.passRate.toFixed(1)}%` : '—', sub: `${statistics.passCount} passed` },
          { label: 'Students', value: stats.totalStudents, sub: 'Distinct pupils' },
          { label: 'Median', value: hasCompleteScores ? statistics.medianScore.toFixed(1) : '—', sub: 'Middle score' },
        ].map((stat) => (
          <article key={stat.label} className="border border-border bg-surface p-4">
            <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.sub}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,1.1fr)]">
        <div className="border border-border bg-surface p-4">
          <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Score Range</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{hasCompleteScores ? (statistics.highestScore - statistics.lowestScore).toFixed(1) : '—'}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="border-l-4 border-l-brand bg-brand-light/20 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">High</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{hasCompleteScores ? statistics.highestScore.toFixed(1) : '—'}</p>
            </div>
            <div className="border-l-4 border-l-brand bg-brand-light/20 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Low</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{hasCompleteScores ? statistics.lowestScore.toFixed(1) : '—'}</p>
            </div>
            <div className="border-l-4 border-l-brand bg-brand-light/20 p-3">
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Avg</p>
              <p className="mt-2 text-lg font-semibold text-foreground">{hasCompleteScores ? statistics.averageScore.toFixed(1) : '—'}</p>
            </div>
          </div>
        </div>

        <div className="border border-border bg-surface p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[.14em] text-muted">Assessment breakdown</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Grade Distribution</h2>
            </div>
            <span className="border border-border bg-background px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-muted">{stats.scoredResults} complete scores</span>
          </div>

          <div className="space-y-3">
            {Object.entries(statistics.gradeDistribution)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([grade, count]) => {
                const maxGradeCount = Math.max(...Object.values(statistics.gradeDistribution), 0);
                const percentageOfMax = maxGradeCount > 0 ? (count / maxGradeCount) * 100 : 0;
                const totalPercentage = stats.scoredResults > 0 ? (count / stats.scoredResults) * 100 : 0;
                return (
                  <div key={grade}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Grade {grade}</span>
                      <span className="text-xs text-muted">{count} ({totalPercentage.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 overflow-hidden bg-background">
                      <div
                        className="h-full"
                        style={{
                          width: `${percentageOfMax}%`,
                          backgroundColor: GRADE_COLOR_MAP[grade] || '#0A66C2',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </section>
  );
}
