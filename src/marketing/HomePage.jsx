/**
 * HomePage - Marketing landing page
 */

import { Link } from 'react-router-dom';
import {
  Monitor,
  Upload,
  ListVideo,
  Zap,
  CheckCircle,
  ArrowRight,
  Play,
  Building2,
  UtensilsCrossed,
  Dumbbell,
  Scissors,
  GraduationCap,
  Hotel
} from 'lucide-react';
import Seo from '../components/Seo';

const useCases = [
  { icon: UtensilsCrossed, title: 'Restaurants', description: 'Digital menu boards and promotions' },
  { icon: Scissors, title: 'Salons', description: 'Service displays and wait time info' },
  { icon: Dumbbell, title: 'Gyms', description: 'Class schedules and motivational content' },
  { icon: Building2, title: 'Lobbies', description: 'Welcome messages and directories' },
  { icon: Hotel, title: 'Hotels', description: 'Guest info and event displays' },
  { icon: GraduationCap, title: 'Schools', description: 'Announcements and schedules' },
];

const steps = [
  { icon: Upload, title: 'Upload Media', description: 'Add images, videos, and web content to your library' },
  { icon: ListVideo, title: 'Build Playlists', description: 'Arrange your content into playlists with transitions' },
  { icon: Monitor, title: 'Assign to Screens', description: 'Connect your TVs and push content instantly' },
  { icon: Zap, title: 'Go Live', description: 'Your content displays in real-time on all screens' },
];

const features = [
  'Unlimited content updates',
  'Real-time screen monitoring',
  'Multi-zone layouts',
  'Time-based scheduling',
  'Works on any smart TV',
  'No special hardware needed',
];

export default function HomePage() {
  return (
    <div>
      <Seo pageKey="home" />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Digital signage for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                  real-world businesses
                </span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 max-w-xl">
                Turn any TV into a powerful digital display. Upload your content, build playlists,
                and manage all your screens from one simple dashboard.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link
                  to="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-600/25"
                >
                  Start free
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  <Play className="w-5 h-5" />
                  See how it works
                </a>
              </div>
              <div className="mt-8 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Free forever plan
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  No credit card required
                </div>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-4 border border-gray-200">
                <div className="bg-gray-900 rounded-xl aspect-video flex items-center justify-center">
                  <div className="text-center p-8">
                    <Monitor className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <div className="text-white text-lg font-medium">Your content here</div>
                    <div className="text-gray-400 text-sm mt-1">Powered by BizScreen</div>
                  </div>
                </div>
              </div>
              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-gray-700">3 screens online</span>
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3 border border-gray-200">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700">Instant updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for every business</h2>
            <p className="mt-4 text-lg text-gray-600">
              From restaurants to lobbies, BizScreen adapts to your needs
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <div
                  key={useCase.title}
                  className="p-6 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 transition-colors"
                >
                  <Icon className="w-8 h-8 text-blue-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">{useCase.title}</h3>
                  <p className="mt-2 text-gray-600">{useCase.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Get started in minutes</h2>
            <p className="mt-4 text-lg text-gray-600">
              Four simple steps to transform your screens
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="relative">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4">
                      <Icon className="w-8 h-8" />
                    </div>
                    <div className="absolute top-8 left-1/2 w-full h-0.5 bg-blue-200 hidden lg:block"
                         style={{ display: index === steps.length - 1 ? 'none' : undefined }} />
                    <span className="absolute top-0 -left-2 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="mt-2 text-gray-600">{step.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features List */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Everything you need to manage your screens
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                BizScreen gives you powerful tools without the complexity.
                Start for free and upgrade as you grow.
              </p>
              <ul className="mt-8 space-y-4">
                {features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  to="/features"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  See all features
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
              <h3 className="text-2xl font-bold mb-4">Start free today</h3>
              <p className="text-blue-100 mb-6">
                No credit card required. Get 1 screen, 50MB storage, and all core features free forever.
              </p>
              <Link
                to="/auth/signup"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors"
              >
                Create free account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Trusted by businesses everywhere</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { quote: "So easy to set up. We had our menu boards running in under an hour.", author: "Mike's Diner" },
              { quote: "Finally, digital signage that doesn't require an IT degree.", author: "Sunrise Salon" },
              { quote: "The scheduling feature is a game changer for our gym.", author: "FitZone Gym" },
            ].map((testimonial) => (
              <div key={testimonial.author} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <p className="text-gray-700 italic">"{testimonial.quote}"</p>
                <p className="mt-4 text-sm font-medium text-gray-900">— {testimonial.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to transform your screens?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join thousands of businesses using BizScreen to power their digital displays.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/auth/signup"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors"
            >
              Start free today
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
