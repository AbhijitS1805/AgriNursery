/// <reference types="cypress" />

describe('HRMS Flow', () => {
  describe('Employee Management', () => {
    beforeEach(() => {
      cy.visit('/employees');
    });

    it('should display employees page with stats', () => {
      cy.contains('h1', 'Employees').should('be.visible');
      
      // Check stats
      cy.contains('Total Employees').should('be.visible');
      cy.contains('Active').should('be.visible');
      cy.contains('Permanent').should('be.visible');
      cy.contains('Contract').should('be.visible');
    });

    it('should show employee list', () => {
      cy.get('table').should('be.visible');
      
      // Check headers
      cy.get('table thead').within(() => {
        cy.contains('Employee').should('be.visible');
        cy.contains('Department').should('be.visible');
        cy.contains('Designation').should('be.visible');
        cy.contains('Contact').should('be.visible');
        cy.contains('Joining Date').should('be.visible');
        cy.contains('Status').should('be.visible');
      });
    });

    it('should search employees', () => {
      cy.get('input[type="text"]').first().type('Ramesh');
      
      cy.wait(500);
      
      cy.get('table tbody tr').should('have.length.at.least', 1);
    });

    it('should filter by department', () => {
      cy.get('select').first().select('Sales');
      
      cy.wait(500);
      
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).should('contain', 'Sales');
      });
    });

    it('should add new employee', () => {
      cy.clickButton('Add Employee');
      
      // Fill employee form
      cy.fillByLabel('Full Name', `Test Employee ${Date.now()}`);
      cy.fillByLabel('Mobile', '9876543210');
      cy.fillByLabel('Email', 'test@example.com');
      cy.selectByLabel('Department', 'Sales');
      cy.selectByLabel('Designation', 'Sales Executive');
      cy.selectByLabel('Employment Type', 'Permanent');
      cy.fillByLabel('Joining Date', '2025-01-10');
      cy.fillByLabel('Basic Salary', '25000');
      
      cy.clickButton('Save');
      
      // Verify
      cy.verifySuccess('Employee created successfully');
    });

    it('should view employee details', () => {
      cy.get('table tbody tr').first().within(() => {
        cy.contains('button', 'View').click();
      });
      
      // Check details visible
      cy.contains('Employee Details').should('be.visible');
      cy.contains('Personal Information').should('be.visible');
      cy.contains('Employment Details').should('be.visible');
      cy.contains('Salary Information').should('be.visible');
    });
  });

  describe('Attendance Management', () => {
    beforeEach(() => {
      cy.visit('/attendance');
    });

    it('should display attendance page with stats', () => {
      cy.contains('h1', 'Attendance').should('be.visible');
      
      // Check stats
      cy.contains('Present').should('be.visible');
      cy.contains('Absent').should('be.visible');
      cy.contains('On Leave').should('be.visible');
      cy.contains('Avg Hours').should('be.visible');
    });

    it('should show today\'s attendance list', () => {
      cy.get('table').should('be.visible');
      
      // Check headers
      cy.get('table thead').within(() => {
        cy.contains('Employee').should('be.visible');
        cy.contains('Department').should('be.visible');
        cy.contains('Check In').should('be.visible');
        cy.contains('Check Out').should('be.visible');
        cy.contains('Hours').should('be.visible');
        cy.contains('Status').should('be.visible');
      });
    });

    it('should mark employee present', () => {
      // Find first employee not marked
      cy.get('table tbody tr').first().within(() => {
        cy.contains('button', 'Present').click();
      });
      
      // Verify success
      cy.verifySuccess('Attendance marked successfully');
      
      // Should show Present status
      cy.reload();
      cy.wait(500);
      cy.get('table tbody tr').first().should('contain', 'Present');
    });

    it('should mark employee absent', () => {
      cy.get('table tbody tr').eq(1).within(() => {
        cy.contains('button', 'Absent').click();
      });
      
      cy.verifySuccess('Attendance marked successfully');
    });

    it('should mark half day', () => {
      cy.get('table tbody tr').eq(2).within(() => {
        cy.contains('button', 'Half Day').click();
      });
      
      cy.verifySuccess('Attendance marked successfully');
    });

    it('should mark all present using bulk action', () => {
      cy.clickButton('Mark All Present');
      
      // Confirm action
      cy.contains('Are you sure').should('be.visible');
      cy.clickButton('Confirm');
      
      // Verify
      cy.verifySuccess('Bulk attendance marked successfully');
      
      // All should be present
      cy.reload();
      cy.wait(500);
      cy.get('table tbody tr').each(($row) => {
        cy.wrap($row).should('contain', 'Present');
      });
    });

    it('should filter attendance by date', () => {
      // Select a past date
      cy.get('input[type="date"]').clear().type('2025-01-05');
      
      cy.wait(500);
      
      // Should show that date's attendance
      cy.get('table').should('be.visible');
    });
  });

  describe('Leave Management', () => {
    beforeEach(() => {
      cy.visit('/leave');
    });

    it('should display leave page', () => {
      cy.contains('h1', 'Leave Management').should('be.visible');
    });

    it('should apply for leave', () => {
      cy.clickButton('Apply Leave');
      
      // Fill leave application
      cy.selectByLabel('Leave Type', 'Casual Leave');
      cy.fillByLabel('From Date', '2025-01-15');
      cy.fillByLabel('To Date', '2025-01-16');
      cy.fillByLabel('Reason', 'Personal work');
      
      cy.clickButton('Submit');
      
      // Verify
      cy.verifySuccess('Leave application submitted successfully');
    });

    it('should show leave balance', () => {
      cy.contains('Leave Balance').should('be.visible');
      
      // Should show different leave types
      cy.contains('Casual Leave').should('be.visible');
      cy.contains('Sick Leave').should('be.visible');
      cy.contains('Earned Leave').should('be.visible');
    });

    it('should approve leave application', () => {
      // Filter pending leaves
      cy.get('select').first().select('Pending');
      cy.wait(500);
      
      // Approve first leave
      cy.get('table tbody tr').first().within(() => {
        cy.contains('button', 'Approve').click();
      });
      
      cy.fillByLabel('Remarks', 'Approved');
      cy.clickButton('Approve');
      
      // Verify
      cy.verifySuccess('Leave approved successfully');
    });

    it('should reject leave application', () => {
      cy.get('select').first().select('Pending');
      cy.wait(500);
      
      cy.get('table tbody tr').first().within(() => {
        cy.contains('button', 'Reject').click();
      });
      
      cy.fillByLabel('Remarks', 'Not approved due to workload');
      cy.clickButton('Reject');
      
      cy.verifySuccess('Leave rejected');
    });
  });
});
