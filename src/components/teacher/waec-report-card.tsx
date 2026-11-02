"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { ReportCardDocument } from "@/components/reports/report-card-document";

interface SubjectResult {
  subjectName: string;
  caScore?: number;
  testScore?: number;
  examScore?: number;
  projectScore?: number;
  totalScore: number;
  grade: string;
  subjectPosition?: number;
  remarks?: string;
  maxScore?: number;
}

interface ReportCardData {
  student: {
    id: string;
    name: string;
    admissionNo: string;
    dateOfBirth?: string;
    gender?: string;
    photoUrl?: string;
  };
  school: {
    id: string;
    name: string;
    address?: string;
    logoUrl?: string;
    principalName?: string;
    stampUrl?: string;
    principalSignatureUrl?: string;
  };
  class: {
    name: string;
    phase: string;
  };
  term: {
    name: string;
    session: string;
    sortOrder?: number | null;
  };
  assessment?: {
    name: string;
    phase: string;
  };
  subjects: SubjectResult[];
  summary?: {
    totalScore: number;
    averageScore: number;
    lowestScore: number;
    highestScore: number;
    classPosition?: number;
    totalStudents?: number;
    passRate: number;
    attendance?: number;
    maxAttendance?: number;
  };
  averageScore?: number;
  classPosition?: number | null;
  totalSubjects?: number;
  statistics?: {
    highestScore: number;
    lowestScore: number;
    passRate: number;
    attendance?: number;
    maxAttendance?: number;
  };
  remarks?: {
    psychomotor?: string;
    affective?: string;
    teacherComment?: string;
    promotionStatus?: string;
  };
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

interface WaecReportCardProps {
  data: ReportCardData;
  assessmentId: string;
  pupilId: string;
  onPrint?: () => void;
  onDownloadPDF?: (pupilId: string) => Promise<void>;
  showDownload?: boolean;
}

const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-green-100", text: "text-green-900" },
  B: { bg: "bg-blue-100", text: "text-blue-900" },
  C: { bg: "bg-yellow-100", text: "text-yellow-900" },
  D: { bg: "bg-orange-100", text: "text-orange-900" },
  E: { bg: "bg-red-100", text: "text-red-900" },
  F: { bg: "bg-red-200", text: "text-red-950" },
};

const PSYCHOMOTOR_GRADES = ["A", "B", "C"];
const AFFECTIVE_GRADES = ["A", "B", "C"];

export function WaecReportCard({
  data,
  assessmentId,
  pupilId,
  onPrint,
  onDownloadPDF,
  showDownload = true,
}: WaecReportCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 500);
  };

  const handleDownload = async () => {
    if (!onDownloadPDF) return;
    setIsDownloading(true);
    try {
      await onDownloadPDF(pupilId);
    } finally {
      setIsDownloading(false);
    }
  };

  const averageScore = data.summary?.averageScore ?? data.averageScore ?? 0;
  const classPosition = data.summary?.classPosition ?? data.classPosition ?? null;
  const totalSubjects = data.totalSubjects ?? data.subjects.length;
  const passRate = data.summary?.passRate ?? data.statistics?.passRate ?? 0;
  const teacherRemark = data.teacherRemark ?? data.remarks?.teacherComment ?? null;

  return (
    <div className="space-y-6">
      <div className="flex gap-2 print:hidden">
        <Button onClick={handlePrint} disabled={isPrinting} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          Print
        </Button>
        {showDownload ? (
          <Button onClick={handleDownload} disabled={isDownloading || !onDownloadPDF} className="gap-2">
            <Download className="w-4 h-4" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
        ) : null}
      </div>

      <ReportCardDocument
        reportCard={{
          student: {
            id: data.student.id,
            name: data.student.name,
            admissionNo: data.student.admissionNo,
            gender: data.student.gender,
            dateOfBirth: data.student.dateOfBirth,
            photoUrl: data.student.photoUrl,
          },
          school: {
            name: data.school.name,
            address: data.school.address,
            logoUrl: data.school.logoUrl,
            stampUrl: data.school.stampUrl,
            principalName: data.school.principalName,
            principalSignatureUrl: data.school.principalSignatureUrl,
          },
          class: {
            name: data.class.name,
            phase: data.class.phase,
          },
          term: {
            name: data.term.name,
            session: data.term.session,
            sortOrder: data.term.sortOrder,
          },
          subjects: data.subjects.map((subject) => ({
            subjectName: subject.subjectName,
            caScore: subject.caScore,
            testScore: subject.testScore,
            examScore: subject.examScore,
            totalScore: subject.totalScore,
            grade: subject.grade,
            remarks: subject.remarks,
          })),
          averageScore,
          classPosition,
          totalSubjects,
          teacherRemark,
          principalRemark: data.principalRemark ?? null,
          publishedAt: data.publishedAt ?? null,
          reportCardSections: data.reportCardSections,
          statistics: {
            passRate,
          },
          gradingScale: data.gradingScale,
          thirdTermHistory: data.thirdTermHistory,
          // include resolved signatory when provided by the server
          signatory: (data as any).signatory ?? null,
        } as any}
        photoUrl={data.student.photoUrl}
      />

      <div className="text-center text-xs text-gray-500 print:hidden">Layout aligned to the admin report card design.</div>
    </div>
  );
}
