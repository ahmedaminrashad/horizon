# NodeAgent API Documentation

This document provides detailed information about the NodeAgent API endpoints.

## Table of Contents

1. [Add Clinic Short Number](#add-clinic-short-number)
2. [UploadIVRAudio](#uploadivraudio)
3. [GetAgentCall](#getagentcall)
4. [CreateAgent](#createagent)
5. [CreateCustomer](#createcustomer)
6. [GetQueueAgents](#getqueueagents)
7. [ChangeAgentPassword](#changeagentpassword)
8. [ChangeCustomerPassword](#changecustomerpassword)
9. [Add Agent to Clinic](#add-agent-to-clinic)
10. [Remove Agent From Clinic](#remove-agent-from-clinic)
11. [RemoveAgent](#removeagent)
12. [RemoveCustomer](#removecustomer)

---

## Add Clinic Short Number

This endpoint creates a clinic queue with a short number (extension) and manages optional multilingual audio files. It sets up queue configuration and organizes audio files for the clinic's IVR system.

**What this endpoint does:**

- **Creates Queue Configuration**: Sets up a new queue in `clinics_queues.conf` with the extension as the queue identifier. This queue will handle incoming calls and distribute them to available agents.

- **Manages Audio Files**: Optionally accepts up to 16 audio files (8 types × 2 languages) for bilingual support:
  - **Arabic (_ar) and English (_en) versions** of each audio prompt
  - Audio files are automatically organized in language-specific directories
  - Files are saved with standardized names based on their type
  - Supports WAV and GSM audio formats

- **Automatic System Reload**: After successful configuration, automatically reloads:
  - Asterisk queues (`core reload`)

- **Validation and Safety**: 
  - Checks if the queue already exists before creating
  - Creates automatic backups of configuration files before modification
  - Creates necessary directories and files if they don't exist

This endpoint provides a streamlined way to create clinic queues and manage associated audio files, making it easy to provision new clinic short numbers with queue configuration and audio file organization.

### Endpoint
```
POST /api/AddIVRQueue
```

### Content-Type
```
multipart/form-data
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| extension | string | Yes | Numeric extension number for the IVR queue |
| welcome_ar | file | No | Welcome message audio file (Arabic) |
| welcome_en | file | No | Welcome message audio file (English) |
| main_menu_ar | file | No | Main menu audio file (Arabic) |
| main_menu_en | file | No | Main menu audio file (English) |
| invalid_ar | file | No | Invalid option audio file (Arabic) |
| invalid_en | file | No | Invalid option audio file (English) |
| timeout_ar | file | No | Timeout message audio file (Arabic) |
| timeout_en | file | No | Timeout message audio file (English) |
| please_select_ar | file | No | Please select option audio file (Arabic) |
| please_select_en | file | No | Please select option audio file (English) |
| services_ar | file | No | Services audio file (Arabic) |
| services_en | file | No | Services audio file (English) |
| opening_hours_ar | file | No | Opening hours audio file (Arabic) |
| opening_hours_en | file | No | Opening hours audio file (English) |
| goodbye_ar | file | No | Goodbye message audio file (Arabic) |
| goodbye_en | file | No | Goodbye message audio file (English) |

**Note:** All audio files are optional. Supported formats: WAV or GSM. Audio files can be uploaded individually using `/api/UploadIVRAudio` endpoint.

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "IVR queue {extension} added successfully, queues reloaded"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Extension is required and must be numeric, or file upload error |
| 1 | Queue already exists |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/AddIVRQueue \
  -F "extension=1001" \
  -F "welcome_ar=@welcome_ar.wav" \
  -F "welcome_en=@welcome_en.wav" \
  -F "main_menu_ar=@main_menu_ar.wav"
```

### Notes
- Creates queue configuration in `clinics_queues.conf`
- Automatically reloads queues after creation
- Audio files are saved in language-specific directories
- Does not create or modify dialplan configuration

---

## UploadIVRAudio

Uploads an individual IVR audio file for a specific Clinic.

### Endpoint
```
POST /api/UploadIVRAudio
```

### Content-Type
```
multipart/form-data
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| extension | string | Yes | Numeric extension number |
| fileType | string | Yes | Type of audio file (see valid types below) |
| file | file | Yes | Audio file (WAV or GSM format) |

### Valid fileType Values

- `welcome_ar`, `welcome_en`
- `main_menu_ar`, `main_menu_en`
- `invalid_ar`, `invalid_en`
- `timeout_ar`, `timeout_en`
- `please_select_ar`, `please_select_en`
- `services_ar`, `services_en`
- `opening_hours_ar`, `opening_hours_en`
- `goodbye_ar`, `goodbye_en`

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "Audio file {fileType} uploaded successfully for extension {extension}"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Extension is required and must be numeric, fileType is required, invalid fileType, or file is required |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/UploadIVRAudio \
  -F "extension=1001" \
  -F "fileType=welcome_ar" \
  -F "file=@welcome_ar.wav"
```

### Notes
- Files are automatically saved with appropriate names based on fileType
- Files are organized in language-specific directories (ar/en)
- Supports WAV and GSM audio formats

---

## GetAgentCall

Retrieves information about the current active call for a specific agent.

### Endpoint
```
POST /api/GetAgentCall
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "agentnumber": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| agentnumber | string | Yes | Agent number/extension |

### Response

**Success Response (No Active Call):**
```json
{
  "success": true,
  "errorcode": 0,
  "result": {
    "hasCall": false,
    "message": "No active call found for agent"
  },
  "message": "No active call"
}
```

**Success Response (Active Call):**
```json
{
  "success": true,
  "errorcode": 0,
  "result": {
    "hasCall": true,
    "channelId": "string",
    "callerID": "string",
    "calledNumber": "string",
    "duration": "string",
    "elapsedTime": "string",
    "application": "string",
    "context": "string",
    "extension": "string",
    "priority": "string",
    "accountCode": "string",
    "state": "string"
  },
  "message": "Call information retrieved"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Agent number is required |
| 500 | Failed to get channels via AMI (with troubleshooting information) |

### Example Request
```bash
curl -X POST http://localhost:3000/api/GetAgentCall \
  -H "Content-Type: application/json" \
  -d '{"agentnumber": "1001"}'
```

### Notes
- Uses AMI (Asterisk Manager Interface) to retrieve channel information
- Returns detailed call information including caller ID, duration, and channel state
- Provides troubleshooting information if AMI connection fails

---

## CreateAgent

Creates a new PJSIP agent account (Linphone UDP configuration).

### Endpoint
```
POST /api/CreateAgent
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "username": "string",
  "password": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Agent username/extension |
| password | string | Yes | Agent password |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "PJSIP agent {username} created successfully"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Username or password is required |
| 1 | PJSIP agent already exists |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/CreateAgent \
  -H "Content-Type: application/json" \
  -d '{"username": "1001", "password": "secret123"}'
```

### Notes
- Creates PJSIP endpoint configuration in `pjsip_agents.conf`
- Uses Linphone UDP transport (transport-udp-5790)
- Automatically reloads PJSIP configuration after creation
- Context: `from-internal`
- Codecs: opus, ulaw, alaw
- WebRTC: disabled (not WebRTC)

---

## CreateCustomer

Creates a new PJSIP customer account (Flutter WebRTC configuration).

### Endpoint
```
POST /api/CreateCustomer
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "username": "string",
  "password": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Customer username/extension |
| password | string | Yes | Customer password |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "PJSIP customer {username} created successfully"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Username or password is required |
| 1 | PJSIP customer already exists |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/CreateCustomer \
  -H "Content-Type: application/json" \
  -d '{"username": "2001", "password": "secret123"}'
```

### Notes
- Creates PJSIP endpoint configuration in `pjsip_customers.conf`
- Uses WebSocket transport (transport-ws) for WebRTC
- Automatically reloads PJSIP configuration after creation
- Context: `clinic-ivr`
- Codecs: opus, ulaw, alaw
- WebRTC: enabled with DTLS encryption
- ICE support: enabled

---

## GetQueueAgents

Retrieves all agents (both dynamic and static members) in a specific queue.

### Endpoint
```
POST /api/GetQueueAgents
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "queue": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| queue | string | Yes | Queue name |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": {
    "queue": "string",
    "agents": ["SIP/1001", "PJSIP/1002"],
    "count": 2
  },
  "message": "Found 2 agent(s) in queue {queue}"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Queue name is required |
| 1 | Queue not found or error accessing queue |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/GetQueueAgents \
  -H "Content-Type: application/json" \
  -d '{"queue": "1001"}'
```

### Notes
- Uses Asterisk CLI command `queue show` to retrieve queue members (more reliable than AMI)
- Returns both SIP and PJSIP interfaces
- Includes both dynamic and static queue members
- Parses CLI output to extract interface information (e.g., "SIP/1001", "PJSIP/2002")

---

## ChangeAgentPassword

Changes the password for an existing PJSIP agent account.

### Endpoint
```
POST /api/ChangeAgentPassword
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "username": "string",
  "password": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Agent username/extension |
| password | string | Yes | New password |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "PJSIP agent {username} password changed successfully"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Username or password is required |
| 1 | PJSIP agent not found |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/ChangeAgentPassword \
  -H "Content-Type: application/json" \
  -d '{"username": "1001", "password": "newpassword123"}'
```

### Notes
- Updates password in `pjsip_agents.conf`
- Automatically reloads PJSIP configuration after password change
- Only updates the password, does not modify other agent settings

---

## ChangeCustomerPassword

Changes the password for an existing PJSIP customer account.

### Endpoint
```
POST /api/ChangeCustomerPassword
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "username": "string",
  "password": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Customer username/extension |
| password | string | Yes | New password |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "PJSIP customer {username} password changed successfully"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Username or password is required |
| 1 | PJSIP customer not found |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/ChangeCustomerPassword \
  -H "Content-Type: application/json" \
  -d '{"username": "2001", "password": "newpassword123"}'
```

### Notes
- Updates password in `pjsip_customers.conf`
- Automatically reloads PJSIP configuration after password change
- Only updates the password, does not modify other customer settings

---

## Add Agent to Clinic

This endpoint adds an agent to a clinic queue as a dynamic member, enabling the agent to receive calls from that clinic's queue. The agent will be available to handle incoming calls routed through the clinic's IVR system.

**What this endpoint does:**

- **Queue Validation**: Verifies that the specified queue (clinic short number) exists in the system before attempting to add the agent. Uses Asterisk CLI commands to check queue existence.

- **Agent Interface Detection**: Automatically detects whether the agent uses SIP or PJSIP interface format by checking the agent's account configuration. This ensures the correct interface format is used when adding the agent to the queue.

- **Duplicate Prevention**: Checks if the agent is already a member of the queue using AMI QueueStatus action. Prevents adding the same agent multiple times to avoid configuration conflicts.

- **Dynamic Member Addition**: Adds the agent as a dynamic queue member using AMI QueueAdd action. Dynamic members can be added or removed without modifying static configuration files, providing flexibility in queue management.

- **System Reload**: Automatically executes `core reload` after successfully adding the agent to ensure the changes take effect immediately in the Asterisk system.

- **Real-time Availability**: Once added, the agent becomes immediately available to receive calls from the clinic queue, assuming the agent is logged in and ready to handle calls.

This endpoint is essential for managing clinic staffing, allowing administrators to dynamically assign agents to specific clinic queues based on operational needs, shift schedules, or workload distribution.

### Endpoint
```
POST /api/AddAgentToQueue
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "queue": "string",
  "agentnumber": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| queue | string | Yes | Queue name |
| agentnumber | string | Yes | Agent number/extension |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "Agent {agentnumber} added to queue {queue} successfully as dynamic member"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Queue name or agent number is required |
| 1 | Queue does not exist, or agent is already in queue |
| 2 | Internal server error (failed to add agent to queue) |

### Example Request
```bash
curl -X POST http://localhost:3000/api/AddAgentToQueue \
  -H "Content-Type: application/json" \
  -d '{"queue": "1001", "agentnumber": "1001"}'
```

### Notes
- Uses AMI QueueAdd action to add dynamic member
- Automatically detects SIP or PJSIP interface format
- Executes core reload after adding member
- Checks if agent is already in queue before adding

---

## Remove Agent From Clinic

This endpoint removes an agent from a clinic queue, stopping them from receiving calls from that clinic's queue. The agent will no longer be available to handle incoming calls routed through the clinic's IVR system.

**What this endpoint does:**

- **Queue Validation**: Verifies that the specified queue (clinic short number) exists in the system before attempting to remove the agent. Uses Asterisk CLI commands to check queue existence.

- **Agent Interface Detection**: Automatically detects whether the agent uses SIP or PJSIP interface format by checking the agent's account configuration. This ensures the correct interface format is used when removing the agent from the queue.

- **Membership Verification**: Checks if the agent is actually a member of the queue using AMI QueueStatus action. Prevents errors by verifying the agent exists in the queue before attempting removal.

- **Dynamic Member Removal**: Removes the agent as a dynamic queue member using AMI QueueRemove action. Dynamic members can be removed without modifying static configuration files, providing flexibility in queue management.

- **System Reload**: Automatically executes `core reload` after successfully removing the agent to ensure the changes take effect immediately in the Asterisk system.

- **Immediate Effect**: Once removed, the agent immediately stops receiving calls from the clinic queue. Any calls already in progress will continue, but new calls will not be routed to this agent.

This endpoint is essential for managing clinic staffing, allowing administrators to dynamically remove agents from specific clinic queues when they go off-duty, are reassigned, or when operational needs change. It complements the "Add Agent to Clinic" endpoint for complete queue membership management.

### Endpoint
```
POST /api/RemoveAgentFromQueue
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "queue": "string",
  "agentnumber": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| queue | string | Yes | Queue name |
| agentnumber | string | Yes | Agent number/extension |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "Agent {agentnumber} removed from queue {queue} successfully"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Queue name or agent number is required |
| 1 | Queue does not exist, or agent not found in queue |
| 2 | Internal server error (failed to remove agent from queue) |

### Example Request
```bash
curl -X POST http://localhost:3000/api/RemoveAgentFromQueue \
  -H "Content-Type: application/json" \
  -d '{"queue": "1001", "agentnumber": "1001"}'
```

### Notes
- Uses AMI QueueRemove action to remove dynamic member
- Automatically detects SIP or PJSIP interface format
- Executes core reload after removing member
- Verifies agent exists in queue before removal

---

## RemoveAgent

Removes a PJSIP agent account from the system.

### Endpoint
```
POST /api/RemoveAgent
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "username": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Agent username/extension |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "PJSIP agent {username} removed successfully"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Username is required |
| 1 | PJSIP agent not found |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/RemoveAgent \
  -H "Content-Type: application/json" \
  -d '{"username": "1001"}'
```

### Notes
- Removes agent from `pjsip_agents.conf`
- Removes endpoint, AOR, and auth sections
- Automatically reloads PJSIP configuration after removal

---

## RemoveCustomer

Removes a PJSIP customer account from the system.

### Endpoint
```
POST /api/RemoveCustomer
```

### Content-Type
```
application/json
```

### Request Body

```json
{
  "username": "string"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Customer username/extension |

### Response

**Success Response:**
```json
{
  "success": true,
  "errorcode": 0,
  "result": "",
  "message": "PJSIP customer {username} removed successfully"
}
```

**Error Responses:**

| Error Code | Description |
|------------|-------------|
| 400 | Username is required |
| 1 | PJSIP customer not found |
| 2 | Internal server error |

### Example Request
```bash
curl -X POST http://localhost:3000/api/RemoveCustomer \
  -H "Content-Type: application/json" \
  -d '{"username": "2001"}'
```

### Notes
- Removes customer from `pjsip_customers.conf`
- Removes endpoint, AOR, and auth sections
- Automatically reloads PJSIP configuration after removal

---

## Response Format

All API endpoints follow a consistent response format:

```json
{
  "success": boolean,
  "errorcode": number,
  "result": object|string|array,
  "message": string
}
```

### Response Fields

- **success**: Boolean indicating if the request was successful
- **errorcode**: Numeric error code (0 = success, non-zero = error)
- **result**: Response data (varies by endpoint)
- **message**: Human-readable message describing the result

### Error Codes

- **0**: Success
- **1**: Business logic error (e.g., resource not found, already exists)
- **2**: Internal server error
- **400**: Validation error (missing or invalid parameters)
- **500**: Server error (e.g., AMI connection failure)

---

## Error Codes Reference

| Error Code | Description |
|------------|-------------|
| 0 | Success |
| 1 | Not found / Already exists / Business logic error |
| 2 | Server/System error |
| 400 | Bad request (missing/invalid parameters) |
| 500 | Internal server error |


## Notes

- All endpoints return JSON responses
- File paths are relative to `/etc/asterisk/` unless specified otherwise
- Audio files are stored in `/usr/share/asterisk/sounds/`
- Configuration changes are automatically backed up before modification
- Queue reloads are executed automatically after configuration changes
- WAV files are automatically converted to GSM format and the original WAV files are removed