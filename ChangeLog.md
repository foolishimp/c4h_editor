# ChangeLog

## 2023-05-22

### Fixed

* Updated the application header to be "Visual Prompt Studio, C4H Editor" with "Visual Prompt Studio" as the main title and "C4H Editor" as a subtitle.
* Investigated and improved the handling of configuration description fields in the UI and API.
* The issue was that the backend returns the description as `title` in the list API but expects it in `metadata.description` when creating or updating a configuration. The frontend now correctly handles both cases.