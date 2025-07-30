# Manual Testing Checklist - New Session Management System

**Tester Name:** ________________  
**Test Date:** ________________  
**Environment:** ________________  
**Build Version:** ________________

## Pre-Test Setup
- [ ] Clear browser cache and cookies
- [ ] Ensure test accounts are created
- [ ] Verify all tables are in available state
- [ ] Close any existing sessions
- [ ] Open browser developer console

---

## 1. Login Flow Testing

### 1.1 Waiter Login
- [ ] Navigate to login page
- [ ] Verify NO table number field is displayed
- [ ] Enter waiter credentials
- [ ] Click login
- [ ] **PASS/FAIL:** Redirected to table management screen?
- **Notes:** ________________________________________________

### 1.2 Invalid Login
- [ ] Try login with wrong password
- [ ] **PASS/FAIL:** Error message displayed?
- [ ] Try login with non-existent email
- [ ] **PASS/FAIL:** Error message displayed?
- **Notes:** ________________________________________________

---

## 2. Table Management Dashboard

### 2.1 Dashboard Display
- [ ] All tables visible in grid
- [ ] Table numbers clearly displayed
- [ ] Status colors correct:
  - [ ] Green = Available
  - [ ] Red = Occupied
  - [ ] Yellow = Reserved
  - [ ] Blue = Cleaning
- [ ] **PASS/FAIL:** Dashboard loads within 2 seconds?
- **Notes:** ________________________________________________

### 2.2 Table Information
For each table, verify display of:
- [ ] Table number
- [ ] Current status
- [ ] Assigned waiter name (if assigned)
- [ ] Customer name (if occupied)
- [ ] Guest count (if occupied)
- [ ] Active orders count (if any)
- [ ] **PASS/FAIL:** All information accurate?
- **Notes:** ________________________________________________

---

## 3. Table Assignment

### 3.1 Assign Available Table
- [ ] Click on green (available) table
- [ ] **PASS/FAIL:** Table assigned immediately?
- [ ] **PASS/FAIL:** "My Table" badge appears?
- [ ] **PASS/FAIL:** Table added to "My Assigned Tables"?
- **Table Number Used:** ________
- **Notes:** ________________________________________________

### 3.2 Multiple Table Assignment
- [ ] Assign 3 different tables
- [ ] **PASS/FAIL:** All 3 tables show as assigned?
- [ ] **PASS/FAIL:** Can switch between tables?
- **Table Numbers:** ________, ________, ________
- **Notes:** ________________________________________________

---

## 4. Customer Session Management

### 4.1 Create Customer Session
- [ ] Select assigned table
- [ ] Click "Select" button
- [ ] **PASS/FAIL:** Welcome screen appears?
- [ ] Click continue to customer form
- [ ] Enter customer details:
  - Name: ________________
  - Phone: ________________
  - Guests: ________
- [ ] Submit form
- [ ] **PASS/FAIL:** Redirected to menu?
- [ ] Return to dashboard (browser back)
- [ ] **PASS/FAIL:** Table shows as occupied?
- **Notes:** ________________________________________________

### 4.2 Order Placement
- [ ] Select table with customer
- [ ] Add items to cart
- [ ] Place order
- [ ] **PASS/FAIL:** Order successful?
- [ ] Check dashboard
- [ ] **PASS/FAIL:** Active orders count updated?
- **Order Total:** ________
- **Notes:** ________________________________________________

---

## 5. Table Handover

### 5.1 Handover Process
- [ ] Select table with active customer
- [ ] Click "Handover" button
- [ ] **PASS/FAIL:** Modal opens with waiter list?
- [ ] Select target waiter: ________________
- [ ] Enter reason: ________________
- [ ] Confirm handover
- [ ] **PASS/FAIL:** Success message displayed?
- [ ] **PASS/FAIL:** Table removed from your list?
- **Notes:** ________________________________________________

### 5.2 Verify Handover (Login as receiving waiter)
- [ ] Logout current waiter
- [ ] Login as receiving waiter
- [ ] **PASS/FAIL:** Handed over table in assigned list?
- [ ] Select the table
- [ ] **PASS/FAIL:** Can access customer session?
- [ ] **PASS/FAIL:** Can see previous orders?
- **Notes:** ________________________________________________

---

## 6. Table Release

