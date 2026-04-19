'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema } from '@/lib/validations/auth';
import type { LoginInput, SignupInput, ForgotPasswordInput, ResetPasswordInput } from '@/lib/validations/auth';

export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function login(formData: LoginInput): Promise<ActionResponse> {
  const validated = loginSchema.safeParse(formData);

  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Check if user has any stores - if not, redirect to onboarding
  const { data: memberships } = await supabase
    .from('store_members')
    .select('store_id')
    .eq('user_id', data.user.id)
    .limit(1);

  if (!memberships || memberships.length === 0) {
    redirect('/onboarding');
  }

  redirect('/dashboard');
}

export async function signup(formData: SignupInput): Promise<ActionResponse> {
  const validated = signupSchema.safeParse(formData);

  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
    options: {
      data: {
        full_name: validated.data.fullName,
      },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Create profile for the new user
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email: validated.data.email,
      full_name: validated.data.fullName,
    });

    if (profileError) {
      console.error('Error creating profile:', profileError);
    }

    // Create user preferences
    const { error: prefError } = await supabase.from('user_preferences').insert({
      user_id: data.user.id,
    });

    if (prefError) {
      console.error('Error creating preferences:', prefError);
    }
  }

  return { success: true, data: { message: 'Account created successfully' } };
}

export async function forgotPassword(formData: ForgotPasswordInput): Promise<ActionResponse> {
  const validated = forgotPasswordSchema.safeParse(formData);

  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(validated.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: { message: 'Password reset email sent' } };
}

export async function resetPassword(formData: ResetPasswordInput): Promise<ActionResponse> {
  const validated = resetPasswordSchema.safeParse(formData);

  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: validated.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  redirect('/dashboard');
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function getSession() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}