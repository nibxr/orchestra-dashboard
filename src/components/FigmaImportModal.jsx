import React, { useState, useEffect } from 'react';
import {
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Image,
  Key,
  Link2,
  ChevronRight,
  Check,
  RefreshCw,
  Settings,
  ExternalLink
} from 'lucide-react';
import {
  extractFigmaFileKey,
  getFigmaFile,
  extractFramesFromFile,
  getFigmaAccessToken,
  setFigmaAccessToken,
  importFigmaFrames
} from '../utils/figmaService';
import { createVersion } from '../utils/versionService';
import { useAuth } from '../contexts/AuthContext';

/**
 * FigmaImportModal - Modal for importing Figma frames into a task
 *
 * Flow:
 * 1. User enters/confirms Figma access token (stored in localStorage)
 * 2. User pastes Figma file URL
 * 3. Modal fetches and displays all frames from the file
 * 4. User selects which frames to import
 * 5. Frames are exported, uploaded to storage, and linked to a new version
 */
const FigmaImportModal = ({
  isOpen,
  onClose,
  taskId,
  onImportComplete,
  initialUrl = ''
}) => {
  // Get team member ID for database storage
  const { teamMemberId } = useAuth();

  // Step management
  const [step, setStep] = useState('token'); // 'token', 'url', 'frames', 'importing'

  // Token state
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  // URL state
  const [figmaUrl, setFigmaUrl] = useState('');
  const [urlError, setUrlError] = useState(null);

  // Frames state
  const [frames, setFrames] = useState([]);
  const [selectedFrames, setSelectedFrames] = useState(new Set());
  const [fileInfo, setFileInfo] = useState(null);
  const [loadingFrames, setLoadingFrames] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  const [importError, setImportError] = useState(null);

  // Load saved token on mount and handle initialUrl
  useEffect(() => {
    if (isOpen) {
      const loadToken = async () => {
        const savedToken = await getFigmaAccessToken(teamMemberId);
        if (savedToken) {
          setAccessToken(savedToken);
          setStep('url');
        } else {
          setStep('token');
        }
      };
      loadToken();
      // Pre-fill URL if provided
      if (initialUrl) {
        setFigmaUrl(initialUrl);
      }
    }
  }, [isOpen, initialUrl, teamMemberId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFigmaUrl('');
      setFrames([]);
      setSelectedFrames(new Set());
      setFileInfo(null);
      setUrlError(null);
      setImportError(null);
      setImportProgress(null);
      setImporting(false);
    }
  }, [isOpen]);

  const handleTokenSubmit = async () => {
    if (!accessToken.trim()) {
      setTokenError('Please enter your Figma access token');
      return;
    }
    // Save token to database and localStorage
    await setFigmaAccessToken(accessToken.trim(), teamMemberId);
    setTokenError(null);
    setStep('url');
  };

  const handleFetchFrames = async () => {
    const fileKey = extractFigmaFileKey(figmaUrl);
    if (!fileKey) {
      setUrlError('Invalid Figma URL. Please use a URL like: https://www.figma.com/file/ABC123/filename');
      return;
    }

    setLoadingFrames(true);
    setUrlError(null);

    try {
      const fileData = await getFigmaFile(fileKey, accessToken);
      const extractedFrames = extractFramesFromFile(fileData);

      setFileInfo({
        name: fileData.name,
        lastModified: fileData.lastModified
      });
      setFrames(extractedFrames);

      // Auto-select all frames
      setSelectedFrames(new Set(extractedFrames.map(f => f.id)));
      setStep('frames');
    } catch (error) {
      if (error.message.includes('403') || error.message.includes('401')) {
        setUrlError('Access denied. Please check your Figma access token.');
        setStep('token');
      } else if (error.message.includes('404')) {
        setUrlError('File not found. Please check the URL and make sure you have access to this file.');
      } else {
        setUrlError(error.message || 'Failed to fetch Figma file');
      }
    } finally {
      setLoadingFrames(false);
    }
  };

  const toggleFrameSelection = (frameId) => {
    const newSelection = new Set(selectedFrames);
    if (newSelection.has(frameId)) {
      newSelection.delete(frameId);
    } else {
      newSelection.add(frameId);
    }
    setSelectedFrames(newSelection);
  };

  const selectAllFrames = () => {
    setSelectedFrames(new Set(frames.map(f => f.id)));
  };

  const deselectAllFrames = () => {
    setSelectedFrames(new Set());
  };

  const handleImport = async () => {
    if (selectedFrames.size === 0) {
      setImportError('Please select at least one frame to import');
      return;
    }

    setImporting(true);
    setImportError(null);
    setStep('importing');

    try {
      // Create a new version for these frames
      const versionName = `Figma Import - ${fileInfo?.name || 'Untitled'}`;
      const { data: version, error: versionError } = await createVersion(
        taskId,
        figmaUrl, // Store the original Figma URL as reference
        versionName
      );

      if (versionError) {
        throw new Error('Failed to create version');
      }

      // Import the frames
      const importedFrames = await importFigmaFrames(
        figmaUrl,
        Array.from(selectedFrames),
        taskId,
        version.id,
        accessToken,
        setImportProgress
      );

      // Notify parent of completion
      onImportComplete?.(version, importedFrames);
      onClose();
    } catch (error) {
      console.error('Import error:', error);
      setImportError(error.message || 'Failed to import frames');
      setStep('frames');
    } finally {
      setImporting(false);
    }
  };

  if (!isOpen) return null;

  // Group frames by page
  const framesByPage = frames.reduce((acc, frame) => {
    if (!acc[frame.pageName]) {
      acc[frame.pageName] = [];
    }
    acc[frame.pageName].push(frame);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f0f0f] w-full max-w-2xl rounded-2xl shadow-2xl border border-neutral-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 38 57" fill="white">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import from Figma</h2>
              <p className="text-sm text-neutral-500">
                {step === 'token' && 'Connect your Figma account'}
                {step === 'url' && 'Enter your Figma file URL'}
                {step === 'frames' && `${fileInfo?.name || 'Select frames'}`}
                {step === 'importing' && 'Importing frames...'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-500 hover:text-white transition-colors rounded-lg hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Token */}
          {step === 'token' && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
                <div className="flex items-start gap-3">
                  <Key size={20} className="text-neutral-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white mb-1">Figma Access Token</h3>
                    <p className="text-xs text-neutral-500 mb-3">
                      You need a personal access token to import frames from Figma.
                      <a
                        href="https://www.figma.com/developers/api#access-tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline ml-1"
                      >
                        Get your token <ExternalLink size={10} className="inline" />
                      </a>
                    </p>
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={accessToken}
                      onChange={e => setAccessToken(e.target.value)}
                      placeholder="figd_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                    />
                    <label className="flex items-center gap-2 mt-2 text-xs text-neutral-500 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showToken}
                        onChange={e => setShowToken(e.target.checked)}
                        className="rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-0"
                      />
                      Show token
                    </label>
                  </div>
                </div>
              </div>

              {tokenError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {tokenError}
                </div>
              )}

              <button
                onClick={handleTokenSubmit}
                className="w-full py-2.5 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: URL */}
          {step === 'url' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-2">
                <span>Connected to Figma</span>
                <button
                  onClick={() => setStep('token')}
                  className="flex items-center gap-1 text-neutral-400 hover:text-white"
                >
                  <Settings size={12} />
                  Change token
                </button>
              </div>

              <div className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
                <div className="flex items-start gap-3">
                  <Link2 size={20} className="text-neutral-400 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white mb-1">Figma File URL</h3>
                    <p className="text-xs text-neutral-500 mb-3">
                      Paste the URL of the Figma file you want to import frames from.
                    </p>
                    <input
                      type="url"
                      value={figmaUrl}
                      onChange={e => setFigmaUrl(e.target.value)}
                      placeholder="https://www.figma.com/file/..."
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
                      onKeyDown={e => e.key === 'Enter' && handleFetchFrames()}
                    />
                  </div>
                </div>
              </div>

              {urlError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {urlError}
                </div>
              )}

              <button
                onClick={handleFetchFrames}
                disabled={loadingFrames || !figmaUrl.trim()}
                className={`w-full py-2.5 font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  loadingFrames || !figmaUrl.trim()
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                {loadingFrames ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Fetching frames...
                  </>
                ) : (
                  <>
                    Fetch Frames
                    <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 3: Frame Selection */}
          {step === 'frames' && (
            <div className="space-y-4">
              {/* Selection controls */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">
                  {selectedFrames.size} of {frames.length} frames selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAllFrames}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Select all
                  </button>
                  <span className="text-neutral-700">|</span>
                  <button
                    onClick={deselectAllFrames}
                    className="text-xs text-neutral-500 hover:text-neutral-300"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Frame list */}
              <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {Object.entries(framesByPage).map(([pageName, pageFrames]) => (
                  <div key={pageName}>
                    <h4 className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-2">
                      {pageName}
                    </h4>
                    <div className="space-y-1">
                      {pageFrames.map(frame => (
                        <button
                          key={frame.id}
                          onClick={() => toggleFrameSelection(frame.id)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            selectedFrames.has(frame.id)
                              ? 'bg-blue-500/10 border-blue-500/30 text-white'
                              : 'bg-neutral-900/50 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            selectedFrames.has(frame.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-neutral-600'
                          }`}>
                            {selectedFrames.has(frame.id) && (
                              <Check size={14} className="text-white" />
                            )}
                          </div>
                          <Image size={16} className="text-neutral-500" />
                          <span className="flex-1 text-left text-sm truncate">{frame.name}</span>
                          {frame.width && frame.height && (
                            <span className="text-xs text-neutral-600">
                              {Math.round(frame.width)} x {Math.round(frame.height)}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                {frames.length === 0 && (
                  <div className="text-center py-8 text-neutral-500">
                    <Image size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No frames found in this file</p>
                    <p className="text-xs text-neutral-600">Make sure your file contains top-level frames</p>
                  </div>
                )}
              </div>

              {importError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle size={16} />
                  {importError}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('url');
                    setFrames([]);
                    setSelectedFrames(new Set());
                  }}
                  className="flex-1 py-2.5 bg-neutral-800 text-white font-medium rounded-lg hover:bg-neutral-700 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedFrames.size === 0}
                  className={`flex-1 py-2.5 font-medium rounded-lg transition-colors ${
                    selectedFrames.size === 0
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  Import {selectedFrames.size} frame{selectedFrames.size !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="py-8 text-center">
              <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {importProgress?.message || 'Importing frames...'}
              </h3>
              {importProgress?.total && (
                <div className="mt-4">
                  <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-full transition-all duration-300"
                      style={{
                        width: `${((importProgress.current || 0) / importProgress.total) * 100}%`
                      }}
                    />
                  </div>
                  <p className="text-sm text-neutral-500 mt-2">
                    {importProgress.current || 0} of {importProgress.total} frames
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FigmaImportModal;
