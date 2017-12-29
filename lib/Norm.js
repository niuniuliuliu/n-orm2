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
                if (arguments[i].prototype.orm) delete arguments[i].prototype.orm;
                Object.defineProperty(arguments[i].prototype, 'orm', {
                    value: this,
                    configurable: true,
                    enumerable: false
                });
                this.entitys[arguments[i].prototype.entityKey] = arguments[i];
            }
        }
        return this;
    }
}

module.exports = Norm;