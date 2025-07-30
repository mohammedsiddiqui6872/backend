# End-to-End Testing Plan for New Session Management System

## Test Environment Setup

### Prerequisites
1. Backend server running on port 5000
2. Frontend application running on port 3000
3. MongoDB database accessible
4. At least 2 waiter accounts created
5. At least 3-4 tables configured in the system

### Test Data Required
- **Waiter 1**: paula@restaurant.com (password: known)
- **Waiter 2**: georg@restaurant.com (password: known)
- **Admin**: admin@restaurant.com (password: known)
- **Tables**: 1, 2, 3, 4 (minimum)

---

## Test Suite 1: Waiter Authentication Flow

### Test 1.1: Waiter Login Without Table Selection
**Steps:**
1. Navigate to login page
2. Enter waiter credentials (paula@restaurant.com)
3. Click login button
4. **Expected:** 
   - No table selection field shown on login
   - Redirected to table management dashboard
   - All tables displayed with current status

### Test 1.2: Table Management Dashboard Display
**Steps:**
1. After login, observe table management screen
2. **Expected:**
   - Grid view of all tables
   - Each table shows:
     - Table number
     - Current status (available/occupied)
     - Assigned waiter (if any)
     - Active customer details (if any)
     - Active order count (if any)
   - My assigned tables highlighted with purple border

### Test 1.3: Logout Prevention with Active Sessions
**Steps:**
1. Login as waiter with active customer session
2. Click logout button
3. **Expected:**
   - Error message: "Cannot logout - active customer sessions exist on your tables"
   - List of tables with active sessions shown
   - Logout prevented

---

## Test Suite 2: Table Assignment and Management

### Test 2.1: Assign Available Table
**Steps:**
1. Login as waiter
2. Click on an available (green) table
3. **Expected:**
   - Table automatically assigned to current waiter
   - Table color changes to show assignment
   - "My Table" badge appears
   - Table added to waiter's assigned tables list

### Test 2.2: Select Assigned Table for Service
**Steps:**
1. Click "Select" button on an assigned table
2. **Expected:**
   - Redirected to restaurant ordering system
   - Welcome screen displayed
   - Table number context maintained

### Test 2.3: Release Table Without Customer
**Steps:**
1. From table management, find assigned table without customer
2. Click "Release" button
3. Confirm release action
4. **Expected:**
   - Table status changes to available
   - Table removed from waiter's assigned list
   - Table color changes to green

### Test 2.4: Attempt to Release Table with Active Customer
**Steps:**
1. Select table with active customer session
2. Verify "Release" button is not shown
3. **Expected:**
   - Only "Select" and "Handover" buttons visible
   - Cannot release occupied table

---

## Test Suite 3: Customer Session Flow

### Test 3.1: Create Customer Session
**Steps:**
1. Select an assigned table
2. On welcome screen, proceed to customer form
3. Enter customer details:
   - Name: "Test Customer"
   - Phone: "1234567890"
   - Guests: 2
4. Submit form
5. **Expected:**
   - Customer session created
   - Redirected to menu
   - Table status shows as occupied in dashboard

### Test 3.2: Place Order
**Steps:**
1. Add items to cart
2. Click cart icon
3. Click "Place Order"
4. **Expected:**
   - Order created successfully
   - Order linked to customer session
   - Active orders count updated on table

### Test 3.3: Complete Customer Session
**Steps:**
1. Request bill
2. Process payment
3. Submit feedback
4. **Expected:**
   - Customer session closed
   - Table remains assigned to waiter
   - Table status changes from occupied to available

---

## Test Suite 4: Table Handover

### Test 4.1: Handover Table to Another Waiter
**Steps:**
1. Login as Waiter 1 (paula)
2. Ensure table has active customer
3. Click "Handover" button on table
4. Select Waiter 2 (georg) from dropdown
5. Enter reason: "Shift change"
6. Confirm handover
7. **Expected:**
   - Table removed from Waiter 1's list
   - Success message displayed

### Test 4.2: Verify Handover Reception
**Steps:**
1. Login as Waiter 2 (georg)
2. Check table management dashboard
3. **Expected:**
   - Handed over table appears in assigned tables
   - Customer session maintained
   - Handover history available

### Test 4.3: Continue Service After Handover
**Steps:**
1. As Waiter 2, select the handed over table
2. **Expected:**
   - Access to existing customer session
   - Can view previous orders
   - Can add new orders
   - Customer experience uninterrupted

---

## Test Suite 5: Multi-Table Management

### Test 5.1: Assign Multiple Tables
**Steps:**
1. Login as waiter
2. Assign 3 different available tables
3. **Expected:**
   - All 3 tables show in "My Assigned Tables"
   - Each table independently manageable
   - Can switch between tables freely

### Test 5.2: Concurrent Customer Sessions
**Steps:**
1. Create customer session on Table 1
2. Create customer session on Table 2
3. Switch between tables
4. **Expected:**
   - Each session maintained independently
   - Orders kept separate
   - Can manage multiple active sessions

---

## Test Suite 6: Error Scenarios

### Test 6.1: Access Unassigned Table
**Steps:**
1. Try to select a table assigned to another waiter
2. **Expected:**
   - Prompt: "This table is currently assigned to [Waiter Name]. Do you want to request access?"
   - Can request access or cancel

