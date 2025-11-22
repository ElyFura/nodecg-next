/* eslint-disable no-undef */
import { createFileRoute } from '@tanstack/react-router';
import { Package, Play, Square, RefreshCw, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useBundles, useReloadBundles } from '@/lib/queries';
import type { Bundle } from '@/lib/api';

export const Route = createFileRoute('/bundles')({
  component: Bundles,
});

function Bundles() {
  const { data, isLoading, error } = useBundles();
  const reloadMutation = useReloadBundles();

  const bundles = data?.bundles || [];

  const handleReload = () => {
    reloadMutation.mutate();
  };

  const handleOpenDashboard = (bundle: Bundle) => {
    if (bundle.dashboardPanels.length === 0) return;

    // Open each panel in a new window
    bundle.dashboardPanels.forEach((panel) => {
      const width = (panel.width || 2) * 300; // Convert grid width to pixels (approx)
      const height = 600;
      const left = window.screenX + 50;
      const top = window.screenY + 50;

      const windowFeatures = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
      const fullUrl = `http://localhost:3000${panel.url}`;

      window.open(fullUrl, `${bundle.name}-${panel.name}`, windowFeatures);
    });
  };

  const handleOpenGraphics = (bundle: Bundle) => {
    if (bundle.graphics.length === 0) return;

    // Open each graphic in a new window
    bundle.graphics.forEach((graphic, index) => {
      const width = graphic.width || 1920;
      const height = graphic.height || 1080;
      const left = window.screenX + index * 50;
      const top = window.screenY + index * 50;

      const windowFeatures = `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`;
      const fullUrl = `http://localhost:3000${graphic.url}`;

      window.open(fullUrl, `${bundle.name}-graphic-${index}`, windowFeatures);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bundles</h1>
            <p className="text-muted-foreground">Manage your NodeCG bundles</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Bundles</h1>
            <p className="text-muted-foreground">Manage your NodeCG bundles</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load bundles</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bundles</h1>
          <p className="text-muted-foreground">Manage your NodeCG bundles</p>
        </div>
        <Button onClick={handleReload} disabled={reloadMutation.isPending}>
          <RefreshCw className={`mr-2 h-4 w-4 ${reloadMutation.isPending ? 'animate-spin' : ''}`} />
          Reload Bundles
        </Button>
      </div>

      {bundles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bundles found</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Place bundles in your bundles directory and reload to get started.
            </p>
            <Button onClick={handleReload} disabled={reloadMutation.isPending}>
              <RefreshCw
                className={`mr-2 h-4 w-4 ${reloadMutation.isPending ? 'animate-spin' : ''}`}
              />
              Reload Bundles
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((bundle) => (
            <Card key={bundle.name} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{bundle.name}</CardTitle>
                  </div>
                  <Badge variant="default">Loaded</Badge>
                </div>
                <CardDescription>{bundle.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">{bundle.version}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Author</span>
                  <span className="font-medium">{bundle.author}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Panels</span>
                  <span className="font-medium">{bundle.panelCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Graphics</span>
                  <span className="font-medium">{bundle.graphicCount}</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={bundle.panelCount === 0}
                    onClick={() => handleOpenDashboard(bundle)}
                    title={
                      bundle.panelCount === 0
                        ? 'No dashboard panels available'
                        : bundle.dashboardPanels.map((p) => p.title).join(', ')
                    }
                  >
                    <Play className="mr-2 h-3 w-3" />
                    Dashboard
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={bundle.graphicCount === 0}
                    onClick={() => handleOpenGraphics(bundle)}
                    title={
                      bundle.graphicCount === 0
                        ? 'No graphics available'
                        : `${bundle.graphicCount} graphic(s): ${bundle.graphics.map((g) => g.file).join(', ')}`
                    }
                  >
                    <Square className="mr-2 h-3 w-3" />
                    Graphics
                  </Button>
                  <Button size="sm" variant="ghost" disabled title="Bundle settings (coming soon)">
                    <SettingsIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Bundle Information</CardTitle>
          <CardDescription>Learn more about NodeCG bundles</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2 p-3 border rounded-lg">
            <Package className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">What are bundles?</p>
              <p className="text-sm text-muted-foreground">
                Bundles are self-contained packages that extend NodeCG with graphics, dashboard
                panels, and server-side extensions.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 border rounded-lg">
            <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">How to add bundles?</p>
              <p className="text-sm text-muted-foreground">
                Place your bundle directory in the bundles folder and click "Reload Bundles" to load
                it.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
