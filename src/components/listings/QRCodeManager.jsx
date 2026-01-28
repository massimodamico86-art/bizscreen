import { useState, useEffect } from 'react';
import { supabase } from '../../supabase';
import { generateQRCode, generateWiFiQRCode, generateURLQRCode } from '../../services/qrcodeService';
import { useLogger } from '../../hooks/useLogger.js';

export const QRCodeManager = ({ formData, setFormData, showToast }) => {
  const logger = useLogger('QRCodeManager');
  const [loading, setLoading] = useState(false);

  // Fetch QR codes from Supabase on mount and subscribe to real-time changes
  useEffect(() => {
    if (!formData.id) return;

    const fetchQRCodes = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('qr_codes')
          .select('*')
          .eq('listing_id', formData.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        // Convert snake_case to camelCase for frontend
        const qrCodesData = (data || []).map(qr => ({
          id: qr.id,
          type: qr.qr_type,
          name: qr.qr_name,
          details: qr.qr_details
        }));

        setFormData({
          ...formData,
          qrCodes: qrCodesData
        });
      } catch (error) {
        logger.error('Error fetching QR codes', { error });
        if (showToast) {
          showToast('Error loading QR codes: ' + error.message, 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchQRCodes();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`qr-codes-${formData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'qr_codes',
          filter: `listing_id=eq.${formData.id}`
        },
        (payload) => {
          logger.debug('QR code change received', { eventType: payload.eventType, id: payload.new?.id || payload.old?.id });

          if (payload.eventType === 'INSERT') {
            const newQRCode = {
              id: payload.new.id,
              type: payload.new.qr_type,
              name: payload.new.qr_name,
              details: payload.new.qr_details
            };
            setFormData(prev => ({
              ...prev,
              qrCodes: [...(prev.qrCodes || []), newQRCode]
            }));
          } else if (payload.eventType === 'UPDATE') {
            const updatedQRCode = {
              id: payload.new.id,
              type: payload.new.qr_type,
              name: payload.new.qr_name,
              details: payload.new.qr_details
            };
            setFormData(prev => ({
              ...prev,
              qrCodes: (prev.qrCodes || []).map(qr =>
                qr.id === updatedQRCode.id ? updatedQRCode : qr
              )
            }));
          } else if (payload.eventType === 'DELETE') {
            setFormData(prev => ({
              ...prev,
              qrCodes: (prev.qrCodes || []).filter(qr => qr.id !== payload.old.id)
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

  // Helper function to update QR code in Supabase
  const updateQRCode = async (qrId, updates) => {
    if (!qrId) return; // Skip if no ID (not yet saved)

    try {
      const { error } = await supabase
        .from('qr_codes')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', qrId);

      if (error) throw error;
    } catch (error) {
      logger.error('Error updating QR code', { error });
      if (showToast) {
        showToast('Error updating QR code: ' + error.message, 'error');
      }
    }
  };

  // Helper function to generate QR code based on type and details
  const handleGenerateQRCode = async (qr, idx) => {
    try {
      if (!qr.details || !qr.details.trim()) {
        showToast('Please enter URL or text first', 'error');
        return;
      }

      setLoading(true);
      let qrCodeDataUrl;

      // Check if it's a WiFi QR code type
      if (qr.type.toLowerCase() === 'wifi') {
        // For WiFi, details should be in format: SSID|PASSWORD
        const [ssid, password] = qr.details.split('|');
        if (!ssid) {
          showToast('WiFi format should be: NetworkName|Password', 'error');
          return;
        }
        qrCodeDataUrl = await generateWiFiQRCode(ssid.trim(), password?.trim() || '');
      } else if (qr.type.toLowerCase() === 'url' || qr.type.toLowerCase() === 'website') {
        qrCodeDataUrl = await generateURLQRCode(qr.details);
      } else {
        // Generic QR code from text
        qrCodeDataUrl = await generateQRCode(qr.details);
      }

      // Update the QR code with generated image
      const newQrs = [...(formData.qrCodes || [])];
      newQrs[idx].details = qrCodeDataUrl;
      setFormData({ ...formData, qrCodes: newQrs });

      // Update in Supabase
      await updateQRCode(qr.id, { qr_details: qrCodeDataUrl });

      showToast('QR code generated successfully!');
    } catch (error) {
      logger.error('Error generating QR code', { error });
      showToast(`Error generating QR code: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">QR codes</h3>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.showQRCodes || false}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  showQRCodes: e.target.checked,
                })
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            title={!formData.wifiNetwork ? "Configure WiFi network in settings above first" : "Generate QR code from WiFi settings"}
            onClick={async () => {
              try {
                // Check if listing is saved first
                if (!formData.id) {
                  if (showToast) {
                    showToast('Please save the listing first before adding QR codes', 'error');
                  }
                  return;
                }

                // Check if WiFi credentials are configured
                if (!formData.wifiNetwork || !formData.wifiNetwork.trim()) {
                  if (showToast) {
                    showToast('Please configure WiFi network in listing settings first', 'error');
                  }
                  return;
                }

                setLoading(true);

                // Generate WiFi QR code
                const qrCodeDataUrl = await generateWiFiQRCode(
                  formData.wifiNetwork,
                  formData.wifiPassword || '',
                  'WPA'
                );

                // Insert into Supabase with generated QR code
                const { data, error } = await supabase
                  .from('qr_codes')
                  .insert([{
                    listing_id: formData.id,
                    qr_type: 'wifi',
                    qr_name: `${formData.wifiNetwork} Network`,
                    qr_details: qrCodeDataUrl
                  }])
                  .select()
                  .single();

                if (error) throw error;

                // Convert back to camelCase and update local state
                const newQRCode = {
                  id: data.id,
                  type: data.qr_type,
                  name: data.qr_name,
                  details: data.qr_details
                };

                setFormData({
                  ...formData,
                  qrCodes: [
                    ...(formData.qrCodes || []),
                    newQRCode
                  ]
                });

                if (showToast) {
                  showToast('WiFi QR code created successfully!');
                }
              } catch (error) {
                logger.error('Error adding WiFi QR code', { error });
                if (showToast) {
                  // Extract Supabase error details
                  const errorMsg = error?.message || error?.msg || error?.error_description || String(error);
                  const hint = error?.hint || '';
                  const code = error?.code || '';
                  const details = error?.details || '';

                  let fullMessage = `Error creating WiFi QR code: ${errorMsg}`;
                  if (hint) fullMessage += `\nHint: ${hint}`;
                  if (code) fullMessage += `\nCode: ${code}`;
                  if (details) fullMessage += `\nDetails: ${details}`;

                  showToast(fullMessage, 'error');
                }
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading || !formData.wifiNetwork}
          >
            <Wifi size={14} /> Add WiFi QR
          </Button>
          <Button
            size="sm"
            variant="outline"
            title="Add custom QR code (upload image, generate from URL/text)"
            onClick={async () => {
              try {
                // Check if listing is saved first
                if (!formData.id) {
                  if (showToast) {
                    showToast('Please save the listing first before adding QR codes', 'error');
                  }
                  return;
                }

                // Insert into Supabase
                const { data, error } = await supabase
                  .from('qr_codes')
                  .insert([{
                    listing_id: formData.id,
                    qr_type: 'custom',
                    qr_name: 'New QR Code',
                    qr_details: 'https://'
                  }])
                  .select()
                  .single();

                if (error) throw error;

                // Convert back to camelCase and update local state
                const newQRCode = {
                  id: data.id,
                  type: data.qr_type,
                  name: data.qr_name,
                  details: data.qr_details
                };

                setFormData({
                  ...formData,
                  qrCodes: [
                    ...(formData.qrCodes || []),
                    newQRCode
                  ]
                });

                if (showToast) {
                  showToast('QR code added successfully!');
                }
              } catch (error) {
                logger.error('Error adding QR code', { error });
                if (showToast) {
                  // Extract Supabase error details
                  const errorMsg = error?.message || error?.msg || error?.error_description || String(error);
                  const hint = error?.hint || '';
                  const code = error?.code || '';
                  const details = error?.details || '';

                  let fullMessage = `Error adding QR code: ${errorMsg}`;
                  if (hint) fullMessage += `\nHint: ${hint}`;
                  if (code) fullMessage += `\nCode: ${code}`;
                  if (details) fullMessage += `\nDetails: ${details}`;

                  showToast(fullMessage, 'error');
                }
              }
            }}
          >
            <Plus size={14} /> Add New
          </Button>
        </div>
      </div>

      {/* Help Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <div className="text-blue-600 mt-0.5 text-lg">ℹ️</div>
          <div className="flex-1 text-sm text-blue-900">
            <strong className="block mb-1">Quick Guide:</strong>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>WiFi QR:</strong> Click "Add WiFi QR" to auto-generate from WiFi settings above</li>
              <li><strong>Custom QR:</strong> Click "Add New" → Enter URL/text → Click "Generate" button</li>
              <li><strong>Upload QR:</strong> Click "Add New" → Click "Upload" button → Select image</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b text-xs text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left w-12"></th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">QR Code Image / URL</th>
              <th className="px-3 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {(formData.qrCodes || []).length > 0 ? (
              (formData.qrCodes || []).map((qr, idx) => (
                <tr key={idx} className="border-b">
                  <td className="px-3 py-2 text-center">
                    <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs">☰</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={qr.type}
                      onChange={async (e) => {
                        const newType = e.target.value;
                        const newQrs = [...(formData.qrCodes || [])];
                        newQrs[idx].type = newType;
                        setFormData({ ...formData, qrCodes: newQrs });

                        // Update in Supabase
                        await updateQRCode(qr.id, { qr_type: newType });
                      }}
                      placeholder="Type"
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={qr.name}
                      onChange={async (e) => {
                        const newName = e.target.value;
                        const newQrs = [...(formData.qrCodes || [])];
                        newQrs[idx].name = newName;
                        setFormData({ ...formData, qrCodes: newQrs });

                        // Update in Supabase
                        await updateQRCode(qr.id, { qr_name: newName });
                      }}
                      placeholder="Name"
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="space-y-2">
                      {/* QR Code Preview */}
                      {qr.details && (
                        <div className="flex items-center gap-2">
                          {qr.details.startsWith('data:image') || qr.details.startsWith('http') ? (
                            <img
                              src={qr.details}
                              alt="QR preview"
                              className="w-12 h-12 object-contain border rounded"
                            />
                          ) : (
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">
                              {qr.details}
                            </div>
                          )}
                          <button
                            onClick={async () => {
                              const newQrs = [...(formData.qrCodes || [])];
                              newQrs[idx].details = '';
                              setFormData({ ...formData, qrCodes: newQrs });

                              // Update in Supabase
                              await updateQRCode(qr.id, { qr_details: '' });
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}

                      {/* Input and Upload Buttons */}
                      <div className="flex gap-1">
                        <input
                          type="text"
                          value={qr.details && !qr.details.startsWith('data:image') && !qr.details.startsWith('http') ? qr.details : ''}
                          onChange={async (e) => {
                            const newDetails = e.target.value;
                            const newQrs = [...(formData.qrCodes || [])];
                            newQrs[idx].details = newDetails;
                            setFormData({ ...formData, qrCodes: newQrs });

                            // Update in Supabase
                            await updateQRCode(qr.id, { qr_details: newDetails });
                          }}
                          placeholder={qr.type.toLowerCase() === 'wifi' ? 'NetworkName|Password' : 'Enter URL or text'}
                          className="flex-1 px-2 py-1 border rounded text-sm"
                        />
                        <button
                          onClick={() => handleGenerateQRCode(qr, idx)}
                          disabled={loading || !qr.details || qr.details.startsWith('data:image')}
                          className="px-2 py-1 text-xs border rounded hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-blue-600 border-blue-300"
                          title="Generate QR code from URL/text"
                        >
                          <Wand2 size={12} />
                          Generate
                        </button>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader();
                              reader.onloadend = async () => {
                                const newDetails = reader.result;
                                const newQrs = [...(formData.qrCodes || [])];
                                newQrs[idx].details = newDetails;
                                setFormData({ ...formData, qrCodes: newQrs });

                                // Update in Supabase
                                await updateQRCode(qr.id, { qr_details: newDetails });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id={`qr-upload-${idx}`}
                        />
                        <label
                          htmlFor={`qr-upload-${idx}`}
                          className="px-2 py-1 text-xs border rounded cursor-pointer hover:bg-gray-50 flex items-center gap-1"
                        >
                          <Plus size={12} />
                          Upload
                        </label>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to delete this QR code?')) {
                          return;
                        }

                        // Delete from Supabase if QR code has an ID
                        if (qr.id) {
                          try {
                            const { error } = await supabase
                              .from('qr_codes')
                              .delete()
                              .eq('id', qr.id);

                            if (error) throw error;

                            if (showToast) {
                              showToast('QR code deleted successfully!');
                            }
                          } catch (error) {
                            logger.error('Error deleting QR code', { error });
                            if (showToast) {
                              showToast('Error deleting QR code: ' + error.message, 'error');
                            }
                            return;
                          }
                        }

                        // Update local state
                        const newQrs = (formData.qrCodes || []).filter((_, i) => i !== idx);
                        setFormData({ ...formData, qrCodes: newQrs });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-3 py-8 text-center text-gray-500 text-sm">
                  No QR codes added yet. Click "Add New" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
