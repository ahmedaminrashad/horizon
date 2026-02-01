# Question Sets Feature

## Overview

The Question Sets feature allows clinic administrators and doctors to assign custom questionnaires to bookings based on various criteria such as doctor, service, specialty, visit type, and branch. This ensures that patients are asked relevant questions during the booking process.

## Features

- **Create and manage question sets** with multiple questions
- **Assign question sets** to:
  - Specific doctors
  - Specific services
  - Specialties (all doctors with that specialty)
  - Visit types (in-clinic, online, home)
  - Branches
- **Priority-based resolution** - automatically selects the most relevant question set when multiple assignments match
- **Question types supported**: text, textarea, select, radio, checkbox, number, date
- **Assignment changes apply to new bookings only** - existing bookings are not affected

## Priority Rules

The system uses a deterministic priority system to select the most relevant question set:

1. **Service-specific** (Priority 5) - Highest priority
2. **Doctor-specific** (Priority 4)
3. **Specialty-specific** (Priority 3)
4. **Visit type-specific** (Priority 2)
5. **Branch-specific** (Priority 1) - Lowest priority

When multiple assignments match a booking, the system selects the one with the highest priority. If multiple assignments have the same priority, the first one (by creation order) is used.

## Database Structure

### Tables

- **question_sets** - Stores question set metadata
- **questions** - Individual questions within a set
- **question_set_assignments** - Links question sets to doctors/services/specialties/visit types/branches

## API Endpoints

All endpoints require authentication and are prefixed with `/clinic/:clinicId/question-sets`.

### Question Sets

#### Create Question Set
```http
POST /clinic/:clinicId/question-sets
```

**Request Body:**
```json
{
  "name": "General Health Questionnaire",
  "description": "Basic health screening questions",
  "is_active": true,
  "questions": [
    {
      "question_text": "Do you have any allergies?",
      "question_type": "text",
      "is_required": true,
      "order": 1
    },
    {
      "question_text": "Are you currently taking any medications?",
      "question_type": "textarea",
      "is_required": false,
      "order": 2
    },
    {
      "question_text": "What is your blood type?",
      "question_type": "select",
      "options": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      "is_required": false,
      "order": 3
    }
  ]
}
```

#### Get All Question Sets
```http
GET /clinic/:clinicId/question-sets?page=1&limit=10
```

#### Get Question Set by ID
```http
GET /clinic/:clinicId/question-sets/:id
```

#### Update Question Set
```http
PATCH /clinic/:clinicId/question-sets/:id
```

#### Delete Question Set
```http
DELETE /clinic/:clinicId/question-sets/:id
```

### Assignments

#### Create Assignment
```http
POST /clinic/:clinicId/question-sets/:id/assignments
```

**Request Body Examples:**

Assign to specific doctor:
```json
{
  "doctor_id": 1
}
```

Assign to specific service:
```json
{
  "service_id": 5
}
```

Assign to specialty:
```json
{
  "specialty": "Cardiology"
}
```

Assign to visit type:
```json
{
  "appoint_type": "in-clinic"
}
```

Assign to branch:
```json
{
  "branch_id": 2
}
```

Combined assignment (service + visit type):
```json
{
  "service_id": 5,
  "appoint_type": "online"
}
```

#### Get Assignments for Question Set
```http
GET /clinic/:clinicId/question-sets/:id/assignments
```

#### Get All Assignments
```http
GET /clinic/:clinicId/question-sets/assignments/all
```

#### Update Assignment
```http
PATCH /clinic/:clinicId/question-sets/assignments/:assignmentId
```

#### Delete Assignment
```http
DELETE /clinic/:clinicId/question-sets/assignments/:assignmentId
```

### Resolve Question Set for Booking

#### Get Question Set for Booking
```http
GET /clinic/:clinicId/question-sets/resolve?doctor_id=1&service_id=5&appoint_type=in-clinic&branch_id=2
```

This endpoint automatically determines the most appropriate question set based on the booking parameters and priority rules.

**Query Parameters:**
- `doctor_id` (optional) - Doctor ID
- `service_id` (optional) - Service ID
- `specialty` (optional) - Specialty name
- `appoint_type` (optional) - Visit type: `in-clinic`, `online`, or `home`
- `branch_id` (optional) - Branch ID

