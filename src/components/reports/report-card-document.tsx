'use client';

import { useEffect, useState } from 'react';
import { getBackendUrl } from '@/lib/backend-url';

interface ReportCardSubject {
  subjectName: string;
  caScore?: number | null;
  testScore?: number | null;
  examScore?: number | null;
  totalScore: number;
  grade: string;
  remarks?: string | null;
}

interface ReportCardData {
  student?: {
    id?: string;
    name?: string;
    admissionNo?: string | null;
    gender?: string | null;
    dateOfBirth?: string | null;
    photoUrl?: string | null;
  };
  school?: {
    name?: string;
    address?: string | null;
    logoUrl?: string | null;
    stampUrl?: string | null;
    principalName?: string | null;
    principalSignatureUrl?: string | null;
  };
  class?: {
    name?: string;
    phase?: string;
  };
  term?: {
    name?: string;
    session?: string;
    sortOrder?: number | null;
  };
  subjects?: ReportCardSubject[];
  averageScore?: number | null;
  classPosition?: number | null;
  totalSubjects?: number | null;
  teacherRemark?: string | null;
  principalRemark?: string | null;
  publishedAt?: string | null;
  reportCardSections?: {
    affective?: Record<string, string>;
    psychomotor?: Record<string, string>;
    teacherCommentsEnabled?: boolean;
    principalCommentsEnabled?: boolean;
    termPrincipalRemark?: string | null;
    attendance?: {
      present: number;
      late: number;
      absent: number;
      excused: number;
      recordedDays: number;
      classRecordedDays: number;
      percentage: number | null;
      coverageComplete: boolean;
      unavailableReason: string | null;
    };
  };
  statistics?: {
    highestScore?: number;
    lowestScore?: number;
    passRate?: number | null;
  };
  gradingScale?: Array<{
    grade: string;
    minScore: number;
    maxScore: number;
  }>;
  thirdTermHistory?: {
    terms: Array<{
      id: string;
      name: string;
      sortOrder: number;
    }>;
    entries: Array<{
      subjectId: string | null;
      subjectName: string;
      currentTotal: number | null;
      cumulativeTotal: number | null;
      previousTotals: Array<{
        termId: string;
        termName: string;
        sortOrder: number;
        totalScore: number | null;
        examScore: number | null;
      }>;
    }>;
  } | null;
}

interface SchoolConfig {
  logoUrl?: string | null;
  stampUrl?: string | null;
  principalSignatureUrl?: string | null;
  principalName?: string | null;
  principalComment?: string | null;
}

interface ReportCardDocumentProps {
  reportCard: ReportCardData;
  photoUrl?: string | null;
  className?: string;
}

function getPerformanceRemark(grade: string, score?: number | null) {
  const normalizedGrade = grade?.toUpperCase() ?? '';

  if (normalizedGrade === 'A') return 'Excellent';
  if (normalizedGrade === 'B') return 'Very Good';
  if (normalizedGrade === 'C') return 'Good';
  if (normalizedGrade === 'D') return 'Fair';
  if (normalizedGrade === 'E') return 'Pass';
  if (normalizedGrade === 'F') return 'Needs Improvement';

  if (typeof score === 'number') {
    if (score >= 70) return 'Excellent';
    if (score >= 60) return 'Very Good';
    if (score >= 50) return 'Good';
    if (score >= 45) return 'Fair';
    if (score >= 40) return 'Pass';
  }

  return 'Needs Improvement';
}

