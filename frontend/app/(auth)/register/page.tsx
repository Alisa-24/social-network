'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register, getCurrentUser } from '@/lib/auth';
import { User, Mail, Lock, Calendar, MessageSquare, Image as ImageIcon, Sparkles, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    nickname: '',
    aboutMe: '',
  });
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        router.push('/feed');
        return;
      }
      setCheckingAuth(false);
    }
    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        nickname: formData.nickname || undefined,
        aboutMe: formData.aboutMe || undefined,
        avatar: avatar || undefined,
      });
      
      router.push('/feed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value ?? '',
    });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-white">Loading...</p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-lg bg-black p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h2 className="text-2xl font-semibold text-white animate-in fade-in slide-in-from-left-2 duration-700">
            Create Account
          </h2>
        </div>
        <p className="mt-1 text-sm text-zinc-400 animate-in fade-in slide-in-from-left-2 duration-700 delay-100">
          Join our social network
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label htmlFor="firstName" className="block text-sm text-zinc-300 mb-1.5">
              First Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-zinc-500 transition-all duration-200 hover:border-zinc-700"
                placeholder="Ali"
              />
            </div>
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm text-zinc-300 mb-1.5">
              Last Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-zinc-500 transition-all duration-200 hover:border-zinc-700"
                placeholder="Hussain"
              />
            </div>
          </div>

          <div>
            <label htmlFor="nickname" className="block text-sm text-zinc-300 mb-1.5">
              Nickname <span className="text-zinc-500">(optional)</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="nickname"
                name="nickname"
                type="text"
                value={formData.nickname}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-zinc-500 transition-all duration-200 hover:border-zinc-700"
                placeholder="username"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="email" className="block text-sm text-zinc-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-zinc-500 transition-all duration-200 hover:border-zinc-700"
                placeholder="example@email.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm text-zinc-300 mb-1.5">
              Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white transition-all duration-200 hover:border-zinc-700"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="password" className="block text-sm text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-zinc-500 transition-all duration-200 hover:border-zinc-700"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm text-zinc-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-zinc-500 transition-all duration-200 hover:border-zinc-700"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="avatar" className="block text-sm text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-zinc-500" />
              Avatar <span className="text-zinc-500">(optional)</span>
            </label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 transition-all duration-200 hover:border-zinc-700"
            />
            {avatarPreview && (
              <div className="mt-1.5 relative inline-block">
                <img
                  src={avatarPreview}
                  alt="Avatar preview"
                  className="w-12 h-12 rounded-full object-cover border border-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPreview('');
                    setAvatar(null);
                  }}
                  className="absolute -top-0.5 -right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="aboutMe" className="block text-sm text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
              About Me <span className="text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="aboutMe"
              name="aboutMe"
              rows={2}
              value={formData.aboutMe}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-zinc-500 resize-none transition-all duration-200 hover:border-zinc-700"
              placeholder="A bit about you..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white text-black rounded-md font-medium hover:bg-zinc-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed mt-2 transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </span>
          ) : 'Create Account'}
        </button>

        <div className="text-center mt-4">
          <p className="text-sm text-zinc-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-white hover:text-zinc-300 underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
