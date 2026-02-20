import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import logoSmall from '../assets/Logo Small.png';
import loginBg from '../assets/Login page right side image.png';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const { error } = await signUp(email, password, { full_name: fullName });
        if (error) throw error;
        setMessage('Check your email to confirm your account');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (err) {
      setError(err.message || 'An error occurred with Google sign in');
      setGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage('Check your email for password reset instructions');
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setShowForgotPassword(false);
  };

  // Forgot Password view
  if (showForgotPassword) {
    return (
      <div className="h-screen w-full flex overflow-hidden">
        {/* Left side */}
        <div className="w-full lg:w-2/5 h-full bg-black flex flex-col px-8 sm:px-12 lg:px-10 xl:px-16 pt-8 pb-0 overflow-y-auto">
          <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto py-8">
            <img src={logoSmall} alt="Dafolle" className="h-5 w-fit mb-8" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight" style={{ fontFamily: "'Lastik', serif" }}>
              Reset password
            </h1>
            <p className="text-neutral-500 text-sm mb-8">
              We'll send you a link to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              {message && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-start gap-3">
                  <AlertCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                  <p className="text-green-400 text-sm">{message}</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-neutral-300 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#D08B00] hover:bg-[#E09B10] text-white py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => { setShowForgotPassword(false); setError(''); setMessage(''); }}
                className="text-sm text-neutral-400 hover:text-[#D08B00] transition-colors"
              >
                Back to <span className="text-[#D08B00] font-medium">Sign In</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 -mx-8 sm:-mx-12 lg:-mx-10 xl:-mx-16">
            <div className="border-t border-neutral-800"></div>
            <div className="flex items-center justify-start h-16 px-8 sm:px-12 lg:px-10 xl:px-16">
              <p className="text-neutral-400 text-xs">
                &copy;Dafolle 2026 - All rights reserved
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Image */}
        <div className="hidden lg:block lg:w-3/5 h-full">
          <img
            src={loginBg}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* Left side - Form */}
      <div className="w-full lg:w-2/5 h-full bg-black flex flex-col px-8 sm:px-12 lg:px-10 xl:px-16 pb-0 overflow-y-auto">
        {/* Form content */}
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto py-6">
          <img src={logoSmall} alt="Dafolle" className="h-5 w-fit mb-20" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight" style={{ fontFamily: "'Lastik', serif" }}>
            {isLogin ? 'Enter the matrix' : 'Join the matrix'}
          </h1>
          <p className="text-neutral-400 text-sm mb-8">
            {isLogin
              ? 'Your creative team awaits you on the other side.'
              : 'Create your account and join the team.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {message && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            {/* Full Name (Sign up only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm text-neutral-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  required={!isLogin}
                  className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="stevejobs@dafolle.io"
                required
                className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 pr-12 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign up only) */}
            {!isLogin && (
              <div>
                <label className="block text-sm text-neutral-300 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required={!isLogin}
                    className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 pr-12 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Remember me & Forgot password (Login only) */}
            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <div
                    role="checkbox"
                    aria-checked={rememberMe}
                    tabIndex={0}
                    onClick={() => setRememberMe(!rememberMe)}
                    onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setRememberMe(!rememberMe); } }}
                    className="w-[18px] h-[18px] rounded-md border border-neutral-800 bg-[#2E2D2C40] flex items-center justify-center cursor-pointer shrink-0 transition-colors"
                  >
                    {rememberMe && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#2E2D2C3D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm text-neutral-400">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => { setShowForgotPassword(true); setError(''); setMessage(''); }}
                  className="text-sm text-[#D08B00] hover:text-[#E09B10] transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D08B00] hover:bg-[#E09B10] text-white py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full mt-3 bg-white hover:bg-neutral-100 border border-white/80 text-black py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {googleLoading ? 'Connecting...' : 'Sign in with Google'}
          </button>

          {/* Toggle Mode */}
          <div className="mt-5 text-center">
            <button
              onClick={toggleMode}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              {isLogin ? (
                <>Not in the loop yet?{' '}<span className="text-[#D08B00]">Create an account</span></>
              ) : (
                <>Already have an account?{' '}<span className="text-[#D08B00]">Sign In</span></>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 -mx-8 sm:-mx-12 lg:-mx-10 xl:-mx-16">
          <div className="border-t border-neutral-800"></div>
          <div className="flex items-center justify-start h-16 px-4 sm:px-6 lg:px-5 xl:px-8">
            <p className="text-neutral-400 text-xs">
              &copy;Dafolle 2026 - All rights reserved
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-3/5 h-full">
        <img
          src={loginBg}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { resetPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) throw error;
      setMessage('Check your email for password reset instructions');
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* Left side */}
      <div className="w-full lg:w-2/5 h-full bg-black flex flex-col px-8 sm:px-12 lg:px-10 xl:px-16 pt-8 pb-0 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto py-8">
          <img src={logoSmall} alt="Dafolle" className="h-5 w-fit mb-8" />
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight" style={{ fontFamily: "'Lastik', serif" }}>
            Reset password
          </h1>
          <p className="text-neutral-400 text-sm mb-8">
            We'll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
            {message && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-start gap-3">
                <AlertCircle size={18} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            <div>
              <label className="block text-sm text-neutral-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#2E2D2C40] border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D08B00] hover:bg-[#E09B10] text-white py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <a href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
              Back to <span className="text-[#D08B00] font-medium">Sign In</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 -mx-8 sm:-mx-12 lg:-mx-10 xl:-mx-16">
          <div className="border-t border-neutral-800"></div>
          <div className="flex items-center justify-start h-16 px-8 sm:px-12 lg:px-10 xl:px-16">
            <p className="text-neutral-400 text-xs">
              &copy;Dafolle 2026 - All rights reserved
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-3/5 h-full">
        <img
          src={loginBg}
          alt=""
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};
