'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Settings,
  CreditCard,
  Bell,
  Shield,
  Trash2,
  LogOut,
  Save,
  Loader2,
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';

// ===========================================
// Settings Page
// ===========================================

export default function SettingsPage() {
  return (
    <div className="container py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="profile" className="gap-2">
            <User className="w-4 h-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="w-4 h-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="w-4 h-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesSettings />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="billing">
          <BillingSettings />
        </TabsContent>

        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ===========================================
// Profile Settings
// ===========================================

function ProfileSettings() {
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation();

  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');

  React.useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const handleSave = () => {
    updateProfile.mutate({
      displayName,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Update your profile information and public details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Contact support to change your email address
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}

// ===========================================
// Preferences Settings
// ===========================================

function PreferencesSettings() {
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  const updatePreferences = trpc.user.updatePreferences.useMutation();

  const preferences = profile?.preferences;

  const [defaultResolution, setDefaultResolution] = React.useState<'720p' | '1080p' | '4k'>('1080p');
  const [defaultDuration, setDefaultDuration] = React.useState(30);
  const [autoSave, setAutoSave] = React.useState(true);
  const [showTutorials, setShowTutorials] = React.useState(true);

  React.useEffect(() => {
    if (preferences) {
      setDefaultResolution(preferences.defaultResolution || '1080p');
      setDefaultDuration(preferences.defaultDuration || 30);
      setAutoSave(preferences.autoSave ?? true);
      setShowTutorials(preferences.showTutorials ?? true);
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferences.mutate({
      defaultResolution,
      defaultDuration,
      autoSave,
      showTutorials,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editor Preferences</CardTitle>
        <CardDescription>
          Customise your default editor settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="resolution">Default Resolution</Label>
          <select
            id="resolution"
            value={defaultResolution}
            onChange={(e) => setDefaultResolution(e.target.value as '720p' | '1080p' | '4k')}
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
          >
            <option value="720p">720p (1280x720)</option>
            <option value="1080p">1080p (1920x1080)</option>
            <option value="4k">4K (3840x2160)</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Default Duration (seconds)</Label>
          <select
            id="duration"
            value={defaultDuration}
            onChange={(e) => setDefaultDuration(Number(e.target.value))}
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
          >
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>60 seconds</option>
            <option value={120}>2 minutes</option>
          </select>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="autoSave">Auto-save</Label>
            <p className="text-sm text-muted-foreground">
              Automatically save changes while editing
            </p>
          </div>
          <Switch
            id="autoSave"
            checked={autoSave}
            onCheckedChange={setAutoSave}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="showTutorials">Show Tutorials</Label>
            <p className="text-sm text-muted-foreground">
              Display tutorial hints for new users
            </p>
          </div>
          <Switch
            id="showTutorials"
            checked={showTutorials}
            onCheckedChange={setShowTutorials}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
        >
          {updatePreferences.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Preferences
        </Button>
      </CardFooter>
    </Card>
  );
}

// ===========================================
// Notification Settings
// ===========================================

function NotificationSettings() {
  const [emailRenderComplete, setEmailRenderComplete] = React.useState(true);
  const [emailNewFeatures, setEmailNewFeatures] = React.useState(true);
  const [emailTips, setEmailTips] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose what notifications you receive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="renderComplete">Render Complete</Label>
            <p className="text-sm text-muted-foreground">
              Email me when a video render is complete
            </p>
          </div>
          <Switch
            id="renderComplete"
            checked={emailRenderComplete}
            onCheckedChange={setEmailRenderComplete}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="newFeatures">New Features</Label>
            <p className="text-sm text-muted-foreground">
              Get notified about new features and updates
            </p>
          </div>
          <Switch
            id="newFeatures"
            checked={emailNewFeatures}
            onCheckedChange={setEmailNewFeatures}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="tips">Tips & Tutorials</Label>
            <p className="text-sm text-muted-foreground">
              Receive tips to get the most out of propNICA
            </p>
          </div>
          <Switch
            id="tips"
            checked={emailTips}
            onCheckedChange={setEmailTips}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Preferences
        </Button>
      </CardFooter>
    </Card>
  );
}

// ===========================================
// Billing Settings
// ===========================================

function BillingSettings() {
  const { data: stats } = trpc.user.getStats.useQuery();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Manage your subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold">Free Plan</h3>
              <p className="text-sm text-muted-foreground">
                Basic features for getting started
              </p>
            </div>
            <Button>Upgrade</Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="font-medium">Usage Statistics</h4>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Projects
                </span>
                <span className="font-medium">
                  {stats?.projectCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Renders
                </span>
                <span className="font-medium">
                  {stats?.renderCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Completed Renders
                </span>
                <span className="font-medium">
                  {stats?.completedRenders ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Video Duration
                </span>
                <span className="font-medium">
                  {Math.floor((stats?.totalVideoDuration ?? 0) / 60)}m {(stats?.totalVideoDuration ?? 0) % 60}s
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>
            Add a payment method to upgrade your plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No payment method on file
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline">
            <CreditCard className="w-4 h-4 mr-2" />
            Add Payment Method
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

// ===========================================
// Security Settings
// ===========================================

function SecuritySettings() {
  const router = useRouter();
  const supabase = createBrowserClient();
  
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = React.useState(false);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    setPasswordLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setPasswordError(error.message);
        return;
      }

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password updated successfully');
    } catch (err) {
      setPasswordError('An error occurred. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.'
    );

    if (!confirmed) return;

    const doubleConfirm = prompt(
      'Type "DELETE" to confirm account deletion:'
    );

    if (doubleConfirm !== 'DELETE') {
      alert('Account deletion cancelled.');
      return;
    }

    setDeleteLoading(true);

    try {
      // Call API to delete account
      // await trpc.user.deleteAccount.mutate();
      await supabase.auth.signOut();
      router.push('/login?message=account_deleted');
    } catch (err) {
      alert('Failed to delete account. Please contact support.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">{passwordError}</p>
            )}
            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Manage your active sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out of All Devices
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions that affect your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={deleteLoading}
          >
            {deleteLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4 mr-2" />
            )}
            Delete Account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
