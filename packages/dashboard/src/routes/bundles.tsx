import { createFileRoute } from '@tanstack/react-router';
import { Package, Play, Square, RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/bundles')({
  component: Bundles,
});

interface Bundle {
  name: string;
  version: string;
  description: string;
  status: 'loaded' | 'error' | 'disabled';
  author: string;
}

function Bundles() {
  // Mock data - will be replaced with API calls
  const bundles: Bundle[] = [
    {
      name: 'example-bundle',
      version: '1.0.0',
      description: 'Example bundle demonstrating NodeCG Next features',
      status: 'loaded',
      author: 'NodeCG Team',
    },
  ];

  const getStatusColor = (status: Bundle['status']) => {
    switch (status) {
      case 'loaded':
        return 'default';
      case 'error':
        return 'destructive';
      case 'disabled':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: Bundle['status']) => {
    switch (status) {
      case 'loaded':
        return 'Loaded';
      case 'error':
        return 'Error';
      case 'disabled':
        return 'Disabled';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bundles</h1>
          <p className="text-muted-foreground">Manage your NodeCG bundles</p>
        </div>
        <Button>
          <RefreshCw className="mr-2 h-4 w-4" />
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
            <Button>
              <RefreshCw className="mr-2 h-4 w-4" />
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
                  <Badge variant={getStatusColor(bundle.status)}>
                    {getStatusText(bundle.status)}
                  </Badge>
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
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Play className="mr-2 h-3 w-3" />
                    Dashboard
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1">
                    <Square className="mr-2 h-3 w-3" />
                    Graphics
                  </Button>
                  <Button size="sm" variant="ghost">
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