### Test 6.2: Network Disconnection
**Steps:**
1. Create customer session
2. Disconnect network
3. Try to place order
4. Reconnect network
5. **Expected:**
   - Error message during disconnection
   - Socket reconnects automatically
   - Session state preserved

### Test 6.3: Simultaneous Handover
**Steps:**
1. Two waiters try to handover same table simultaneously
2. **Expected:**
   - First handover succeeds
   - Second handover fails with appropriate error
   - Table state remains consistent

---

## Test Suite 7: Admin Functions

### Test 7.1: View All Active Sessions
**Steps:**
1. Login as admin
2. Navigate to table management in admin panel
3. **Expected:**
   - See all tables with detailed information
   - View all active waiter sessions
   - View all customer sessions
   - Can end sessions if needed

### Test 7.2: Force Release Table
**Steps:**
1. As admin, find occupied table
2. Use admin override to release
3. **Expected:**
   - Table released despite active session
   - Appropriate warnings shown
   - Audit log created

---

## Test Suite 8: Session Persistence

### Test 8.1: Browser Refresh
**Steps:**
1. Login and select table
2. Create customer session
3. Refresh browser (F5)
4. **Expected:**
   - Remain logged in
   - Return to table selection screen
   - Can resume selected table
   - Customer session intact

### Test 8.2: Logout and Re-login
**Steps:**
1. Complete all customer sessions
2. Logout successfully
3. Login again
4. **Expected:**
   - Previous table assignments cleared
   - Fresh session started
   - No residual data from previous session

---

## Test Suite 9: Performance Testing

### Test 9.1: Multiple Concurrent Waiters
**Steps:**
1. Login 5+ waiters simultaneously
2. Each waiter assigns 2-3 tables
3. Create customer sessions
4. Place orders
5. **Expected:**
   - System remains responsive
   - No data conflicts
   - Real-time updates work correctly

### Test 9.2: Rapid Table Switching
**Steps:**
1. Assign 5 tables to one waiter
2. Rapidly switch between tables
3. **Expected:**
   - Smooth transitions
   - No session data mixing
   - UI remains responsive

---

## Test Suite 10: Data Migration Verification

### Test 10.1: Legacy Session Check
**Steps:**
1. Verify old TableSession data archived
2. Check active sessions migrated correctly
3. **Expected:**
   - All active sessions preserved
   - Historical data accessible
   - No data loss

### Test 10.2: Backward Compatibility
**Steps:**
1. Check existing orders still accessible
2. Verify customer history intact
3. **Expected:**
   - All historical data preserved
   - Reports still accurate
   - Analytics unaffected

---

## Automated Test Checklist

### API Endpoints to Test
- [ ] POST /api/auth/login (without tableNumber)
- [ ] POST /api/auth/logout (with session checks)
- [ ] GET /api/auth/my-tables
- [ ] POST /api/auth/request-table
- [ ] POST /api/auth/handover-table
- [ ] GET /api/tables/state
- [ ] PUT /api/tables/:number/assign
- [ ] PUT /api/tables/:number/release
- [ ] PUT /api/tables/:number/status
- [ ] POST /api/customer-sessions/create
- [ ] GET /api/customer-sessions/active/:tableNumber

### Database Validations
- [ ] WaiterSession created on login
- [ ] TableState updated on assignment
- [ ] CustomerSession linked correctly
- [ ] Handover history tracked
- [ ] No orphaned records

### Socket Events to Monitor
- [ ] table-assigned
- [ ] table-released
- [ ] table-status-updated
- [ ] customer-session-created
- [ ] order-status-changed

---

## Regression Testing

### Features to Verify Still Working
1. **Menu Management**
   - Categories display correctly
   - Items can be added to cart
   - Customizations work

2. **Order Processing**
   - Orders reach kitchen
   - Status updates work
   - Payment processing unchanged

3. **Customer Experience**
   - Welcome flow unchanged
   - Order history accurate
   - Feedback submission works

4. **Admin Panel**
   - All reports accurate
   - User management works
   - Analytics unchanged

---

## Performance Benchmarks

### Expected Response Times
- Login: < 2 seconds
- Table assignment: < 1 second
- Table handover: < 2 seconds
- Session creation: < 1 second
- Page transitions: < 500ms

### Concurrent User Limits
- Minimum 50 concurrent waiters
- Minimum 200 concurrent sessions
- Real-time updates < 100ms delay

---

## Sign-off Criteria

- [ ] All test suites pass
- [ ] No critical bugs found
- [ ] Performance meets benchmarks
- [ ] Data migration verified
- [ ] Backward compatibility confirmed
- [ ] User acceptance testing completed
- [ ] Documentation updated
- [ ] Training materials prepared

---

## Notes for Testers

1. **Test Data Reset**: Run cleanup script between test runs
2. **Browser Testing**: Test on Chrome, Firefox, Safari, Edge
3. **Mobile Testing**: Verify responsive design on tablets
4. **Network Conditions**: Test on 3G, 4G, WiFi
5. **Error Logs**: Monitor console for any errors
6. **Database State**: Check for orphaned records after tests

---

## Issue Reporting Template

**Issue Title**: [Component] - Brief description
**Severity**: Critical/High/Medium/Low
**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Result**:
**Actual Result**:
**Screenshots/Logs**:
**Environment**: Browser/OS/Network
**Additional Notes**: