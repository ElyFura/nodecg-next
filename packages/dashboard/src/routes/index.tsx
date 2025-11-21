import { createFileRoute } from '@tanstack/react-router';
import { Package, Radio, Users, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const stats = [
    {
      title: 'Bundles',
      value: '0',
      description: 'Loaded bundles',
      icon: Package,
    },
    {
      title: 'Replicants',
      value: '0',
      description: 'Active replicants',
      icon: Radio,
    },
    {
      title: 'Users',
      value: '0',
      description: 'Registered users',
      icon: Users,
    },
    {
      title: 'Status',
      value: 'Online',
      description: 'Server status',
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to NodeCG Next</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
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
              <p className="text-sm text-muted-foreground">
                View and edit replicants in real-time
              </p>
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
