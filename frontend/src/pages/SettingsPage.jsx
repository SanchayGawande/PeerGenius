// frontend/src/pages/SettingsPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { getUserSettings, saveUserSettings } from '../services/firebaseService';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();
  const { theme, setTheme } = useTheme();
  
  // Loading state
  const [loading, setLoading] = useState(false);

  // Settings state
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    threadUpdates: true,
    aiResponses: true,
    mentions: true,
  });

  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'en',
    autoSave: true,
    compactMode: false,
  });

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Sync theme from context
  useEffect(() => {
    setPreferences(prev => ({ ...prev, theme }));
  }, [theme]);

  const loadSettings = () => {
    try {
      const settings = getUserSettings();
      console.log('🔧 Loading settings:', settings);
      setNotifications(settings.notifications);
      setPreferences({
        ...settings.preferences,
        theme // Use current theme from context
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      showError('Failed to load settings');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleNotificationChange = (key, value) => {
    setNotifications(prev => {
      const newNotifications = {
        ...prev,
        [key]: value
      };
      
      // Auto-save on change
      if (preferences.autoSave) {
        autoSaveSettings(newNotifications, preferences);
      }
      
      return newNotifications;
    });
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => {
      const newPreferences = {
        ...prev,
        [key]: value
      };
      
      // Apply theme immediately when changed
      if (key === 'theme') {
        setTheme(value);
      }
      
      // Auto-save on change
      if (newPreferences.autoSave) {
        autoSaveSettings(notifications, newPreferences);
      }
      
      return newPreferences;
    });
  };

  // Auto-save function
  const autoSaveSettings = async (currentNotifications, currentPreferences) => {
    try {
      const settingsToSave = {
        theme: currentPreferences.theme,
        language: currentPreferences.language,
        notifications: currentNotifications,
        preferences: currentPreferences
      };
      
      await saveUserSettings(settingsToSave);
      console.log('🔧 Auto-saved settings');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      const settingsToSave = {
        theme: preferences.theme,
        language: preferences.language,
        notifications,
        preferences
      };
      
      await saveUserSettings(settingsToSave);
      showSuccess('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
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
              <span className="text-slate-900 dark:text-slate-100 font-medium">Settings</span>
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400">Customize your PeerGenius experience</p>
        </div>

        <div className="space-y-8">
          {/* Notification Settings */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>🔔</span>
                <span>Notification Settings</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Choose what notifications you want to receive</p>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Email Notifications</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Get notified via email about important updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.email}
                    onChange={(e) => handleNotificationChange('email', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Push Notifications</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Get push notifications in your browser</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.push}
                    onChange={(e) => handleNotificationChange('push', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Thread Updates */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Thread Updates</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">New messages in threads you're participating in</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.threadUpdates}
                    onChange={(e) => handleNotificationChange('threadUpdates', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* AI Responses */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">AI Responses</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">When AI responds to your messages</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={notifications.aiResponses}
                    onChange={(e) => handleNotificationChange('aiResponses', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>⚙️</span>
                <span>Application Preferences</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Customize how PeerGenius works for you</p>
            </div>

            <div className="px-8 py-6 space-y-6">
              {/* Theme Selection */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Theme</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['light', 'dark', 'auto'].map((theme) => (
                    <label key={theme} className="relative">
                      <input
                        type="radio"
                        name="theme"
                        value={theme}
                        checked={preferences.theme === theme}
                        onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                        className="sr-only peer"
                      />
                      <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg cursor-pointer peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900 peer-checked:border-blue-500 dark:peer-checked:border-blue-400 transition-colors">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 peer-checked:text-blue-700 dark:peer-checked:text-blue-300 capitalize">
                          {theme === 'auto' ? '🔄 Auto' : theme === 'light' ? '☀️ Light' : '🌙 Dark'}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Language Selection */}
              <div>
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">Language</h3>
                <select
                  value={preferences.language}
                  onChange={(e) => handlePreferenceChange('language', e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 dark:text-slate-100 transition-colors"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Spanish</option>
                  <option value="fr">🇫🇷 French</option>
                  <option value="de">🇩🇪 German</option>
                </select>
              </div>

              {/* Auto-save */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Auto-save</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Automatically save your drafts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.autoSave}
                    onChange={(e) => handlePreferenceChange('autoSave', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Compact Mode</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Use a denser layout to fit more content</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.compactMode}
                    onChange={(e) => handlePreferenceChange('compactMode', e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 dark:after:border-gray-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 dark:peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>🔒</span>
                <span>Account Security</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your account security settings</p>
            </div>

            <div className="px-8 py-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Current Email</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{currentUser?.email}</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors">
                  Change Email
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Password</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Last updated: Not available</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors">
                  Change Password
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">Two-Factor Authentication</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Add an extra layer of security</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  Enable 2FA
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              )}
              <span>{loading ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Settings are automatically saved to your browser and synced across devices. Theme changes apply immediately.
          </p>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;