import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Loader2 } from 'lucide-react';
import { useBundles } from '@/lib/queries';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/workspace')({
  component: Workspace,
});

interface PanelState {
  [key: string]: boolean; // bundleName:panelName -> isCollapsed
}

function Workspace() {
  const { data, isLoading, error } = useBundles();
  const [panelStates, setPanelStates] = useState<PanelState>({});

  const bundles = data?.bundles || [];

  const togglePanel = (bundleName: string, panelName: string) => {
    const key = `${bundleName}:${panelName}`;
    setPanelStates((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isPanelCollapsed = (bundleName: string, panelName: string): boolean => {
    const key = `${bundleName}:${panelName}`;
    return panelStates[key] || false;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load bundles</p>
          <p className="text-sm text-muted-foreground">Check server connection</p>
        </div>
      </div>
    );
  }

  // Collect all panels from all bundles
  const allPanels = bundles.flatMap((bundle) =>
    bundle.dashboardPanels.map((panel) => ({
      bundle,
      panel,
    }))
  );

  if (allPanels.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">No dashboard panels available</p>
          <p className="text-sm text-muted-foreground">Load a bundle with panels to get started</p>
        </div>
      </div>
    );
  }

  // Separate fullbleed panels from regular panels
  const fullbleedPanels = allPanels.filter(({ panel }) => panel.fullbleed);
  const regularPanels = allPanels.filter(({ panel }) => !panel.fullbleed);

  return (
    <div className="bg-background">
      {/* Fullbleed panels take full viewport */}
      {fullbleedPanels.map(({ bundle, panel }) => {
        const isCollapsed = isPanelCollapsed(bundle.name, panel.name);
        const panelKey = `${bundle.name}:${panel.name}`;

        return (
          <div key={panelKey} className="h-screen">
            <DashboardPanel
              bundle={bundle}
              panel={panel}
              isCollapsed={isCollapsed}
              onToggleCollapse={() => togglePanel(bundle.name, panel.name)}
            />
          </div>
        );
      })}

      {/* Regular panels in flexbox grid */}
      {regularPanels.length > 0 && (
        <div className="p-4 flex flex-wrap gap-4 items-start content-start min-h-screen">
          {regularPanels.map(({ bundle, panel }) => {
            const isCollapsed = isPanelCollapsed(bundle.name, panel.name);
            const panelKey = `${bundle.name}:${panel.name}`;

            return (
              <DashboardPanel
                key={panelKey}
                bundle={bundle}
                panel={panel}
                isCollapsed={isCollapsed}
                onToggleCollapse={() => togglePanel(bundle.name, panel.name)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface DashboardPanelProps {
  bundle: any;
  panel: any;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function DashboardPanel({ bundle, panel, isCollapsed, onToggleCollapse }: DashboardPanelProps) {
  const width = panel.width || 2;
  const fullbleed = panel.fullbleed || false;

  // Calculate pixel width based on NodeCG's formula: 128 + (width - 1) * 144
  const pixelWidth = 128 + (width - 1) * 144;

  return (
    <div
      className={cn(
        'bg-card rounded-lg shadow-md overflow-hidden transition-all',
        fullbleed ? 'w-full h-full' : ''
      )}
      style={
        !fullbleed
          ? {
              width: `${pixelWidth}px`,
              minWidth: `${pixelWidth}px`,
            }
          : undefined
      }
    >
      {/* Panel Header */}
      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium truncate">{panel.title || panel.name}</h3>
        <div className="flex items-center gap-1">
          {/* Standalone button */}
          <button
            className="p-1 hover:bg-primary-foreground/10 rounded transition-colors"
            onClick={() => {
              const url = `http://localhost:3000${panel.url}?standalone=true`;
              window.open(url, `${bundle.name}-${panel.name}`, 'width=800,height=600');
            }}
            title="Open in new window"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {/* Collapse button */}
          {!fullbleed && (
            <button
              className="p-1 hover:bg-primary-foreground/10 rounded transition-colors"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand' : 'Collapse'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Panel Body */}
      {!isCollapsed && (
        <div className={cn('bg-muted', fullbleed ? 'h-full' : '')}>
          <iframe
            src={`http://localhost:3000${panel.url}`}
            className={cn('w-full border-0', fullbleed ? 'h-full' : 'min-h-[200px]')}
            title={panel.title || panel.name}
            style={
              fullbleed
                ? {
                    width: '100%',
                    height: '100%',
                  }
                : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
