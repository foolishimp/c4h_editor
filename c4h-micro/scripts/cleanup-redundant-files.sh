#!/bin/bash
# File: scripts/cleanup-redundant-files.sh

# Duplicate components
rm -f packages/config-editor/src/common/TimeAgo.tsx
rm -f packages/shell/src/components/common/TimeAgo.tsx
rm -f packages/job-management/src/components/TimeAgo.tsx
rm -f packages/config-selector/src/components/TimeAgo.tsx
rm -f packages/config-editor/src/common/DiffViewer.tsx

# Duplicate utilities
rm -f packages/shell/src/utils/RemoteComponent.tsx
rm -f packages/config-selector/src/utils/RemoteComponent.tsx

# API files
rm -f packages/config-editor/src/config/api.ts
rm -f packages/shell/src/config/api.ts

# Legacy hooks
rm -f packages/config-editor/src/hooks/useJobApi.ts
rm -f packages/config-editor/src/hooks/useWorkOrderApi.ts
rm -f packages/config-editor/src/hooks/useConfigSection.ts
rm -f packages/shell/src/hooks/useJobApi.ts
rm -f packages/shell/src/hooks/useWorkOrderApi.ts

# Legacy components
rm -f packages/shell/src/components/WorkOrderList/WorkOrderList.tsx
rm -f packages/shell/src/components/JobsList/JobsList.tsx
rm -f packages/shell/src/components/JobDetails/JobDetails.tsx
rm -f packages/shell/src/components/common/ConfigTypeSidebar.tsx
rm -f packages/shell/src/utils/eventListener.ts

echo "Cleanup complete."