'use strict'
let BaseDBEngine = require('./BaseDBEngine');
let DBDataType = require('./DBDataType');
let MsSql = require('mssql');

class SqlServer extends BaseDBEngine {
    constructor({server, database, user, password, port = 1433} = {}) {
        super();
        this.pool = null;
        this.transaction = null;
        this.config = {
            user: user,
            password: password,
            server: server,
            database: database,
            port: port,
            pool: {
                max: 10,
                min: 0,
                idleTimeoutMillis: 30000
            }
        };
        this.MsSql = MsSql;
    }

    async getPool() {
        return new Promise((resolve, reject) => {
            if (this.pool) {
                resolve(this.pool);
            } else {
                let pool = new MsSql.ConnectionPool(this.config, err => {
                    if (err) reject(err);
                    else {
                        this.pool = pool;
                        resolve(pool);
                    }
                });
            }
        });
    }

    async getTable(sql, dbParams) {
        await this.getPool();
        let br = this.buildRequest(sql, dbParams);
        let result = await br.request.query(br.sql);
        return result.recordset;
    }

    async getTablePage(sql, dbParams, pageIndex, pageSize, orderBy) {
        await this.getPool();
        let pageSql = `select top(${pageSize}) * from (select *,Row_Number() Over (order by ${orderBy}) as RowNumber From(${sql}) tmp) TableA
        Where TableA.RowNumber>${pageSize}*${pageIndex - 1}`;
        let br = this.buildRequest(pageSql, dbParams);
        let result = await br.request.query(br.sql);
        return result.recordset;
    }

    async getTableCount(sql, dbParams) {
        await this.getPool();
        let countSql = `select count(1) as total from (${sql}) tmp`;
        let br = this.buildRequest(countSql, dbParams);
        let result = await br.request.query(br.sql);
        return result.recordset[0].total;
    }

    async execute(sql, dbParams) {
        await this.getPool();
        let br = this.buildRequest(sql, dbParams);
        let result = await br.request.query(br.sql);
        return result.rowsAffected[0];
    }

    async beginTransaction(level) {
        await this.getPool();
        this.transaction = this.pool.transaction();
        if (level)
            await this.transaction.begin(this.mapIoslationLevel(level));
        else
            await this.transaction.begin();
        return this.transaction;
    }

    async rollbackTransaction() {
        return new Promise((resolve, reject) => {
            if (this.transaction) {
                this.transaction.rollback((err) => {
                    this.transaction = null;
                });
            }
            resolve();
        });
    }

    async commitTransaction() {
        return new Promise((resolve, reject) => {
            if (this.transaction) {
                this.transaction.commit(async (err) => {
                    if (err)
                        await this.rollbackTransaction();
                    else
                        this.transaction = null;
                });
            }
            resolve();
        });
    }

    buildRequest(sql, dbParams) {
        let request = this.transaction ? this.transaction.request() : this.pool.request();
        for (let dbParam of dbParams) {
            if (dbParam.type) {
                request = request.input(dbParam.name, this.mapDBDataType(dbParam.type), dbParam.value);
            } else {
                request = request.input(dbParam.name, dbParam.value);
            }
        }
        return {sql: sql, request: request};
    }

    mapIoslationLevel(level) {
        switch (level) {
            case this.ISOLATION_LEVEL.READ_UNCOMMITTED:
                return MsSql.ISOLATION_LEVEL.READ_COMMITTED;
            case this.ISOLATION_LEVEL.READ_COMMITTED:
                return MsSql.ISOLATION_LEVEL.READ_UNCOMMITTED;
            case this.ISOLATION_LEVEL.REPEATABLE_READ:
                return MsSql.ISOLATION_LEVEL.REPEATABLE_READ;
            case this.ISOLATION_LEVEL.SERIALIZABLE:
                return MsSql.ISOLATION_LEVEL.SERIALIZABLE;
            default:
                return MsSql.ISOLATION_LEVEL.READ_COMMITTED;
        }
    }

    mapDBDataType(dbDataType) {
        switch (dbDataType.type) {
            case DBDataType.VarChar:
                return MsSql.VarChar(dbDataType.length);
            case DBDataType.NVarChar:
                return MsSql.NVarChar(dbDataType.length);
            case DBDataType.Text:
                return MsSql.Text;
            case DBDataType.Int:
                return MsSql.Int;
            case DBDataType.BigInt:
                return MsSql.BigInt;
            case DBDataType.TinyInt:
                return MsSql.TinyInt;
            case DBDataType.SmallInt:
                return MsSql.SmallInt;
            case DBDataType.Bit:
                return MsSql.Bit;
            case DBDataType.Float:
                return MsSql.Float;
            case DBDataType.Numeric:
                return MsSql.Numeric(dbDataType.precision, dbDataType.scale);
            case DBDataType.Decimal:
                return MsSql.Decimal(dbDataType.precision, dbDataType.scale);
            case DBDataType.Real:
                return MsSql.Real;
            case DBDataType.Date:
                return MsSql.Date;
            case DBDataType.DateTime:
                return MsSql.DateTime;
            case DBDataType.DateTime2:
                return MsSql.DateTime2;
            case DBDataType.DateTimeOffset:
                return MsSql.DateTimeOffset;
            case DBDataType.SmallDateTime:
                return MsSql.SmallDateTime;
            case DBDataType.Time:
                return MsSql.Time;
            case DBDataType.UniqueIdentifier:
                return MsSql.UniqueIdentifier;
            case DBDataType.SmallMoney:
                return MsSql.SmallMoney;
            case DBDataType.Money:
                return MsSql.Money;
            case DBDataType.Binary:
                return MsSql.Binary;
            case DBDataType.VarBinary:
                return MsSql.VarBinary;
            case DBDataType.Image:
                return MsSql.Image;
            case DBDataType.Char:
                return MsSql.Char(dbDataType.length);
            case DBDataType.NChar:
                return MsSql.NChar(dbDataType.length);
            case DBDataType.NText:
                return MsSql.NText;
        }
    }
}

module.exports = SqlServer;