# Clinic Working Hours & Breaks

This module provides functionality for clinic administrators to define default weekly working hours and break times. These default schedules serve as a baseline for creating doctor schedules, ensuring consistency across the clinic.

## Features

- ✅ **Multiple Working Ranges per Day** - Support for split shifts (e.g., 9 AM-1 PM and 2 PM-6 PM)
- ✅ **Multiple Break Ranges per Day** - Define multiple break periods within working hours
- ✅ **Comprehensive Validation** - Prevents invalid configurations with clear error messages
- ✅ **Automatic Doctor Schedule Creation** - New doctors automatically inherit default working hours
- ✅ **Break Time Validation** - Ensures breaks are within working hours
- ✅ **Overlap Detection** - Prevents overlapping working hours and breaks

## Table of Contents

- [Overview](#overview)
- [API Endpoints](#api-endpoints)
- [Doctor Working Hours](#doctor-working-hours)
- [Usage Examples](#usage-examples)
- [Validation Rules](#validation-rules)
- [Integration with Doctor Schedules](#integration-with-doctor-schedules)
- [Error Handling](#error-handling)

## Overview

The working hours system consists of two main components:

1. **Working Hours** - Define when the clinic is open for each day of the week
2. **Break Hours** - Define break times within working hours

### Day of Week Enum

The system uses the following day values:
- `MONDAY`
- `TUESDAY`
- `WEDNESDAY`
- `THURSDAY`
- `FRIDAY`
- `SATURDAY`
- `SUNDAY`

### Time Format

All times must be in `HH:MM:SS` format (24-hour format):
- Valid: `09:00:00`, `13:30:00`, `17:00:00`
- Invalid: `9:00 AM`, `1:30 PM`, `17:00`

## API Endpoints

Base path: `/api/clinic/working-hours`. Clinic context is set via `ClinicTenantGuard` (e.g. `clinicId` from JWT or route params). Many endpoints accept optional query `?clinicId=1` to override.

### Working Hours Endpoints

#### Get All Working Hours (public, with filters)
```http
GET /api/clinic/working-hours?clinicId=1&day=MONDAY&start_time=09:00:00&end_time=17:00:00
```

**Response:**
```json
[
  {
    "id": 1,
    "day": "MONDAY",
    "start_time": "09:00:00",
    "end_time": "17:00:00",
    "range_order": 0,
    "is_active": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Set Working Hours
```http
POST /api/clinic/working-hours?clinicId=1
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "days": [
    {
      "day": "MONDAY",
      "working_ranges": [
        {
          "start_time": "09:00:00",
          "end_time": "13:00:00"
        },
        {
          "start_time": "14:00:00",
          "end_time": "18:00:00"
        }
      ]
    },
    {
      "day": "TUESDAY",
      "working_ranges": [
        {
          "start_time": "09:00:00",
          "end_time": "17:00:00"
        }
      ]
    }
  ]
}
```

**Response:** Array of created/updated working hours

#### Get Working Hours for a Specific Day
```http
GET /api/clinic/working-hours/day/:day
```

**Parameters:**
- `day` - One of: `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY`, `SATURDAY`, `SUNDAY`

#### Delete Working Hours for a Day
```http
DELETE /api/clinic/working-hours/day/:day
```

### Break Hours Endpoints

#### Get All Break Hours
```http
GET /api/clinic/working-hours/breaks
```

#### Set Break Hours
```http
POST /api/clinic/working-hours/breaks?clinicId=1
Content-Type: application/json
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "days": [
    {
      "day": "MONDAY",
      "break_ranges": [
        {
          "start_time": "13:00:00",
          "end_time": "14:00:00"
        }
      ]
    }
  ]
}
```

**Response:** Array of created/updated break hours

#### Get Break Hours for a Specific Day
```http
GET /api/clinic/working-hours/breaks/day/:day
```

#### Delete Break Hours for a Day
```http
DELETE /api/clinic/working-hours/breaks/day/:day
```

### Schedule Endpoints

#### Get Complete Weekly Schedule
```http
GET /api/clinic/working-hours/schedule
```

**Response:**
```json
[
  {
    "day": "MONDAY",
    "working_hours": [
      {
        "id": 1,
        "day": "MONDAY",
        "start_time": "09:00:00",
        "end_time": "17:00:00",
        "range_order": 0,
        "is_active": true
      }
    ],
    "break_hours": [
      {
        "id": 1,
        "day": "MONDAY",
        "start_time": "13:00:00",
        "end_time": "14:00:00",
        "break_order": 0,
        "is_active": true
      }
    ]
  }
]
```

#### Get Schedule for a Specific Day
```http
GET /api/clinic/working-hours/schedule/day/:day
```

---

## Doctor Working Hours

Doctor working hours define **per-doctor** availability: which days, times, branches, fees, and (optionally) which **doctor service** (e.g. consultation, follow-up) each slot is for. Used for reservations and slot generation.

### Concepts

| Concept | Description |
|--------|-------------|
| **Clinic working hours** | Default clinic/branch open times (above). |
| **Doctor working hours** | Per-doctor slots: day, branch, start/end time, fees, session_time, waterfall, `doctor_service_id`. |
| **Waterfall** | If `true`, one continuous range; appointments use next available slot. If `false`, slots are fixed by `session_time`. |
| **doctor_service_id** | Optional link to `doctor_services` (e.g. consultation ID) so a slot can be tied to a specific service. |

### Doctor Working Hours Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/clinic/working-hours/doctors/:id` | Get all working hours for a doctor (includes `branch`, `doctor_service`). |
| `GET` | `/api/clinic/working-hours/doctors/:doctorId/day/:day` | Get working hours for a doctor on a day. |
| `GET` | `/api/clinic/working-hours/doctors/:doctorId/branch/:branchId` | Get working hours for a doctor at a branch. |
| `POST` | `/api/clinic/working-hours/doctors/:doctorId` | Create one doctor working hour entry. |
| `POST` | `/api/clinic/working-hours/doctors/bulk` | Bulk create doctor working hours. |
| `POST` | `/api/clinic/working-hours/doctors/:doctorId/update/:id` | Update a doctor working hour by ID. |
| `DELETE` | `/api/clinic/working-hours/doctors/:doctorId/:id` | Delete one doctor working hour. |
| `DELETE` | `/api/clinic/working-hours/doctors/:doctorId` | Delete all working hours for a doctor. |
| `DELETE` | `/api/clinic/working-hours/doctors/:doctorId/day/:day` | Delete all working hours for a doctor on a day. |

### Doctor Working Hour DTO (create/update)

Request body for **single** create (`POST .../doctors/:doctorId`) or **each item** in bulk (`POST .../doctors/bulk`):

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `day` | enum | Yes | `MONDAY`, `TUESDAY`, … `SUNDAY` |
| `start_time` | string | Yes | Start time `HH:MM:SS` (e.g. `09:00:00`) |
| `end_time` | string | Yes | End time `HH:MM:SS` (e.g. `17:00:00`) |
| `fees` | number | Yes | Fee for this slot (≥ 0) |
| `branch_id` | number | No | Branch ID; omit for clinic-wide |
| `session_time` | string | No | Slot duration `HH:MM:SS` (e.g. `00:30:00`); used when `waterfall: false` |
| `is_active` | boolean | No | Default `true` |
| `waterfall` | boolean | No | Default `true`; if `false`, fixed slots by `session_time` |
| `busy` | boolean | No | Default `false` |
| `patients_limit` | number | No | Max patients for slot; when waterfall false, default 1 |
| `appoint_type` | enum | No | `in-clinic`, `online`, `home` |
| `doctor_service_id` | number | No | Link to `doctor_services.id` (e.g. consultation, follow-up) |

### Bulk create body

For `POST /api/clinic/working-hours/doctors/bulk`:

```json
{
  "doctor_id": 1,
  "working_hours": [
    {
      "day": "MONDAY",
      "start_time": "09:00:00",
      "end_time": "13:00:00",
      "fees": 100,
      "doctor_service_id": 1
    },
    {
      "day": "MONDAY",
      "start_time": "14:00:00",
      "end_time": "17:00:00",
      "fees": 100,
      "session_time": "00:30:00",
      "waterfall": false,
      "doctor_service_id": 2
    },
    {
      "day": "TUESDAY",
      "branch_id": 1,
      "start_time": "10:00:00",
      "end_time": "16:00:00",
      "fees": 120
    }
  ]
}
```

### Create single doctor working hour

```http
POST /api/clinic/working-hours/doctors/1
Content-Type: application/json
Authorization: Bearer <token>
```

```json
{
  "day": "MONDAY",
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "fees": 100,
  "session_time": "00:30:00",
  "doctor_service_id": 1
}
```

### Response shape (doctor working hour)

Responses include `branch` and `doctor_service` when loaded:

```json
{
  "id": 1,
  "doctor_id": 1,
  "day": "MONDAY",
  "branch_id": 1,
  "start_time": "09:00:00",
  "end_time": "17:00:00",
  "session_time": "00:30:00",
  "is_active": true,
  "waterfall": true,
  "fees": "100.00",
  "busy": false,
  "patients_limit": null,
  "appoint_type": "in-clinic",
  "doctor_service_id": 1,
  "doctor_service": { "id": 1, "service_id": 1, "doctor_id": 1, "duration": 30, "price": "100.00", "service_type": "consultation" },
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Creating a doctor with working hours

When creating a doctor (see [Doctors](../doctors/README.md)), you can pass `working_hours` in the create body; they are created after the doctor is saved via the same validation and bulk logic as above.

---

## Usage Examples

### Example 1: Standard 9-to-5 Schedule with Lunch Break

```bash
# Set working hours
curl -X POST "http://localhost:3000/api/clinic/working-hours?clinicId=1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "days": [
      {
        "day": "MONDAY",
        "working_ranges": [
          {
            "start_time": "09:00:00",
            "end_time": "17:00:00"
          }
        ]
      },
      {
        "day": "TUESDAY",
        "working_ranges": [
          {
            "start_time": "09:00:00",
            "end_time": "17:00:00"
          }
        ]
      }
    ]
  }'

# Set break hours
curl -X POST "http://localhost:3000/api/clinic/working-hours/breaks?clinicId=1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "days": [
      {
        "day": "MONDAY",
        "break_ranges": [
          {
            "start_time": "13:00:00",
            "end_time": "14:00:00"
          }
        ]
      },
      {
        "day": "TUESDAY",
        "break_ranges": [
          {
            "start_time": "13:00:00",
            "end_time": "14:00:00"
          }
        ]
      }
    ]
  }'
```

### Example 2: Split Shift Schedule

```json
{
  "days": [
    {
      "day": "WEDNESDAY",
      "working_ranges": [
        {
          "start_time": "09:00:00",
          "end_time": "13:00:00"
        },
        {
          "start_time": "14:00:00",
          "end_time": "18:00:00"
        }
      ]
    }
  ]
}
```

### Example 3: Multiple Breaks per Day

```json
{
  "days": [
    {
      "day": "THURSDAY",
      "break_ranges": [
        {
          "start_time": "11:00:00",
          "end_time": "11:15:00"
        },
        {
          "start_time": "13:00:00",
          "end_time": "14:00:00"
        },
        {
          "start_time": "16:00:00",
          "end_time": "16:15:00"
        }
      ]
    }
  ]
}
```

## Validation Rules

### Working Hours Validation

1. **Time Range Validation**
   - End time must be after start time
   - Times must be in `HH:MM:SS` format
   - Times must be valid (00:00:00 to 23:59:59)

2. **Overlap Detection**
   - Working hour ranges cannot overlap on the same day
   - Example: Cannot have `09:00-12:00` and `11:00-14:00` on the same day

3. **Multiple Ranges**
   - Multiple non-overlapping ranges are allowed
   - Example: `09:00-13:00` and `14:00-18:00` is valid

### Break Hours Validation

1. **Time Range Validation**
   - End time must be after start time
   - Times must be in `HH:MM:SS` format

2. **Within Working Hours**
   - Breaks must be completely within at least one working hour range
   - Example: If working hours are `09:00-17:00`, break `13:00-14:00` is valid
   - Example: If working hours are `09:00-17:00`, break `08:00-09:00` is invalid

3. **Overlap Detection**
   - Break ranges cannot overlap on the same day
   - Example: Cannot have `13:00-14:00` and `13:30-14:30` on the same day

4. **Working Hours Required**
   - Cannot set break hours for a day without working hours
   - Must define working hours first

## Integration with Doctor Schedules

When a new doctor is created **without** slot templates, the system automatically:

1. Retrieves the clinic's default working hours
2. Subtracts break times from working hours
3. Creates slot templates for available time slots
4. Sets default slot duration to 30 minutes
5. Sets default cost to 0

### Example Flow

**Clinic Working Hours:**
- Monday: 09:00-17:00
- Break: 13:00-14:00

**Resulting Doctor Schedule:**
- Monday: 09:00-13:00 (available for appointments)
- Monday: 14:00-17:00 (available for appointments)
- Break: 13:00-14:00 (unavailable)

**Slot Templates Created:**
- Duration: 30 minutes
- Days: MONDAY
- Cost: 0
- Available times: 09:00-13:00 and 14:00-17:00

### Custom Slot Templates

If a doctor is created **with** slot templates, the default working hours are **not** used. The provided slot templates take precedence.

## Error Handling

### Common Errors

#### 1. Invalid Time Range
```json
{
  "statusCode": 400,
  "message": "Invalid time range: end time (09:00:00) must be after start time (17:00:00)",
  "error": "Bad Request"
}
```

#### 2. Overlapping Working Hours
```json
{
  "statusCode": 400,
  "message": "Overlapping working hours detected on MONDAY: 09:00:00-12:00:00 overlaps with 11:00:00-14:00:00",
  "error": "Bad Request"
}
```

#### 3. Break Outside Working Hours
```json
{
  "statusCode": 400,
  "message": "Break time 08:00:00-09:00:00 on MONDAY is outside of working hours. Breaks must be within working time ranges.",
  "error": "Bad Request"
}
```

#### 4. Overlapping Breaks
```json
{
  "statusCode": 400,
  "message": "Overlapping break hours detected on MONDAY: 13:00:00-14:00:00 overlaps with 13:30:00-14:30:00",
  "error": "Bad Request"
}
```

#### 5. No Working Hours for Break
```json
{
  "statusCode": 400,
  "message": "Cannot set break hours for FRIDAY: No working hours defined for this day",
  "error": "Bad Request"
}
```

## Permissions

All endpoints require the following permissions:
- **Read Operations**: `read-setting`
- **Write Operations**: `update-setting`

## Database Schema

### Working Hours Table

```sql
CREATE TABLE working_hours (
  id INT PRIMARY KEY AUTO_INCREMENT,
  day ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  range_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX IDX_working_hours_day (day)
);
```

### Break Hours Table

```sql
CREATE TABLE break_hours (
  id INT PRIMARY KEY AUTO_INCREMENT,
  day ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX IDX_break_hours_day (day)
);
```

### Doctor Working Hours Table

```sql
CREATE TABLE doctor_working_hours (
  id INT PRIMARY KEY AUTO_INCREMENT,
  doctor_id INT NOT NULL,
  day ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
  branch_id INT NULL,
  doctor_service_id INT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  session_time TIME NULL,
  is_active BOOLEAN DEFAULT TRUE,
  waterfall BOOLEAN DEFAULT TRUE,
  fees DECIMAL(10,2) NOT NULL,
  busy BOOLEAN DEFAULT FALSE,
  patients_limit INT NULL,
  appoint_type ENUM('in-clinic', 'online', 'home') NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX IDX_doctor_working_hours_doctor_day (doctor_id, day),
  INDEX IDX_doctor_working_hours_branch (branch_id),
  FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
  FOREIGN KEY (doctor_service_id) REFERENCES doctor_services(id) ON DELETE SET NULL
);
```

### Doctor Working Hours Validation

- **Time range:** `end_time` must be after `start_time`; format `HH:MM:SS`.
- **Overlaps:** No overlapping ranges for the same doctor, day, and branch.
- **doctor_service_id:** If provided, must reference an existing `doctor_services.id` for the same doctor (enforced by FK).

## Best Practices

1. **Set Working Hours First** - Always define working hours before setting break hours
2. **Use Consistent Times** - Maintain consistent working hours across weekdays when possible
3. **Plan Breaks Carefully** - Ensure breaks don't conflict with peak appointment times
4. **Review Default Schedules** - Regularly review default schedules to ensure they match clinic operations
5. **Test Before Production** - Test working hours and breaks configuration in a development environment first

## Troubleshooting

### Issue: Doctor schedules not using default working hours

**Solution:** Ensure:
1. Working hours are set for the clinic
2. Doctor is created without custom slot templates
3. Working hours are active (`is_active: true`)

### Issue: Breaks not being excluded from doctor schedules

**Solution:** Ensure:
1. Break hours are set after working hours
2. Breaks are within working hour ranges
3. Break hours are active (`is_active: true`)

### Issue: Validation errors when setting working hours

**Solution:** Check:
1. Time format is `HH:MM:SS` (24-hour format)
2. End time is after start time
3. No overlapping ranges on the same day

## Related Documentation

- [Doctor Management](../doctors/README.md)
- [Slot Templates](../slot-template/README.md)
- [Clinic Settings](../settings/README.md)

## Support

For issues or questions regarding working hours and breaks:
1. Check the error messages for specific validation issues
2. Review the validation rules section
3. Ensure all prerequisites are met (working hours before breaks)
4. Contact the development team for assistance

