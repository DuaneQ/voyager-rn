# messages Specification

## Purpose
TBD - created by archiving change add-connection-chat. Update Purpose after archive.
## Requirements
### Requirement: Messages API

The server SHALL deduplicate messages that share the same `clientMessageId` for a given `connectionId`. Clients MUST include `clientMessageId` when performing optimistic sends that may be retried.

#### Scenario: Optimistic placeholder and finalization
Given a client inserts a placeholder message with `clientMessageId` and `pending=true`
When the media upload completes
Then the message is updated with `imageUrl` and `pending=false` and viewers see the final media

