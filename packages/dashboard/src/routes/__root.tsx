import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { DashboardLayout } from '@/components/layout/dashboard-layout';

export const Route = createRootRoute({
  component: () => (
    <DashboardLayout>
      <Outlet />
      {process.env.NODE_ENV === 'development' && <TanStackRouterDevtools />}
    </DashboardLayout>
  ),
});