**Response:**
```json
{
  "questionSet": {
    "id": 1,
    "name": "General Health Questionnaire",
    "description": "Basic health screening questions",
    "is_active": true,
    "questions": [
      {
        "id": 1,
        "question_text": "Do you have any allergies?",
        "question_type": "text",
        "is_required": true,
        "order": 1
      }
    ]
  }
}
```

## Question Types

- **text** - Single-line text input
- **textarea** - Multi-line text input
- **select** - Dropdown selection
- **radio** - Radio button group
- **checkbox** - Checkbox group
- **number** - Numeric input
- **date** - Date picker

For `select`, `radio`, and `checkbox` types, provide an `options` array in the question.

## Usage Examples

### Example 1: Create a Question Set for Cardiology Appointments

1. Create the question set:
```http
POST /clinic/1/question-sets
{
  "name": "Cardiology Pre-Visit Questions",
  "description": "Questions for cardiology appointments",
  "questions": [
    {
      "question_text": "Do you have a history of heart disease?",
      "question_type": "radio",
      "options": ["Yes", "No"],
      "is_required": true,
      "order": 1
    },
    {
      "question_text": "What medications are you currently taking for your heart?",
      "question_type": "textarea",
      "is_required": false,
      "order": 2
    }
  ]
}
```

2. Assign to Cardiology specialty:
```http
POST /clinic/1/question-sets/1/assignments
{
  "specialty": "Cardiology"
}
```

### Example 2: Service-Specific Questions

1. Create question set for online consultations:
```http
POST /clinic/1/question-sets
{
  "name": "Online Consultation Setup",
  "questions": [
    {
      "question_text": "Do you have a stable internet connection?",
      "question_type": "radio",
      "options": ["Yes", "No"],
      "is_required": true,
      "order": 1
    },
    {
      "question_text": "Preferred video platform",
      "question_type": "select",
      "options": ["Zoom", "Google Meet", "Microsoft Teams"],
      "is_required": false,
      "order": 2
    }
  ]
}
```

2. Assign to online visit type:
```http
POST /clinic/1/question-sets/2/assignments
{
  "appoint_type": "online"
}
```

### Example 3: Doctor-Specific Questions

Assign a question set to a specific doctor:
```http
POST /clinic/1/question-sets/3/assignments
{
  "doctor_id": 5
}
```

### Example 4: Resolve Question Set for Booking

When creating a booking, resolve the appropriate question set:
```http
GET /clinic/1/question-sets/resolve?doctor_id=5&service_id=3&appoint_type=in-clinic
```

The system will:
1. Check for service-specific assignment (priority 5)
2. Check for doctor-specific assignment (priority 4)
3. Check for specialty-specific assignment (priority 3)
4. Check for visit type-specific assignment (priority 2)
5. Check for branch-specific assignment (priority 1)
6. Return the highest priority match

## Priority Calculation

When creating an assignment, if `priority` is not provided, the system automatically calculates it:

- If `service_id` is provided → priority = 5
- Else if `doctor_id` is provided → priority = 4
- Else if `specialty` is provided → priority = 3
- Else if `appoint_type` is provided → priority = 2
- Else if `branch_id` is provided → priority = 1
- Else → priority = 0

You can override the priority by explicitly providing it in the request.

## Important Notes

1. **Assignment changes apply to new bookings only** - Existing bookings retain their original question sets
2. **Duplicate assignments are prevented** - The system ensures unique combinations of assignment criteria
3. **Cascade deletion** - Deleting a question set also deletes all its questions and assignments
4. **Active status** - Only active question sets are considered when resolving for bookings
5. **Clinic isolation** - All question sets are scoped to the clinic (via `clinic_id`)

## Migration

To set up the database tables, run the clinic migrations:

```bash
npm run migration:run
```

The following migrations will be executed:
- `1776000000011-CreateQuestionSetsTable.ts`
- `1776000000012-CreateQuestionsTable.ts`
- `1776000000013-CreateQuestionSetAssignmentsTable.ts`

## Error Handling

- **404 Not Found** - Question set, assignment, or referenced entity not found
- **409 Conflict** - Duplicate assignment already exists
- **400 Bad Request** - Invalid input data or validation errors

## Security

All endpoints require:
- JWT authentication (`@UseGuards(JwtAuthGuard)`)
- Clinic tenant context (`@UseGuards(ClinicTenantGuard)`)
- Appropriate permissions (`@UseGuards(ClinicPermissionsGuard)`)

Only users with proper clinic access can manage question sets for their clinic.
