/**
 * PricingPage - Public pricing page
 */

import { Zap, Star, Building2 } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying BizScreen',
    icon: Zap,
    features: [
      '1 screen',
      '50 MB storage',
      '3 playlists',
      '2 layouts',
      '2 schedules',
      'Basic support',
    ],
    cta: 'Start free',
    ctaLink: '/auth/signup',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: 'per month',
    description: 'Great for small businesses',
    icon: Star,
    features: [
      '5 screens',
      '500 MB storage',
      '10 playlists',
      '5 layouts',
      '5 schedules',
      'Priority support',
      'Custom branding',
    ],
    cta: 'Start free trial',
    ctaLink: '/auth/signup?plan=starter',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$79',
    period: 'per month',
    description: 'For growing businesses',
    icon: Building2,
    features: [
      '20 screens',
      '2 GB storage',
      'Unlimited playlists',
      'Unlimited layouts',
      'Unlimited schedules',
      'Priority support',
      'Custom branding',
      'Advanced analytics',
      'API access',
    ],
    cta: 'Start free trial',
    ctaLink: '/auth/signup?plan=pro',
    highlighted: false,
  },
];

const faqs = [
  {
    question: 'Can I change plans anytime?',
    answer: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we\'ll prorate your billing.',
  },
  {
    question: 'What happens if I exceed my limits?',
    answer: 'We\'ll notify you when you\'re approaching your limits. You can upgrade anytime to get more capacity.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all paid plans come with a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'What kind of support do you offer?',
    answer: 'All plans include email support. Starter and Pro plans get priority response times and access to live chat.',
  },
  {
    question: 'Can I use my own TV or device?',
    answer: 'Absolutely! BizScreen works on any smart TV with a web browser, as well as Fire TV sticks, Chromecasts, and more.',
  },
];

export default function PricingPage() {
  return (
    <div>
      <Seo pageKey="pricing" />
      {/* Header */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const Icon = plan.icon;
              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border-2 p-8 ${
                    plan.highlighted
                      ? 'border-blue-600 shadow-xl shadow-blue-600/10'
                      : 'border-gray-200'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                      Most Popular
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      plan.highlighted ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 ml-2">/{plan.period}</span>
                  </div>
                  <p className="text-gray-600 mb-6">{plan.description}</p>
                  <Link
                    to={plan.ctaLink}
                    className={`block w-full py-3 px-4 text-center font-medium rounded-lg transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                  <ul className="mt-8 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Enterprise */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Need more?</h2>
          <p className="mt-4 text-gray-600">
            For larger deployments, custom features, or volume pricing, contact us for an enterprise plan.
          </p>
          <a
            href="mailto:sales@bizscreen.app"
            className="mt-6 inline-flex items-center justify-center px-6 py-3 text-base font-medium text-blue-600 bg-white border-2 border-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Contact sales
          </a>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Frequently asked questions
          </h2>
          <div className="space-y-8">
            {faqs.map((faq) => (
              <div key={faq.question}>
                <h3 className="text-lg font-semibold text-gray-900">{faq.question}</h3>
                <p className="mt-2 text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Start free today. No credit card required.
          </p>
          <Link
            to="/auth/signup"
            className="mt-8 inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-blue-600 bg-white hover:bg-blue-50 rounded-lg transition-colors"
          >
            Create free account
          </Link>
        </div>
      </section>
    </div>
  );
}
