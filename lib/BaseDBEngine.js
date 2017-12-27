'use strict';

class BaseDBEngine {
    constructor() {
        this.ISOLATION_LEVEL = {
            READ_UNCOMMITTED: 'READ-UNCOMMITTED',
            READ_COMMITTED: 'READ-COMMITTED',
            REPEATABLE_READ: 'REPEATABLE-READ',
            SERIALIZABLE: 'SERIALIZABLE'
        };
    }

    async getTable(sql, dbParams) {
        throw 'Not Implemented';
    }

    async getTablePage(sql, dbParams, pageIndex, pageSize, orderBy) {
        throw 'Not Implemented';
    }

    async getTableCount(sql, dbParams) {
        throw 'Not Implemented';
    }

    async execute(sql, dbParams) {
        throw 'Not Implemented';
    }

    async beginTransaction(level) {
        throw 'Not Implemented';
    }

    async rollbackTransaction() {
        throw 'Not Implemented';
    };

    async commitTransaction() {
        throw 'Not Implemented';
    };

    async setIsolationLevel(level) {
        throw 'Not Implemented';
    };
}

module.exports = BaseDBEngine;