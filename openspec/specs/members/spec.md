# members Specification

## Purpose
TBD - created by archiving change add-connection-chat. Update Purpose after archive.
## Requirements
### Requirement: Members API (add/remove)

The server SHALL enforce that only the user who added another member MAY remove them from a connection. Clients MUST authenticate requests that alter membership.

#### Scenario: Add and remove member with permission
Given user A adds user C to a connection
When user A requests removal of user C
Then the removal succeeds; when any other user attempts the same removal the request is rejected

