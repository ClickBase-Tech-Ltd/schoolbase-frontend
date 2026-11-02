"use client";

import { getBackendUrl } from "@/lib/backend-url";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSkeleton from "@/components/ui/skeleton";
import SubscriptionModal from "@/components/subscription-modal";
import ClassesPageClient from "../classes/classes-client";
import SubjectsPageClient from "../subjects/subjects-client";

type AcademicClass = {
  id: string;
  name: string;
  phase?: string;
  arm?: string | null;
  _count?: { pupils?: number; subjectClasses?: number };
};

type AcademicSubject = { id: string; name: string };
type AcademicSubjectClass = {
  classId: string;
  subjectId: string;
  class?: AcademicClass;
  subject?: AcademicSubject;
};
type AcademicTeacherSubject = {
  subjectId: string;
  teacher?: { name?: string | null };
};

type AcademicData = {
  classes: AcademicClass[];
  subjects: AcademicSubject[];
  subjectClasses: AcademicSubjectClass[];
  teacherSubjects: AcademicTeacherSubject[];
};

function AcademicsWorkspace() {
  const searchParams = useSearchParams();
  const activeView = searchParams.get("view") === "subjects" ? "subjects" : "classes";
  const [data, setData] = useState<AcademicData>({
    classes: [],
    subjects: [],
    subjectClasses: [],
    teacherSubjects: [],
  });
  const [loading, setLoading] = useState(activeView === "subjects");
  const [error, setError] = useState<string | null>(null);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState<string | null>(null);

  useEffect(() => {
    if (activeView !== "subjects") return;

    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setSubscriptionBlocked(null);
      try {
        const response = await fetch(`${getBackendUrl()}/api/admin/subjects/data`, {
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          if (response.status === 403 && errorBody?.code === "SUBSCRIPTION_INACTIVE") {
            if (!cancelled) {
              setSubscriptionBlocked(errorBody.reason || "Your school subscription is not active");
            }
            return;
          }
          throw new Error(errorBody?.error || `Failed to load academic data (${response.status})`);
        }

        const result = (await response.json()) as AcademicData;
        if (!cancelled) {
          setData({
            classes: result.classes || [],
            subjects: result.subjects || [],
            subjectClasses: result.subjectClasses || [],
            teacherSubjects: result.teacherSubjects || [],
          });
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : "Failed to load academic data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [activeView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminSkeleton />
      </div>
    );
  }

  if (subscriptionBlocked) return <SubscriptionModal reason={subscriptionBlocked} />;

  if (error) {
    return (
      <div role="alert" className="mx-auto mt-8 max-w-3xl border border-error/20 bg-error/10 p-4 text-sm text-error">
        {error}
      </div>
    );
  }

  if (activeView === "subjects") {
    return (
      <SubjectsPageClient
        classes={data.classes}
        subjects={data.subjects}
        subjectClasses={data.subjectClasses}
        teacherSubjects={data.teacherSubjects}
      />
    );
  }

  return <ClassesPageClient classes={[]} />;
}

export default function AcademicsPage() {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AcademicsWorkspace />
    </Suspense>
  );
}
