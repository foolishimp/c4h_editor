# Change Log

## 2023-11-29: Fixed Config Description Display in Job Creator Dropdowns

### Problem Description and Impact

On the Jobs screen, the dropdown selections for the Configs that make up the Job Tuple were not displaying the description properly. This made it difficult for users to identify the correct configurations when creating a job. The descriptions were showing as "No description" even when the configs had descriptions.

### Root Causes Identified

1. The `apiService.getConfigs()` method was making two separate API calls - it fetched the configs once, logged the count, but then made a second API call and returned that result instead of the first response.

2. The `JobCreator` component was not handling all possible locations where the description field might exist in the API response. Unlike the `ConfigList` component (which was working correctly), it didn't check for the `title` field that sometimes contains the description in list responses.

### Files Refactored

1. **`/packages/shared/src/services/apiService.ts`**: Fixed the `getConfigs()` method to return the first API response instead of making a duplicate call.

2. **`/packages/job-management/src/components/JobCreator.tsx`**: Enhanced the description extraction logic to handle all possible field locations where descriptions might be found - checking `metadata.description`, `title`, and `description` fields. Also added proper string trimming to avoid blank spaces.