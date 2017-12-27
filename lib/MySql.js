'use strict'
let mysql = require('mysql');
let BaseDBEngine = require('./BaseDBEngine');

class MySql extends BaseDBEngine {
    constructor({server, database, user, password, port = 3306} = {}) {
        super();
        this.currentConnection = null;
        this.pool = mysql.createPool({
            connectionLimit: 10,
            host: server,
            user: user,
            port: port,
            password: password,
            database: database
        });
    }

    buildSql(sql, dbParams) {
        let reg = /@[a-z0-9_-]*/g;
        let params = [];
        sql = sql.replace(reg, (match) => {
            let name = match.slice(1);
            let dbParam = dbParams.filter(x => x.name === name);
            if (dbParam.length === 0) throw `undefined param:${name}`;
            params.push(dbParam[0].value);
            return '?';
        });
        return {sql: sql, params: params};
    }


    async getTable(sql, dbParams) {
        let buildResult = this.buildSql(sql, dbParams || []);
        return new Promise((resolve, reject) => {
            if (this.currentConnection) {
                this.currentConnection.query(buildResult.sql, buildResult.params, (err, rows, fields) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(rows);
                    }
                });
            } else {
                this.pool.getConnection((err, connection) => {
                    if (err) {
                        reject(err);
                    } else {
                        connection.query(buildResult.sql, buildResult.params, (err, rows, fields) => {
                            connection.destroy();
                            if (err) {
                                reject(err);
                            } else {
                                resolve(rows);
                            }
                        });
                    }
                });
            }
        });
    }

    async getTablePage(sql, dbParams, pageIndex, pageSize, orderBy) {
        sql = 'select * from (select * from (' + sql + ') a Order by ' + orderBy + ' LIMIT ' + ((pageIndex - 1) * pageSize) + ',' + pageSize + ') TableA';
        let buildResult = this.buildSql(sql, dbParams || []);
        return new Promise((resolve, reject) => {
            if (this.currentConnection) {
                this.currentConnection.query(buildResult.sql, buildResult.params, (err, rows, fields) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(rows);
                    }
                });
            } else {
                this.pool.getConnection((err, connection) => {
                    if (err) {
                        reject(err);
                    } else {
                        connection.query(buildResult.sql, buildResult.params, (err, rows, fields) => {
                            connection.destroy();
                            if (err) {
                                reject(err);
                            } else {
                                resolve(rows);
                            }
                        });
                    }
                });
            }
        });
    }

    async getTableCount(sql, dbParams) {
        sql = 'select count(1) as total from (' + sql + ') a';
        let buildResult = this.buildSql(sql, dbParams || []);
        return new Promise((resolve, reject) => {
            if (this.currentConnection) {
                this.currentConnection.query(buildResult.sql, buildResult.params, (err, rows, fields) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(rows[0].total);
                    }
                });
            } else {
                this.pool.getConnection((err, connection) => {
                    if (err) {
                        reject(err);
                    } else {
                        connection.query(buildResult.sql, buildResult.params, (err, rows, fields) => {
                            connection.destroy();
                            if (err) {
                                reject(err);
                            } else {
                                resolve(rows[0].total);
                            }
                        });
                    }
                });
            }
        });
    }

    async execute(sql, dbParams) {
        let buildResult = this.buildSql(sql, dbParams || []);
        return new Promise((resolve, reject) => {
            if (this.currentConnection) {
                this.currentConnection.query(buildResult.sql, buildResult.params, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            }
            else {
                this.pool.getConnection((err, connection) => {
                    if (err) {
                        reject(err);
                    } else {
                        connection.query(buildResult.sql, buildResult.params, (err, result) => {
                            connection.destroy();
                            if (err) {
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });
                    }
                });
            }
        });
    }

    async beginTransaction(level) {
        return new Promise((resolve, reject) => {
            if (this.currentConnection) {
                this.currentConnection.beginTransaction((err) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        if (level) {
                            this.setIsolationLevel(level).then(() => {
                                resolve(this.currentConnection);
                            }, (err) => {
                                reject(err);
                            });
                        } else {
                            resolve(this.currentConnection);
                        }
                    }
                });
            }
            else {
                this.pool.getConnection((err, connection) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        this.currentConnection = connection;
                        connection.beginTransaction((err) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                if (level) {
                                    this.setIsolationLevel(level).then(() => {
                                        resolve(connection);
                                    }, (err) => {
                                        reject(err);
                                    });
                                } else {
                                    resolve(connection);
                                }
                            }
                        });
                    }
                });
            }
        });
    }

    async rollbackTransaction() {
        return new Promise((resolve, reject) => {
            if (this.currentConnection) {
                this.currentConnection.rollback(() => {
                    try {
                        this.currentConnection.destroy();
                    }
                    catch (e) {
                    }
                    finally {
                        this.currentConnection = null;
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    async commitTransaction() {
        return new Promise((resolve, reject) => {
            if (this.currentConnection) {
                this.currentConnection.commit(async (err) => {
                    if (err) {
                        await this.rollbackTransaction();
                    } else {
                        try {
                            this.currentConnection.destroy();
                        }
                        catch (e) {
                        }
                        finally {
                            this.currentConnection = null;
                        }
                    }
                    resolve();
                });
            } else {
                resolve();
            }
        });

    }

    async setIsolationLevel(level) {
        return new Promise(async (resolve, reject) => {
            if (this.currentConnection) {
                try {
                    await this.execute('SET SESSION tx_isolation=\'' + level + '\' ');
                    resolve();
                } catch (e) {
                    reject(e);
                }
            } else {
                resolve();
            }
        });
    }
}

module.exports = MySql;
