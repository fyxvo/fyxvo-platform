"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Notice } from "@fyxvo/ui";
import {
  createPlaygroundRecipe,
  deletePlaygroundRecipe,
  getSharedPlaygroundRecipe,
  listPlaygroundRecipes,
  updatePlaygroundRecipe,
} from "../lib/api";
import { formatRelativeDate } from "../lib/format";
import type { PlaygroundRecipe } from "../lib/types";

export function PlaygroundRecipesPanel({
  projectId,
  token,
  currentRecipe,
  onLoadRecipe,
}: {
  readonly projectId: string | null;
  readonly token: string | null;
  readonly currentRecipe: {
    readonly method: string;
    readonly mode: "standard" | "priority";
    readonly simulationEnabled: boolean;
    readonly params: Record<string, string>;
  };
  readonly onLoadRecipe: (recipe: PlaygroundRecipe) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [recipes, setRecipes] = useState<PlaygroundRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("debugging");
  const [sharedRecipeError, setSharedRecipeError] = useState<string | null>(null);
  const autoLoadedRecipeId = useRef<string | null>(null);
  const selectedRecipeId = searchParams.get("recipe");
  const sharedRecipeToken = searchParams.get("sharedRecipe");

  useEffect(() => {
    if (!projectId || !token) {
      setRecipes([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listPlaygroundRecipes(projectId, token)
      .then((items) => {
        if (!cancelled) {
          setRecipes(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRecipes([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, token]);

  useEffect(() => {
    if (!selectedRecipeId || selectedRecipeId === autoLoadedRecipeId.current) {
      return;
    }
    const match = recipes.find((recipe) => recipe.id === selectedRecipeId);
    if (!match) {
      return;
    }
    autoLoadedRecipeId.current = match.id;
    onLoadRecipe(match);
  }, [onLoadRecipe, recipes, selectedRecipeId]);

  const setRecipeQuery = useCallback((recipeId: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (recipeId) {
      params.set("recipe", recipeId);
    } else {
      params.delete("recipe");
    }
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!sharedRecipeToken || !token) return;
    let cancelled = false;
    setSharedRecipeError(null);
    getSharedPlaygroundRecipe(sharedRecipeToken, token)
      .then((response) => {
        if (cancelled) return;
        onLoadRecipe(response.item);
        autoLoadedRecipeId.current = response.item.id;
        setRecipeQuery(response.item.id);
      })
      .catch((error) => {
        if (cancelled) return;
        setSharedRecipeError(error instanceof Error ? error.message : "This shared recipe could not be opened.");
      });
    return () => {
      cancelled = true;
    };
  }, [onLoadRecipe, setRecipeQuery, sharedRecipeToken, token]);

  async function refreshRecipes(selectedId?: string | null) {
    if (!projectId || !token) return;
    const items = await listPlaygroundRecipes(projectId, token);
    setRecipes(items);
    if (selectedId) {
      const match = items.find((item) => item.id === selectedId);
      if (match) {
        onLoadRecipe(match);
        setRecipeQuery(match.id);
      }
    }
  }

  async function handleSave() {
    if (!projectId || !token || !name.trim()) return;
    setSaving(true);
    try {
      const response = await createPlaygroundRecipe(
        projectId,
        {
          name: name.trim(),
          method: currentRecipe.method,
          mode: currentRecipe.mode,
          simulationEnabled: currentRecipe.simulationEnabled,
          params: currentRecipe.params,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(tags.trim() ? { tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean) } : {}),
        },
        token
      );
      setName("");
      setNotes("");
      setTags("debugging");
      await refreshRecipes(response.item.id);
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(recipe: PlaygroundRecipe) {
    if (!projectId || !token) return;
    const nextName = window.prompt("Rename recipe", recipe.name);
    if (!nextName || nextName.trim() === recipe.name) return;
    await updatePlaygroundRecipe(projectId, recipe.id, { name: nextName.trim() }, token);
    await refreshRecipes(recipe.id);
  }

  async function handleClone(recipe: PlaygroundRecipe) {
    if (!projectId || !token) return;
    const nextName = window.prompt("Name for the cloned recipe", `${recipe.name} copy`);
    if (!nextName || !nextName.trim()) return;
    const response = await createPlaygroundRecipe(
      projectId,
      {
        name: nextName.trim(),
        method: recipe.method,
        mode: recipe.mode,
        simulationEnabled: recipe.simulationEnabled,
        params: recipe.params,
        ...(recipe.notes ? { notes: recipe.notes } : {}),
        ...(recipe.tags.length > 0 ? { tags: recipe.tags } : {}),
      },
      token
    );
    await refreshRecipes(response.item.id);
  }

  async function handleDelete(recipe: PlaygroundRecipe) {
    if (!projectId || !token) return;
    if (!window.confirm(`Delete recipe "${recipe.name}"?`)) return;
    await deletePlaygroundRecipe(projectId, recipe.id, token);
    if (selectedRecipeId === recipe.id) {
      setRecipeQuery(null);
    }
    await refreshRecipes();
  }

  async function handleCopyShareLink(recipe: PlaygroundRecipe) {
    if (!projectId || !token) return;
    const response = recipe.sharedToken
      ? { item: recipe }
      : await updatePlaygroundRecipe(projectId, recipe.id, { share: true }, token);
    const params = new URLSearchParams(searchParams.toString());
    params.set("sharedRecipe", response.item.sharedToken ?? "");
    const nextUrl = `${window.location.origin}${pathname}?${params.toString()}`;
    await navigator.clipboard.writeText(nextUrl);
  }

  async function handlePin(recipe: PlaygroundRecipe) {
    if (!projectId || !token) return;
    await updatePlaygroundRecipe(projectId, recipe.id, { pinned: !recipe.pinned }, token);
    await refreshRecipes(recipe.id);
  }

  async function handleLoad(recipe: PlaygroundRecipe) {
    if (!projectId || !token) return;
    onLoadRecipe(recipe);
    setRecipeQuery(recipe.id);
    await updatePlaygroundRecipe(projectId, recipe.id, { touchLastUsedAt: true }, token);
    await refreshRecipes(recipe.id);
  }

  if (!projectId || !token) {
    return (
      <Card className="fyxvo-surface border-[color:var(--fyxvo-border)]">
        <CardHeader>
          <CardTitle>Saved recipes</CardTitle>
          <CardDescription>Save playground calls once a project session is active.</CardDescription>
        </CardHeader>
        <CardContent>
          <Notice tone="neutral" title="Connect a project session first">
            Saved recipes are project-scoped so your team can reuse the exact same request shapes safely.
          </Notice>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fyxvo-surface border-[color:var(--fyxvo-border)] xl:self-start">
      <CardHeader>
        <CardTitle>Saved recipes</CardTitle>
        <CardDescription>Reusable request presets for the selected project.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sharedRecipeError ? (
          <Notice tone="warning" title="Shared recipe unavailable">
            {sharedRecipeError}
          </Notice>
        ) : null}
        <div className="space-y-3 rounded-[1.25rem] border border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)] p-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Recipe name"
            className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
          />
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional notes"
            rows={3}
            className="w-full resize-none rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
          />
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags: debugging, balance, transactions"
            className="w-full rounded-lg border border-[var(--fyxvo-border)] bg-[var(--fyxvo-bg)] px-3 py-2 text-sm text-[var(--fyxvo-text)]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{currentRecipe.method}</Badge>
            <Badge tone={currentRecipe.mode === "priority" ? "warning" : "neutral"}>{currentRecipe.mode}</Badge>
            {currentRecipe.simulationEnabled ? <Badge tone="warning">simulation</Badge> : null}
          </div>
          <Button onClick={() => void handleSave()} disabled={saving || !name.trim()} className="w-full">
            {saving ? "Saving…" : "Save recipe"}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-xl bg-[var(--fyxvo-panel-soft)]" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <Notice tone="neutral" title="No saved recipes yet">
            Save a request shape from the playground and it will show up here for quick reuse.
          </Notice>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <div
                key={recipe.id}
                className={`rounded-[1.25rem] border p-4 ${
                  selectedRecipeId === recipe.id
                    ? "border-[var(--fyxvo-brand)]/40 bg-[var(--fyxvo-brand-subtle)]"
                    : "border-[var(--fyxvo-border)] bg-[var(--fyxvo-panel-soft)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-[var(--fyxvo-text)]">{recipe.name}</div>
                      {recipe.pinned ? <Badge tone="brand">pinned</Badge> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{recipe.method}</Badge>
                      <Badge tone={recipe.mode === "priority" ? "warning" : "neutral"}>{recipe.mode}</Badge>
                      {recipe.simulationEnabled ? <Badge tone="warning">simulation</Badge> : null}
                      {recipe.tags.map((tag) => <Badge key={tag} tone="neutral">{tag}</Badge>)}
                    </div>
                  </div>
                  <div className="text-right text-xs text-[var(--fyxvo-text-muted)]">
                    <div>{formatRelativeDate(recipe.updatedAt)}</div>
                    {recipe.lastUsedAt ? <div>Used {formatRelativeDate(recipe.lastUsedAt)}</div> : null}
                  </div>
                </div>
                {recipe.notes ? (
                  <p className="mt-3 text-sm leading-6 text-[var(--fyxvo-text-soft)]">{recipe.notes}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void handleLoad(recipe)}
                  >
                    Load recipe
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handlePin(recipe)}>
                    {recipe.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleRename(recipe)}>
                    Rename
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleClone(recipe)}>
                    Clone
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleCopyShareLink(recipe)}>
                    Copy URL
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void handleDelete(recipe)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
