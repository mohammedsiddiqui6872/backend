const { AsyncLocalStorage } = require('async_hooks');

// Create async local storage instance for tenant context
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = asyncLocalStorage;