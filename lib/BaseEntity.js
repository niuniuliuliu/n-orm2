let DBParam = require('./DBParam');
queryCondition = Symbol();
let read = Symbol();
let buildQuerySql = Symbol();
let getCount = Symbol();
let getEntityCount = Symbol();
let create = Symbol();
let update = Symbol();
let del = Symbol();

class BaseEntity {
    constructor(obj) {
        for (let item in obj) {
            let columns = this.columns.filter(x => x.name.toLowerCase() === item.toLowerCase());
            if (columns.length !== 0) {
                this[columns[0].name] = obj[item];
            } else {
                let props = (this.relations || []).filter(x => x.propertyName.toLowerCase() === item.toLowerCase());
                if (props.length !== 0)
                    this[props[0].propertyName] = obj[item];
            }
        }
        this.clearQueryCondition();
    }

    instance(obj) {
        let Entity = this.orm.getEntity(this.entityKey);
        return new Entity(obj);
    }

    find(obj) {
        for (let item in obj) {
            this[queryCondition].conditions.push({name: item, op: '=', value: obj[item]});
        }
        return this;
    }

    condition(condition) {
        this[queryCondition].conditions.push(condition);
        return this;
    }

    orCondition(condition) {
        this[queryCondition].orConditions.push(condition);
        return this;
    }

    paramSql(paramSql) {
        this[queryCondition].paramSqls.push(paramSql);
        return this;
    }

    where(where) {
        this[queryCondition].where += (where || '');
        return this;
    }

    only() {
        this[queryCondition].only = true;
        return this;
    }

    orderBy(orderBy) {
        this[queryCondition].orderBy = (orderBy || '');
        return this;
    }

    page(pageIndex, pageSize) {
        this[queryCondition].page = {pageIndex: pageIndex || 1, pageSize: pageSize || 10};
        return this;
    }

    clearQueryCondition() {
        this[queryCondition] = {
            page: null,
            conditions: [],
            orConditions: [],
            paramSqls: [],
            where: '',
            orderBy: '',
            only: false
        };
    }

    async query({cascade = true} = {}) {
        if (this[queryCondition].page && this[queryCondition].orderBy === '') throw 'orderBy must be provided when query with page';
        let result = await this[read](this, this[queryCondition], cascade);
        this.clearQueryCondition();
        return result;
    }

    async save({cascade = true} = {}) {
        let conditions = [];
        let pks = this.columns.filter((x) => x.ispk);
        for (let item of pks) {
            if (this[item.name])
                conditions.push({name: item.name, op: '=', value: this[item.name]});
        }
        let count = 0;
        if (pks.length > 0 && conditions.length === pks.length)
            count = await this[getEntityCount](this);
        let result = null;
        if (count === 0) {
            if (this.orm.options && this.orm.options.beforeInsert)
                this.orm.options.beforeInsert(this);
            result = await this[create](this, cascade);
        }
        else {
            if (this.orm.options && this.orm.options.beforeUpdate)
                this.orm.options.beforeUpdate(this);
            result = await this[update](this, cascade);
        }
        return result;
    }

    async count() {
        let count = await this[getCount](this, this[queryCondition]);
        this.clearQueryCondition();
        return count;
    }

    async del({cascade = true} = {}) {
        if (this.orm.options && this.orm.options.beforeDelete)
            this.orm.options.beforeDelete(this);
        let result = await this[del](this, cascade);
        return result;
    }

