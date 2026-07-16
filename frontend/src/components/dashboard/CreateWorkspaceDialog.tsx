"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { ApiError } from "@/lib/api";

export function CreateWorkspaceDialog() {
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createWorkspace(name);
      setName("");
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create workspace.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a workspace</DialogTitle>
            <DialogDescription>
              A workspace holds your team&apos;s projects and members.
              You&apos;ll be its admin.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-4">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
            />
          </div>
          {error ? (
            <p className="pb-2 text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting || name.trim().length === 0}
            >
              {isSubmitting ? "Creating..." : "Create workspace"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
