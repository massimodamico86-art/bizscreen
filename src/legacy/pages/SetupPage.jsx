

const SetupPage = ({ showToast }) => {
  const steps = [
    { label: 'Add Locations', completed: true },
    { label: 'Confirm Locations', completed: true },
    { label: 'Download TV App', completed: true },
    { label: 'Complete!', completed: true }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Setup account</h1>

      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                step.completed ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              }`}
            >
              {step.completed ? <Check size={14} /> : index + 1}
            </div>
            <span className="ml-2 text-sm font-medium">{step.label}</span>
            {index < steps.length - 1 && (
              <div className="mx-2 flex-1 border-t-2 border-gray-300"></div>
            )}
          </div>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Check size={16} className="text-green-600" />
          </div>
          <h2 className="font-semibold text-lg">Set Up Complete!</h2>
        </div>
        <p className="text-gray-600 mb-6">
          Your setup is complete. Now, let's personalize your experience!
        </p>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">
              1
            </div>
            <div>
              <strong className="text-gray-900">Customize your screen:</strong>
              <p className="text-gray-600">
                Go to the Locations tab and click <em>Edit</em> to start customizing any screen you want.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">
              2
            </div>
            <div>
              <strong className="text-gray-900">Manage TV connections:</strong>
              <p className="text-gray-600">
                Once you're done customizing, locate <em>Manage TV Connections</em> and click + to get your one-time password to connect to the TV.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">
              3
            </div>
            <div>
              <strong className="text-gray-900">Apply changes:</strong>
              <p className="text-gray-600">
                When you make any changes, exit the app on the TV and open it again. Your changes will be reflected.
              </p>
            </div>
          </div>
        </div>

        <Button className="mt-6" onClick={() => showToast('Setup complete!')}>
          Complete
        </Button>
      </Card>
    </div>
  );
};

export default SetupPage;
