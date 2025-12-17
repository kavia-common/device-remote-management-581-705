const SNMPService = require('./protocols/snmpService');
const WebPAService = require('./protocols/webpaService');
const TR69Service = require('./protocols/tr69Service');
const TR369Service = require('./protocols/tr369Service');

class ProtocolService {
  constructor(pool) {
    this.pool = pool;
    this.snmpService = new SNMPService(pool);
    this.webpaService = new WebPAService(pool);
    this.tr69Service = new TR69Service(pool);
    this.tr369Service = new TR369Service(pool);
  }

  // PUBLIC_INTERFACE
  /**
   * Execute a query on a device using the appropriate protocol
   * @param {string} queryId - Query history ID
   * @param {string} deviceId - Device ID
   * @param {string} protocolType - Protocol type (snmp, webpa, tr69, tr369)
   * @param {string} queryType - Type of query to execute
   * @param {Object} parameters - Query parameters
   */
  async executeQuery(queryId, deviceId, protocolType, queryType, parameters) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (protocolType.toLowerCase()) {
        case 'snmp':
          result = await this.snmpService.executeQuery(deviceId, queryType, parameters);
          break;
        case 'webpa':
          result = await this.webpaService.executeQuery(deviceId, queryType, parameters);
          break;
        case 'tr69':
          result = await this.tr69Service.executeQuery(deviceId, queryType, parameters);
          break;
        case 'tr369':
          result = await this.tr369Service.executeQuery(deviceId, queryType, parameters);
          break;
        default:
          throw new Error(`Unsupported protocol: ${protocolType}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      // Update query history with result
      await this.pool.query(`
        UPDATE query_history SET
          status = 'completed',
          response_data = $1,
          execution_time_ms = $2,
          completed_at = NOW()
        WHERE id = $3
      `, [JSON.stringify(result), executionTime, queryId]);
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Update query history with error
      await this.pool.query(`
        UPDATE query_history SET
          status = 'failed',
          error_message = $1,
          execution_time_ms = $2,
          completed_at = NOW()
        WHERE id = $3
      `, [error.message, executionTime, queryId]);
      
      throw error;
    }
  }
}

module.exports = ProtocolService;