    [buildQuerySql](entity, relations, queryCondition) {
        let joinSqls = [];
        let displayColumns = entity.columns.filter(x => !x.hide).map(x => 't1.' + x.name + ' ' + x.name);
        let castCount = 1;
        let join = (relation, tableName) => {
            let E = this.orm.getEntity(relation.entityKey);
            let castName = 't' + ++castCount;
            displayColumns.push(...E.prototype.columns.filter(x => !x.hide).map(x => `${castName}.${x.name} ${castName}_${x.name}`));
            let rs = (E.prototype.relations || []).filter(x => x.relationType === 'OneToOne').map(x => Object.create(x));
            relation.castName = castName;
            relation.relations = rs;
            relation.E = E;
            joinSqls.push(`left join ${E.prototype.tableName} ${castName} on ${tableName}.${relation.column}=${castName}.${relation.refColumn}`);
            rs.forEach((r) => {
                join(r, castName);
            });
        };
        relations.forEach((r) => {
            join(r, 't1');
        });
        let params = [];
        let buildCondition = (conditions) => {
            let arr = [];
            for (let item of conditions) {
                let queryColumn = entity.columns.filter(x => x.name.toLowerCase() === item.name.toLowerCase())[0];
                if (!queryColumn) continue;
                let columnName = `t1.${queryColumn.name}`;
                switch (item.op) {
                    case '=':
                    case '!=':
                    case '<>':
                    case '>':
                    case '>=':
                    case '<':
                    case '<=':
                    case 'like':
                        arr.push(`${columnName} ${item.op} @param${params.length + 1}`);
                        params.push(DBParam(`param${params.length + 1}`, item.value, queryColumn.type));
                        break;
                    case 'between':
                        if (!(Array.isArray(item.value) && item.value.length === 2))
                            throw 'between param should be an array with length 2';
                        arr.push(`${columnName} between @param${params.length + 1} and @param${params.length + 2}`);
                        params.push(DBParam(`param${params.length + 1}`, item.value[0], queryColumn.type));
                        params.push(DBParam(`param${params.length + 1}`, item.value[1], queryColumn.type));
                        break;
                    case 'not in':
                    case 'in':
                        if (!(Array.isArray(item.value) && item.value.length > 0))
                            throw 'in param should be a non-empty array';
                        let s = `${columnName} ${item.op} (`;
                        for (let i = 0; i < item.value.length; i++) {
                            s += `@param${params.length + 1}`;
                            if (i !== item.value.length - 1)
                                s += ',';
                            else
                                s += ')';
                            params.push(DBParam(`param${params.length + 1}`, item.value[i], queryColumn.type));
                        }
                        arr.push(s);
                        break;
                }
            }
            return arr;
        };
        let sql = `select ${displayColumns.join(',')} from ${ entity.tableName } t1\r\n ${joinSqls.join('\r\n')} where 1=1 `;
        if (queryCondition.conditions && queryCondition.conditions.length > 0) {
            let conditions = buildCondition(queryCondition.conditions);
            if (conditions.length > 0)
                sql += 'and ' + conditions.join(' and ');
        }
        if (queryCondition.orConditions && queryCondition.orConditions.length > 0) {
            let conditions = buildCondition(queryCondition.orConditions);
            if (conditions.length > 0)
                sql += ' and (' + conditions.join(' or ') + ')';
        }
        if (queryCondition.paramSqls) {
            for (let item of queryCondition.paramSqls) {
                sql += ` ${item.sql || ''}`;
                if (item.dbParams && Array.isArray(item.dbParams))
                    params.push(...item.dbParams);
            }
        }
        if (queryCondition.where)
            sql += ` ${queryCondition.where}`;
        return {sql: sql, dbParams: params};
    }

    async [read](entity, queryCondition, cascade) {
        let relations = (entity.relations || []).filter(x => x.relationType === 'OneToOne').map(x => Object.create(x));
        let br = this[buildQuerySql](entity, relations, queryCondition);
        let rows = null;
        if (queryCondition.page) {
            rows = await this.orm.db.getTablePage(br.sql, br.dbParams, queryCondition.page.pageIndex, queryCondition.page.pageSize, queryCondition.orderBy);
        } else {
            if (queryCondition.orderBy)
                br.sql += ` order by ${queryCondition.orderBy}`;
            rows = await this.orm.db.getTable(br.sql, br.dbParams);
        }
        let buildResult = (relation, row, refEntity) => {
            let e = new relation.E();
            relation.E.prototype.columns.forEach((column) => {
                let queryName = relation.castName + '_' + column.name;
                if (!column.hide && row[queryName] !== undefined) {
                    e[column.name] = row[queryName];
                    delete row[queryName];
                }
            });
            refEntity[relation.propertyName] = e;
            relation.relations.forEach(r => {
                buildResult(r, row, e);
            });
        };
        let entitys = [];
        rows.forEach((row, index) => {
            let rowEntity = entity.instance(row);
            relations.forEach(r => {
                buildResult(r, row, rowEntity);
            });
            entitys.push(rowEntity);
        });

        let readOneToMany = async (relation, refEntity) => {
            let E = this.orm.getEntity(relation.entityKey);
            let result = await this[read](new E(), {
                conditions: [{
                    name: relation.refColumn,
                    op: '=',
                    value: refEntity[relation.column]
                }],
                orderBy: relation.orderBy || ''
            }, cascade);
            refEntity[relation.propertyName] = result;
        };
        let result = queryCondition.only ? (entitys[0] || null) : entitys;
        if (cascade) {
            let otmRelations = (entity.relations || []).filter(x => x.relationType === 'OneToMany');
            let arr = Array.isArray(result) ? result : (result ? [result] : []);
            for (let e of arr) {
                for (let relation of otmRelations) {
                    await readOneToMany(relation, e);
                }
            }
        }
        return result;
    }

    async [getCount](entity, queryCondition) {
        let relations = (entity.relations || []).filter(x => x.relationType === 'OneToOne').map(x => Object.create(x));
        let br = this[buildQuerySql](entity, relations, queryCondition);
        let total = await this.orm.db.getTableCount(br.sql, br.dbParams);
        return total;
    }

    async [getEntityCount](entity) {
        let dbParams = [];
        let conditions = [];
        let paramCount = 0;
        let pks = this.columns.filter((x) => x.ispk);
        for (let column of pks) {
            if (this[column.name]) {
                let paramName = 'param' + ++paramCount;
                conditions.push(`${column.name}=@${paramName}`);
                dbParams.push(DBParam(paramName, this[column.name], column.type));
            }
        }
        let sql = `select 1 as tmp from ${entity.tableName} where 1=1 and ${conditions.join(' and ')}`;
        let total = await this.orm.db.getTableCount(sql, dbParams);
        return total;
    }

