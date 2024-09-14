"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseModel = void 0;
class BaseModel {
    constructor(tableName, pool) {
        this.tableName = tableName;
        this.pool = pool;
    }
    insert(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = Object.keys(data).join(', ');
            const values = Object.values(data);
            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
            const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
            yield this.pool.query(query, values);
        });
    }
    delete(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `DELETE FROM ${this.tableName} WHERE ${String(key)} = $1`;
            yield this.pool.query(query, [value]);
        });
    }
    select(whereClause) {
        return __awaiter(this, void 0, void 0, function* () {
            const conditions = Object.keys(whereClause)
                .map((key, index) => `${key} = $${index + 1}`)
                .join(' AND ');
            const values = Object.values(whereClause);
            const query = `SELECT * FROM ${this.tableName} WHERE ${conditions}`;
            const result = yield this.pool.query(query, values);
            return result;
        });
    }
    update(key, keyValue, data, uniqueColumns) {
        return __awaiter(this, void 0, void 0, function* () {
            const columns = Object.keys(data);
            const columnNames = columns.map((col) => `"${col}"`).join(', ');
            const valuePlaceholders = columns.map((_, index) => `$${index + 1}`).join(', ');
            const conflictColumns = uniqueColumns.map((col) => `"${String(col)}"`).join(', ');
            const conflictAction = columns
                .filter((col) => !uniqueColumns.includes(col))
                .map((col) => `"${col}" = EXCLUDED."${col}"`)
                .join(', ');
            const values = [...Object.values(data), keyValue];
            const query = `
      INSERT INTO ${this.tableName} (${columnNames}, "${String(key)}")
      VALUES (${valuePlaceholders}, $${values.length})
      ON CONFLICT (${conflictColumns})  -- Учитываем все уникальные столбцы
      DO UPDATE SET ${conflictAction};
    `;
            yield this.pool.query(query, values);
        });
    }
}
exports.BaseModel = BaseModel;
