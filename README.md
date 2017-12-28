# n-orm2
a nodejs orm framework

## Connect to Database
supported database: Sql-Server(mssql), MySql(mysql)
```
let Norm = require('n-orm2');
let orm = Norm.connect({
    type: 'mysql',
    server: 'localhost',
    database: 'test',
    user: 'sa',
    password: 'sa'
});
```

## DBParam(name, value, type)
```
let param = Norm.DBParam('id','1111',Norm.DBDataType.VarChar(40));
```

## db

### execute(sql, dbParams)
```
let result = await orm.db.execute('update test set name=1 where id=@id', [DBParam('id'),1]);
```

### getTable (sql, dbParams)
```
let result = await orm.db.getTable('select * from test where id=@id', [DBParam('id'),1]);
```

### getTablePage(sql, dbParams, pageIndex, pageSize, orderBy)
```
let result = await orm.db.getTable('select * from test where id=@id', [DBParam('id'),1],1,10,'id');
```

### getTableCount(sql, dbParams)
```
let result = await orm.db.getTable('select * from test where id=@id', [DBParam('id'),1],1,10,'id');
```

### beginTransaction(level)
```
await orm.db.beginTransaction();
```
level:
READ-UNCOMMITTED
READ-COMMITTED
REPEATABLE-READ
SERIALIZABLE

## ORM

### define entity
```
class TestEntity extends Norm.BaseEntity {
    constructor(obj) {
        super(obj);
    }
}

Object.defineProperty(TestEntity.prototype, 'tableName', {
    value: 'test',
    enumerable: false
});
Object.defineProperty(TestEntity.prototype, 'entityKey', {
    value: 'Test',
    enumerable: false
});
Object.defineProperty(TestEntity.prototype, 'columns', {
    value: [
        {name: 'id', ispk: true, defaultVal: 'uuid', type: Norm.DBDataType.VarChar(40)},
        {name: 'name', ispk: false},
    ],
    enumerable: false
});
Object.defineProperty(TestEntity.prototype, 'relations', {
    value: [
        {
            propertyName: 'details',
            column: 'id',
            refColumn: 'testId',
            entityKey: 'TestDetail',
            relationType: 'OneToMany'
        }
    ],
    enumerable: false
});
orm.defineEntity(TestEntity);
```

### query
```
let testEntity = new orm.entitys.Test();
let result = await testEntity.find({id: 1}).orderBy('code desc').only().query();
```

### save
```
let testEntity = new orm.entitys.Test({
        id: '1',
        name: 'test'
    });
let result = await testEntity.save();
```

### del
```
let result = await testEntity.del();
```