    async [create](entity, cascade) {
        let dbParams = [];
        let insertColumns = [];
        let paramCount = 0;
        for (let column of entity.columns) {
            if (column.name in entity) {
                insertColumns.push(column.name);
                dbParams.push(DBParam('param' + ++paramCount, entity[column.name], column.type));
            }
        }
        let sql = `insert into ${ entity.tableName} (${insertColumns.join(',')}) values (${dbParams.map(x => '@' + x.name).join(',')}) `;
        let result = await this.orm.db.execute(sql, dbParams);
        let aipks = entity.columns.filter((x) => x.ispk && x.ai);
        if (aipks.length > 0 && result.insertId != null) {
            entity[aipks[0].name] = result.insertId;
        }
        if (cascade) {
            let otmRelations = (entity.relations || []).filter(x => x.relationType === 'OneToMany');
            for (let relation of otmRelations) {
                let otmArr = entity[relation.propertyName];
                if (otmArr && Array.isArray(otmArr)) {
                    for (let i = 0; i < otmArr.length; i++) {
                        let item = otmArr[i];
                        item[relation.refColumn] = entity[relation.column];
                        let E = this.orm.getEntity(relation.entityKey);
                        let e = new E(item);
                        otmArr[i] = e;
                        await e.save({cascade: cascade});
                    }
                }
            }
        }
        return entity;
    }

    async [update](entity, cascade) {
        let dbParams = [];
        let updateColumns = [];
        let conditions = [];
        let paramCount = 0;
        let pks = entity.columns.filter((x) => x.ispk);
        if (pks.length === 0) throw 'update should have a primary key';
        for (let column of pks) {
            if (!(column.name in entity)) throw 'primary key is not set';
            let paramName = 'param' + ++paramCount;
            conditions.push(`${column.name}=@${paramName}`);
            dbParams.push(DBParam(paramName, entity[column.name], column.type));
        }
        for (let column of entity.columns) {
            if (column.name in entity && !column.ispk) {
                let paramName = 'param' + ++paramCount;
                updateColumns.push(`${column.name}=@${paramName}`);
                dbParams.push(DBParam(paramName, entity[column.name], column.type));
            }
        }
        if (cascade) {
            let otmRelations = (entity.relations || []).filter(x => x.relationType === 'OneToMany');
            for (let relation of otmRelations) {
                let otmArr = entity[relation.propertyName];
                if (otmArr && Array.isArray(otmArr) && entity[relation.column]) {
                    let E = this.orm.getEntity(relation.entityKey);
                    let refColumn = E.prototype.columns.filter(x => x.name.toLowerCase() === relation.refColumn.toLowerCase())[0];
                    await this.orm.db.execute(`delete from ${E.prototype.tableName} where ${relation.refColumn}=@param`, [
                        DBParam('param', entity[relation.column], refColumn.type)
                    ]);
                    for (let i = 0; i < otmArr.length; i++) {
                        let item = otmArr[i];
                        item[relation.refColumn] = entity[relation.column];
                        let e = new E(item);
                        otmArr[i] = e;
                        await e.save({cascade: cascade});
                    }
                }
            }
        }
        let sql = `update ${entity.tableName} set ${updateColumns.join(',')} where 1=1 and ${conditions.join(' and ')}`;
        await this.orm.db.execute(sql, dbParams);
        return entity;
    }

    async [del](entity, cascade) {
        let dbParams = [];
        let conditions = [];
        let paramCount = 0;
        let pks = entity.columns.filter((x) => x.ispk);
        if (pks.length === 0) throw 'update should have a primary key';
        for (let column of pks) {
            if (!(column.name in entity)) throw 'primary key is not set';
            let paramName = 'param' + ++paramCount;
            conditions.push(`${column.name}=@${paramName}`);
            dbParams.push(DBParam(paramName, entity[column.name], column.type));
        }
        if (cascade) {
            let otmRelations = (entity.relations || []).filter(x => x.relationType === 'OneToMany');
            for (let relation of otmRelations) {
                if (entity[relation.column]) {
                    let E = this.orm.getEntity(relation.entityKey);
                    let refColumn = E.prototype.columns.filter(x => x.name.toLowerCase() === relation.refColumn.toLowerCase())[0];
                    await this.orm.db.execute(`delete from ${E.prototype.tableName} where ${relation.refColumn}=@param`, [
                        DBParam('param', entity[relation.column], refColumn.type)
                    ]);
                }
            }
        }
        let sql = `delete from ${entity.tableName} where 1=1 and ${conditions.join(' and ')}`;
        await this.orm.db.execute(sql, dbParams);
        return entity;
    }
}

module.exports = BaseEntity;