export function ReportCardDocument({ reportCard, photoUrl, className }: ReportCardDocumentProps) {
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig | null>(null);

  useEffect(() => {
    let active = true;

    const fetchSchoolConfig = async () => {
      try {
        const backendUrl = getBackendUrl();
        const response = await fetch(`${backendUrl}/api/admin/settings/data`, {
          credentials: 'include',
        });

        if (!response.ok) return;

        const data = await response.json();
        if (active) {
          setSchoolConfig(data?.config ?? null);
        }
      } catch (error) {
        console.error('Error loading school config:', error);
      }
    };

    fetchSchoolConfig();

    return () => {
      active = false;
    };
  }, [reportCard?.school?.principalSignatureUrl, reportCard?.school?.principalName, reportCard?.principalRemark, reportCard?.teacherRemark]);

  const school = reportCard.school ?? {};
  const student = reportCard.student ?? {};
  const classInfo = reportCard.class ?? {};
  const term = reportCard.term ?? {};
  const subjects = reportCard.subjects ?? [];
  const averageScore = reportCard.averageScore ?? 0;
  const totalSubjects = reportCard.totalSubjects ?? subjects.length;
  const passRate = reportCard.statistics?.passRate ?? 0;
  const teacherRemark = reportCard.teacherRemark ?? null;
  // Principal comment prefers the resolved Signatory on the reportCard,
  // falling back to configured school principal comment or the report's principal remark.
  const principalComment = reportCard.reportCardSections?.principalCommentsEnabled
    ? reportCard.reportCardSections.termPrincipalRemark
      ?? (reportCard as any).signatory?.comment
      ?? schoolConfig?.principalComment
      ?? reportCard.principalRemark
      ?? null
    : (reportCard as any).signatory?.comment ?? schoolConfig?.principalComment ?? reportCard.principalRemark ?? null;
  const publishedDateLabel = reportCard.publishedAt
    ? new Date(reportCard.publishedAt).toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const gradingScale = (reportCard.gradingScale && reportCard.gradingScale.length > 0
    ? reportCard.gradingScale
    : [
        { grade: 'A', minScore: 70, maxScore: 100 },
        { grade: 'B', minScore: 60, maxScore: 69 },
        { grade: 'C', minScore: 50, maxScore: 59 },
        { grade: 'D', minScore: 45, maxScore: 49 },
        { grade: 'E', minScore: 40, maxScore: 44 },
        { grade: 'F', minScore: 0, maxScore: 39 },
      ]);

  return (
    <div className={`mx-auto bg-white ${className ?? ''}`} style={{ width: '210mm', maxWidth: '100%', aspectRatio: '1/1.414' }}>
      <div className="h-full overflow-auto border border-gray-300 p-8 print:p-0 print:border-0" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="mb-6 border-b border-gray-800 pb-3 text-center">
          {school.logoUrl ? (
            <img src={school.logoUrl} alt="School Logo" className="mx-auto mb-3 h-20 w-20 object-contain" />
          ) : (
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-4 border-gray-800 bg-gradient-to-br from-blue-600 to-blue-800">
              <span className="text-lg font-bold text-white">SB</span>
            </div>
          )}

          <h1 className="mb-1 text-[18px] font-bold uppercase tracking-wide text-gray-900">{school.name ?? 'School Name'}</h1>
          {school.address ? <p className="mb-2 text-[11px] text-gray-700">{school.address}</p> : null}
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-800">Pupil's Cumulative Report</p>
        </div>

        <div className="mb-6 flex gap-4 border-b border-gray-300 pb-4">
          {(student.photoUrl || photoUrl) ? (
            <div className="flex-shrink-0">
              <img src={student.photoUrl ?? photoUrl ?? ''} alt={student.name ?? 'Student'} className="h-24 w-20 rounded border-2 border-gray-400 object-cover" />
            </div>
          ) : null}

          <div className={`flex-1 ${student.photoUrl || photoUrl ? '' : 'w-full'}`}>
            <div className={`grid gap-x-8 gap-y-3 text-xs ${student.photoUrl || photoUrl ? 'grid-cols-2' : 'grid-cols-2 w-full'}`}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Pupil's Name</p>
                <p className="text-[12px] font-bold text-gray-900">{student.name ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Admission No</p>
                <p className="text-[12px] font-bold text-gray-900">{student.admissionNo || 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Class</p>
                <p className="text-[12px] font-bold text-gray-900">{classInfo.name ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Term/Session</p>
                <p className="text-[12px] font-bold text-gray-900">{term.name ?? 'N/A'} {term.session ?? ''}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-700">
              <span><span className="font-semibold text-gray-900">Average:</span> {averageScore.toFixed(1)}</span>
              <span><span className="font-semibold text-gray-900">Subjects:</span> {totalSubjects}</span>
              <span><span className="font-semibold text-gray-900">Pass Rate:</span> {passRate.toFixed(0)}%</span>
              {reportCard.reportCardSections?.attendance ? (
                <span>
                  <span className="font-semibold text-gray-900">Attendance:</span>{" "}
                  {reportCard.reportCardSections.attendance.percentage !== null
                    ? `${reportCard.reportCardSections.attendance.percentage}% (${reportCard.reportCardSections.attendance.present + reportCard.reportCardSections.attendance.late}/${reportCard.reportCardSections.attendance.present + reportCard.reportCardSections.attendance.late + reportCard.reportCardSections.attendance.absent} days)`
                    : reportCard.reportCardSections.attendance.classRecordedDays === 0
                      ? "No records"
                      : "Incomplete records"}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">Academic Performance</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-700 text-[11px]">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="border border-gray-700 p-1 text-left font-semibold">Subject</th>
                  <th className="border border-gray-700 p-1 text-center font-semibold">CA</th>
                  <th className="border border-gray-700 p-1 text-center font-semibold">Test</th>
                  <th className="border border-gray-700 p-1 text-center font-semibold">Exam</th>
                  <th className="border border-gray-700 p-1 text-center font-semibold">Total</th>
                  <th className="border border-gray-700 p-1 text-center font-semibold">Grade</th>
                  <th className="border border-gray-700 p-1 text-center font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {subjects.length > 0 ? subjects.map((subject, idx) => (
                  <tr key={`${subject.subjectName}-${idx}`} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="border border-gray-700 p-1 font-medium text-gray-900">{subject.subjectName}</td>
                    <td className="border border-gray-700 p-1 text-center text-gray-900">{subject.caScore ?? '—'}</td>
                    <td className="border border-gray-700 p-1 text-center text-gray-900">{subject.testScore ?? '—'}</td>
                    <td className="border border-gray-700 p-1 text-center text-gray-900">{subject.examScore ?? '—'}</td>
                    <td className="border border-gray-700 p-1 text-center font-semibold text-gray-900">{subject.totalScore.toFixed(1)}</td>
                    <td className="border border-gray-700 p-1 text-center">
                      <span className="inline-block rounded bg-blue-100 px-2 py-0.5 font-bold text-blue-900">{subject.grade}</span>
                    </td>
                    <td className="border border-gray-700 p-1 text-center text-gray-700">
                      {subject.remarks || getPerformanceRemark(subject.grade, subject.totalScore)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="border border-gray-700 p-2 text-center text-gray-500">No subject results available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {reportCard.reportCardSections && (
          reportCard.reportCardSections.affective ||
          reportCard.reportCardSections.psychomotor ||
          (reportCard.reportCardSections.attendance?.classRecordedDays ?? 0) > 0
        ) ? (
          <section className="mb-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">Personal Development & Attendance</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {reportCard.reportCardSections.affective ? (
                <div className="rounded border border-gray-300 p-3">
                  <h3 className="mb-2 text-[10px] font-bold uppercase text-gray-800">Affective Development</h3>
                  {Object.keys(reportCard.reportCardSections.affective).length ? <dl className="space-y-1 text-[11px]">
                    {Object.entries(reportCard.reportCardSections.affective).map(([indicator, rating]) => (
                      <div key={indicator} className="flex justify-between gap-3">
                        <dt className="text-gray-700">{indicator}</dt>
                        <dd className="font-semibold capitalize text-gray-900">{rating.replace(/_/g, " ").toLowerCase()}</dd>
                      </div>
                    ))}
                  </dl> : <p className="text-[11px] text-gray-600">Not assessed</p>}
                </div>
              ) : null}
              {reportCard.reportCardSections.psychomotor ? (
                <div className="rounded border border-gray-300 p-3">
                  <h3 className="mb-2 text-[10px] font-bold uppercase text-gray-800">Psychomotor Skills</h3>
                  {Object.keys(reportCard.reportCardSections.psychomotor).length ? <dl className="space-y-1 text-[11px]">
                    {Object.entries(reportCard.reportCardSections.psychomotor).map(([indicator, rating]) => (
                      <div key={indicator} className="flex justify-between gap-3">
                        <dt className="text-gray-700">{indicator}</dt>
                        <dd className="font-semibold capitalize text-gray-900">{rating.replace(/_/g, " ").toLowerCase()}</dd>
                      </div>
                    ))}
                  </dl> : <p className="text-[11px] text-gray-600">Not assessed</p>}
                </div>
              ) : null}
              {reportCard.reportCardSections.attendance && reportCard.reportCardSections.attendance.classRecordedDays > 0 ? (
                <div className="rounded border border-gray-300 p-3">
                  <h3 className="mb-2 text-[10px] font-bold uppercase text-gray-800">Attendance</h3>
                  <p className="text-[11px] text-gray-800">
                    {reportCard.reportCardSections.attendance.percentage !== null
                      ? `${reportCard.reportCardSections.attendance.percentage}% attendance (${reportCard.reportCardSections.attendance.present + reportCard.reportCardSections.attendance.late} of ${reportCard.reportCardSections.attendance.present + reportCard.reportCardSections.attendance.late + reportCard.reportCardSections.attendance.absent} recorded school days)`
                      : `${reportCard.reportCardSections.attendance.recordedDays} pupil attendance records across ${reportCard.reportCardSections.attendance.classRecordedDays} class attendance days`}
                  </p>
                  {reportCard.reportCardSections.attendance.unavailableReason ? (
                    <p className="mt-1 text-[10px] text-amber-800">{reportCard.reportCardSections.attendance.unavailableReason}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {term.sortOrder === 3 && reportCard.thirdTermHistory?.entries?.length ? (
          <div className="mb-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">Third Term Cumulative History</p>
            <div className="overflow-x-auto rounded border border-gray-300">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-gray-100 text-gray-900">
                    <th className="border border-gray-300 p-1 text-left font-semibold">Subject</th>
                    {reportCard.thirdTermHistory.terms.map((termItem) => (
                      <th key={termItem.id} className="border border-gray-300 p-1 text-center font-semibold">{termItem.name}</th>
                    ))}
                    <th className="border border-gray-300 p-1 text-center font-semibold">Term 3</th>
                    <th className="border border-gray-300 p-1 text-center font-semibold">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {reportCard.thirdTermHistory.entries.map((entry, idx) => (
                    <tr key={`${entry.subjectName}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 p-1 font-medium text-gray-900">{entry.subjectName}</td>
                      {entry.previousTotals.map((termTotal) => (
                        <td key={`${entry.subjectName}-${termTotal.termId}`} className="border border-gray-300 p-1 text-center text-gray-900">
                          {termTotal.totalScore !== null ? termTotal.totalScore.toFixed(1) : '—'}
                        </td>
                      ))}
                      <td className="border border-gray-300 p-1 text-center text-gray-900">
                        {entry.currentTotal !== null ? entry.currentTotal.toFixed(1) : '—'}
                      </td>
                      <td className="border border-gray-300 p-1 text-center font-semibold text-gray-900">
                        {entry.cumulativeTotal !== null ? entry.cumulativeTotal.toFixed(1) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mb-6 space-y-2 text-[11px]">
          {teacherRemark ? (
            <div className="border-b border-gray-400 pb-2">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900">Teacher's Remark</p>
              <p className="text-gray-700">{teacherRemark}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-[1.2fr_0.8fr_1fr] gap-6 text-[11px]">
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900">Head/Principal's Comment</p>
              <div className="min-h-12 border-b border-gray-400 pb-2">
                <p className="text-gray-700">{principalComment || 'No principal comment available.'}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900">School Stamp</p>
              <div className="flex min-h-16 w-20 items-center justify-center border border-dashed border-gray-400">
                {schoolConfig?.stampUrl || school.stampUrl ? (
                  <img src={schoolConfig?.stampUrl || school.stampUrl || ''} alt="School Stamp" className="h-14 w-14 object-contain" />
                ) : (
                  <span className="text-[10px] text-center text-gray-400">Official<br />Seal</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900">Signature</p>
            <div className="min-h-12 border-b border-gray-400 pb-2">
              {(() => {
                const signatureUrl = (reportCard as any).signatory?.signatureUrl ?? schoolConfig?.principalSignatureUrl ?? school.principalSignatureUrl ?? null;
                return signatureUrl ? (
                  <img src={signatureUrl} alt="Signature" className="h-10 object-contain" />
                ) : (
                  <div className="h-10" />
                );
              })()}
            </div>
            <p className="font-semibold text-gray-900">{(reportCard as any).signatory?.name ?? schoolConfig?.principalName ?? school.principalName ?? 'Principal/Headmaster'}</p>
            <p className="text-sm text-gray-600">
              {(reportCard as any).signatory?.title ?? schoolConfig?.principalName ? (reportCard as any).signatory?.title ?? schoolConfig?.principalName : 'Principal/Headmaster'}
            </p>
            {publishedDateLabel ? (
              <p className="text-gray-600">Published on {publishedDateLabel}</p>
            ) : null}
            <p className="text-gray-600">Signature & Date</p>
          </div>

          <div className="p-0">
            <p className="mb-2 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-gray-900">Grading System</p>
            <div className="overflow-hidden border border-black bg-white">
              <div className="grid grid-cols-[1fr_0.7fr_1.2fr] border-b border-black bg-gray-100 text-[9px] font-semibold uppercase text-gray-700">
                <div className="border-r border-black px-1.5 py-1">Score</div>
                <div className="border-r border-black px-1.5 py-1 text-center">Grade</div>
                <div className="px-1.5 py-1 text-center">Remarks</div>
              </div>
              {gradingScale.map((scale) => {
                const remark = getPerformanceRemark(scale.grade, scale.maxScore);

                return (
                  <div key={`${scale.grade}-${scale.minScore}-${scale.maxScore}`} className="grid grid-cols-[1fr_0.7fr_1.2fr] border-b border-black last:border-b-0 text-[9px] text-gray-700">
                    <div className="border-r border-black px-1.5 py-1">{scale.minScore}-{scale.maxScore}</div>
                    <div className="border-r border-black px-1.5 py-1 text-center font-semibold text-gray-900">{scale.grade}</div>
                    <div className="px-1.5 py-1 text-center">{remark}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-400 pt-3 text-center text-[10px] text-gray-600">
          <p>This is an official document of {school.name ?? 'the school'}</p>
          <p>Generated by SchoolBase • Confidential</p>
        </div>
      </div>
    </div>
  );
}
