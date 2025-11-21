import { createFileRoute } from '@tanstack/react-router';
import { Server, Database, Lock, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Route = createFileRoute('/settings')({
  component: Settings,
});

function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your NodeCG Next instance</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Server Configuration</CardTitle>
              <CardDescription>Core server settings and runtime configuration</CardDescription>
            </div>
            <Server className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Port</p>
              <p className="text-sm text-muted-foreground">HTTP server port</p>
            </div>
            <Badge variant="secondary">3000</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Host</p>
              <p className="text-sm text-muted-foreground">Bind address</p>
            </div>
            <Badge variant="secondary">0.0.0.0</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Environment</p>
              <p className="text-sm text-muted-foreground">Current runtime mode</p>
            </div>
            <Badge>Development</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Database</CardTitle>
              <CardDescription>Database connection and storage settings</CardDescription>
            </div>
            <Database className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Database Type</p>
              <p className="text-sm text-muted-foreground">Storage engine</p>
            </div>
            <Badge variant="secondary">SQLite</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Database Location</p>
              <p className="text-sm text-muted-foreground">Database file path</p>
            </div>
            <code className="text-xs bg-muted px-2 py-1 rounded">/db/node.db</code>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Connection Status</p>
              <p className="text-sm text-muted-foreground">Current connection state</p>
            </div>
            <Badge>Connected</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>Authentication and authorization settings</CardDescription>
            </div>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">OAuth Providers</p>
              <p className="text-sm text-muted-foreground">Connected authentication providers</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">Twitch</Badge>
              <Badge variant="secondary">Discord</Badge>
              <Badge variant="secondary">GitHub</Badge>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Session Timeout</p>
              <p className="text-sm text-muted-foreground">JWT token expiry</p>
            </div>
            <Badge variant="secondary">7 days</Badge>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Audit Logging</p>
              <p className="text-sm text-muted-foreground">Security event tracking</p>
            </div>
            <Badge>Enabled</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Alert and notification preferences</CardDescription>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Bundle Load Errors</p>
              <p className="text-sm text-muted-foreground">Notify when bundles fail to load</p>
            </div>
            <Button size="sm" variant="outline">
              Enabled
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">Replicant Errors</p>
              <p className="text-sm text-muted-foreground">Notify on replicant validation errors</p>
            </div>
            <Button size="sm" variant="outline">
              Enabled
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">System Updates</p>
              <p className="text-sm text-muted-foreground">Notify about available updates</p>
            </div>
            <Button size="sm" variant="outline">
              Enabled
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Reset to Defaults</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
