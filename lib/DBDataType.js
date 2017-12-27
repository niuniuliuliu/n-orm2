'use strict';
const DBDataTypes = {
    Char(n) {
        return {type: DBDataTypes.Char, length: n};
    },
    NChar(n) {
        return {type: DBDataTypes.NChar, length: n};
    },
    VarChar(n) {
        return {type: DBDataTypes.VarChar, length: n};
    },
    NVarChar(n) {
        return {type: DBDataTypes.NVarChar, length: n};
    },
    TinyText() {
        return {type: DBDataTypes.TinyText};
    },
    Text() {
        return {type: DBDataTypes.Text};
    },
    NText() {
        return {type: DBDataTypes.NText};
    },
    MediumText() {
        return {type: DBDataTypes.MediumText};
    },
    LongText() {
        return {type: DBDataTypes.LongText};
    },
    TinyInt() {
        return {type: DBDataTypes.TinyInt};
    },
    SmallInt() {
        return {type: DBDataTypes.SmallInt};
    },
    MediumInt() {
        return {type: DBDataTypes.MediumInt};
    },
    Int() {
        return {type: DBDataTypes.Int};
    },
    BigInt() {
        return {type: DBDataTypes.BigInt};
    },
    Float(p, s) {
        return {type: DBDataTypes.Float, precision: p, scale: s};
    },
    Double(p, s) {
        return {type: DBDataTypes.Double, precision: p, scale: s};
    },
    Decimal(p, s) {
        return {type: DBDataTypes.Decimal, precision: p, scale: s};
    },
    Numeric(p, s) {
        return {type: DBDataTypes.Numeric, precision: p, scale: s};
    },
    SmallMoney() {
        return {type: DBDataTypes.SmallMoney};
    },
    Money() {
        return {type: DBDataTypes.Money};
    },
    Real() {
        return {type: DBDataTypes.Real};
    },
    TinyBlob() {
        return {type: DBDataTypes.TinyBlob};
    },
    MediumBlob() {
        return {type: DBDataTypes.MediumBlob};
    },
    Blob() {
        return {type: DBDataTypes.Blob};
    },
    LongBlob() {
        return {type: DBDataTypes.LongBlob};
    },
    Date() {
        return {type: DBDataTypes.Date};
    },
    Time() {
        return {type: DBDataTypes.Time};
    },
    SmallDateTime() {
        return {type: DBDataTypes.SmallDateTime};
    },
    DateTime() {
        return {type: DBDataTypes.DateTime};
    },
    DateTime2() {
        return {type: DBDataTypes.DateTime2};
    },
    TimeStamp() {
        return {type: DBDataTypes.TimeStamp};
    },
    DateTimeOffset() {
        return {type: DBDataTypes.DateTimeOffset};
    },
    Bit() {
        return {type: DBDataTypes.Bit};
    },
    Binary(n) {
        return {type: DBDataTypes.Binary, length: n};
    },
    VarBinary(n) {
        return {type: DBDataTypes.VarBinary, length: n};
    },
    Image() {
        return {type: DBDataTypes.Image};
    },
    Xml() {
        return {type: DBDataTypes.Xml};
    },
    UniqueIdentifier() {
        return {type: DBDataTypes.UniqueIdentifier};
    },
    Cursor() {
        return {type: DBDataTypes.Cursor};
    },
    Table() {
        return {type: DBDataTypes.Table};
    }
};

module.exports = DBDataTypes;