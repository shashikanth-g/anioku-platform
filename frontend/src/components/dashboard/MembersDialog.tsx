"use client";

import { useEffect, useState } from "react";
import { Users, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import type { Workspace, WorkspaceRole } from "@/types";

const ROLES: WorkspaceRole[] = ["admin", "editor", "viewer"];

export function MembersDialog({ workspace }: { workspace: Workspace }) {
  const { user } = useAuth();
  const membersByWorkspace = useWorkspaceStore((s) => s.membersByWorkspace);
  const fetchMembers = useWorkspaceStore((s) => s.fetchMembers);
  const inviteMember = useWorkspaceStore((s) => s.inviteMember);
  const updateMemberRole = useWorkspaceStore((s) => s.updateMemberRole);
  const removeMember = useWorkspaceStore((s) => s.removeMember);

  const members = membersByWorkspace[workspace.id] ?? [];

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("viewer");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      void fetchMembers(workspace.id);
    }
  }, [open, workspace.id, fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await inviteMember(workspace.id, email, role);
      setEmail("");
      setRole("viewer");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to invite member.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: WorkspaceRole) {
    setError(null);
    try {
      await updateMemberRole(workspace.id, userId, newRole);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update role.",
      );
    }
  }

  async function handleRemove(userId: string) {
    setError(null);
    try {
      await removeMember(workspace.id, userId);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to remove member.",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Users className="mr-2 h-4 w-4" />
          Members
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Members of {workspace.name}</DialogTitle>
          <DialogDescription>
            Invite people by email and manage their role.
          </DialogDescription>
        </DialogHeader>

        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {members.map((member) => {
            const isOwner = member.user_id === workspace.owner_id;
            const isSelf = member.user_id === user?.id;
            return (
              <li
                key={member.user_id}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate" title={member.user_id}>
                  {isSelf && user
                    ? user.email
                    : `${member.user_id.slice(0, 8)}…`}
                  {isSelf ? (
                    <span className="text-muted-foreground"> (you)</span>
                  ) : null}
                </span>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <Badge variant="secondary">owner</Badge>
                  ) : (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(v) =>
                          handleRoleChange(member.user_id, v as WorkspaceRole)
                        }
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleRemove(member.user_id)}
                        aria-label="Remove member"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <form
          onSubmit={handleInvite}
          className="flex flex-col gap-2 border-t pt-4"
        >
          <div className="flex gap-2">
            <Input
              type="email"
              required
              placeholder="teammate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select
              value={role}
              onValueChange={(v) => setRole(v as WorkspaceRole)}
            >
              <SelectTrigger className="w-28 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button
            type="submit"
            disabled={isSubmitting || email.trim().length === 0}
          >
            {isSubmitting ? "Inviting..." : "Invite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
