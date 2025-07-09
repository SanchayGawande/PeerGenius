// frontend/src/pages/ProfilePage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { 
  updateUserProfile, 
  changeUserPassword, 
  changeUserEmail, 
  uploadAvatar, 
  removeAvatar, 
  getUserStats, 
  exportUserData 
} from '../services/firebaseService';

const ProfilePage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const fileInputRef = useRef(null);

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [loading, setLoading] = useState({
    profile: false,
    avatar: false,
    password: false,
    email: false,
    export: false
  });

  // Stats state
  const [stats, setStats] = useState({
    threadsJoined: 0,
    messagesSent: 0,
    aiInteractions: 0
  });

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [emailData, setEmailData] = useState({
    password: '',
    newEmail: ''
  });

  // Initialize data
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || currentUser.email?.split('@')[0] || '');
      loadStats();
    }
  }, [currentUser]);

  const loadStats = async () => {
    try {
      const userStats = await getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Generate user initials
  const getInitials = (email) => {
    if (!email) return 'U';
    const name = email.split('@')[0];
    if (name.length >= 2) {
      return name.slice(0, 2).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Generate consistent avatar color based on email
  const getAvatarColor = (email) => {
    if (!email) return 'bg-gradient-to-br from-gray-400 to-gray-500';
    
    const colors = [
      'bg-gradient-to-br from-blue-400 to-blue-600',
      'bg-gradient-to-br from-purple-400 to-purple-600',
      'bg-gradient-to-br from-pink-400 to-pink-600',
      'bg-gradient-to-br from-green-400 to-green-600',
      'bg-gradient-to-br from-yellow-400 to-yellow-600',
      'bg-gradient-to-br from-red-400 to-red-600',
      'bg-gradient-to-br from-indigo-400 to-indigo-600',
      'bg-gradient-to-br from-teal-400 to-teal-600',
    ];
    
    const hash = email.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colors[Math.abs(hash) % colors.length];
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  // Profile name update
  const handleUpdateName = async () => {
    if (!displayName.trim()) {
      showError('Display name cannot be empty');
      return;
    }

    setLoading(prev => ({ ...prev, profile: true }));
    try {
      await updateUserProfile(displayName.trim());
      setIsEditingName(false);
      showSuccess('Profile updated successfully');
    } catch (error) {
      showError('Failed to update profile: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  // Avatar upload
  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('Image size must be less than 5MB');
      return;
    }

    setLoading(prev => ({ ...prev, avatar: true }));
    try {
      await uploadAvatar(file);
      showSuccess('Avatar updated successfully');
    } catch (error) {
      showError('Failed to upload avatar: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, avatar: false }));
    }
  };

  // Remove avatar
  const handleRemoveAvatar = async () => {
    setLoading(prev => ({ ...prev, avatar: true }));
    try {
      await removeAvatar();
      showSuccess('Avatar removed successfully');
    } catch (error) {
      showError('Failed to remove avatar: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, avatar: false }));
    }
  };

  // Password change
  const handleChangePassword = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      showError('Please fill in all password fields');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      showError('New passwords do not match');
      return;
    }

    if (passwordData.new.length < 6) {
      showError('New password must be at least 6 characters');
      return;
    }

    setLoading(prev => ({ ...prev, password: true }));
    try {
      await changeUserPassword(passwordData.current, passwordData.new);
      setPasswordData({ current: '', new: '', confirm: '' });
      setShowPasswordModal(false);
      showSuccess('Password changed successfully');
    } catch (error) {
      showError('Failed to change password: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  // Email change
  const handleChangeEmail = async () => {
    if (!emailData.password || !emailData.newEmail) {
      showError('Please fill in all fields');
      return;
    }

    if (emailData.newEmail === currentUser?.email) {
      showError('New email must be different from current email');
      return;
    }

    setLoading(prev => ({ ...prev, email: true }));
    try {
      await changeUserEmail(emailData.password, emailData.newEmail);
      setEmailData({ password: '', newEmail: '' });
      setShowEmailModal(false);
      showSuccess('Email changed successfully');
    } catch (error) {
      showError('Failed to change email: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  // Export data
  const handleExportData = async () => {
    setLoading(prev => ({ ...prev, export: true }));
    try {
      await exportUserData();
      showSuccess('Data exported successfully');
    } catch (error) {
      showError('Failed to export data: ' + error.message);
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-700/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm">
              <button
                onClick={handleBackToDashboard}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Dashboard
              </button>
              <span className="text-slate-400 dark:text-slate-500">/</span>
              <span className="text-slate-900 dark:text-slate-100 font-medium">My Profile</span>
            </nav>

            {/* Back Button */}
            <button
              onClick={handleBackToDashboard}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">My Profile</h1>
          <p className="text-slate-600 dark:text-slate-400">Manage your account information and preferences</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 dark:from-blue-500/20 dark:via-purple-500/20 dark:to-pink-500/20 px-8 py-12">
            <div className="flex items-center space-x-6">
              {/* Avatar with upload functionality */}
              <div className="relative">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover shadow-lg"
                  />
                ) : (
                  <div className={`w-20 h-20 rounded-full ${getAvatarColor(currentUser?.email)} flex items-center justify-center text-white text-2xl font-bold shadow-lg`}>
                    {getInitials(currentUser?.email)}
                  </div>
                )}
                
                {/* Avatar actions */}
                <div className="absolute -bottom-2 -right-2 flex space-x-1">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading.avatar}
                    className="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors flex items-center justify-center disabled:opacity-50"
                  >
                    {loading.avatar ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                  </button>
                  
                  {currentUser?.photoURL && (
                    <button
                      onClick={handleRemoveAvatar}
                      disabled={loading.avatar}
                      className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                {/* Editable display name */}
                <div className="mb-4">
                  {isEditingName ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="text-2xl font-bold text-slate-900 bg-white/80 border border-slate-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleUpdateName();
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={handleUpdateName}
                        disabled={loading.profile}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                      >
                        {loading.profile ? (
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Save'
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false);
                          setDisplayName(currentUser?.displayName || currentUser?.email?.split('@')[0] || '');
                        }}
                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User'}
                      </h2>
                      <button
                        onClick={() => setIsEditingName(true)}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <p className="text-slate-600 dark:text-slate-400 mb-4">{currentUser?.email}</p>
                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span>Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-8 py-8">
            {/* Account Information */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                    {currentUser?.email || 'Not available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">User ID</label>
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-mono text-sm">
                    {currentUser?.uid?.slice(0, 8) || 'Not available'}...
                  </div>
                </div>
              </div>
            </div>

            {/* Account Statistics */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Account Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Threads Joined</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.threadsJoined}</p>
                    </div>
                    <div className="text-blue-500 text-2xl">💬</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/50 dark:to-purple-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Messages Sent</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.messagesSent}</p>
                    </div>
                    <div className="text-purple-500 text-2xl">📤</div>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/50 dark:to-emerald-800/50 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">AI Interactions</p>
                      <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.aiInteractions}</p>
                    </div>
                    <div className="text-emerald-500 text-2xl">🤖</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Account Actions</h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  <span>🔒</span>
                  <span>Change Password</span>
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg transition-colors"
                >
                  <span>📧</span>
                  <span>Change Email</span>
                </button>
                <button
                  onClick={handleExportData}
                  disabled={loading.export}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <span>📥</span>
                  <span>{loading.export ? 'Exporting...' : 'Export Data'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={loading.password}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading.password ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Change Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Email</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={emailData.password}
                  onChange={(e) => setEmailData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">New Email</label>
                <input
                  type="email"
                  value={emailData.newEmail}
                  onChange={(e) => setEmailData(prev => ({ ...prev, newEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangeEmail}
                disabled={loading.email}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading.email ? 'Changing...' : 'Change Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;