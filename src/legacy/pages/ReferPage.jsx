
import { Share2, Users, DollarSign, Target } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import StatCard from '../components/StatCard';

const ReferPage = ({ showToast }) => {
  const copyCode = () => {
    navigator.clipboard.writeText('ADMIN2024');
    showToast('Referral code copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Refer & Earn</h1>
        <p className="text-gray-600">Earn $9.99 credit for every friend you refer</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Referrals" value="5" icon={Users} />
        <StatCard title="Total Earnings" value="$49.95" icon={DollarSign} />
        <StatCard title="Conversion Rate" value="80%" icon={Target} />
      </div>

      <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-bold mb-4">Your Referral Code</h2>
        <div className="flex gap-2">
          <input type="text" value="ADMIN2024" readOnly className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-lg text-lg font-bold bg-white" />
          <Button onClick={copyCode}>
            <Share2 size={18} />
            Copy Code
          </Button>
        </div>
        <p className="text-sm text-gray-600 mt-3">Share this code with friends. When they sign up, you both get $9.99 credit!</p>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Share on Social Media</h2>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => showToast('Opening Facebook...')}>
            Facebook
          </Button>
          <Button variant="outline" onClick={() => showToast('Opening Twitter...')}>
            Twitter
          </Button>
          <Button variant="outline" onClick={() => showToast('Opening LinkedIn...')}>
            LinkedIn
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ReferPage;
