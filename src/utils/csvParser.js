const { parse } = require('csv-parse');
const { Readable } = require('stream');

/**
 * Parse CSV data for table import
 * Expected columns: number, displayName, capacity, type, section, posX, posY, status
 */
class TableCSVParser {
  constructor() {
    this.requiredColumns = ['number', 'capacity'];
    this.optionalColumns = ['displayName', 'type', 'section', 'posX', 'posY', 'status'];
    this.validTypes = ['regular', 'booth', 'bar', 'outdoor', 'private'];
    this.validStatuses = ['available', 'occupied', 'reserved', 'maintenance'];
  }

  /**
   * Parse CSV buffer/string and return array of table objects
   */
  async parse(csvData, options = {}) {
    const results = [];
    const errors = [];
    let rowNumber = 0;

    return new Promise((resolve, reject) => {
      const stream = Readable.from(csvData.toString());
      
      const parser = parse({
        columns: (header) => header.map(col => col.trim().toLowerCase()),
        skip_empty_lines: true,
        trim: true
      });

      parser.on('readable', () => {
        let record;
        while ((record = parser.read()) !== null) {
          rowNumber++;
          const validation = this.validateRow(record, rowNumber);
          
          if (validation.isValid) {
            results.push(validation.data);
          } else {
            errors.push(...validation.errors);
          }
        }
      });

      parser.on('error', (err) => {
        reject(new Error(`CSV parsing error: ${err.message}`));
      });

      parser.on('end', () => {
        resolve({
          success: errors.length === 0,
          tables: results,
          errors,
          summary: {
            total: rowNumber,
            successful: results.length,
            failed: errors.length
          }
        });
      });

      stream.pipe(parser);
    });
  }

  /**
   * Validate a single row of data
   */
  validateRow(row, rowNumber) {
    const errors = [];
    const cleanedRow = {};

    // Check required fields
    for (const field of this.requiredColumns) {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push({
          row: rowNumber,
          field,
          message: `Missing required field: ${field}`
        });
      }
    }

    // Validate and clean table number
    if (row.number) {
      const tableNumber = row.number.toString().trim();
      if (!/^[A-Za-z0-9-]+$/.test(tableNumber)) {
        errors.push({
          row: rowNumber,
          field: 'number',
          message: 'Table number can only contain letters, numbers, and hyphens'
        });
      }
      cleanedRow.number = tableNumber;
    }

    // Validate capacity
    if (row.capacity) {
      const capacity = parseInt(row.capacity, 10);
      if (isNaN(capacity) || capacity < 1 || capacity > 50) {
        errors.push({
          row: rowNumber,
          field: 'capacity',
          message: 'Capacity must be a number between 1 and 50'
        });
      } else {
        cleanedRow.capacity = capacity;
      }
    }

    // Validate type
    if (row.type) {
      const type = row.type.toString().trim().toLowerCase();
      if (!this.validTypes.includes(type)) {
        errors.push({
          row: rowNumber,
          field: 'type',
          message: `Invalid type. Must be one of: ${this.validTypes.join(', ')}`
        });
      } else {
        cleanedRow.type = type;
      }
    } else {
      cleanedRow.type = 'regular'; // Default type
    }

    // Validate status
    if (row.status) {
      const status = row.status.toString().trim().toLowerCase();
      if (!this.validStatuses.includes(status)) {
        errors.push({
          row: rowNumber,
          field: 'status',
          message: `Invalid status. Must be one of: ${this.validStatuses.join(', ')}`
        });
      } else {
        cleanedRow.status = status;
      }
    } else {
      cleanedRow.status = 'available'; // Default status
    }

    // Handle optional fields
    if (row.displayName) {
      cleanedRow.displayName = row.displayName.toString().trim();
    }

    if (row.section) {
      cleanedRow.section = row.section.toString().trim();
    }

    // Validate coordinates
    if (row.posX !== undefined && row.posX !== '') {
      const posX = parseFloat(row.posX);
      if (isNaN(posX) || posX < 0 || posX > 1000) {
        errors.push({
          row: rowNumber,
          field: 'posX',
          message: 'Position X must be a number between 0 and 1000'
        });
      } else {
        cleanedRow.position = cleanedRow.position || {};
        cleanedRow.position.x = posX;
      }
    }

    if (row.posY !== undefined && row.posY !== '') {
      const posY = parseFloat(row.posY);
      if (isNaN(posY) || posY < 0 || posY > 1000) {
        errors.push({
          row: rowNumber,
          field: 'posY',
          message: 'Position Y must be a number between 0 and 1000'
        });
      } else {
        cleanedRow.position = cleanedRow.position || {};
        cleanedRow.position.y = posY;
      }
    }

    // Set default position if not provided
    if (!cleanedRow.position) {
      cleanedRow.position = { x: 50, y: 50 };
    }

    return {
      isValid: errors.length === 0,
      data: cleanedRow,
      errors
    };
  }

  /**
   * Generate sample CSV content
   */
  generateSampleCSV() {
    const headers = ['number', 'displayName', 'capacity', 'type', 'section', 'posX', 'posY', 'status'];
    const sampleData = [
      ['1', 'Table 1', '4', 'regular', 'Main Hall', '100', '100', 'available'],
      ['2', 'Table 2', '6', 'booth', 'Main Hall', '200', '100', 'available'],
      ['3', 'Table 3', '2', 'bar', 'Bar Area', '300', '150', 'available'],
      ['VIP-1', 'VIP Table 1', '8', 'private', 'VIP Section', '150', '250', 'available'],
      ['P-1', 'Patio 1', '4', 'outdoor', 'Patio', '400', '300', 'available']
    ];

    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Validate CSV headers
   */
  validateHeaders(headers) {
    const normalizedHeaders = headers.map(h => h.trim().toLowerCase());
    const missingRequired = this.requiredColumns.filter(col => !normalizedHeaders.includes(col));
    
    if (missingRequired.length > 0) {
      return {
        isValid: false,
        error: `Missing required columns: ${missingRequired.join(', ')}`
      };
    }

    return { isValid: true };
  }
}

module.exports = TableCSVParser;