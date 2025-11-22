/* eslint-disable no-undef */
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Radio, Copy, Edit, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useReplicants, useDeleteReplicant, useUpdateReplicant } from '@/lib/queries';

export const Route = createFileRoute('/replicants')({
  component: Replicants,
});

function Replicants() {
  const { data, isLoading, error, refetch } = useReplicants();
  const deleteMutation = useDeleteReplicant();
  const updateMutation = useUpdateReplicant();

  const replicants = data?.replicants || [];

  // Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReplicant, setEditingReplicant] = useState<{
    namespace: string;
    name: string;
    value: unknown;
  } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [jsonError, setJsonError] = useState('');

  const handleDelete = (namespace: string, name: string) => {
    if (confirm(`Delete replicant ${namespace}:${name}?`)) {
      deleteMutation.mutate({ namespace, name });
    }
  };

  const handleCopy = (value: unknown) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const openEditModal = (namespace: string, name: string, currentValue: unknown) => {
    setEditingReplicant({ namespace, name, value: currentValue });
    const valueStr =
      typeof currentValue === 'string' ? currentValue : JSON.stringify(currentValue, null, 2);
    setEditValue(valueStr);
    setJsonError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReplicant) return;

    try {
      // Try to parse as JSON if it looks like JSON
      const newValue =
        editValue.trim().startsWith('{') ||
        editValue.trim().startsWith('[') ||
        editValue.trim().startsWith('"')
          ? JSON.parse(editValue)
          : editValue;

      updateMutation.mutate(
        {
          namespace: editingReplicant.namespace,
          name: editingReplicant.name,
          value: newValue,
        },
        {
          onSuccess: () => {
            setIsEditModalOpen(false);
            setEditingReplicant(null);
            setEditValue('');
            setJsonError('');
          },
        }
      );
    } catch {
      setJsonError('Invalid JSON format. Please check your syntax.');
    }
  };

  const formatValue = (value: unknown): string => {
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Replicants</h1>
            <p className="text-muted-foreground">
              View and manage synchronized state across your NodeCG instance
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Replicants</h1>
            <p className="text-muted-foreground">
              View and manage synchronized state across your NodeCG instance
            </p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load replicants</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Replicants</h1>
          <p className="text-muted-foreground">
            View and manage synchronized state across your NodeCG instance
          </p>
        </div>
        <Button onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {replicants.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No replicants found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Replicants will appear here when your bundles create them.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {replicants.map((replicant) => (
            <Card key={`${replicant.namespace}:${replicant.name}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary" />
                      <CardTitle className="text-lg">
                        {replicant.namespace}:{replicant.name}
                      </CardTitle>
                      <Badge variant="secondary">v{replicant.revision}</Badge>
                    </div>
                    <CardDescription>
                      Last updated {formatDate(replicant.updatedAt)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Copy value"
                      onClick={() => handleCopy(replicant.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Edit value"
                      onClick={() =>
                        openEditModal(replicant.namespace, replicant.name, replicant.value)
                      }
                      disabled={updateMutation.isPending}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Delete replicant"
                      onClick={() => handleDelete(replicant.namespace, replicant.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-4">
                  <pre className="text-sm overflow-x-auto">
                    <code>{formatValue(replicant.value)}</code>
                  </pre>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>About Replicants</CardTitle>
          <CardDescription>Understanding replicants in NodeCG Next</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2 p-3 border rounded-lg">
            <Radio className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">What are replicants?</p>
              <p className="text-sm text-muted-foreground">
                Replicants are synchronized variables that automatically sync between the server,
                dashboard, and graphics in real-time.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 border rounded-lg">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Real-time synchronization</p>
              <p className="text-sm text-muted-foreground">
                Changes to replicants are instantly propagated to all connected clients via
                WebSockets, ensuring consistent state across your broadcast.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Replicant Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>
                Edit Replicant:{' '}
                {editingReplicant && `${editingReplicant.namespace}:${editingReplicant.name}`}
              </DialogTitle>
              <DialogDescription>
                Modify the replicant value. For objects/arrays, use valid JSON format.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="replicant-value">Value</Label>
                <Textarea
                  id="replicant-value"
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setJsonError('');
                  }}
                  rows={15}
                  className="font-mono text-sm"
                  placeholder='Enter value or JSON: {"key": "value"}'
                />
                {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
