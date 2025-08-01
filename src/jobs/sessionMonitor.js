const Table = require('../models/Table');
const TableStatusRuleEngine = require('../services/tableStatusRuleEngine');

class SessionMonitor {
  constructor(io) {
    this.io = io;
    this.ruleEngine = new TableStatusRuleEngine(io);
    this.intervalId = null;
  }

  start() {
    // Run every 5 minutes
    this.intervalId = setInterval(() => {
      this.checkLongRunningSessions();
    }, 5 * 60 * 1000);

    console.log('Session monitor started - checking every 5 minutes');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Session monitor stopped');
    }
  }

  async checkLongRunningSessions() {
    try {
      // Get all occupied tables
      const occupiedTables = await Table.find({
        status: 'occupied',
        sessionStartTime: { $exists: true }
      });

      const now = new Date();

      for (const table of occupiedTables) {
        if (!table.sessionStartTime) continue;

        const sessionDuration = now - table.sessionStartTime;

        // Process session check event
        await this.ruleEngine.processEvent(
          table.tenantId,
          'session_check',
          table.number,
          {
            session: {
              duration: sessionDuration,
              startTime: table.sessionStartTime
            }
          }
        );
      }

      console.log(`Checked ${occupiedTables.length} occupied tables for long sessions`);
    } catch (error) {
      console.error('Error checking long-running sessions:', error);
    }
  }
}

module.exports = SessionMonitor;