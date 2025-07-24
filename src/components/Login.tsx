import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      setIsSubmitting(false);
      return;
    }

    const success = await login(username.trim(), password);
    
    if (!success) {
      setError('Invalid username or password');
    }
    
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sy-black-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sy-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sy-black-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-sy-green-100">
            <User className="h-6 w-6 text-sy-green-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-sy-black-900">
            Sign in to SMT Production
          </h2>
          <p className="mt-2 text-center text-sm text-sy-black-600">
            Access your production scheduling dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-sy-black-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-sy-black-300 rounded-md placeholder-sy-black-500 text-sy-black-900 focus:outline-none focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  placeholder="Username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-sy-black-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-sy-black-300 rounded-md placeholder-sy-black-500 text-sy-black-900 focus:outline-none focus:ring-sy-green-500 focus:border-sy-green-500 sm:text-sm"
                  placeholder="Password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-sy-black-400 hover:text-sy-black-500 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-sy-green-600 hover:bg-sy-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sy-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="mt-6">
            <div className="bg-sy-black-100 rounded-md p-4">
              <h3 className="text-sm font-medium text-sy-black-900 mb-2">Default Accounts:</h3>
              <div className="text-xs text-sy-black-600 space-y-1">
                <div><span className="font-medium">Admin:</span> admin / admin123</div>
                <div><span className="font-medium">Scheduler:</span> scheduler / scheduler123</div>
                <div><span className="font-medium">Supervisor:</span> supervisor / supervisor123</div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 