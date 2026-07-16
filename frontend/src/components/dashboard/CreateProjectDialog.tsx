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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import { ApiError } from "@/lib/api";
import type { TemplateName } from "@/types";

const TEMPLATES: { value: TemplateName; label: string; description: string }[] =
  [
    {
      value: "blank",
      label: "Blank",
      description: "An empty project — just a README.",
    },
    {
      value: "node",
      label: "Node.js",
      description: "package.json + index.js.",
    },
    {
      value: "next",
      label: "Next.js",
      description: "Minimal App Router skeleton.",
    },
    {
      value: "python",
      label: "Python",
      description: "main.py + requirements.txt.",
    },
    {
      value: "fastapi",
      label: "FastAPI",
      description: "A minimal FastAPI app.",
    },
  ];

export function CreateProjectDialog({ workspaceId }: { workspaceId: string }) {
  const createProject = useWorkspaceStore((s) => s.createProject);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<TemplateName>("blank");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await createProject(workspaceId, {
        name,
        description: description || null,
        template,
      });
      setName("");
      setDescription("");
      setTemplate("blank");
      setOpen(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to create project.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a project</DialogTitle>
            <DialogDescription>
              Pick a template to start from.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My project"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-description">
                Description (optional)
              </Label>
              <Input
                id="project-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-template">Template</Label>
              <Select
                value={template}
                onValueChange={(v) => setTemplate(v as TemplateName)}
              >
                <SelectTrigger id="project-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label} — {t.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {error ? (
            <p className="pb-2 text-sm text-destructive">{error}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting || name.trim().length === 0}
            >
              {isSubmitting ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
