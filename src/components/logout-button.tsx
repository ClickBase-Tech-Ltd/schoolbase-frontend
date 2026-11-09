'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { playLogoutTone } from '@/lib/sounds';

export function LogoutButton({ redirectUrl = "/login" }: { redirectUrl?: string }) {
  return (
    <form action={`/api/auth/logout?redirectUrl=${encodeURIComponent(redirectUrl)}`} method="POST" className="w-full" data-assistant-target="/logout" onSubmit={() => playLogoutTone()}>
      <Button type="submit" variant="primary" className="cursor-pointer w-full justify-center gap-2 text-sm py-3">
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </form>
  );
}
