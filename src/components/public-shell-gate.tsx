"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";

const hiddenPublicShellPaths = [
  "/admin",
  "/employee",
  "/staff",
  "/teacher",
  "/parent",
  "/admissions",
  "/schoolbase-admin",
  "/accounting",
];

export default function PublicShellGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (hiddenPublicShellPaths.some((path) => pathname.startsWith(path))) {
    return null;
  }

  return <>{children}</>;
}
