import mysql from 'mysql2/promise';
import crypto from 'crypto';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'warungppl_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

export class MysqlQueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private columns: string = '*';
  private whereClauses: Array<{ col: string; op: string; val: any }> = [];
  private orderClauses: string[] = [];
  private isSingle: boolean = false;
  private limitValue: number | null = null;
  private offsetValue: number | null = null;
  private insertValues: any[] = [];
  private updateValues: Record<string, any> = {};

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string = '*') {
    this.columns = cols;
    return this;
  }

  eq(col: string, val: any) {
    this.whereClauses.push({ col, op: '=', val });
    return this;
  }

  neq(col: string, val: any) {
    this.whereClauses.push({ col, op: '!=', val });
    return this;
  }

  gt(col: string, val: any) {
    this.whereClauses.push({ col, op: '>', val });
    return this;
  }

  gte(col: string, val: any) {
    this.whereClauses.push({ col, op: '>=', val });
    return this;
  }

  lt(col: string, val: any) {
    this.whereClauses.push({ col, op: '<', val });
    return this;
  }

  lte(col: string, val: any) {
    this.whereClauses.push({ col, op: '<=', val });
    return this;
  }

  is(col: string, val: any) {
    if (val === null) {
      this.whereClauses.push({ col, op: 'IS', val: null });
    } else {
      this.whereClauses.push({ col, op: '=', val });
    }
    return this;
  }

  in(col: string, values: any[]) {
    if (!values || values.length === 0) {
      this.whereClauses.push({ col, op: 'IN', val: [null] });
    } else {
      this.whereClauses.push({ col, op: 'IN', val: values });
    }
    return this;
  }

  ilike(col: string, pattern: string) {
    this.whereClauses.push({ col, op: 'LIKE', val: pattern });
    return this;
  }

  like(col: string, pattern: string) {
    this.whereClauses.push({ col, op: 'LIKE', val: pattern });
    return this;
  }

  match(query: Record<string, any>) {
    Object.entries(query).forEach(([col, val]) => {
      this.whereClauses.push({ col, op: '=', val });
    });
    return this;
  }

  order(col: string, opts: { ascending?: boolean } = {}) {
    const dir = opts.ascending === false ? 'DESC' : 'ASC';
    this.orderClauses.push(`\`${col}\` ${dir}`);
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetValue = from;
    this.limitValue = Math.max(0, to - from + 1);
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  insert(data: any | any[]) {
    this.action = 'insert';
    this.insertValues = Array.isArray(data) ? data : [data];
    return this;
  }

  update(data: Record<string, any>) {
    this.action = 'update';
    this.updateValues = data;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  private buildWhere(params: any[]): string {
    if (this.whereClauses.length === 0) return '';
    const wh = this.whereClauses
      .map((w) => {
        if (w.op === 'IN') {
          const arr = Array.isArray(w.val) ? w.val : [w.val];
          arr.forEach((v) => params.push(v));
          const pl = arr.map(() => '?').join(', ');
          return `\`${w.col}\` IN (${pl || 'NULL'})`;
        }
        if (w.op === 'IS' && w.val === null) {
          return `\`${w.col}\` IS NULL`;
        }
        params.push(w.val);
        return `\`${w.col}\` ${w.op} ?`;
      })
      .join(' AND ');
    return ` WHERE ${wh}`;
  }

  async execute(): Promise<{ data: any; error: any }> {
    try {
      if (this.action === 'select') {
        let sql = `SELECT ${this.columns} FROM \`${this.table}\``;
        const params: any[] = [];
        sql += this.buildWhere(params);

        if (this.orderClauses.length > 0) {
          sql += ` ORDER BY ${this.orderClauses.join(', ')}`;
        }

        if (this.isSingle) {
          sql += ` LIMIT 1`;
        } else if (this.limitValue !== null) {
          if (this.offsetValue !== null) {
            sql += ` LIMIT ${Number(this.offsetValue)}, ${Number(this.limitValue)}`;
          } else {
            sql += ` LIMIT ${Number(this.limitValue)}`;
          }
        }

        const [rows]: any = await pool.query(sql, params);
        if (this.isSingle) {
          return { data: rows[0] || null, error: null };
        }
        return { data: rows, error: null };
      }

      if (this.action === 'insert') {
        const insertedRows: any[] = [];
        for (const item of this.insertValues) {
          const row = { ...item };
          if (!row.id) {
            row.id = crypto.randomUUID();
          }
          if (row.items && typeof row.items === 'object') {
            row.items = JSON.stringify(row.items);
          }
          const keys = Object.keys(row);
          const cols = keys.map((k) => `\`${k}\``).join(', ');
          const placeholders = keys.map(() => '?').join(', ');
          const vals = keys.map((k) => row[k]);

          await pool.query(
            `INSERT INTO \`${this.table}\` (${cols}) VALUES (${placeholders})`,
            vals
          );
          insertedRows.push(row);
        }
        return {
          data: this.isSingle ? insertedRows[0] : insertedRows,
          error: null,
        };
      }

      if (this.action === 'update') {
        const keys = Object.keys(this.updateValues);
        const setClauses = keys.map((k) => `\`${k}\` = ?`).join(', ');
        const vals: any[] = keys.map((k) => {
          const v = this.updateValues[k];
          if (k === 'items' && typeof v === 'object') return JSON.stringify(v);
          return v;
        });

        let sql = `UPDATE \`${this.table}\` SET ${setClauses}`;
        sql += this.buildWhere(vals);

        const [result]: any = await pool.query(sql, vals);
        return { data: result, error: null };
      }

      if (this.action === 'delete') {
        let sql = `DELETE FROM \`${this.table}\``;
        const vals: any[] = [];
        sql += this.buildWhere(vals);

        const [result]: any = await pool.query(sql, vals);
        return { data: result, error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      console.error(`[MySQL Error in ${this.table}]:`, err?.message || err);
      return { data: null, error: err };
    }
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export const mysqlClient = {
  from: (table: string) => new MysqlQueryBuilder(table),
};
