"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export function PublicMobileMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      const menu = menuRef.current;
      if (menu?.open && event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector("summary")?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details ref={menuRef} className="relative lg:hidden">
      <summary className="list-none cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground marker:hidden">
        Menu
      </summary>
      <nav className="absolute right-0 top-12 z-10 grid min-w-56 gap-1 border border-border bg-white p-2 text-sm font-medium text-foreground shadow-xl">
        <Link href="/platform" className="px-3 py-2 hover:bg-brand-light hover:text-brand">Platform</Link>
        <Link href="/solutions" className="px-3 py-2 hover:bg-brand-light hover:text-brand">Solutions</Link>
        <Link href="/for-principals" className="px-3 py-2 hover:bg-brand-light hover:text-brand">For Your Role</Link>
        <Link href="/compare" className="px-3 py-2 hover:bg-brand-light hover:text-brand">Compare</Link>
        <Link href="/how-to-use-schoolbase" className="px-3 py-2 hover:bg-brand-light hover:text-brand">How to use SchoolBase</Link>
        <Link href="/blog" className="px-3 py-2 hover:bg-brand-light hover:text-brand">Blog</Link>
        <Link href="/investors" className="px-3 py-2 hover:bg-brand-light hover:text-brand">Investor & partner enquiries</Link>
        <div className="my-1 border-t border-border" />
        <Link href="/login" className="px-3 py-2 font-semibold text-brand hover:bg-brand-light">School login</Link>
        <Link href="/parent/login" className="px-3 py-2 font-semibold text-brand hover:bg-brand-light">Parent login</Link>
      </nav>
    </details>
  );
}