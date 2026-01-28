/**
 * PairDevicePage - Admin page for completing QR-based device pairing
 *
 * This page is loaded when admin scans the QR code displayed on a device.
 * It shows:
 * 1. If device is already paired - message with existing screen info
 * 2. List of unpaired screens to select from
 * 3. Form to create a new screen and pair immediately
 * 4. Optional kiosk PIN setup during pairing
 *
 * Route: /pair/:deviceId (protected - requires auth)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';


import { useLogger } from '../hooks/useLogger';
import {
  fetchScreens,
  pairDeviceToScreen,
  createAndPairScreen,
  getScreenByDeviceId,
} from '../services/screenService';



export default function PairDevicePage() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const logger = useLogger('PairDevicePage');

  // State
  const [loading, setLoading] = useState(true);
  const [pairing, setPairing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [existingScreen, setExistingScreen] = useState(null);
  const [unpairedScreens, setUnpairedScreens] = useState([]);
  const [selectedScreenId, setSelectedScreenId] = useState(null);
  const [newScreenName, setNewScreenName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [kioskPin, setKioskPin] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Check if device is already paired
        const existing = await getScreenByDeviceId(deviceId);
        if (existing) {
          logger.info('Device already paired', { deviceId, screenId: existing.id });
          setExistingScreen(existing);
          setLoading(false);
          return;
        }

        // Load all screens and filter to unpaired
        const allScreens = await fetchScreens({ limit: 200 });
        const unpaired = allScreens.filter(s => !s.is_paired && !s.device_id);
        setUnpairedScreens(unpaired);
        logger.info('Loaded unpaired screens', { count: unpaired.length });
      } catch (err) {
        logger.error('Failed to load pairing data', { error: err.message });
        setError('Failed to load screens. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    if (deviceId) {
      loadData();
    }
  }, [deviceId, logger]);

  // Handle pairing to existing screen
  const handlePairToExisting = useCallback(async () => {
    if (!selectedScreenId) {
      setError('Please select a screen to pair');
      return;
    }

    try {
      setPairing(true);
      setError(null);

      const pin = showPinInput && kioskPin.length === 4 ? kioskPin : null;
      const screen = await pairDeviceToScreen(deviceId, selectedScreenId, pin);

      logger.info('Device paired to existing screen', {
        deviceId,
        screenId: selectedScreenId,
        screenName: screen.device_name,
      });

      setSuccess(`Successfully paired to "${screen.device_name}"!`);

      // Navigate to screens page after short delay
      setTimeout(() => navigate('/app/screens'), 2000);
    } catch (err) {
      logger.error('Failed to pair device', { error: err.message });
      setError('Failed to pair device. Please try again.');
    } finally {
      setPairing(false);
    }
  }, [deviceId, selectedScreenId, showPinInput, kioskPin, navigate, logger]);

  // Handle creating new screen and pairing
  const handleCreateAndPair = useCallback(async () => {
    if (!newScreenName.trim()) {
      setError('Please enter a screen name');
      return;
    }

    try {
      setPairing(true);
      setError(null);

      const pin = showPinInput && kioskPin.length === 4 ? kioskPin : null;
      const screen = await createAndPairScreen(deviceId, newScreenName.trim(), pin);

      logger.info('Device paired to new screen', {
        deviceId,
        screenId: screen.id,
        screenName: screen.device_name,
      });

      setSuccess(`Created and paired to "${screen.device_name}"!`);

      // Navigate to screens page after short delay
      setTimeout(() => navigate('/app/screens'), 2000);
    } catch (err) {
      logger.error('Failed to create and pair', { error: err.message });
      setError('Failed to create screen. Please try again.');
    } finally {
      setPairing(false);
    }
  }, [deviceId, newScreenName, showPinInput, kioskPin, navigate, logger]);

  // Handle PIN input change
  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setKioskPin(value);
  };

  // Loading state
  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading pairing options...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Already paired state
  if (existingScreen) {
    return (
      <PageLayout>
        <PageContent className="max-w-xl mx-auto py-12">
          <Card>
            <CardContent className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Device Already Paired
              </h2>
              <p className="text-gray-600 mb-6">
                This device is already paired to &quot;{existingScreen.device_name}&quot;.
              </p>
              <Stack gap="sm">
                <Button onClick={() => navigate('/app/screens')}>
                  Go to Screens
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/app/screens/${existingScreen.id}`)}
                >
                  View Screen Details
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </PageContent>
      </PageLayout>
    );
  }

  // Success state
  if (success) {
    return (
      <PageLayout>
        <PageContent className="max-w-xl mx-auto py-12">
          <Card>
            <CardContent className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Pairing Complete!
              </h2>
              <p className="text-gray-600 mb-2">{success}</p>
              <p className="text-sm text-gray-500">
                Redirecting to screens page...
              </p>
            </CardContent>
          </Card>
        </PageContent>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Pair Device"
        description={`Pair device ${deviceId.slice(0, 8)}... to a screen`}
        icon={<Tv2 className="h-6 w-6 text-blue-600" />}
      />

      <PageContent className="max-w-2xl mx-auto">
        <Stack gap="lg">
          {/* Error Alert */}
          {error && (
            <Alert variant="error" icon={<AlertCircle className="h-5 w-5" />}>
              {error}
            </Alert>
          )}

          {/* Select Existing Screen */}
          <Card>
            <CardHeader>
              <CardTitle>Select Existing Screen</CardTitle>
              <CardDescription>
                Choose an unpaired screen to connect this device to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unpairedScreens.length === 0 ? (
                <EmptyState
                  icon={<Monitor className="h-12 w-12 text-gray-400" />}
                  title="No unpaired screens"
                  description="All your screens are already paired. Create a new screen below."
                />
              ) : (
                <Stack gap="sm">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {unpairedScreens.map((screen) => (
                      <button
                        key={screen.id}
                        onClick={() => setSelectedScreenId(screen.id)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedScreenId === screen.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Monitor className={`h-5 w-5 ${
                            selectedScreenId === screen.id ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          <div>
                            <p className="font-medium text-gray-900">
                              {screen.device_name}
                            </p>
                            {screen.assigned_playlist && (
                              <p className="text-sm text-gray-500">
                                Playlist: {screen.assigned_playlist.name}
                              </p>
                            )}
                          </div>
                          {selectedScreenId === screen.id && (
                            <Check className="h-5 w-5 text-blue-600 ml-auto" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedScreenId && (
                    <Button
                      onClick={handlePairToExisting}
                      disabled={pairing}
                      className="mt-4"
                    >
                      {pairing ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Pairing...
                        </>
                      ) : (
                        <>
                          Pair to Selected Screen
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 px-4 text-sm text-gray-500">or</span>
            </div>
          </div>

          {/* Create New Screen */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Screen</CardTitle>
              <CardDescription>
                Create a new screen and pair this device to it
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateForm ? (
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Screen
                </Button>
              ) : (
                <Stack gap="md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Screen Name
                    </label>
                    <Input
                      placeholder="e.g., Lobby Display, Conference Room TV"
                      value={newScreenName}
                      onChange={(e) => setNewScreenName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <Button
                    onClick={handleCreateAndPair}
                    disabled={pairing || !newScreenName.trim()}
                  >
                    {pairing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create and Pair
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* Optional Kiosk PIN */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-gray-400" />
                <CardTitle className="text-base">Optional: Set Kiosk PIN</CardTitle>
              </div>
              <CardDescription>
                Set a 4-digit PIN to protect this device from unauthorized access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPinInput}
                    onChange={(e) => setShowPinInput(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Set kiosk PIN</span>
                </label>
                {showPinInput && (
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={4}
                    placeholder="0000"
                    value={kioskPin}
                    onChange={handlePinChange}
                    className="w-24 text-center font-mono text-lg tracking-widest"
                  />
                )}
              </div>
              {showPinInput && kioskPin.length > 0 && kioskPin.length < 4 && (
                <p className="text-sm text-amber-600 mt-2">
                  PIN must be 4 digits
                </p>
              )}
            </CardContent>
          </Card>
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
