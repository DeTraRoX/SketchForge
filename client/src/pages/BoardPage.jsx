import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/useAuthStore';
import { useCanvasStore } from '../store/useCanvasStore';
import useInfiniteFabricBoard from '../canvas/useInfiniteFabricBoard';
import ToolPanel from '../components/board/ToolPanel';
import PropertiesPanel from '../components/board/PropertiesPanel';
import ZoomControls from '../components/board/ZoomControls';
import CollaboratorCursors from '../components/board/CollaboratorCursors';
import PresenceAvatars from '../components/board/PresenceAvatars';
import ExportMenu from '../components/board/ExportMenu';
import ShareModal from '../components/board/ShareModal';
import TemplatesModal from '../components/board/TemplatesModal';
import AIGeneratorModal from '../components/board/AIGeneratorModal';
import CommentsPanel from '../components/board/CommentsPanel';
import VersionHistory from '../components/board/VersionHistory';
import ActivityFeed from '../components/board/ActivityFeed';
import SelectionHighlights from '../components/board/SelectionHighlights';
import { 
  Undo2, 
  Redo2, 
  LayoutTemplate, 
  Sparkles, 
  History, 
  MessageSquare, 
  Activity, 
  Download, 
  Share2, 
  HelpCircle, 
  X, 
  ChevronLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function BoardPage() {
  const { boardId } = useParams();
  const user = useAuthStore((s) => s.user);
  const [board, setBoard] = useState(null);
  const [canEdit, setCanEdit] = useState(true);
  const [status, setStatus] = useState('connecting');
  const [presence, setPresence] = useState([]);
  const [cursors, setCursors] = useState({});
  const [remoteSelections, setRemoteSelections] = useState({});
  const [showExport, setShowExport] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const imageInputRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const presenceRef = useRef([]);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;

  const tool = useCanvasStore((s) => s.tool);
  const setTool = useCanvasStore((s) => s.setTool);
  const showComments = useCanvasStore((s) => s.showComments);
  const showVersions = useCanvasStore((s) => s.showVersions);
  const toggleComments = useCanvasStore((s) => s.toggleComments);
  const toggleVersions = useCanvasStore((s) => s.toggleVersions);
  const showActivity = useCanvasStore((s) => s.showActivity);
  const toggleActivity = useCanvasStore((s) => s.toggleActivity);
  const theme = useCanvasStore((s) => s.theme);
  const gridStyle = useCanvasStore((s) => s.gridStyle);
  const addToast = useCanvasStore((s) => s.addToast);
  const toasts = useCanvasStore((s) => s.toasts);
  const removeToast = useCanvasStore((s) => s.removeToast);

  const socketRef = useRef(null);
  if (!socketRef.current) {
    const token = localStorage.getItem('token');
    socketRef.current = io(import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000', {
      auth: { token, name: user?.name },
      transports: ['websocket', 'polling'],
    });
  }
  const socket = socketRef.current;

  useEffect(() => () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const {
    hostRef,
    canvasRef,
    getElements,
    loadRemoteElements,
    applyServerState,
    addImage,
    applyTemplate,
    applyAIElements,
    applyStyleToSelection,
    undo,
    redo,
  } = useInfiniteFabricBoard({
    boardId,
    socket,
    initialBoard: board,
    canEdit,
    userId: user?.id,
  });

  const syncRef = useRef({ loadRemoteElements, applyServerState });
  syncRef.current = { loadRemoteElements, applyServerState };

  useEffect(() => {
    return () => {
      useCanvasStore.setState({ showComments: false, showVersions: false, showActivity: false });
    };
  }, []);

  // Fetch board once when boardId changes
  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    api.get(`/api/boards/${boardId}`, { signal: controller.signal })
      .then((res) => {
        if (!cancelled) {
          setBoard(res.data.board);
          setCanEdit(res.data.canEdit !== false);
        }
      })
      .catch((err) => {
        if (!cancelled && err?.code !== 'ERR_CANCELED') {
          // ignore aborted duplicate requests in dev StrictMode
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [boardId]);

  // Socket setup — stable deps only
  useEffect(() => {
    const onConnect = () => {
      setStatus('connected');
      socket.emit('board:join', { boardId });
    };

    const onBoardState = ({ elements, revision }) => {
      syncRef.current.applyServerState(elements, revision);
    };

    const onRemote = ({ elements, userId, revision, deletedIds }) => {
      if (userId && userId === userIdRef.current) return;
      if (Array.isArray(elements)) {
        syncRef.current.loadRemoteElements(elements, revision, deletedIds);
      }
    };

    const onCursor = ({ socketId, cursor, userId }) => {
      if (userId === userIdRef.current) return;
      const presenceUser = presenceRef.current.find((p) => p.userId === userId);
      setCursors((prev) => ({
        ...prev,
        [socketId]: { ...cursor, color: presenceUser?.color, name: presenceUser?.name },
      }));
    };

    const onPresence = ({ users }) => {
      presenceRef.current = users || [];
      setPresence(users || []);
    };

    const onSelectionRemote = ({ socketId, userId, name, color, elementIds, bounds }) => {
      if (userId === userIdRef.current) return;
      setRemoteSelections((prev) => {
        const next = { ...prev };
        if (!elementIds?.length) delete next[socketId];
        else next[socketId] = { socketId, name, color, elementIds, bounds };
        return next;
      });
    };

    const onSelectionsState = ({ selections }) => {
      if (!selections) return;
      const filtered = {};
      Object.entries(selections).forEach(([sid, data]) => {
        if (data.userId !== userIdRef.current) filtered[sid] = data;
      });
      setRemoteSelections(filtered);
    };

    const onDisconnect = () => setStatus('connecting');

    socket.on('connect', onConnect);
    socket.on('board:state', onBoardState);
    socket.on('board:elements:remote', onRemote);
    socket.on('board:cursor', onCursor);
    socket.on('presence:update', onPresence);
    socket.on('board:selection:remote', onSelectionRemote);
    socket.on('board:selections:state', onSelectionsState);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('board:state', onBoardState);
      socket.off('board:elements:remote', onRemote);
      socket.off('board:cursor', onCursor);
      socket.off('presence:update', onPresence);
      socket.off('board:selection:remote', onSelectionRemote);
      socket.off('board:selections:state', onSelectionsState);
      socket.off('disconnect', onDisconnect);
      setRemoteSelections({});
    };
  }, [boardId, socket]);

  const screenCursors = useMemo(() => {
    const zoom = canvasRef.current?.getZoom?.() || 1;
    const vpt = canvasRef.current?.viewportTransform || [1, 0, 0, 1, 0, 0];
    const result = {};
    Object.entries(cursors).forEach(([id, c]) => {
      if (c.x !== undefined) {
        result[id] = {
          ...c,
          x: c.x * zoom + vpt[4],
          y: c.y * zoom + vpt[5],
        };
      }
    });
    return result;
  }, [cursors, canvasRef]);

  function handleImageClick() {
    setTool('image');
    imageInputRef.current?.click();
  }

  async function renameBoard() {
    const title = prompt('Board title', board?.title || '');
    if (!title) return;
    try {
      const res = await api.patch(`/api/boards/${boardId}/rename`, { title });
      setBoard(res.data.board);
      addToast('Board renamed successfully');
    } catch {
      addToast('Failed to rename board', 'error');
    }
  }

  // Help shortcut Modal bindings
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '?' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${isDark ? 'bg-[#0f0f1a] text-slate-100' : 'bg-surface'}`}>
      <header className={`h-14 flex items-center justify-between px-5 border-b z-30 transition-all duration-300 ${isDark ? 'bg-[#0c0c14] border-[#2a2a42]' : 'bg-white border-slate-100 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1 font-bold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent hover:opacity-85 transition">
            <ChevronLeft className="w-5 h-5 text-indigo-500 shrink-0" />
            <span className="hidden sm:inline">SketchForge</span>
          </Link>
          <button 
            onClick={renameBoard} 
            className={`text-sm font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-800'}`}
          >
            {board?.title || 'Loading...'}
          </button>
          
          <div className="flex items-center gap-1.5 ml-1">
            <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {status === 'connected' ? 'Live' : 'Connecting'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={undo} title="Undo (Ctrl+Z)" className="btn-ghost !p-2 !w-9 !h-9 rounded-xl flex items-center justify-center cursor-pointer">
            <Undo2 className="w-4.5 h-4.5" />
          </button>
          <button onClick={redo} title="Redo (Ctrl+Shift+Z)" className="btn-ghost !p-2 !w-9 !h-9 rounded-xl flex items-center justify-center cursor-pointer">
            <Redo2 className="w-4.5 h-4.5" />
          </button>
          
          <div className={`w-px h-5 mx-1.5 ${isDark ? 'bg-[#2a2a42]' : 'bg-slate-100'}`} />
          
          <button 
            onClick={() => setShowTemplates(true)} 
            className="btn-ghost text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <LayoutTemplate className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Templates</span>
          </button>
          
          <button 
            onClick={() => setShowAI(true)} 
            className="btn-ghost text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="hidden sm:inline">AI Board</span>
          </button>
          
          <button 
            onClick={toggleActivity} 
            className={`btn-ghost text-xs font-semibold rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer ${showActivity ? '!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-950/45 dark:!text-indigo-400' : ''}`}
          >
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Activity</span>
          </button>
          
          <button 
            onClick={toggleComments} 
            className={`btn-ghost text-xs font-semibold rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer ${showComments ? '!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-950/45 dark:!text-indigo-400' : ''}`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Comments</span>
          </button>
          
          <button 
            onClick={toggleVersions} 
            className={`btn-ghost text-xs font-semibold rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer ${showVersions ? '!bg-indigo-50 !text-indigo-600 dark:!bg-indigo-950/45 dark:!text-indigo-400' : ''}`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </button>
          
          <div className={`w-px h-5 mx-1.5 ${isDark ? 'bg-[#2a2a42]' : 'bg-slate-100'}`} />
          
          <button 
            onClick={() => setShowExport((v) => !v)} 
            className="btn-ghost text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-3 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          
          <button 
            onClick={() => setShowShare(true)} 
            className="btn-primary !py-2 !px-4 !text-xs ml-1 flex items-center gap-1.5 rounded-xl"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
          
          <div className="ml-3 shrink-0"><PresenceAvatars users={presence} /></div>
        </div>
      </header>

      <div className="flex-1 flex min-h-0 relative">
        <ToolPanel tool={tool} setTool={setTool} onImageClick={handleImageClick} canEdit={canEdit} isDark={isDark} />

        <main ref={canvasContainerRef} className={`flex-1 relative min-h-0 overflow-hidden ${isDark ? 'bg-[#0f0f1a]' : 'bg-slate-100'}`}>
          <div ref={hostRef} className="absolute inset-0 w-full h-full" />
          <SelectionHighlights selections={Object.values(remoteSelections)} canvasRef={canvasRef} />
          <CollaboratorCursors cursors={screenCursors} />
          
          <ZoomControls isDark={isDark} />
          
          {/* Shortcuts Info Helper Button */}
          <button 
            onClick={() => setShowHelp(true)}
            className="absolute bottom-5 right-5 w-9 h-9 rounded-xl bg-white/95 dark:bg-[#12121e]/95 border border-slate-200/60 dark:border-slate-800/60 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center shadow-md cursor-pointer z-30"
            title="Keyboard Shortcuts (?)"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {showExport && (
            <ExportMenu
              canvasRef={canvasRef}
              elements={getElements()}
              settings={{ theme, gridEnabled: gridStyle !== 'none' }}
              title={board?.title}
              onClose={() => setShowExport(false)}
            />
          )}
        </main>

        <PropertiesPanel onApply={applyStyleToSelection} canEdit={canEdit} isDark={isDark} />

        {showActivity && <ActivityFeed boardId={boardId} socket={socket} onClose={toggleActivity} />}
        {showComments && <CommentsPanel boardId={boardId} canEdit={canEdit} isDark={isDark} />}
        {showVersions && (
          <VersionHistory boardId={boardId} onRestore={(b) => setBoard(b)} onClose={toggleVersions} isDark={isDark} />
        )}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ''; }} />

      {showShare && <ShareModal boardId={boardId} onClose={() => setShowShare(false)} />}
      {showTemplates && <TemplatesModal onSelect={applyTemplate} onClose={() => setShowTemplates(false)} />}
      {showAI && <AIGeneratorModal onGenerate={applyAIElements} onClose={() => setShowAI(false)} />}

      {/* Floating Toast Notification Wrapper */}
      <div className="absolute bottom-16 right-5 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`flex items-center gap-2.5 px-4.5 py-3 rounded-2xl shadow-premium border text-xs font-semibold ${
              toast.type === 'error' 
                ? 'bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-900/40 text-red-700 dark:text-red-400' 
                : 'bg-white dark:bg-[#12121e] border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-500 shrink-0" /> : <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />}
            <span className="flex-1">{toast.message}</span>
            <button 
              onClick={() => removeToast(toast.id)} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Keyboard Shortcuts Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
          <div 
            className="bg-white dark:bg-[#12121e] rounded-3xl shadow-2xl p-6.5 w-full max-w-lg border border-slate-100 dark:border-slate-800/80 transition-all duration-300 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5.5 h-5.5 text-indigo-500" />
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">Keyboard Shortcuts</h2>
              </div>
              <button 
                onClick={() => setShowHelp(false)} 
                className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
              <div>
                <h3 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wider text-[10px]">Controls</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center"><span className="text-slate-500">Undo</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">Ctrl + Z</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Redo</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">Ctrl + Shift + Z</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Copy / Paste</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">Ctrl + C / V</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Duplicate</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">Ctrl + D</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Group Selection</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">Ctrl + G</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Ungroup Selection</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">Ctrl + Shift + G</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Delete Selected</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">Del / Backspace</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Pan Canvas</span><span className="text-slate-600 font-medium text-[10px]">Space + Drag</span></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Zoom</span><span className="text-slate-600 font-medium text-[10px]">Scroll Wheel</span></div>
                </div>
              </div>
              
              <div>
                <h3 className="font-bold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wider text-[10px]">Quick Tool Bindings</h3>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center"><span className="text-slate-500">Select Mode</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">V</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Freehand / Pencil</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">F / P</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Rectangle / Ellipse</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">R / O</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Diamond / Triangle</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">D / G</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Star / Frame</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">S / M</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Line / Arrow</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">L / A</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Text tool</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">T</kbd></div>
                  <div className="flex justify-between items-center"><span className="text-slate-500">Eraser</span><kbd className="px-2 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded font-semibold text-[10px] text-slate-700 dark:text-slate-300">E</kbd></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
