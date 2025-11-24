import { createFileRoute } from '@tanstack/react-router';
import { Package, Radio, Users, Activity, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStats } from '@/lib/queries';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading, error } = useStats();

  const statsCards = [
    {
      title: 'Bundles',
      value: stats?.bundles.toString() || '0',
      description: 'Loaded bundles',
      icon: Package,
    },
    {
      title: 'Replicants',
      value: stats?.replicants.toString() || '0',
      description: 'Active replicants',
      icon: Radio,
    },
    {
      title: 'Users',
      value: stats?.users.toString() || '0',
      description: 'Registered users',
      icon: Users,
    },
    {
      title: 'Status',
      value: stats?.status === 'online' ? 'Online' : 'Offline',
      description: 'Server status',
      icon: Activity,
    },
  ];

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to NodeCG Next</p>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Activity className="h-5 w-5" />
              <p className="font-medium">Failed to connect to server</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Make sure the NodeCG server is running on port 3000
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to NodeCG Next</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
          <CardDescription>Quick actions to get you started with NodeCG Next</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Load a Bundle</p>
              <p className="text-sm text-muted-foreground">
                Add bundles to your bundles directory and reload
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Radio className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Inspect Replicants</p>
              <p className="text-sm text-muted-foreground">View and edit replicants in real-time</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 border rounded-lg">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-muted-foreground">Add users and configure permissions</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
