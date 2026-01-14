/**
 * @file DataSourcesPage.jsx
 * @description Data Sources management page for creating and editing dynamic data sources.
 *
 * Features:
 * - List all data sources with field/row counts
 * - Create new data sources (internal table or CSV import)
 * - Edit data source fields and rows inline
 * - CSV file upload with auto-field detection
 * - Delete data sources with confirmation
 *
 * State Management:
 * - `dataSources` - Array of data source objects
 * - `loading` - Boolean for data fetch loading state
 * - `error` - Error message string
 * - `selectedSource` - Currently selected data source for editing
 * - `showCreateModal` - Toggle for create modal
 *
 * @see {@link ../services/dataSourceService.js} - Data source CRUD operations
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Plus,
  Upload,
  Database,
  Table2,
  FileSpreadsheet,
  MoreVertical,
  Trash2,
  Edit,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Loader2,
  AlertTriangle,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Link2,
  Unlink,
  RefreshCw,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../i18n';
import {
  fetchDataSources,
  getDataSource,
  createDataSource,
  updateDataSource,
  deleteDataSource,
  createField,
  updateField,
  deleteField,
  createRow,
  updateRow,
  deleteRow,
  createDataSourceFromCSV,
  linkToGoogleSheet,
  unlinkIntegration,
  getSyncHistory,
  DATA_SOURCE_TYPES,
  FIELD_DATA_TYPES,
  INTEGRATION_TYPES,
  SYNC_STATUS,
} from '../services/dataSourceService';
import {
  syncDataSourceFromSheet,
  parseSheetId,
} from '../services/googleSheetsService';

// Design system imports
import {
  PageLayout,
  PageHeader,
  PageContent,
  Stack,
  Inline,
} from '../design-system';
import { Button, IconButton } from '../design-system';
import { Card, CardHeader, CardTitle, CardContent } from '../design-system';
import { Badge } from '../design-system';
import { FormField, Input, Select } from '../design-system';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '../design-system';
import { Alert } from '../design-system';
import { EmptyState } from '../design-system';

// --------------------------------------------------------------------------
// Sub-components
// --------------------------------------------------------------------------

// Data source card in list view
const DataSourceCard = ({ source, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const TypeIcon = source.type === DATA_SOURCE_TYPES.CSV_IMPORT ? FileSpreadsheet : Table2;

  return (
    <Card className="hover:border-blue-300 transition-colors cursor-pointer" onClick={() => onEdit(source)}>
      <CardContent className="p-4">
        <Inline justify="between" align="start">
          <Inline gap="md" align="center">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TypeIcon size={20} className="text-blue-600" />
            </div>
            <Stack gap="xs">
              <span className="font-medium text-gray-900">{source.name}</span>
              {source.description && (
                <span className="text-sm text-gray-500 line-clamp-1">{source.description}</span>
              )}
              <Inline gap="sm">
                <Badge variant="secondary" size="sm">
                  {source.field_count || 0} fields
                </Badge>
                <Badge variant="secondary" size="sm">
                  {source.row_count || 0} rows
                </Badge>
              </Inline>
            </Stack>
          </Inline>

          <div className="relative" ref={menuRef}>
            <IconButton
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical size={16} />
            </IconButton>

            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(source);
                    setShowMenu(false);
                  }}
                >
                  <Edit size={14} />
                  Edit
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(source);
                    setShowMenu(false);
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </Inline>
      </CardContent>
    </Card>
  );
};

// Field editor row
const FieldEditorRow = ({ field, onUpdate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    label: field.label,
    dataType: field.data_type,
  });

  const handleSave = async () => {
    await onUpdate(field.id, {
      label: editData.label,
      dataType: editData.dataType,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="p-2">
          <GripVertical size={16} className="text-gray-400" />
        </td>
        <td className="p-2">
          <span className="font-mono text-sm text-gray-500">{field.name}</span>
        </td>
        <td className="p-2">
          <Input
            value={editData.label}
            onChange={(e) => setEditData({ ...editData, label: e.target.value })}
            size="sm"
          />
        </td>
        <td className="p-2">
          <Select
            value={editData.dataType}
            onChange={(e) => setEditData({ ...editData, dataType: e.target.value })}
            size="sm"
          >
            {Object.entries(FIELD_DATA_TYPES).map(([key, value]) => (
              <option key={value} value={value}>
                {key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')}
              </option>
            ))}
          </Select>
        </td>
        <td className="p-2">
          <Inline gap="xs">
            <IconButton variant="ghost" size="sm" onClick={handleSave}>
              <Check size={14} className="text-green-600" />
            </IconButton>
            <IconButton variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X size={14} className="text-gray-500" />
            </IconButton>
          </Inline>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="p-2">
        <Inline gap="xs">
          <IconButton variant="ghost" size="sm" disabled={isFirst} onClick={onMoveUp}>
            <ArrowUp size={14} />
          </IconButton>
          <IconButton variant="ghost" size="sm" disabled={isLast} onClick={onMoveDown}>
            <ArrowDown size={14} />
          </IconButton>
        </Inline>
      </td>
      <td className="p-2 font-mono text-sm text-gray-500">{field.name}</td>
      <td className="p-2">{field.label}</td>
      <td className="p-2">
        <Badge variant="secondary" size="sm">
          {field.data_type}
        </Badge>
      </td>
      <td className="p-2">
        <Inline gap="xs">
          <IconButton variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Edit size={14} />
          </IconButton>
          <IconButton variant="ghost" size="sm" onClick={() => onDelete(field.id)}>
            <Trash2 size={14} className="text-red-500" />
          </IconButton>
        </Inline>
      </td>
    </tr>
  );
};

// Row editor
const RowEditor = ({ row, fields, onUpdate, onDelete }) => {
  const [values, setValues] = useState(row.values || {});
  const [isDirty, setIsDirty] = useState(false);

  const handleValueChange = (fieldName, value) => {
    setValues({ ...values, [fieldName]: value });
    setIsDirty(true);
  };

  const handleSave = async () => {
    await onUpdate(row.id, { values });
    setIsDirty(false);
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      {fields.map((field) => (
        <td key={field.id} className="p-2">
          <Input
            value={values[field.name] || ''}
            onChange={(e) => handleValueChange(field.name, e.target.value)}
            size="sm"
            placeholder={field.default_value || ''}
          />
        </td>
      ))}
      <td className="p-2">
        <Inline gap="xs">
          {isDirty && (
            <IconButton variant="primary" size="sm" onClick={handleSave}>
              <Check size={14} />
            </IconButton>
          )}
          <IconButton variant="ghost" size="sm" onClick={() => onDelete(row.id)}>
            <Trash2 size={14} className="text-red-500" />
          </IconButton>
        </Inline>
      </td>
    </tr>
  );
};

// --------------------------------------------------------------------------
// Main Component
// --------------------------------------------------------------------------

export default function DataSourcesPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // List state
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  // Editor state
  const [selectedSource, setSelectedSource] = useState(null);
  const [sourceData, setSourceData] = useState(null);
  const [loadingSource, setLoadingSource] = useState(false);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createData, setCreateData] = useState({ name: '', description: '', type: DATA_SOURCE_TYPES.INTERNAL_TABLE });
  const [creating, setCreating] = useState(false);

  // CSV import state
  const [csvFile, setCsvFile] = useState(null);
  const [csvPreview, setCsvPreview] = useState(null);

  // Field creation state
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState({ name: '', label: '', dataType: FIELD_DATA_TYPES.TEXT });

  // Google Sheets integration state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState({ sheetUrl: '', range: 'Sheet1!A:Z', pollIntervalMinutes: 15 });
  const [linking, setLinking] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncHistory, setSyncHistory] = useState([]);

  // Fetch data sources
  const loadDataSources = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDataSources();
      setDataSources(data);
    } catch (err) {
      console.error('[DataSourcesPage] Failed to load:', err);
      setError('Failed to load data sources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataSources();
  }, [loadDataSources]);

  // Load selected source details
  const loadSourceDetails = useCallback(async (sourceId) => {
    if (!sourceId) {
      setSourceData(null);
      return;
    }

    try {
      setLoadingSource(true);
      const data = await getDataSource(sourceId);
      setSourceData(data);
    } catch (err) {
      console.error('[DataSourcesPage] Failed to load source:', err);
      setError('Failed to load data source details');
    } finally {
      setLoadingSource(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSource) {
      loadSourceDetails(selectedSource.id);
    }
  }, [selectedSource, loadSourceDetails]);

  // Create data source
  const handleCreate = async () => {
    if (!createData.name.trim()) return;

    try {
      setCreating(true);

      if (createData.type === DATA_SOURCE_TYPES.CSV_IMPORT && csvFile) {
        // Create from CSV
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const newSource = await createDataSourceFromCSV({
              name: createData.name,
              description: createData.description,
              csvContent: e.target.result,
              clientId: user?.clientId || user?.client_id,
              filename: csvFile.name,
            });
            setShowCreateModal(false);
            setCreateData({ name: '', description: '', type: DATA_SOURCE_TYPES.INTERNAL_TABLE });
            setCsvFile(null);
            setCsvPreview(null);
            await loadDataSources();
            setSelectedSource(newSource);
          } catch (err) {
            console.error('[DataSourcesPage] CSV import failed:', err);
            setError('Failed to import CSV: ' + err.message);
          } finally {
            setCreating(false);
          }
        };
        reader.readAsText(csvFile);
      } else {
        // Create empty data source
        const newSource = await createDataSource({
          name: createData.name,
          description: createData.description,
          type: createData.type,
          clientId: user?.clientId || user?.client_id,
        });
        setShowCreateModal(false);
        setCreateData({ name: '', description: '', type: DATA_SOURCE_TYPES.INTERNAL_TABLE });
        await loadDataSources();
        setSelectedSource(newSource);
      }
    } catch (err) {
      console.error('[DataSourcesPage] Create failed:', err);
      setError('Failed to create data source: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Delete data source
  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteDataSource(deleteTarget.id);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      if (selectedSource?.id === deleteTarget.id) {
        setSelectedSource(null);
        setSourceData(null);
      }
      await loadDataSources();
    } catch (err) {
      console.error('[DataSourcesPage] Delete failed:', err);
      setError('Failed to delete data source');
    }
  };

  // Field operations
  const handleAddField = async () => {
    if (!sourceData || !newField.name.trim() || !newField.label.trim()) return;

    try {
      await createField({
        dataSourceId: sourceData.id,
        name: newField.name,
        label: newField.label,
        dataType: newField.dataType,
      });
      setShowAddField(false);
      setNewField({ name: '', label: '', dataType: FIELD_DATA_TYPES.TEXT });
      await loadSourceDetails(sourceData.id);
      await loadDataSources();
    } catch (err) {
      console.error('[DataSourcesPage] Add field failed:', err);
      setError('Failed to add field: ' + err.message);
    }
  };

  const handleUpdateField = async (fieldId, updates) => {
    try {
      await updateField(fieldId, updates);
      await loadSourceDetails(sourceData.id);
    } catch (err) {
      console.error('[DataSourcesPage] Update field failed:', err);
      setError('Failed to update field');
    }
  };

  const handleDeleteField = async (fieldId) => {
    try {
      await deleteField(fieldId);
      await loadSourceDetails(sourceData.id);
      await loadDataSources();
    } catch (err) {
      console.error('[DataSourcesPage] Delete field failed:', err);
      setError('Failed to delete field');
    }
  };

  const handleMoveField = async (index, direction) => {
    const fields = [...sourceData.fields];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;

    [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];

    try {
      await Promise.all(
        fields.map((field, i) => updateField(field.id, { orderIndex: i }))
      );
      await loadSourceDetails(sourceData.id);
    } catch (err) {
      console.error('[DataSourcesPage] Reorder failed:', err);
    }
  };

  // Row operations
  const handleAddRow = async () => {
    if (!sourceData) return;

    try {
      await createRow({
        dataSourceId: sourceData.id,
        values: {},
      });
      await loadSourceDetails(sourceData.id);
      await loadDataSources();
    } catch (err) {
      console.error('[DataSourcesPage] Add row failed:', err);
      setError('Failed to add row');
    }
  };

  const handleUpdateRow = async (rowId, updates) => {
    try {
      await updateRow(rowId, updates);
      await loadSourceDetails(sourceData.id);
    } catch (err) {
      console.error('[DataSourcesPage] Update row failed:', err);
      setError('Failed to update row');
    }
  };

  const handleDeleteRow = async (rowId) => {
    try {
      await deleteRow(rowId);
      await loadSourceDetails(sourceData.id);
      await loadDataSources();
    } catch (err) {
      console.error('[DataSourcesPage] Delete row failed:', err);
      setError('Failed to delete row');
    }
  };

  // Google Sheets integration handlers
  const handleLinkToSheet = async () => {
    if (!sourceData || !linkData.sheetUrl.trim()) return;

    try {
      setLinking(true);
      const sheetId = parseSheetId(linkData.sheetUrl);
      if (!sheetId) {
        setError('Invalid Google Sheets URL or ID');
        return;
      }

      await linkToGoogleSheet(
        sourceData.id,
        sheetId,
        linkData.range,
        linkData.pollIntervalMinutes
      );

      setShowLinkModal(false);
      setLinkData({ sheetUrl: '', range: 'Sheet1!A:Z', pollIntervalMinutes: 15 });
      await loadSourceDetails(sourceData.id);
      await loadDataSources();
    } catch (err) {
      console.error('[DataSourcesPage] Link to sheet failed:', err);
      setError('Failed to link to Google Sheets: ' + err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkIntegration = async () => {
    if (!sourceData) return;

    try {
      await unlinkIntegration(sourceData.id);
      await loadSourceDetails(sourceData.id);
      await loadDataSources();
    } catch (err) {
      console.error('[DataSourcesPage] Unlink failed:', err);
      setError('Failed to unlink integration');
    }
  };

  const handleManualSync = async () => {
    if (!sourceData) return;

    try {
      setSyncing(true);
      await syncDataSourceFromSheet(sourceData);
      await loadSourceDetails(sourceData.id);
      await loadDataSources();
      // Reload sync history
      const history = await getSyncHistory(sourceData.id, 5);
      setSyncHistory(history);
    } catch (err) {
      console.error('[DataSourcesPage] Manual sync failed:', err);
      setError('Failed to sync: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleLoadSyncHistory = useCallback(async (dataSourceId) => {
    try {
      const history = await getSyncHistory(dataSourceId, 5);
      setSyncHistory(history);
    } catch (err) {
      console.error('[DataSourcesPage] Failed to load sync history:', err);
    }
  }, []);

  // Load sync history when source changes
  useEffect(() => {
    if (sourceData?.integration_type && sourceData.integration_type !== INTEGRATION_TYPES.NONE) {
      handleLoadSyncHistory(sourceData.id);
    } else {
      setSyncHistory([]);
    }
  }, [sourceData?.id, sourceData?.integration_type, handleLoadSyncHistory]);

  // CSV file handling
  const handleCsvFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);

    // Preview first few lines
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').slice(0, 5);
      setCsvPreview(lines.join('\n'));
    };
    reader.readAsText(file);
  };

  // Filter data sources
  const filteredSources = dataSources.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase())
  );

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  return (
    <PageLayout>
      <PageHeader
        title="Data Sources"
        description="Manage dynamic data for menus, price lists, and schedules"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            New Data Source
          </Button>
        }
      />

      <PageContent>
        {error && (
          <Alert variant="error" className="mb-4" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        <div className="flex gap-6">
          {/* Left sidebar - list */}
          <div className="w-80 flex-shrink-0">
            <Card>
              <CardContent className="p-4">
                <div className="mb-4">
                  <Input
                    placeholder="Search data sources..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    prefix={<Search size={16} className="text-gray-400" />}
                  />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  </div>
                ) : filteredSources.length === 0 ? (
                  <EmptyState
                    icon={<Database size={32} />}
                    title="No data sources"
                    description={search ? 'No sources match your search' : 'Create your first data source'}
                    action={
                      !search && (
                        <Button size="sm" onClick={() => setShowCreateModal(true)}>
                          <Plus size={14} />
                          Create
                        </Button>
                      )
                    }
                  />
                ) : (
                  <Stack gap="sm">
                    {filteredSources.map((source) => (
                      <DataSourceCard
                        key={source.id}
                        source={source}
                        onEdit={setSelectedSource}
                        onDelete={(s) => {
                          setDeleteTarget(s);
                          setShowDeleteModal(true);
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel - editor */}
          <div className="flex-1">
            {loadingSource ? (
              <Card>
                <CardContent className="p-8 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-gray-400" />
                </CardContent>
              </Card>
            ) : sourceData ? (
              <Stack gap="md">
                {/* Source info */}
                <Card>
                  <CardHeader>
                    <Inline justify="between" align="center">
                      <Stack gap="xs">
                        <CardTitle>{sourceData.name}</CardTitle>
                        {sourceData.description && (
                          <span className="text-sm text-gray-500">{sourceData.description}</span>
                        )}
                      </Stack>
                      <Badge variant={sourceData.type === DATA_SOURCE_TYPES.CSV_IMPORT ? 'info' : 'secondary'}>
                        {sourceData.type === DATA_SOURCE_TYPES.CSV_IMPORT ? 'CSV Import' : 'Internal Table'}
                      </Badge>
                    </Inline>
                  </CardHeader>
                </Card>

                {/* Google Sheets Integration section */}
                <Card>
                  <CardHeader>
                    <Inline justify="between" align="center">
                      <CardTitle>Google Sheets Integration</CardTitle>
                      {sourceData.integration_type === INTEGRATION_TYPES.GOOGLE_SHEETS ? (
                        <Inline gap="sm">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleManualSync}
                            disabled={syncing}
                          >
                            {syncing ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                            {syncing ? 'Syncing...' : 'Sync Now'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleUnlinkIntegration}
                          >
                            <Unlink size={14} />
                            Unlink
                          </Button>
                        </Inline>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowLinkModal(true)}
                        >
                          <Link2 size={14} />
                          Link to Sheet
                        </Button>
                      )}
                    </Inline>
                  </CardHeader>
                  <CardContent>
                    {sourceData.integration_type === INTEGRATION_TYPES.GOOGLE_SHEETS ? (
                      <Stack gap="md">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <FileSpreadsheet size={20} className="text-green-600" />
                          <Stack gap="xs">
                            <span className="font-medium text-green-800">Connected to Google Sheets</span>
                            <span className="text-sm text-green-600">
                              Sheet: {sourceData.integration_config?.sheetId}
                            </span>
                          </Stack>
                        </div>

                        <Inline justify="between" align="center">
                          <Stack gap="xs">
                            <span className="text-sm text-gray-500">Range</span>
                            <span className="font-medium">{sourceData.integration_config?.range || 'Sheet1!A:Z'}</span>
                          </Stack>
                          <Stack gap="xs">
                            <span className="text-sm text-gray-500">Sync Interval</span>
                            <span className="font-medium">{sourceData.integration_config?.pollIntervalMinutes || 15} minutes</span>
                          </Stack>
                          <Stack gap="xs">
                            <span className="text-sm text-gray-500">Last Sync</span>
                            <span className="font-medium">
                              {sourceData.last_sync_at
                                ? new Date(sourceData.last_sync_at).toLocaleString()
                                : 'Never'}
                            </span>
                          </Stack>
                          <Stack gap="xs">
                            <span className="text-sm text-gray-500">Status</span>
                            <Badge
                              variant={
                                sourceData.last_sync_status === SYNC_STATUS.OK
                                  ? 'success'
                                  : sourceData.last_sync_status === SYNC_STATUS.ERROR
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {sourceData.last_sync_status || 'pending'}
                            </Badge>
                          </Stack>
                        </Inline>

                        {sourceData.last_sync_error && (
                          <Alert variant="warning">
                            <AlertTriangle size={16} />
                            <span className="text-sm">{sourceData.last_sync_error}</span>
                          </Alert>
                        )}

                        {syncHistory.length > 0 && (
                          <Stack gap="sm">
                            <span className="text-sm font-medium text-gray-700">Recent Sync History</span>
                            <div className="space-y-1">
                              {syncHistory.map((log) => (
                                <div
                                  key={log.id}
                                  className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded"
                                >
                                  <Inline gap="sm" align="center">
                                    <Clock size={12} className="text-gray-400" />
                                    <span>{new Date(log.synced_at).toLocaleString()}</span>
                                  </Inline>
                                  <Inline gap="sm">
                                    <Badge
                                      size="sm"
                                      variant={
                                        log.status === SYNC_STATUS.OK
                                          ? 'success'
                                          : log.status === SYNC_STATUS.ERROR
                                          ? 'destructive'
                                          : 'secondary'
                                      }
                                    >
                                      {log.status}
                                    </Badge>
                                    {log.rows_updated > 0 && (
                                      <span className="text-gray-500">{log.rows_updated} rows</span>
                                    )}
                                  </Inline>
                                </div>
                              ))}
                            </div>
                          </Stack>
                        )}
                      </Stack>
                    ) : (
                      <div className="p-4 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                        <FileSpreadsheet size={32} className="mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">Link this data source to a Google Sheet for automatic syncing</p>
                        <p className="text-xs text-gray-400 mt-1">Data will auto-update and push to all devices</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Fields section */}
                <Card>
                  <CardHeader>
                    <Inline justify="between" align="center">
                      <CardTitle>Fields</CardTitle>
                      <Button size="sm" variant="secondary" onClick={() => setShowAddField(true)}>
                        <Plus size={14} />
                        Add Field
                      </Button>
                    </Inline>
                  </CardHeader>
                  <CardContent className="p-0">
                    {sourceData.fields?.length > 0 ? (
                      <table className="w-full">
                        <thead className="bg-gray-50 text-sm text-gray-600">
                          <tr>
                            <th className="p-2 text-left w-20">Order</th>
                            <th className="p-2 text-left">Name</th>
                            <th className="p-2 text-left">Label</th>
                            <th className="p-2 text-left w-32">Type</th>
                            <th className="p-2 text-left w-24">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sourceData.fields.map((field, index) => (
                            <FieldEditorRow
                              key={field.id}
                              field={field}
                              onUpdate={handleUpdateField}
                              onDelete={handleDeleteField}
                              onMoveUp={() => handleMoveField(index, -1)}
                              onMoveDown={() => handleMoveField(index, 1)}
                              isFirst={index === 0}
                              isLast={index === sourceData.fields.length - 1}
                            />
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No fields defined. Add fields to structure your data.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Rows section */}
                <Card>
                  <CardHeader>
                    <Inline justify="between" align="center">
                      <CardTitle>Data Rows ({sourceData.rows?.length || 0})</CardTitle>
                      <Button size="sm" variant="secondary" onClick={handleAddRow} disabled={!sourceData.fields?.length}>
                        <Plus size={14} />
                        Add Row
                      </Button>
                    </Inline>
                  </CardHeader>
                  <CardContent className="p-0">
                    {!sourceData.fields?.length ? (
                      <div className="p-4 text-center text-gray-500">
                        Add fields first before adding data rows.
                      </div>
                    ) : sourceData.rows?.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 text-sm text-gray-600">
                            <tr>
                              {sourceData.fields.map((field) => (
                                <th key={field.id} className="p-2 text-left">
                                  {field.label}
                                </th>
                              ))}
                              <th className="p-2 text-left w-24">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sourceData.rows.map((row) => (
                              <RowEditor
                                key={row.id}
                                row={row}
                                fields={sourceData.fields}
                                onUpdate={handleUpdateRow}
                                onDelete={handleDeleteRow}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No data rows. Add rows to populate your data source.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            ) : (
              <Card>
                <CardContent className="p-8">
                  <EmptyState
                    icon={<Database size={48} />}
                    title="Select a data source"
                    description="Choose a data source from the list to view and edit its data"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </PageContent>

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalHeader>
          <ModalTitle>Create Data Source</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack gap="md">
            <FormField label="Name" required>
              <Input
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                placeholder="e.g., Menu Items, Price List"
              />
            </FormField>

            <FormField label="Description">
              <textarea
                value={createData.description}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </FormField>

            <FormField label="Type">
              <Select
                value={createData.type}
                onChange={(e) => setCreateData({ ...createData, type: e.target.value })}
              >
                <option value={DATA_SOURCE_TYPES.INTERNAL_TABLE}>Internal Table</option>
                <option value={DATA_SOURCE_TYPES.CSV_IMPORT}>CSV Import</option>
              </Select>
            </FormField>

            {createData.type === DATA_SOURCE_TYPES.CSV_IMPORT && (
              <FormField label="CSV File" required>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {csvPreview && (
                  <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                    {csvPreview}
                  </pre>
                )}
              </FormField>
            )}
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!createData.name.trim() || creating || (createData.type === DATA_SOURCE_TYPES.CSV_IMPORT && !csvFile)}
          >
            {creating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Field Modal */}
      <Modal open={showAddField} onClose={() => setShowAddField(false)}>
        <ModalHeader>
          <ModalTitle>Add Field</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack gap="md">
            <FormField label="Field Name" required hint="Machine-readable name (letters, numbers, underscores)">
              <Input
                value={newField.name}
                onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                placeholder="e.g., item_name, price"
              />
            </FormField>

            <FormField label="Label" required hint="Human-readable label shown in UI">
              <Input
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="e.g., Item Name, Price"
              />
            </FormField>

            <FormField label="Data Type">
              <Select
                value={newField.dataType}
                onChange={(e) => setNewField({ ...newField, dataType: e.target.value })}
              >
                {Object.entries(FIELD_DATA_TYPES).map(([key, value]) => (
                  <option key={value} value={value}>
                    {key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')}
                  </option>
                ))}
              </Select>
            </FormField>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowAddField(false)}>
            Cancel
          </Button>
          <Button onClick={handleAddField} disabled={!newField.name.trim() || !newField.label.trim()}>
            Add Field
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <ModalHeader>
          <ModalTitle>Delete Data Source</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack gap="md">
            <Alert variant="warning">
              <AlertTriangle size={16} />
              This action cannot be undone.
            </Alert>
            <p>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? All fields and data rows will be permanently deleted.
            </p>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* Link to Google Sheets Modal */}
      <Modal open={showLinkModal} onClose={() => setShowLinkModal(false)}>
        <ModalHeader>
          <ModalTitle>Link to Google Sheets</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack gap="md">
            <Alert variant="info">
              <FileSpreadsheet size={16} />
              <span className="text-sm">
                The Google Sheet must be publicly viewable or shared with "Anyone with the link".
              </span>
            </Alert>

            <FormField
              label="Google Sheets URL or ID"
              required
              hint="Paste the full URL or just the sheet ID"
            >
              <Input
                value={linkData.sheetUrl}
                onChange={(e) => setLinkData({ ...linkData, sheetUrl: e.target.value })}
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
            </FormField>

            <FormField
              label="Range"
              hint="Which sheet and columns to sync (e.g., Sheet1!A:Z)"
            >
              <Input
                value={linkData.range}
                onChange={(e) => setLinkData({ ...linkData, range: e.target.value })}
                placeholder="Sheet1!A:Z"
              />
            </FormField>

            <FormField
              label="Sync Interval"
              hint="How often to check for updates"
            >
              <Select
                value={linkData.pollIntervalMinutes}
                onChange={(e) => setLinkData({ ...linkData, pollIntervalMinutes: parseInt(e.target.value, 10) })}
              >
                <option value={5}>Every 5 minutes</option>
                <option value={10}>Every 10 minutes</option>
                <option value={15}>Every 15 minutes</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Every hour</option>
              </Select>
            </FormField>

            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Data will be fetched from your Google Sheet</li>
                <li>First row is treated as column headers (field names)</li>
                <li>Changes sync automatically at your chosen interval</li>
                <li>All connected devices update in real-time</li>
              </ul>
            </div>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowLinkModal(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLinkToSheet}
            disabled={!linkData.sheetUrl.trim() || linking}
          >
            {linking ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Linking...
              </>
            ) : (
              <>
                <Link2 size={16} />
                Link Sheet
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </PageLayout>
  );
}