### 6.1 Release Empty Table
- [ ] Find assigned table without customer
- [ ] **PASS/FAIL:** "Release" button visible?
- [ ] Click "Release"
- [ ] Confirm action
- [ ] **PASS/FAIL:** Table status changes to available?
- [ ] **PASS/FAIL:** Table removed from assigned list?
- **Notes:** ________________________________________________

### 6.2 Attempt Release with Customer
- [ ] Select table with active customer
- [ ] **PASS/FAIL:** "Release" button NOT visible?
- [ ] **PASS/FAIL:** Only "Select" and "Handover" visible?
- **Notes:** ________________________________________________

---

## 7. Logout Scenarios

### 7.1 Clean Logout
- [ ] Ensure no active customer sessions
- [ ] Click logout
- [ ] **PASS/FAIL:** Logout successful?
- [ ] **PASS/FAIL:** Redirected to login?
- [ ] **PASS/FAIL:** Tables released?
- **Notes:** ________________________________________________

### 7.2 Logout Prevention
- [ ] Create active customer session
- [ ] Attempt logout
- [ ] **PASS/FAIL:** Error message displayed?
- [ ] **PASS/FAIL:** Lists tables with active sessions?
- [ ] **PASS/FAIL:** Logout prevented?
- **Error Message:** ________________________________________________
- **Notes:** ________________________________________________

---

## 8. Session Persistence

### 8.1 Browser Refresh
- [ ] Create customer session
- [ ] Refresh browser (F5)
- [ ] **PASS/FAIL:** Still logged in?
- [ ] **PASS/FAIL:** Returns to table selection?
- [ ] Select same table
- [ ] **PASS/FAIL:** Customer session intact?
- **Notes:** ________________________________________________

### 8.2 Network Disruption
- [ ] Disconnect network (airplane mode)
- [ ] Try to perform action
- [ ] **PASS/FAIL:** Error message displayed?
- [ ] Reconnect network
- [ ] **PASS/FAIL:** Automatically reconnects?
- [ ] **PASS/FAIL:** Can continue working?
- **Notes:** ________________________________________________

---

## 9. Edge Cases

### 9.1 Simultaneous Access
- [ ] Two waiters try to assign same table
- [ ] **PASS/FAIL:** Second waiter gets appropriate message?
- [ ] **PASS/FAIL:** Can request access?
- **Notes:** ________________________________________________

### 9.2 Rapid Actions
- [ ] Rapidly click between 5 tables
- [ ] **PASS/FAIL:** UI remains responsive?
- [ ] **PASS/FAIL:** No data mixing?
- [ ] **PASS/FAIL:** All actions processed correctly?
- **Notes:** ________________________________________________

---

## 10. Mobile/Tablet Testing

### 10.1 Responsive Design
- [ ] Test on tablet (iPad size)
- [ ] **PASS/FAIL:** Table grid displays properly?
- [ ] **PASS/FAIL:** All buttons accessible?
- [ ] **PASS/FAIL:** Modals fit screen?
- **Device Used:** ________________
- **Notes:** ________________________________________________

### 10.2 Touch Interactions
- [ ] Test all tap targets
- [ ] **PASS/FAIL:** Buttons large enough?
- [ ] **PASS/FAIL:** No accidental triggers?
- [ ] **PASS/FAIL:** Smooth scrolling?
- **Notes:** ________________________________________________

---

## Performance Metrics

### Response Times
- [ ] Login: ________ seconds (Target: <2s)
- [ ] Table assignment: ________ seconds (Target: <1s)
- [ ] Table handover: ________ seconds (Target: <2s)
- [ ] Page transitions: ________ ms (Target: <500ms)

### Resource Usage
- [ ] Check browser memory usage: ________ MB
- [ ] Check network requests count: ________
- [ ] Any console errors? Yes/No
- **If yes, list errors:** ________________________________________________

---

## Overall Assessment

### Summary
- **Total Tests:** ________
- **Passed:** ________
- **Failed:** ________
- **Blocked:** ________

### Critical Issues Found
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Recommendations
1. ________________________________________________
2. ________________________________________________
3. ________________________________________________

### Sign-off
- [ ] All critical paths tested
- [ ] No blocking issues
- [ ] Ready for production

**Tester Signature:** ________________  
**Date:** ________________

---

## Notes Section
_Use this space for any additional observations, suggestions, or issues encountered during testing_

________________________________________________
________________________________________________
________________________________________________
________________________________________________
________________________________________________