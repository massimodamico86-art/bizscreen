import { useState } from 'react';
import { CreditCard, Download } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import Badge from '../components/Badge';

const SubscriptionPage = ({ showToast }) => {
  const [currentPlan, setCurrentPlan] = useState('pro');

  const plans = [
    { id: 'starter', name: 'Starter', price: 29, locations: 3 },
    { id: 'pro', name: 'Pro', price: 59, locations: 10 },
    { id: 'enterprise', name: 'Enterprise', price: 149, locations: 'Unlimited' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription & Billing</h1>
        <p className="text-gray-600">Manage your plan and payment methods</p>
      </div>

      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Current Plan: Pro</h2>
            <p className="text-gray-600">$59/month • 10 locations included</p>
            <p className="text-sm text-gray-500 mt-1">Next billing date: November 28, 2025</p>
          </div>
          <Button onClick={() => showToast('Payment details feature coming soon!')}>
            <CreditCard size={18} />
            Update Payment
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <Card key={plan.id} className={`p-6 ${currentPlan === plan.id ? 'border-2 border-blue-500' : ''}`}>
            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
            <div className="text-3xl font-bold mb-1">${plan.price}<span className="text-lg text-gray-600 font-normal">/mo</span></div>
            <p className="text-gray-600 mb-4">{plan.locations} locations</p>
            {currentPlan === plan.id ? (
              <Badge variant="success" className="w-full text-center">Current Plan</Badge>
            ) : (
              <Button
                className="w-full"
                variant={currentPlan === plan.id ? 'outline' : 'primary'}
                onClick={() => { setCurrentPlan(plan.id); showToast(`Switched to ${plan.name} plan!`); }}
              >
                {plan.price > plans.find(p => p.id === currentPlan).price ? 'Upgrade' : 'Downgrade'}
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Billing History</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">October 2025 - Pro Plan</div>
              <div className="text-sm text-gray-600">Oct 28, 2025</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold">$59.00</span>
              <Button size="sm" variant="outline">
                <Download size={14} />
                Invoice
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SubscriptionPage;
