const Workspace = require('../models/Workspace');

function getMemberRole(workspace, userId) {
  if (!workspace || !userId) return null;
  if (workspace.owner?.toString() === userId) return 'owner';
  const member = workspace.members?.find((m) => m.user?.toString() === userId);
  return member?.role || null;
}

function canAccessWorkspace(workspace, userId) {
  const role = getMemberRole(workspace, userId);
  return role != null;
}

function canEditWorkspace(workspace, userId) {
  const role = getMemberRole(workspace, userId);
  return role === 'owner' || role === 'admin' || role === 'editor';
}

function canManageWorkspace(workspace, userId) {
  const role = getMemberRole(workspace, userId);
  return role === 'owner' || role === 'admin';
}

async function loadWorkspace(workspaceId, userId) {
  const workspace = await Workspace.findById(workspaceId).populate('members.user', 'name email avatar');
  if (!workspace) return { ok: false, status: 404 };
  if (!canAccessWorkspace(workspace, userId)) return { ok: false, status: 403 };
  return { ok: true, workspace, role: getMemberRole(workspace, userId) };
}

module.exports = {
  getMemberRole,
  canAccessWorkspace,
  canEditWorkspace,
  canManageWorkspace,
  loadWorkspace,
};
