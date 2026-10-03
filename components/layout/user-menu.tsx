"use client";

import { Dropdown, DropdownItem, DropdownSeparator } from "@/components/ui/dropdown";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { InstallButton } from "@/components/pwa/install-button";

export function UserMenu({ name, role, email }: { name: string; role: string; email: string }) {
  return (
    <Dropdown
      trigger={
        <button className="flex items-center gap-2.5 rounded-full pl-1 pr-2 py-1 hover:bg-[var(--muted)] transition-colors" aria-label="Account menu">
          <Avatar name={name} size="sm" />
          <span className="hidden sm:block text-left">
            <span className="block text-xs font-medium leading-tight max-w-[120px] truncate">{name}</span>
            <span className="block text-2xs text-muted-foreground leading-tight">{ROLE_LABELS[role] ?? role}</span>
          </span>
        </button>
      }
    >
      {(close) => (
        <>
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-2xs text-muted-foreground truncate">{email}</p>
          </div>
          <DropdownSeparator />
          <InstallButton />
          <DropdownItem danger onClick={() => { close(); logoutAction(); }}>
            Sign out
          </DropdownItem>
        </>
      )}
    </Dropdown>
  );
}
