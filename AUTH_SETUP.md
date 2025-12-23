# Authentication Setup Guide

This guide explains the authentication implementation in the Orchestra Dashboard application.

## Overview

The application uses **Supabase Auth** for user authentication and session management. Authentication is fully integrated throughout the app, protecting all routes and tracking user actions.

## What's Implemented

### 1. Authentication Context (`src/contexts/AuthContext.jsx`)
- Central authentication state management
- User session handling
- Authentication methods:
  - `signUp(email, password, metadata)` - Create new account
  - `signIn(email, password)` - Sign in existing user
  - `signOut()` - Sign out current user
  - `resetPassword(email)` - Send password reset email
  - `updatePassword(newPassword)` - Update user password
  - `updateProfile(updates)` - Update user profile metadata

### 2. Authentication UI (`src/components/Auth.jsx`)
- **AuthPage**: Combined login/signup form
  - Email & password authentication
  - Toggle between login and signup modes
  - Form validation and error handling
  - Full name collection during signup

- **ForgotPasswordPage**: Password reset form
  - Email-based password reset
  - Reset link sent to user's email

### 3. Protected Routes (`src/components/ProtectedRoute.jsx`)
- Wraps the entire application
- Redirects unauthenticated users to login page
- Shows loading state during auth check
- Automatically displays AuthPage when not logged in

### 4. User Profile Management (`src/components/SettingsViews.jsx`)
- **ProfileSettingsView**: Complete profile management
  - Update full name
  - Update profile picture (avatar URL)
  - View email (read-only)
  - Change password
  - Sign out functionality

### 5. Integration Points

#### App.jsx
- Wrapped with `<ProtectedRoute>`
- Uses `useAuth()` hook to access current user
- User ID included when creating tasks (`created_by` field)

#### TaskDetails.jsx
- Uses `useAuth()` to get current user
- User ID automatically added to comments (`author_designer_id`)
- User name and avatar displayed in comment feed

#### Sidebars.jsx
- UserFooter displays authenticated user info
- Shows user's full name, email, and avatar
- Profile settings accessible from sidebar

## Setup Instructions

### 1. Configure Supabase

1. Create a Supabase project at https://app.supabase.com
2. Go to Project Settings > API
3. Copy your project URL and anon/public key

### 2. Set Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Set Up Database Tables

Your Supabase database should have the following tables configured:

#### Enable Row Level Security (RLS)

For production, enable RLS on all tables and create policies:

```sql
-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see all tasks (adjust based on your needs)
CREATE POLICY "Users can view tasks" ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can create tasks
CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update tasks they created
CREATE POLICY "Users can update their tasks" ON tasks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);

-- Enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view all comments
CREATE POLICY "Users can view comments" ON comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can create comments
CREATE POLICY "Users can create comments" ON comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_designer_id);
```

### 4. Configure Email Templates (Optional)

In Supabase Dashboard > Authentication > Email Templates, customize:
- Confirmation email (signup)
- Password reset email
- Email change confirmation

### 5. Enable Email Provider

In Supabase Dashboard > Authentication > Providers:
- Ensure "Email" provider is enabled
- Configure email settings (SMTP or use Supabase's default)

## User Flow

### New User Signup
1. User visits app → sees AuthPage (login form)
2. User clicks "Sign Up" → signup form appears
3. User enters email, password, and full name
4. On submit → Supabase creates user account
5. Confirmation email sent (if email confirmation enabled)
6. User confirms email → can log in
7. User logs in → redirected to dashboard

### Existing User Login
1. User visits app → sees AuthPage
2. User enters email and password
3. On submit → Supabase authenticates
4. On success → user session created
5. Redirected to dashboard with full access

### Password Reset
1. User clicks "Forgot Password?" (you can add this link)
2. User enters email
3. Reset link sent to email
4. User clicks link → redirected to reset page
5. User enters new password
6. Password updated → user can log in

### Profile Management
1. User navigates to Settings
2. Clicks "Profile" in sidebar
3. Can update:
   - Full name
   - Profile picture URL
   - Password
4. Changes saved to Supabase Auth
5. UI updates throughout app

## Security Features

### Implemented
- ✅ Password hashing (handled by Supabase)
- ✅ Secure session management
- ✅ Protected routes (no access without auth)
- ✅ User context isolation
- ✅ HTTPS required (Supabase enforced)
- ✅ JWT token authentication

### Recommended for Production
- [ ] Enable email confirmation
- [ ] Set up RLS policies on all tables
- [ ] Configure password strength requirements
- [ ] Add rate limiting on auth endpoints
- [ ] Enable multi-factor authentication (MFA)
- [ ] Set up proper CORS policies
- [ ] Add account lockout after failed attempts

## Data Structure

### User Metadata
When a user signs up, the following metadata is stored:
```javascript
{
  id: "uuid",
  email: "user@example.com",
  user_metadata: {
    full_name: "John Doe",
    avatar_url: "https://..."
  }
}
```

### Task Creation
Tasks created by authenticated users include:
```javascript
{
  ...taskData,
  created_by: user.id,  // UUID of authenticated user
  created_at: timestamp,
  updated_at: timestamp
}
```

### Comment Creation
Comments include author information:
```javascript
{
  content: "Comment text",
  task_id: taskId,
  author_designer_id: user.id,  // UUID of authenticated user
  created_at: timestamp
}
```

## Troubleshooting

### "Invalid API key" error
- Check that your `.env` file exists
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
- Restart dev server after changing `.env`

### Users can't sign up
- Check Supabase Dashboard > Authentication > Providers
- Ensure Email provider is enabled
- Check for email confirmation requirements

### Session not persisting
- Check browser localStorage (Supabase stores session there)
- Verify Supabase URL is correct
- Check for CORS issues in browser console

### RLS blocks all queries
- Temporarily disable RLS during development
- Check policy configurations
- Ensure user is authenticated before queries

## File Structure

```
src/
├── contexts/
│   └── AuthContext.jsx          # Auth state management
├── components/
│   ├── Auth.jsx                 # Login/Signup UI
│   ├── ProtectedRoute.jsx       # Route protection
│   ├── SettingsViews.jsx        # Profile settings (ProfileSettingsView)
│   ├── Sidebars.jsx             # User display in footer
│   └── TaskDetails.jsx          # User integration in comments
├── supabaseClient.js            # Supabase configuration
├── App.jsx                      # Protected app wrapper
└── main.jsx                     # AuthProvider wrapper

.env.example                     # Environment template
.env                            # Your credentials (gitignored)
```

## Next Steps

### Recommended Enhancements
1. **Social Authentication**: Add Google, GitHub, etc.
2. **Team Invitations**: Invite users to join organization
3. **Role-based Access Control**: Admin, Member, Viewer roles
4. **Audit Logging**: Track user actions
5. **Session Timeout**: Auto-logout after inactivity
6. **Email Verification**: Require email confirmation
7. **Avatar Upload**: Direct file upload instead of URLs
8. **Account Deletion**: Allow users to delete accounts

## Support

For Supabase-specific issues:
- Documentation: https://supabase.com/docs/guides/auth
- Community: https://github.com/supabase/supabase/discussions

For application issues:
- Check browser console for errors
- Verify Supabase Dashboard for user creation
- Test API connectivity
