# Testing Availability Management UI

## Prerequisites

1. **Servers Running:**
   - API Server: http://localhost:4000 ✅
   - Web Server: http://localhost:3000 ✅

2. **Test Doctor Account:**
   - Email: `doctor@medbook.com`
   - Password: `password123`
   - **Note:** Doctor profile must exist (see Setup below)

## Setup

### Step 1: Ensure Doctor Profile Exists

If the doctor user doesn't have a profile yet, create one:

**Option A: Via Admin Dashboard (Recommended)**

1. Login as admin: `admin@medbook.com` / `password123`
2. Go to Admin Dashboard: http://localhost:3000/admin
3. Navigate to Doctor Management section
4. Create a doctor profile for `doctor@medbook.com` if needed

**Option B: Via API (Direct)**

```bash
# First, login to get token
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@medbook.com","password":"password123"}'

# Use the token to create doctor profile
curl -X POST http://localhost:4000/api/v1/doctors \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"specialization":"General Practice","bio":"Test doctor"}'
```

## Testing Steps

### 1. Access Availability Management Page

1. Open browser: http://localhost:3000
2. Login as doctor: `doctor@medbook.com` / `password123`
3. Navigate to: http://localhost:3000/dashboard/doctor/availability

**Expected:**

- Page loads successfully
- Shows "Manage Availability" heading
- Shows "Add New Availability" button
- Empty state message if no availabilities exist

### 2. Create One-Time Availability

1. Click "Add New Availability" button
2. Fill in the form:
   - **Start Time:** Select a future date/time (e.g., tomorrow 9:00 AM)
   - **End Time:** Select a time after start time (e.g., tomorrow 10:00 AM)
   - **Recurring schedule:** Leave unchecked
3. Click "Add Availability"

**Expected:**

- Form submits successfully
- New availability appears in the list
- Shows start/end times formatted correctly
- Shows "One-time" badge

### 3. Create Recurring Availability

1. Click "Add New Availability" button
2. Fill in the form:
   - **Start Time:** Select a time (e.g., 2:00 PM)
   - **End Time:** Select a time after start (e.g., 4:00 PM)
   - **Recurring schedule:** Check the checkbox
   - **Day of Week:** Select "Monday"
   - **Valid From:** Select a start date
   - **Valid To:** Select an end date (after start date)
3. Click "Add Availability"

**Expected:**

- Form submits successfully
- New recurring availability appears in the list
- Shows day of week, valid from/to dates
- Shows "Recurring" badge

### 4. Edit Availability

1. Click "Edit" button on any availability
2. Modify the form fields
3. Click "Update Availability"

**Expected:**

- Form pre-populates with existing data
- Changes save successfully
- Updated availability reflects changes

### 5. Delete Availability

1. Click "Delete" button on any availability
2. Confirm deletion in the dialog

**Expected:**

- Confirmation dialog appears
- Availability is removed after confirmation
- List updates to show remaining availabilities

### 6. Filter by Date Range

1. Set **Start Date** filter (e.g., today's date)
2. Set **End Date** filter (e.g., next week)
3. Click "Clear Filters" to reset

**Expected:**

- Only availabilities within date range are shown
- Filters work correctly
- Clear Filters resets the view

### 7. Validation Testing

**Test Invalid Inputs:**

1. Try to create availability with end time before start time
2. Try to create recurring availability without day of week
3. Try to create recurring availability with invalid date range

**Expected:**

- Validation errors appear below relevant fields
- Form does not submit
- Error messages are clear and helpful

### 8. Error Handling

**Test Error Scenarios:**

1. Try to access page as non-doctor user (should redirect)
2. Try to create overlapping availability slots
3. Try to edit/delete with network disconnected

**Expected:**

- Non-doctors are redirected or see access denied
- Overlapping slots show appropriate error
- Network errors are handled gracefully

## Test Checklist

- [ ] Page loads for doctor users
- [ ] Non-doctors are blocked/redirected
- [ ] Create one-time availability works
- [ ] Create recurring availability works
- [ ] Edit availability works
- [ ] Delete availability works (with confirmation)
- [ ] Date range filtering works
- [ ] Form validation works
- [ ] Error messages display correctly
- [ ] Loading states work
- [ ] Empty states display correctly
- [ ] Responsive design works on mobile/tablet

## Troubleshooting

### Issue: "Doctor profile not found"

**Solution:** Create doctor profile via admin dashboard or API (see Setup)

### Issue: "Not authenticated"

**Solution:** Make sure you're logged in as a doctor user

### Issue: API errors

**Solution:**

- Check API server is running: http://localhost:4000/api/v1/health
- Check browser console for errors
- Verify CORS settings if seeing CORS errors

### Issue: Form not submitting

**Solution:**

- Check browser console for JavaScript errors
- Verify all required fields are filled
- Check network tab for API request/response

## Notes

- All times are in local timezone
- Date inputs use browser's date picker
- Recurring schedules require day of week
- One-time slots use full datetime
- Availability slots cannot overlap (backend validation)
