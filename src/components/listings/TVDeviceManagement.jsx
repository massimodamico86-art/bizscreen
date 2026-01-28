import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabase';
import { generateQRCode } from '../../services/qrcodeService';
import { useLogger } from '../../hooks/useLogger.js';

export const TVDeviceManagement = ({ formData, setFormData, showToast }) => {
  const logger = useLogger('TVDeviceManagement');
  const [loading, setLoading] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(null);
  const [pairingCodes, setPairingCodes] = useState({});
  const [qrCodes, setQrCodes] = useState({});
  const [showPairingModal, setShowPairingModal] = useState(null);

  // Fetch TV devices from Supabase on mount and subscribe to real-time changes
  useEffect(() => {
    if (!formData.id) return;

    const fetchDevices = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('tv_devices')
          .select('*')
          .eq('listing_id', formData.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Convert snake_case to camelCase for frontend
        const devicesData = (data || []).map(device => ({
          id: device.id,
          name: device.name || device.device_name,
          otp: device.otp,
          otpExpiresAt: device.otp_expires_at,
          isOnline: device.is_online,
          isPaired: device.is_paired,
          lastSeen: device.last_seen_at,
          platform: device.platform,
          model: device.model,
          appVersion: device.app_version
        }));

        setFormData({
          ...formData,
          tvDevices: devicesData
        });
      } catch (error) {
        logger.error('Error fetching TV devices', { error });
        if (showToast) {
          showToast('Error loading TV devices: ' + error.message, 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`tv-devices-${formData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tv_devices',
          filter: `listing_id=eq.${formData.id}`
        },
        (payload) => {
          logger.debug('TV device change received', { eventType: payload.eventType, id: payload.new?.id || payload.old?.id });

          if (payload.eventType === 'INSERT') {
            const newDevice = {
              id: payload.new.id,
              name: payload.new.name || payload.new.device_name,
              otp: payload.new.otp,
              otpExpiresAt: payload.new.otp_expires_at,
              isOnline: payload.new.is_online,
              isPaired: payload.new.is_paired,
              lastSeen: payload.new.last_seen_at,
              platform: payload.new.platform,
              model: payload.new.model
            };
            setFormData(prev => ({
              ...prev,
              tvDevices: [...(prev.tvDevices || []), newDevice]
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedDevice = {
              id: payload.new.id,
              name: payload.new.name || payload.new.device_name,
              otp: payload.new.otp,
              otpExpiresAt: payload.new.otp_expires_at,
              isOnline: payload.new.is_online,
              isPaired: payload.new.is_paired,
              lastSeen: payload.new.last_seen_at,
              platform: payload.new.platform,
              model: payload.new.model,
              appVersion: payload.new.app_version
            };
            setFormData(prev => ({
              ...prev,
              tvDevices: (prev.tvDevices || []).map(d =>
                d.id === updatedDevice.id ? updatedDevice : d
              )
            }));
            // Clear pairing code if device was just paired
            if (payload.new.is_paired && !payload.old?.is_paired) {
              setPairingCodes(prev => {
                const newCodes = { ...prev };
                delete newCodes[payload.new.id];
                return newCodes;
              });
              setQrCodes(prev => {
                const newQrs = { ...prev };
                delete newQrs[payload.new.id];
                return newQrs;
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setFormData(prev => ({
              ...prev,
              tvDevices: (prev.tvDevices || []).filter(d => d.id !== payload.old.id)
            }));
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [formData.id]);

  // Generate pairing code for a device
  const generatePairingCode = useCallback(async (deviceId) => {
    setGeneratingCode(deviceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/screens/generate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ screenId: deviceId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate code');
      }

      // Store the code
      const expiresAt = new Date(Date.now() + data.expiresIn * 1000);
      setPairingCodes(prev => ({
        ...prev,
        [deviceId]: {
          code: data.code,
          expiresAt
        }
      }));

      // Generate QR code with deep link
      const deepLink = `bizscreen://pair?token=${data.code}&screen=${deviceId}`;
      const qrDataUrl = await generateQRCode(deepLink, { width: 256 });
      setQrCodes(prev => ({
        ...prev,
        [deviceId]: qrDataUrl
      }));

      if (showToast) {
        showToast('Pairing code generated!');
      }
    } catch (error) {
      logger.error('Error generating pairing code', { error });
      if (showToast) {
        showToast('Error: ' + error.message, 'error');
      }
    } finally {
      setGeneratingCode(null);
    }
  }, [showToast]);

  // Copy code to clipboard
  const copyCode = useCallback((code) => {
    navigator.clipboard.writeText(code);
    if (showToast) {
      showToast('Code copied to clipboard!');
    }
  }, [showToast]);

  // Format last seen time
  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform?.toLowerCase()) {
      case 'ios':
      case 'android':
        return <Smartphone size={14} className="text-gray-500" />;
      default:
        return <Monitor size={14} className="text-gray-500" />;
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-semibold mb-3">Manage TVs & Screens</h3>

      {loading && (
        <div className="text-center py-4 text-gray-500">Loading devices...</div>
      )}

      {(formData.tvDevices || []).map((tv, idx) => (
        <div key={tv.id || idx} className="border rounded-lg p-3 mb-3 bg-gray-50">
          <div className="flex gap-2 items-center">
            <div className="relative w-10 h-10 bg-white rounded-lg flex items-center justify-center text-lg border">
              {getPlatformIcon(tv.platform)}
              {/* Online status indicator */}
              <div
                className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                  tv.isOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
                title={tv.isOnline ? 'Online' : 'Offline'}
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={tv.name || ''}
                onChange={async (e) => {
                  const newName = e.target.value;
                  const newTvs = [...(formData.tvDevices || [])];
                  newTvs[idx].name = newName;
                  setFormData({ ...formData, tvDevices: newTvs });

                  // Save to Supabase if device has an ID
                  if (tv.id) {
                    try {
                      const { error } = await supabase
                        .from('tv_devices')
                        .update({
                          name: newName,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', tv.id);

                      if (error) throw error;
                    } catch (error) {
                      logger.error('Error updating TV device', { error });
                      if (showToast) {
                        showToast('Error updating TV device: ' + error.message, 'error');
                      }
                    }
                  }
                }}
                placeholder="Device name"
                className="w-full px-3 py-1.5 border rounded text-sm bg-white"
              />
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                {tv.isPaired ? (
                  <>
                    {tv.isOnline ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <Wifi size={12} /> Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <WifiOff size={12} /> {formatLastSeen(tv.lastSeen)}
                      </span>
                    )}
                    {tv.platform && <span className="capitalize">{tv.platform}</span>}
                    {tv.model && <span>{tv.model}</span>}
                  </>
                ) : (
                  <span className="text-amber-600">Not paired</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {!tv.isPaired && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    generatePairingCode(tv.id);
                    setShowPairingModal(tv.id);
                  }}
                  disabled={generatingCode === tv.id}
                  title="Generate pairing code"
                >
                  {generatingCode === tv.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <QrCode size={14} />
                  )}
                </Button>
              )}
              <button
                onClick={async () => {
                  if (!window.confirm('Are you sure you want to delete this device?')) {
                    return;
                  }

                  if (tv.id) {
                    try {
                      const { error } = await supabase
                        .from('tv_devices')
                        .delete()
                        .eq('id', tv.id);

                      if (error) throw error;

                      if (showToast) {
                        showToast('Device deleted successfully!');
                      }
                    } catch (error) {
                      logger.error('Error deleting TV device', { error });
                      if (showToast) {
                        showToast('Error deleting device: ' + error.message, 'error');
                      }
                      return;
                    }
                  }

                  const newTvs = (formData.tvDevices || []).filter((_, i) => i !== idx);
                  setFormData({ ...formData, tvDevices: newTvs });
                }}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Pairing Code Display */}
          {showPairingModal === tv.id && pairingCodes[tv.id] && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-start gap-4">
                {/* QR Code */}
                {qrCodes[tv.id] && (
                  <div className="flex-shrink-0">
                    <img
                      src={qrCodes[tv.id]}
                      alt="Pairing QR Code"
                      className="w-32 h-32 border rounded"
                    />
                    <p className="text-xs text-gray-500 text-center mt-1">Scan with app</p>
                  </div>
                )}

                {/* Code and Instructions */}
                <div className="flex-1">
                  <div className="text-sm text-gray-600 mb-2">
                    Or enter this code in the player app:
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-mono text-2xl font-bold tracking-wider bg-white px-4 py-2 rounded border">
                      {pairingCodes[tv.id].code}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(pairingCodes[tv.id].code)}
                      title="Copy code"
                    >
                      <Copy size={14} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    <Clock size={12} />
                    <ExpirationTimer expiresAt={pairingCodes[tv.id].expiresAt} />
                  </div>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generatePairingCode(tv.id)}
                      disabled={generatingCode === tv.id}
                    >
                      <RefreshCw size={12} className={generatingCode === tv.id ? 'animate-spin' : ''} />
                      <span className="ml-1">Generate New Code</span>
                    </Button>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowPairingModal(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        onClick={async () => {
          try {
            // Insert into Supabase with a temporary name
            const { data, error } = await supabase
              .from('tv_devices')
              .insert([{
                listing_id: formData.id,
                name: `Screen ${(formData.tvDevices || []).length + 1}`,
                is_online: false,
                is_paired: false
              }])
              .select()
              .single();

            if (error) throw error;

            // Convert back to camelCase and update local state
            const newDevice = {
              id: data.id,
              name: data.name,
              otp: data.otp,
              isOnline: data.is_online,
              isPaired: data.is_paired,
              lastSeen: data.last_seen_at
            };

            setFormData({
              ...formData,
              tvDevices: [
                ...(formData.tvDevices || []),
                newDevice
              ]
            });

            if (showToast) {
              showToast('Screen added! Click the QR icon to generate a pairing code.');
            }
          } catch (error) {
            logger.error('Error adding TV device', { error });
            if (showToast) {
              showToast('Error adding device: ' + error.message, 'error');
            }
          }
        }}
      >
        <Plus size={14} /> Add Screen
      </Button>
    </div>
  );
};

// Expiration countdown timer component
function ExpirationTimer({ expiresAt }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`Expires in ${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className={timeLeft === 'Expired' ? 'text-red-500' : ''}>{timeLeft}</span>;
}
