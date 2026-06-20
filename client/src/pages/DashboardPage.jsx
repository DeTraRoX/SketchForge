import { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useCanvasStore } from '../store/useCanvasStore';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Trash2, 
  Plus, 
  Users, 
  Folder, 
  FolderPlus, 
  Search, 
  LogOut, 
  User, 
  MoreVertical, 
  Edit2, 
  MoveRight, 
  Sun, 
  Moon, 
  Layers, 
  Calendar,
  Grid,
  FileText
} from 'lucide-react';

export default function DashboardPage() {
  const [boards, setBoards] = useState([]);
  const [folders, setFolders] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('boards');
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);
  
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useCanvasStore((s) => s.theme);
  const setTheme = useCanvasStore((s) => s.setTheme);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadBoards() {
    const params = {};
    if (selectedWorkspace) params.workspaceId = selectedWorkspace;
    if (selectedFolder) params.folderId = selectedFolder;
    const res = await api.get('/api/boards', { params });
    setBoards(res.data.boards);
  }

  async function loadFolders() {
    const params = selectedWorkspace ? { workspaceId: selectedWorkspace } : {};
    const res = await api.get('/api/folders', { params });
    setFolders(res.data.folders);
  }

  async function loadWorkspaces() {
    const res = await api.get('/api/workspaces');
    setWorkspaces(res.data.workspaces);
  }

  async function loadTrash() {
    const res = await api.get('/api/boards/trash');
    setTrash(res.data.boards);
  }

  async function load() {
    setLoading(true);
    try {
      await Promise.all([loadWorkspaces(), loadFolders(), loadBoards(), loadTrash()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [selectedWorkspace, selectedFolder]);

  async function createBoard() {
    const res = await api.post('/api/boards', {
      title: 'Untitled board',
      workspaceId: selectedWorkspace || undefined,
      folderId: selectedFolder || undefined,
    });
    navigate(`/board/${res.data.board._id}`);
  }

  async function createFolder() {
    const name = prompt('Folder name');
    if (!name?.trim()) return;
    await api.post('/api/folders', { name, workspaceId: selectedWorkspace || undefined });
    loadFolders();
  }

  async function createWorkspace(e) {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    await api.post('/api/workspaces', { name: workspaceName });
    setWorkspaceName('');
    setShowWorkspaceModal(false);
    loadWorkspaces();
  }

  async function renameBoard(e, boardId, currentTitle) {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(null);
    const title = prompt('Rename board', currentTitle);
    if (!title || title === currentTitle) return;
    await api.patch(`/api/boards/${boardId}/rename`, { title });
    load();
  }

  async function trashBoard(e, boardId) {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(null);
    if (!confirm('Move this board to trash?')) return;
    await api.delete(`/api/boards/${boardId}`);
    load();
  }

  async function restoreBoard(boardId) {
    await api.post(`/api/boards/${boardId}/restore`);
    load();
  }

  async function deleteForever(boardId) {
    if (!confirm('Permanently delete this board?')) return;
    await api.delete(`/api/boards/${boardId}?permanent=true`);
    load();
  }

  async function moveBoardToFolder(e, boardId) {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(null);
    if (!folders.length) {
      const ok = confirm('No folders yet. Create one first?');
      if (ok) createFolder();
      return;
    }
    const choice = prompt(
      `Move to folder:\n0 — Remove from folder\n${folders.map((f, i) => `${i + 1} — ${f.name}`).join('\n')}`
    );
    if (choice === null) return;
    const idx = parseInt(choice, 10);
    const folderId = idx === 0 ? null : folders[idx - 1]?._id;
    if (idx > 0 && !folderId) return;
    await api.patch(`/api/boards/${boardId}/move`, { folderId });
    load();
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Generates a beautiful gradient based on the board ID or title
  function getVisualPreview(boardId) {
    const stringUniqueHash = boardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue1 = stringUniqueHash % 360;
    const hue2 = (hue1 + 45) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 80%, 75%) 0%, hsl(${hue2}, 75%, 65%) 100%)`;
  }

  const rawBoards = view === 'trash' ? trash : boards;
  const filteredBoards = rawBoards.filter((b) => 
    b.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090e] flex transition-colors duration-300">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200/80 dark:border-slate-800/85 bg-white dark:bg-[#0c0c14] p-5 flex flex-col gap-1 shrink-0 transition-colors">
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <span className="text-white text-base font-bold">SF</span>
          </div>
          <span className="font-extrabold text-lg bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
            SketchForge
          </span>
        </div>

        <button
          type="button"
          onClick={() => { setView('boards'); setSelectedFolder(null); }}
          className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${view === 'boards' && !selectedFolder ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60'}`}
        >
          <LayoutDashboard className="w-4.5 h-4.5 mr-2.5" />
          All Boards
        </button>

        <button
          type="button"
          onClick={() => { setView('trash'); setSelectedFolder(null); }}
          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${view === 'trash' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60'}`}
        >
          <div className="flex items-center">
            <Trash2 className="w-4.5 h-4.5 mr-2.5" />
            Trash
          </div>
          {trash.length > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-medium px-2 py-0.5 rounded-full">
              {trash.length}
            </span>
          )}
        </button>

        <div className="border-t border-slate-100 dark:border-slate-800/80 my-4" />

        {/* Workspaces Group */}
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Workspaces</span>
          <button 
            type="button" 
            onClick={() => setShowWorkspaceModal(true)} 
            className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition inline-flex items-center justify-center w-5 h-5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            title="Create Workspace"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-0.5">
          {workspaces.map((w) => (
            <button
              key={w._id}
              type="button"
              onClick={() => { setSelectedWorkspace(w._id); setSelectedFolder(null); setView('boards'); }}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm truncate transition-all duration-150 ${selectedWorkspace === w._id ? 'bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/60 dark:hover:bg-slate-900/30'}`}
            >
              <Users className="w-4 h-4 mr-2.5 shrink-0 text-slate-400" />
              <span className="truncate">{w.name}</span>
            </button>
          ))}
          {selectedWorkspace && (
            <button 
              type="button" 
              onClick={() => setSelectedWorkspace(null)} 
              className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline mt-1"
            >
              ← Back to Personal
            </button>
          )}
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 my-4" />

        {/* Folders Group */}
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Folders</span>
          <button 
            type="button" 
            onClick={createFolder} 
            className="text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition inline-flex items-center justify-center w-5 h-5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            title="Create Folder"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
          {folders.map((f) => (
            <button
              key={f._id}
              type="button"
              onClick={() => { setSelectedFolder(f._id); setView('boards'); }}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm truncate transition-all duration-150 ${selectedFolder === f._id ? 'bg-slate-100 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/60 dark:hover:bg-slate-900/30'}`}
            >
              <span className="inline-block w-2.5 h-2.5 rounded-full mr-3 shrink-0" style={{ backgroundColor: f.color }} />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        
        {/* Header */}
        <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#0c0c14]/80 backdrop-blur-xl sticky top-0 z-20 transition-colors">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full max-w-sm hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input 
                type="text"
                placeholder="Search boards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10 py-1.5"
              />
            </div>

            <div className="flex items-center gap-3 ml-auto">
              
              {/* Theme toggle */}
              <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="btn-ghost !p-2 !w-9 !h-9 border border-slate-200/60 dark:border-slate-800/60 rounded-xl"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5 text-slate-500" />}
              </button>

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-800 mx-1" />

              {/* User Profile */}
              <Link to="/profile" className="flex items-center gap-2 hover:opacity-85 transition bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 pl-1.5 pr-3 py-1.5 rounded-xl">
                <div className="w-6.5 h-6.5 rounded-lg bg-gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {user?.avatar ? (
                    <img src={user.avatar} className="w-full h-full object-cover rounded-lg" alt="" />
                  ) : (
                    (user?.name || 'U')[0].toUpperCase()
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden md:block">{user?.name}</span>
              </Link>
              
              <button 
                onClick={handleLogout} 
                className="btn-ghost border border-slate-200/60 dark:border-slate-800/60 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 !px-3.5 !py-2 rounded-xl flex items-center gap-1.5"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-semibold hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Dashboard Main Grid */}
        <main className="max-w-6xl mx-auto px-6 py-8 flex-1 w-full space-y-8">
          
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {view === 'trash' ? 'Trash' : selectedFolder ? folders.find((f) => f._id === selectedFolder)?.name || 'Folder' : selectedWorkspace ? workspaces.find((w) => w._id === selectedWorkspace)?.name : 'My Boards'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {view === 'trash' ? 'Manage deleted boards' : 'Create, edit and share collaborative whiteboards'}
              </p>
            </div>
            
            {view !== 'trash' && (
              <button 
                onClick={createBoard} 
                className="btn-primary !px-5 !py-3 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg rounded-2xl"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>New Board</span>
              </button>
            )}
          </div>

          {/* Stats Bar */}
          {view !== 'trash' && (
            <div className="grid grid-cols-3 gap-4 bg-white dark:bg-[#0c0c14] border border-slate-200/50 dark:border-slate-800/50 p-4.5 rounded-2xl shadow-card transition-colors">
              <div className="flex items-center gap-3.5 px-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                  <Grid className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">{boards.length}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Boards</div>
                </div>
              </div>
              <div className="flex items-center gap-3.5 px-3 border-x border-slate-100 dark:border-slate-800/60">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">{workspaces.length}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Teams</div>
                </div>
              </div>
              <div className="flex items-center gap-3.5 px-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">{folders.length}</div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Folders</div>
                </div>
              </div>
            </div>
          )}

          {/* Search on Mobile */}
          <div className="relative block sm:hidden">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search boards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-white dark:bg-[#0c0c14] border border-slate-200/50 dark:border-slate-800/50 shadow-card animate-pulse" />
              ))}
            </div>
          ) : filteredBoards.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-[#0c0c14] rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-card flex flex-col items-center justify-center transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center mb-4 text-3xl">
                {view === 'trash' ? '🗑️' : '✏️'}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                {view === 'trash' ? 'Trash is Empty' : 'No Boards Found'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-normal">
                {view === 'trash' ? 'Items you delete will appear here.' : 'Create your first collaborative drawing space to begin.'}
              </p>
              {view !== 'trash' && (
                <button onClick={createBoard} className="btn-primary mt-5 px-5">Create a board</button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBoards.map((b) => {
                const folderObj = folders.find((f) => f._id === b.folderId);
                
                return view === 'trash' ? (
                  <div key={b._id} className="bg-white dark:bg-[#0c0c14] rounded-2xl border border-slate-200/60 dark:border-slate-800/60 shadow-card p-5.5 flex flex-col justify-between h-48 transition-colors">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-base truncate">{b.title}</div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Deleted {new Date(b.deletedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => restoreBoard(b._id)} 
                        className="text-xs font-semibold px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                      >
                        Restore
                      </button>
                      <button 
                        onClick={() => deleteForever(b._id)} 
                        className="text-xs font-semibold px-4 py-2 rounded-xl border border-red-200 dark:border-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                      >
                        Delete forever
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={b._id} className="relative group">
                    <Link
                      to={`/board/${b._id}`}
                      className="block bg-white dark:bg-[#0c0c14] rounded-2.5xl border border-slate-200/60 dark:border-slate-800/60 shadow-card hover:shadow-premium hover:border-indigo-500/30 transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                    >
                      {/* Geometric styled header banner instead of standard emojis */}
                      <div className="h-32 flex items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:opacity-95" style={{ background: getVisualPreview(b._id) }}>
                        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                        <FileText className="w-10 h-10 text-white/95 relative z-10 drop-shadow-sm group-hover:scale-110 transition-transform duration-300" />
                        
                        {/* Folder indicator on card preview */}
                        {folderObj && (
                          <span 
                            className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm flex items-center gap-1"
                            style={{ backgroundColor: folderObj.color || '#6366f1' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                            {folderObj.name}
                          </span>
                        )}
                      </div>

                      <div className="p-5">
                        <div className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-base truncate pr-6">
                          {b.title}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Updated {new Date(b.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </Link>

                    {/* Floating Options Menu Button */}
                    <div className="absolute top-2.5 right-2.5 z-10" ref={activeDropdown === b._id ? dropdownRef : null}>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === b._id ? null : b._id);
                        }}
                        className="w-8 h-8 rounded-xl bg-white/95 dark:bg-[#12121e]/95 hover:bg-indigo-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center shadow-md cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical className="w-4.5 h-4.5" />
                      </button>

                      {/* Dropdown Floating Options Menu */}
                      {activeDropdown === b._id && (
                        <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-[#161626] border border-slate-100 dark:border-slate-800/80 rounded-xl shadow-xl z-30 py-1 divide-y divide-slate-100 dark:divide-slate-800">
                          <div className="py-0.5">
                            <button
                              onClick={(e) => renameBoard(e, b._id, b.title)}
                              className="w-full flex items-center text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              Rename
                            </button>
                            <button
                              onClick={(e) => moveBoardToFolder(e, b._id)}
                              className="w-full flex items-center text-left px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors cursor-pointer"
                            >
                              <MoveRight className="w-3.5 h-3.5 mr-2 text-slate-400" />
                              Move
                            </button>
                          </div>
                          <div className="py-0.5">
                            <button
                              onClick={(e) => trashBoard(e, b._id)}
                              className="w-full flex items-center text-left px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2 text-red-400" />
                              Trash
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Workspace Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowWorkspaceModal(false)}>
          <form className="bg-white dark:bg-[#12121e] rounded-3xl shadow-2xl p-6.5 w-full max-w-md border border-slate-100 dark:border-slate-800/80 transition-all duration-300" onClick={(e) => e.stopPropagation()} onSubmit={createWorkspace}>
            <h2 className="text-xl font-extrabold text-slate-950 dark:text-white mb-1.5 tracking-tight">Create team workspace</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4.5">Share boards, elements, and collaborate in real-time with team members.</p>
            <input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Workspace Name (e.g. Design Team)"
              className="input-field mb-5"
              required
            />
            <div className="flex gap-2.5">
              <button type="submit" className="btn-primary flex-1 py-3">Create</button>
              <button type="button" onClick={() => setShowWorkspaceModal(false)} className="btn-ghost border border-slate-200 dark:border-slate-800 flex-1 py-3 text-slate-600 dark:text-slate-400">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
