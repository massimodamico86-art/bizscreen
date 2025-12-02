/**
 * TeamPage - Manage team members within the organization
 */
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '../i18n';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Crown,
  Edit3,
  Eye,
  MoreVertical,
  RefreshCw,
  Trash2,
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  PageLayout,
  PageHeader,
  PageContent,
  Card,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  EmptyState,
} from '../design-system';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchTeamMembers,
  inviteMember,
  updateMemberRole,
  revokeMember,
  resendInvite,
  deleteInvite,
  getRoleDisplayName,
  getRoleDescription,
} from '../services/teamService';
import { getPermissions } from '../services/permissionsService';

const ROLE_ICONS = {
  owner: Crown,
  manager: Shield,
  editor: Edit3,
  viewer: Eye,
};

const ROLE_COLORS = {
  owner: 'text-amber-600 bg-amber-50',
  manager: 'text-blue-600 bg-blue-50',
  editor: 'text-purple-600 bg-purple-50',
  viewer: 'text-gray-600 bg-gray-50',
};

const TeamPage = ({ showToast }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [membersResult, permsResult] = await Promise.all([
        fetchTeamMembers(),
        getPermissions(),
      ]);

      if (membersResult.error) {
        showToast?.(t('team.errorLoading', 'Error loading team: {{error}}', { error: membersResult.error }), 'error');
      } else {
        setMembers(membersResult.data);
      }
      setPermissions(permsResult);
    } catch (err) {
      showToast?.(t('team.errorLoadingData', 'Error loading team data'), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setProcessing(true);
      const result = await inviteMember({ email: inviteEmail.trim(), role: inviteRole });

      if (result.success) {
        if (result.data?.isExistingUser) {
          showToast?.(t('team.memberAdded', 'Team member added successfully!'));
        } else if (result.data?.inviteToken) {
          showToast?.(t('team.inviteSent', 'Invitation sent! They will receive an email to join.'));
        }
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('editor');
        loadData();
      } else {
        showToast?.(result.error || t('team.inviteFailed', 'Failed to invite member'), 'error');
      }
    } catch (err) {
      showToast?.(t('team.errorInviting', 'Error inviting member'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      setProcessing(true);
      const result = await updateMemberRole(memberId, newRole);

      if (result.success) {
        showToast?.(t('team.roleUpdated', 'Role updated successfully'));
        setShowRoleModal(null);
        loadData();
      } else {
        showToast?.(result.error || t('team.roleUpdateFailed', 'Failed to update role'), 'error');
      }
    } catch (err) {
      showToast?.(t('team.errorUpdatingRole', 'Error updating role'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (memberId) => {
    try {
      setProcessing(true);
      const result = await revokeMember(memberId);

      if (result.success) {
        showToast?.(t('team.accessRevoked', 'Member access revoked'));
        setShowConfirmModal(null);
        loadData();
      } else {
        showToast?.(result.error || t('team.revokeFailed', 'Failed to revoke access'), 'error');
      }
    } catch (err) {
      showToast?.(t('team.errorRevoking', 'Error revoking access'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleResendInvite = async (memberId) => {
    try {
      setProcessing(true);
      const result = await resendInvite(memberId);

      if (result.success) {
        showToast?.(t('team.inviteResent', 'Invitation resent!'));
        loadData();
      } else {
        showToast?.(result.error || t('team.resendFailed', 'Failed to resend invitation'), 'error');
      }
    } catch (err) {
      showToast?.(t('team.errorResending', 'Error resending invitation'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteInvite = async (memberId) => {
    try {
      setProcessing(true);
      const result = await deleteInvite(memberId);

      if (result.success) {
        showToast?.(t('team.inviteDeleted', 'Invitation deleted'));
        setShowConfirmModal(null);
        loadData();
      } else {
        showToast?.(result.error || t('team.deleteFailed', 'Failed to delete invitation'), 'error');
      }
    } catch (err) {
      showToast?.(t('team.errorDeleting', 'Error deleting invitation'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const canManage = permissions?.canManageTeam ?? false;

  if (loading) {
    return (
      <PageLayout>
        <PageContent>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" aria-label={t('common.loading', 'Loading')} />
          </div>
        </PageContent>
      </PageLayout>
    );
  }

  const activeMembers = members.filter((m) => m.status === 'active');
  const pendingMembers = members.filter((m) => m.status === 'invited');
  const revokedMembers = members.filter((m) => m.status === 'revoked');

  return (
    <PageLayout>
      <PageHeader
        title={t('team.title', 'Team')}
        description={t('team.description', 'Manage who has access to your account')}
        actions={
          canManage && (
            <Button onClick={() => setShowInviteModal(true)} icon={<UserPlus size={18} />}>
              {t('team.inviteMember', 'Invite Member')}
            </Button>
          )
        }
      />

      <PageContent className="space-y-6">
        {/* Active Members */}
        <Card padding="none" className="overflow-hidden">
          <CardHeader className="px-6 py-4 border-b bg-gray-50">
            <CardTitle className="flex items-center gap-2">
              <Users size={18} aria-hidden="true" />
              {t('team.teamMembers', 'Team Members')} ({activeMembers.length})
            </CardTitle>
          </CardHeader>

          {activeMembers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('team.noActiveMembers', 'No active team members yet')}
            />
          ) : (
            <div className="divide-y" role="list" aria-label={t('team.membersList', 'Team members list')}>
              {activeMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  currentUserId={user?.id}
                  canManage={canManage}
                  onChangeRole={() => setShowRoleModal(member)}
                  onRevoke={() => setShowConfirmModal({ type: 'revoke', member })}
                  t={t}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Pending Invitations */}
        {pendingMembers.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b bg-yellow-50">
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <Clock size={18} aria-hidden="true" />
                {t('team.pendingInvitations', 'Pending Invitations')} ({pendingMembers.length})
              </CardTitle>
            </CardHeader>
            <div className="divide-y" role="list">
              {pendingMembers.map((member) => (
                <PendingRow
                  key={member.id}
                  member={member}
                  canManage={canManage}
                  onResend={() => handleResendInvite(member.id)}
                  onDelete={() => setShowConfirmModal({ type: 'delete', member })}
                  processing={processing}
                  t={t}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Revoked Members */}
        {revokedMembers.length > 0 && (
          <Card padding="none" className="overflow-hidden">
            <CardHeader className="px-6 py-4 border-b bg-red-50">
              <CardTitle className="flex items-center gap-2 text-red-800">
                <X size={18} aria-hidden="true" />
                {t('team.revokedAccess', 'Revoked Access')} ({revokedMembers.length})
              </CardTitle>
            </CardHeader>
            <div className="divide-y" role="list">
              {revokedMembers.map((member) => (
                <MemberRow key={member.id} member={member} currentUserId={user?.id} canManage={false} disabled t={t} />
              ))}
            </div>
          </Card>
        )}

        {/* Role Descriptions */}
        <Card padding="default">
          <h3 className="font-semibold text-gray-900 mb-4">{t('team.teamRoles', 'Team Roles')}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {['owner', 'manager', 'editor', 'viewer'].map((role) => {
              const Icon = ROLE_ICONS[role];
              return (
                <div key={role} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-lg ${ROLE_COLORS[role]}`}><Icon size={18} aria-hidden="true" /></div>
                  <div>
                    <p className="font-medium text-gray-900">{getRoleDisplayName(role)}</p>
                    <p className="text-sm text-gray-600">{getRoleDescription(role)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Invite Modal */}
        <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} size="sm">
          <form onSubmit={handleInvite}>
            <ModalHeader><ModalTitle>{t('team.inviteTeamMember', 'Invite Team Member')}</ModalTitle></ModalHeader>
            <ModalContent className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.emailAddress', 'Email Address')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden="true" />
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">{t('team.role', 'Role')}</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="manager">{t('team.roleManager', 'Manager')}</option>
                  <option value="editor">{t('team.roleEditor', 'Editor')}</option>
                  <option value="viewer">{t('team.roleViewer', 'Viewer')}</option>
                </select>
                <p className="text-sm text-gray-500 mt-1">{getRoleDescription(inviteRole)}</p>
              </div>
            </ModalContent>
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setShowInviteModal(false)}>{t('common.cancel', 'Cancel')}</Button>
              <Button type="submit" disabled={processing} loading={processing} icon={<UserPlus size={16} />}>{t('team.sendInvite', 'Send Invite')}</Button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Change Role Modal */}
        <Modal open={!!showRoleModal} onClose={() => setShowRoleModal(null)} size="sm">
          <ModalHeader><ModalTitle>{t('team.changeRole', 'Change Role')}</ModalTitle></ModalHeader>
          <ModalContent>
            <p className="text-gray-600 mb-4">
              {t('team.updateRoleFor', 'Update role for')} <strong>{showRoleModal?.fullName || showRoleModal?.email}</strong>
            </p>
            <div className="space-y-2">
              {['owner', 'manager', 'editor', 'viewer'].map((role) => {
                const Icon = ROLE_ICONS[role];
                const isSelected = showRoleModal?.role === role;
                return (
                  <button
                    key={role}
                    onClick={() => handleChangeRole(showRoleModal.id, role)}
                    disabled={processing || isSelected}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div className={`p-2 rounded-lg ${ROLE_COLORS[role]}`}><Icon size={18} /></div>
                    <div className="text-left flex-1">
                      <p className="font-medium text-gray-900">{getRoleDisplayName(role)}</p>
                      <p className="text-sm text-gray-500">{getRoleDescription(role)}</p>
                    </div>
                    {isSelected && <Check className="w-5 h-5 text-blue-600" aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowRoleModal(null)} fullWidth>{t('common.cancel', 'Cancel')}</Button>
          </ModalFooter>
        </Modal>

        {/* Confirm Modal */}
        <Modal open={!!showConfirmModal} onClose={() => setShowConfirmModal(null)} size="sm">
          <ModalHeader>
            <ModalTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} aria-hidden="true" />
              {showConfirmModal?.type === 'revoke' ? t('team.revokeAccess', 'Revoke Access') : t('team.deleteInvitation', 'Delete Invitation')}
            </ModalTitle>
          </ModalHeader>
          <ModalContent>
            <p className="text-gray-600">
              {showConfirmModal?.type === 'revoke'
                ? t('team.revokeConfirm', 'Are you sure you want to revoke access for {{name}}? They will no longer be able to access this account.', { name: showConfirmModal?.member?.fullName || showConfirmModal?.member?.email })
                : t('team.deleteConfirm', 'Are you sure you want to delete the invitation for {{email}}?', { email: showConfirmModal?.member?.email })
              }
            </p>
          </ModalContent>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setShowConfirmModal(null)}>{t('common.cancel', 'Cancel')}</Button>
            <Button
              variant="danger"
              onClick={() => showConfirmModal?.type === 'revoke' ? handleRevoke(showConfirmModal.member.id) : handleDeleteInvite(showConfirmModal.member.id)}
              disabled={processing}
              loading={processing}
            >
              {showConfirmModal?.type === 'revoke' ? t('team.revokeAccess', 'Revoke Access') : t('common.delete', 'Delete')}
            </Button>
          </ModalFooter>
        </Modal>
      </PageContent>
    </PageLayout>
  );
};

function MemberRow({ member, currentUserId, canManage, onChangeRole, onRevoke, disabled, t }) {
  const [showMenu, setShowMenu] = useState(false);
  const Icon = ROLE_ICONS[member.role];
  const isCurrentUser = member.userId === currentUserId;

  return (
    <div className={`flex items-center gap-4 px-6 py-4 ${disabled ? 'opacity-50' : ''}`} role="listitem">
      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium" aria-hidden="true">
        {member.fullName?.[0]?.toUpperCase() || member.email?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 truncate">{member.fullName || member.email}</p>
          {isCurrentUser && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t('team.you', 'You')}</span>}
        </div>
        <p className="text-sm text-gray-500 truncate">{member.email}</p>
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${ROLE_COLORS[member.role]}`}>
        <Icon size={14} aria-hidden="true" />
        <span className="text-sm font-medium">{getRoleDisplayName(member.role)}</span>
      </div>
      {canManage && !disabled && !isCurrentUser && (
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={t('team.memberActions', 'Member actions')}
            aria-haspopup="true"
            aria-expanded={showMenu}
          >
            <MoreVertical size={18} className="text-gray-500" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0" onClick={() => setShowMenu(false)} aria-hidden="true" />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border py-1 z-10" role="menu">
                <button onClick={() => { setShowMenu(false); onChangeRole?.(); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" role="menuitem">
                  <Shield size={16} aria-hidden="true" />{t('team.changeRole', 'Change Role')}
                </button>
                <button onClick={() => { setShowMenu(false); onRevoke?.(); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50" role="menuitem">
                  <X size={16} aria-hidden="true" />{t('team.revokeAccess', 'Revoke Access')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PendingRow({ member, canManage, onResend, onDelete, processing, t }) {
  const Icon = ROLE_ICONS[member.role];

  return (
    <div className="flex items-center gap-4 px-6 py-4" role="listitem">
      <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600" aria-hidden="true">
        <Mail size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{member.email}</p>
        <p className="text-sm text-gray-500">
          {t('team.invitedAs', 'Invited as {{role}}', { role: getRoleDisplayName(member.role) })}
          {member.inviteExpired && <span className="text-red-600 ml-2">({t('team.expired', 'Expired')})</span>}
        </p>
      </div>
      <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">{t('team.pending', 'Pending')}</span>
      {canManage && (
        <div className="flex items-center gap-2">
          <button onClick={onResend} disabled={processing} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={t('team.resendInvitation', 'Resend invitation')}>
            <RefreshCw size={16} />
          </button>
          <button onClick={onDelete} disabled={processing} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" aria-label={t('team.deleteInvitation', 'Delete invitation')}>
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

export default TeamPage;
