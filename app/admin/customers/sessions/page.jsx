'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';

export default function SessionsPage() {
  const { client } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const playerRef = useRef(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/sessions?limit=50');
      const data = await res.json();

      if (!res.ok) {
        setError(`API Error: ${data.error || res.statusText}${data.details ? ` — ${data.details}` : ''}`);
        setSessions([]);
      } else {
        setSessions(data.sessions || []);
        if ((data.sessions || []).length === 0) {
          setError('No sessions found. Sessions are recorded when visitors browse the storefront. Visit your store in a different tab, wait 10 seconds, then click Refresh.');
        }
      }
    } catch (err) {
      console.error('Load sessions error:', err);
      setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (client) loadSessions();
  }, [client, loadSessions]);

  const playSession = async (sessionId) => {
    setSelectedId(sessionId);
    setPlaying(true);
    setPlayerError('');

    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();

      if (!res.ok) {
        setPlayerError(`Failed to load session: ${data.error}`);
        setPlaying(false);
        return;
      }

      if (!data.session?.events || data.session.events.length === 0) {
        setPlayerError(`No events in this session yet. Events: ${data.session?.eventCount || 0}`);
        setPlaying(false);
        return;
      }

      // Dynamically import rrweb-player
      const rrwebPlayer = await import('rrweb-player');
      await import('rrweb-player/dist/style.css');

      if (playerRef.current) {
        // Clean up: remove all children using native DOM (not innerHTML which can conflict with React)
        while (playerRef.current.firstChild) {
          playerRef.current.removeChild(playerRef.current.firstChild);
        }

        // Create a fresh container for rrweb-player to mount into
        const mountDiv = document.createElement('div');
        playerRef.current.appendChild(mountDiv);

        const PlayerClass = rrwebPlayer.default || rrwebPlayer;

        new PlayerClass({
          target: mountDiv,
          props: {
            events: data.session.events,
            width: 780,
            height: 440,
            showController: true,
            autoPlay: true,
          },
        });
      }
    } catch (err) {
      console.error('Player error:', err);
      setPlayerError(`Playback error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setPlaying(false);
  };

  const purgeOld = async () => {
    if (!confirm('Delete all sessions older than 30 days?')) return;
    try {
      const res = await fetch('/api/sessions', { method: 'DELETE' });
      const data = await res.json();
      alert(`Purged ${data.deleted} old sessions`);
      loadSessions();
    } catch (err) {
      console.error('Purge error:', err);
    }
  };

  // Group sessions by user
  const groupedByUser = sessions.reduce((acc, s) => {
    const key = s.userId || s.fingerprintId || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Recordings</h1>
          <p className="text-sm text-gray-600 mt-1">{sessions.length} sessions from {Object.keys(groupedByUser).length} visitors</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSessions} disabled={loading} className="px-3 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">
            {loading ? '⏳' : '🔄'} Refresh
          </button>
          <button onClick={purgeOld} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">🗑️ Purge Old</button>
        </div>
      </div>

      {error && (
        <div className={`p-4 rounded-lg text-sm ${sessions.length === 0 && !error.startsWith('API') ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'}`}>
          {error}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Session List */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-900">
              Sessions ({sessions.length})
            </h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Connecting to MongoDB clusters...</p>
              </div>
            ) : sessions.length > 0 ? (
              Object.entries(groupedByUser).map(([userId, userSessions]) => (
                <div key={userId} className="p-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">
                    👤 {userId}{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      ({userSessions.length} session{userSessions.length > 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="space-y-1 ml-4">
                    {userSessions.map(session => (
                      <button
                        key={session.sessionId}
                        onClick={() => playSession(session.sessionId)}
                        className={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm ${
                          selectedId === session.sessionId ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700">
                            {session.metadata?.deviceType === 'mobile' ? '📱' : '💻'}{' '}
                            {session.metadata?.browser || 'Unknown Browser'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {session.startTime ? formatDate(session.startTime) : 'Unknown time'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {session.eventCount || 0} events
                          {session.metadata?.screenWidth ? ` • ${session.metadata.screenWidth}×${session.metadata.screenHeight}` : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-3">📹</div>
                <h3 className="font-medium text-gray-700 mb-1">No sessions recorded yet</h3>
                <p className="text-sm">
                  Open your store in another tab, browse around for 10+ seconds, then come back and click Refresh.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Session Player */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Session Player</h2>

          {playerError && (
            <div className="p-3 bg-yellow-50 text-yellow-700 rounded-lg text-sm mb-4">{playerError}</div>
          )}

          {selectedId ? (
            <div className="space-y-4">
              {/* Loading overlay — OUTSIDE the player container */}
              {playing && (
                <div className="bg-gray-900 rounded-lg min-h-[300px] flex items-center justify-center">
                  <div className="text-white text-sm flex items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-white" />
                    Loading recording...
                  </div>
                </div>
              )}
              {/* Player container — React must NOT put children here. rrweb-player owns this DOM node entirely. */}
              <div
                ref={playerRef}
                className="bg-gray-900 rounded-lg overflow-hidden min-h-[300px]"
                style={{ display: playing ? 'none' : 'block' }}
              />

              {/* Session Info */}
              {sessions.find(s => s.sessionId === selectedId) && (() => {
                const s = sessions.find(s => s.sessionId === selectedId);
                return (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">Events</div>
                      <div className="font-bold text-gray-900">{s.eventCount || 0}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">Device</div>
                      <div className="font-bold text-gray-900 capitalize">{s.metadata?.deviceType || 'Unknown'}</div>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">Browser</div>
                      <div className="font-bold text-gray-900">{s.metadata?.browser || 'Unknown'}</div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <div className="text-4xl mb-3">▶️</div>
              <p className="text-sm">Select a session to watch the replay</p>
            </div>
          )}
        </div>
      </div>

      {/* Debug Info */}
      <details className="bg-gray-50 rounded-lg border p-4">
        <summary className="text-sm font-medium text-gray-600 cursor-pointer">Debug Info</summary>
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p>MongoDB clusters configured: Check .env.local for MONGODB_URI_1, MONGODB_URI_2, MONGODB_URI_3</p>
          <p>Sessions are recorded via rrweb when visitors browse the storefront</p>
          <p>Data is flushed every 10 seconds or when 50 events accumulate</p>
          <p>To test: Open storefront in another tab → browse products → wait 10s → refresh this page</p>
        </div>
      </details>
    </div>
  );
}
