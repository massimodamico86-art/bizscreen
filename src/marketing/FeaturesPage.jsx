/**
 * FeaturesPage - Public features overview page
 */

import { Link } from 'react-router-dom';
import {
  Monitor,
  Upload,
  ListVideo,
  Layout,
  Calendar,
  Wifi,
  Palette,
  Bell,
  Shield,
  Zap,
  Cloud,
  Globe,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import Seo from '../components/Seo';

const features = [
  {
    icon: Upload,
    title: 'Media Library',
    description: 'Upload images, videos, documents, and web pages. Organize everything in one place with tags and folders.',
    details: ['Support for all common formats', 'Cloud storage included', 'Automatic thumbnails', 'Drag-and-drop uploads']
  },
  {
    icon: ListVideo,
    title: 'Playlists',
    description: 'Create dynamic playlists with your content. Set durations, transitions, and shuffle options.',
    details: ['Smooth transitions', 'Per-item duration control', 'Shuffle mode', 'Easy reordering']
  },
  {
    icon: Layout,
    title: 'Multi-Zone Layouts',
    description: 'Design custom screen layouts with multiple zones. Show different content in each zone.',
    details: ['Drag-and-drop editor', 'Assign playlists per zone', 'Flexible sizing', 'Layer control']
  },
  {
    icon: Calendar,
    title: 'Scheduling',
    description: 'Schedule content to play at specific times. Perfect for day-parting and special events.',
    details: ['Day-of-week scheduling', 'Time-based rules', 'Priority levels', 'Automatic transitions']
  },
  {
    icon: Monitor,
    title: 'Screen Management',
    description: 'Manage all your screens from one dashboard. Push updates instantly to any screen.',
    details: ['Simple pairing process', 'Real-time status', 'Remote control', 'Group management']
  },
  {
    icon: Wifi,
    title: 'Health Monitoring',
    description: 'Know when screens go offline. Get alerts and track uptime for all your displays.',
    details: ['Online/offline detection', 'Email alerts', 'Health history', 'Last seen tracking']
  },
  {
    icon: Palette,
    title: 'Custom Branding',
    description: 'White-label the dashboard with your own logo and colors. Perfect for agencies.',
    details: ['Custom logo', 'Brand colors', 'Favicon support', 'Client workspaces']
  },
  {
    icon: Bell,
    title: 'Alerts & Notifications',
    description: 'Set up alerts for screen issues. Get notified when something needs attention.',
    details: ['Offline alerts', 'Email notifications', 'Configurable thresholds', 'Activity log']
  },
];

const compatibility = [
  { name: 'Smart TVs', description: 'Samsung, LG, Sony, and more' },
  { name: 'Fire TV Stick', description: 'Amazon Fire TV devices' },
  { name: 'Chromecast', description: 'Google Chromecast devices' },
  { name: 'Android TV', description: 'Any Android TV box' },
  { name: 'Web Browsers', description: 'Chrome, Firefox, Edge' },
  { name: 'Raspberry Pi', description: 'Budget-friendly option' },
];

export default function FeaturesPage() {
  return (
    <div>
      <Seo pageKey="features" />
      {/* Header */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Powerful features, simple interface
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to manage your digital signage, without the complexity.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-6 rounded-2xl border border-gray-200 hover:border-blue-200 hover:shadow-lg transition-all"
                >
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 mb-4">{feature.description}</p>
                  <ul className="space-y-2">
                    {feature.details.map((detail) => (
                      <li key={detail} className="flex items-center gap-2 text-sm text-gray-500">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for reliability</h2>
            <p className="mt-4 text-lg text-gray-600">
              Enterprise-grade infrastructure for businesses of all sizes
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Cloud, title: 'Cloud-based', description: 'No servers to maintain' },
              { icon: Zap, title: 'Real-time sync', description: 'Changes push instantly' },
              { icon: Shield, title: 'Secure', description: 'Enterprise-grade security' },
              { icon: Globe, title: '99.9% uptime', description: 'Always available' },
            ].map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.title} className="text-center p-6">
                  <Icon className="w-10 h-10 text-blue-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Compatibility */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Works with your devices</h2>
            <p className="mt-4 text-lg text-gray-600">
              No special hardware required. Use what you already have.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {compatibility.map((device) => (
              <div
                key={device.name}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200"
              >
                <Monitor className="w-8 h-8 text-gray-400" />
                <div>
                  <h3 className="font-semibold text-gray-900">{device.name}</h3>
                  <p className="text-sm text-gray-500">{device.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to see it in action?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Create a free account and explore all features.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors"
            >
              Start free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-white border-2 border-white/30 hover:bg-white/10 rounded-lg transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
