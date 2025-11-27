```markdown

## ADDED Requirements

### Requirement: Messages API

The server SHALL deduplicate messages that share the same `clientMessageId` for a given `connectionId`. Clients MUST include `clientMessageId` when performing optimistic sends that may be retried.

#### Scenario: Optimistic placeholder and finalization
Given a client inserts a placeholder message with `clientMessageId` and `pending=true`
When the media upload completes
Then the message is updated with `imageUrl` and `pending=false` and viewers see the final media


``` 
## ADDED Requirements

### Requirement: Messages API

The server SHALL deduplicate messages that share the same `clientMessageId` for a given `connectionId`. Clients MUST include `clientMessageId` when performing optimistic sends that may be retried.

#### Scenario: Optimistic placeholder and finalization
Given a client inserts a placeholder message with `clientMessageId` and `pending=true`
When the media upload completes
Then the message is updated with `imageUrl` and `pending=false` and viewers see the final media
## ADDED Requirements

### Requirement: Messages API

Clients MUST include `clientMessageId` for optimistic messages when retries are possible. The server
SHALL deduplicate messages that share the same `clientMessageId` for a given `connectionId`.

Details
-------
Define message schema and operations for posting and listing messages. Include `clientMessageId` for
idempotency and `pending`/`imageUrl` semantics for optimistic uploads.

Schema: Message
---------------
- id: string
- clientMessageId?: string
- connectionId: string
- sender: string
- text?: string
- imageUrl?: string
- pending?: boolean
- createdAt: string (date-time)
## ADDED Requirements

### Requirement: Messages API

The server SHALL deduplicate messages that share the same `clientMessageId` for a given `connectionId`. Clients MUST include `clientMessageId` when performing optimistic sends that may be retried.

#### Scenario: Optimistic placeholder and finalization
Given a client inserts a placeholder message with `clientMessageId` and `pending=true`
When the media upload completes
Then the message is updated with `imageUrl` and `pending=false` and viewers see the final media

