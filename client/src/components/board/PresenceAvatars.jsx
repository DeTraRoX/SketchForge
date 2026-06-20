export default function PresenceAvatars({ users = [] }) {
  if (!users.length) return null;
  return (
    <div className="flex items-center -space-x-2">
      {users.slice(0, 5).map((u, i) => (
        <div
          key={u.userId || i}
          title={u.name || 'Collaborator'}
          className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white dark:border-[#0c0c14] shadow-sm shrink-0 transition-transform hover:scale-105 hover:z-10 cursor-pointer"
          style={{ backgroundColor: u.color || '#6366f1' }}
        >
          {(u.name || 'U')[0].toUpperCase()}
        </div>
      ))}
      {users.length > 5 && (
        <div className="w-7.5 h-7.5 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-900 border-2 border-white dark:border-[#0c0c14] shrink-0">
          +{users.length - 5}
        </div>
      )}
    </div>
  );
}
