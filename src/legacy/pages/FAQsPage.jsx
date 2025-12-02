import { useState } from 'react';
import { Search } from 'lucide-react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { mockData } from '../data/mockData';

const FAQsPage = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const filteredFaqs = mockData.faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(search.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || faq.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">FAQs</h1>
        <p className="text-gray-600">Find answers to common questions</p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search FAQs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="all">All Categories</option>
          <option value="General">General</option>
          <option value="Billing">Billing</option>
          <option value="Integration">Integration</option>
        </select>
      </div>

      {filteredFaqs.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-500">No FAQs found matching your criteria</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFaqs.map(faq => (
            <Card key={faq.id} className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-lg">{faq.question}</h3>
                <Badge variant="info">{faq.category}</Badge>
              </div>
              <p className="text-gray-600 mb-4">{faq.answer}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <button className="hover:text-green-600">👍 Helpful</button>
                <button className="hover:text-red-600">👎 Not helpful</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FAQsPage;
