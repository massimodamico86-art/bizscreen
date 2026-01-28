import { useState } from 'react';

const DateRangeModal = ({ isOpen, onClose, onApply }) => {
  const [range, setRange] = useState('30');

  const handleApply = () => {
    onApply(range);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Date Range" size="small">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Date Range</label>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </div>
    </Modal>
  );
};

export default DateRangeModal;
