/* eslint-disable no-undef */
import { createFileRoute } from '@tanstack/react-router';
import {
  Users as UsersIcon,
  UserPlus,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useUsers, useDeleteUser } from '@/lib/queries';

export const Route = createFileRoute('/users')({
  component: Users,
});

function Users() {
  const { data, isLoading, error } = useUsers();
  const deleteMutation = useDeleteUser();

  const users = data?.users || [];

  const handleDelete = (id: string, username: string) => {
    if (confirm(`Delete user ${username}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case 'admin':
        return 'default';
      case 'operator':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage user accounts and permissions</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">Manage user accounts and permissions</p>
          </div>
        </div>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load users</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage user accounts and permissions</p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? 's' : ''} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UsersIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No users found</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Get started by creating your first user account.
              </p>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      {user.email || <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role?.name || 'viewer')}>
                        <Shield className="mr-1 h-3 w-3" />
                        {user.role?.name || 'viewer'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" title="Edit user">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete user"
                          onClick={() => handleDelete(user.id, user.username)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button size="sm" variant="ghost" title="More options">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Admin</CardTitle>
            <CardDescription>Full system access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role?.name === 'admin').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Can manage all users, bundles, and settings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Operator</CardTitle>
            <CardDescription>Content management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role?.name === 'operator').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Can manage replicants and assets</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Viewer</CardTitle>
            <CardDescription>Read-only access</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role?.name === 'viewer').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Can view dashboard and graphics</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
