import { acceptInvitation } from '@/app/actions/members';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';

interface InvitePageProps {
  params: {
    token: string;
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { token } = params;

  // Get invitation details
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select(`
      *,
      stores(id, name),
      invited_by_profile:invited_by(full_name, email)
    `)
    .eq('token', token)
    .single();

  const typedInvitation = invitation as { id: string; email: string; role: string; status: string; expires_at: string; invited_by: string; store_id: string; stores?: { id: string; name: string }; invited_by_profile?: { full_name: string | null; email: string } } | null;

  if (error || !typedInvitation) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if invitation is expired
  const isExpired = new Date(typedInvitation.expires_at) < new Date();
  const isAccepted = typedInvitation.status === 'accepted';
  const isExpiredStatus = typedInvitation.status === 'expired' || isExpired;

  if (isExpiredStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please ask the store admin to send a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been accepted. You can now access the store from your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user is not logged in, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>You're Invited!</CardTitle>
            <CardDescription>
              <span className="font-medium">{typedInvitation.invited_by_profile?.full_name || typedInvitation.invited_by_profile?.email}</span> has invited you to join{' '}
              <span className="font-medium">{typedInvitation.stores?.name}</span> as a{' '}
              <Badge variant="secondary">{typedInvitation.role}</Badge>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Please sign in or create an account to accept this invitation.
            </p>
            <div className="flex gap-3">
              <Link href={`/login?redirect=/invite/${token}`} className="flex-1">
                <Button variant="outline" className="w-full">Sign In</Button>
              </Link>
              <Link href={`/signup?redirect=/invite/${token}`} className="flex-1">
                <Button className="w-full">Create Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in, show accept/reject options
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <CardTitle>Join {typedInvitation.stores?.name}?</CardTitle>
          <CardDescription>
            You've been invited by{' '}
            <span className="font-medium">{typedInvitation.invited_by_profile?.full_name || typedInvitation.invited_by_profile?.email}</span>{' '}
            as a <Badge variant="secondary">{typedInvitation.role}</Badge>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg text-sm">
            <p className="font-medium mb-2">As a {typedInvitation.role}, you'll be able to:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              {typedInvitation.role === 'admin' ? (
                <>
                  <li>Manage store settings and members</li>
                  <li>View all reports and analytics</li>
                  <li>Manage inventory and products</li>
                  <li>Process sales transactions</li>
                </>
              ) : typedInvitation.role === 'manager' ? (
                <>
                  <li>Manage inventory and products</li>
                  <li>View reports and analytics</li>
                  <li>Process sales transactions</li>
                </>
              ) : (
                <>
                  <li>Process sales transactions</li>
                  <li>View products and inventory</li>
                </>
              )}
            </ul>
          </div>

          <form action={async () => {
            'use server';
            await acceptInvitation(token);
          }}>
            <Button type="submit" className="w-full">
              Accept Invitation
            </Button>
          </form>

          <Link href="/dashboard">
            <Button variant="outline" className="w-full">
              Decline
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
