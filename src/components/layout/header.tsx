'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Video,
  Home,
  FolderOpen,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Bell,
  HelpCircle,
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';

// ===========================================
// Types
// ===========================================

interface HeaderProps {
  user?: {
    id: string;
    email?: string;
    displayName?: string;
    avatarUrl?: string;
  } | null;
}

// ===========================================
// Navigation Links
// ===========================================

const navigationLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
];

// ===========================================
// Header Component
// ===========================================

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const supabase = createBrowserClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const userInitials = user?.displayName
    ? user.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center space-x-2 mr-6">
          <Video className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">PropertyClips</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center space-x-1 flex-1">
          {navigationLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-9 px-3',
                    isActive && 'bg-secondary'
                  )}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Help */}
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <HelpCircle className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-9 px-2 flex items-center space-x-2"
              >
                <Avatar className="h-7 w-7">
                  {user?.avatarUrl && (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName || ''} />
                  )}
                  <AvatarFallback className="text-xs">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  Account
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
