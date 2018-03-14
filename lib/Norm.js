let MySql = require('./MySql');
let SqlServer = require('./SqlServer');
let BaseEntity = require('./BaseEntity');

class Norm {
    constructor({type, server, database, user, password, port} = {}) {
        this.entitys = {};
        this.options = {
            beforeInsert: null,
            beforeUpdate: null,
            beforeDelete: null
        };
        type = (type || '').toLowerCase();
        switch (type) {
            case 'mysql':
                this.db = new MySql({
                    server: server,
                    database: database,
                    user: user,
                    password: password,
                    port: port
                });
                break;
            case 'mssql':
                this.db = new SqlServer({
                    server: server,
                    database: database,
                    user: user,
                    password: password,
                    port: port
                });
                break;
            default:
                throw new Error("invalid database type");
        }
    }

    defineEntity() {
        for (let i = 0; i < arguments.length; i++) {
            if (arguments[i].prototype && arguments[i].prototype instanceof BaseEntity) {
                this.entitys[arguments[i].prototype.entityKey] = arguments[i];
            }
        }
        return this;
    }

    getEntity(entityKey) {
        if (!this.entitys[entityKey]) throw new Error('entity key is not defined');
        let Entity = this.entitys[entityKey];
        let orm = this;

        let NewEntity = class extends BaseEntity {
            constructor(obj) {
                super(obj);
                Object.defineProperty(this, 'orm', {
                    value: orm,
                    configurable: true,
                    enumerable: false
                });
            }
        };
        NewEntity.prototype['tableName'] = Entity.prototype['tableName'];
        NewEntity.prototype['entityKey'] = Entity.prototype['entityKey'];
        NewEntity.prototype['columns'] = Entity.prototype['columns'];
        NewEntity.prototype['relations'] = Entity.prototype['relations'];

        return NewEntity;
    }
}

module.exports = Norm;