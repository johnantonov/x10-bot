"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.user_articles_db = void 0;
const BaseModel_1 = require("../BaseModel");
const dotenv = __importStar(require("dotenv"));
const db_1 = __importDefault(require("../db"));
dotenv.config();
class ArticlesModel extends BaseModel_1.BaseModel {
    constructor(pool) {
        super('user_articles', pool);
    }
    updateArticle(chat_id, key) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const query = `SELECT * FROM user_articles WHERE user_id = $1`;
                const data = yield this.pool.query(query, [chat_id]);
                let articles = (_b = (_a = data.rows[0]) === null || _a === void 0 ? void 0 : _a.articles) !== null && _b !== void 0 ? _b : [];
                articles.unshift(key);
                const marketing_cost = {};
                if (articles.length > 5) {
                    articles = articles.slice(0, 5);
                }
                yield this.update('user_id', chat_id, { articles, marketing_cost }, ['user_id']);
            }
            catch (e) {
                console.error(e);
            }
        });
    }
    updateField(chat_id, key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `
        UPDATE user_articles 
        SET ${key === 'name' ? 'name' : 'self_cost'} = $1 
        WHERE user_id = $2
      `;
                yield this.pool.query(query, [value, chat_id]);
            }
            catch (e) {
                console.error('Error updating field:', e);
            }
        });
    }
    deleteArticle(chat_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `DELETE FROM user_articles WHERE user_id = $1`;
                yield this.pool.query(query, [chat_id]);
            }
            catch (e) {
                console.error('Error deleting article:', e);
            }
        });
    }
    selectArticle(user_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const query = `SELECT * FROM user_articles WHERE user_id = $1`;
                const res = yield this.pool.query(query, [user_id]);
                if (res.rows.length > 0) {
                    const article = res.rows[0];
                    article.article = article.articles[0];
                    return article;
                }
                else {
                    return null;
                }
            }
            catch (e) {
                console.error('postgres: ' + e);
            }
        });
    }
    addMarketingCost(user_id, marketingCost) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const query = `SELECT marketing_cost FROM user_articles WHERE user_id = $1`;
                const result = yield this.pool.query(query, [user_id]);
                let currentMarketingCost = ((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.marketing_cost) || {};
                for (const [date, cost] of Object.entries(marketingCost)) {
                    if (cost !== 0 || !(date in currentMarketingCost)) {
                        currentMarketingCost[date] = cost;
                    }
                }
                const sortedDates = Object.keys(currentMarketingCost).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
                const latest30Days = sortedDates.slice(0, 30);
                const updatedMarketingCost = latest30Days.reduce((obj, date) => {
                    obj[date] = currentMarketingCost[date];
                    return obj;
                }, {});
                const updateQuery = `
        UPDATE user_articles 
        SET marketing_cost = $1 
        WHERE user_id = $2
      `;
                yield this.pool.query(updateQuery, [updatedMarketingCost, user_id]);
            }
            catch (e) {
                console.error('Error updating marketing cost:', e);
            }
        });
    }
}
exports.user_articles_db = new ArticlesModel(db_1.default);
