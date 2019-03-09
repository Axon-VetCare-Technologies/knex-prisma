import Knex = require('knex');
import { QueryBuilder, Transaction } from 'knex';
import cuid from 'cuid';
import { IntrospectionFieldType } from './knex-prisma-generate';

export interface IKnexPrismaUtilProps {
  knex: Knex;
  schema: string;
}

interface IProps extends IKnexPrismaUtilProps {
  fields: { [name: string]: { [name: string]: string } };
  fieldTypes: { [name: string]: { [name: string]: string } };
}

interface WhereSimplePart {
  field: string;
  operator: '=' | '<' | 'contains';
  value: any;
  fieldType: IntrospectionFieldType;
}

const DATE_TEMPLATE = 'YYYY-MM-DD HH24:MI:SS:MSZ';

export class KnexPrismaUtil {
  private k: Knex;
  constructor(private props: IProps) {
    this.k = props.knex;
  }

  /**
   * Construct a flat where clause given a prisma <table>WhereInput
   *
   * @param prismaWhereObject - an object defined in generated prisma client that defines a where clause
   * @param tableName
   */

  whereBuilderSimple(
    prismaWhereObject: object,
    tableName: string,
    name?: string
  ) {
    return (builder: Knex) => {
      const parts: WhereSimplePart[] = [];

      for (let prismaWhereKey in prismaWhereObject) {
        const table = this.props.fields[tableName];
        const part: WhereSimplePart = {} as any;
        const field = table[prismaWhereKey];
        if (field) {
          // great - referencing field directly, but be =
          part.operator = '=';
          part.field = prismaWhereKey;
        } else {
          // derive operator
          if (prismaWhereKey.endsWith('_lt')) {
            part.operator = '<';
            part.field = prismaWhereKey.substring(0, prismaWhereKey.length - 3);
          } else if (prismaWhereKey.endsWith('_contains')) {
            part.operator = 'contains';
            part.field = prismaWhereKey.substring(0, prismaWhereKey.length - 9);
          } else {
            console.log(table);
            throw new Error(`'Unsupported Operator ${prismaWhereKey}`);
          }
        }
        part.value = prismaWhereObject[prismaWhereKey];
        if (part.value !== undefined) {
          part.fieldType = this.props.fieldTypes[tableName][
            part.field
          ] as IntrospectionFieldType;
          parts.push(part);
        }
      }
      parts.forEach(part => {
        if (part.operator === 'contains') {
          // strpos( string, substring ) > 0
          builder.whereRaw(
            `strpos(${name ? `"${name}"` + '.' : ''}"${part.field}", '${
              part.value
            }') > 0`
          );
        } else {
          if (part.fieldType === 'DateTime') {
            builder.whereRaw(
              `EXTRACT(EPOCH FROM  ${name ? `"${name}"` + '.' : ''}"${
                part.field
              }") ${part.operator} EXTRACT(EPOCH FROM  to_timestamp('${
                part.value
              }', '${DATE_TEMPLATE}'))` //String(part.value).substring(0, 19) +'Z'
            );
          } else {
            builder.where(
              `${name ? `${name}` + '.' : ''}${part.field}`,
              part.operator,
              part.value
            );
          }
        }
      });
    };
  }

  whereBuilderInSelect(fieldName: string, subQuery: QueryBuilder) {
    return (builder: Knex) => {
      builder.whereIn(fieldName, subQuery);
    };
  }

  async insert<R>(
    prismaCreateInput: any,
    tableName: string,
    trx?: Transaction,
    id?: string
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const now = prismaNow();
      const insertObj = {
        id: id || cuid(),
        createdAt: now,
        updatedAt: now,
        ...prismaCreateInput,
      };
      const base = trx ? trx : this.k;
      base(`${this.props.schema}.${tableName}`)
        .returning(Object.keys(insertObj))
        .insert(insertObj)
        .then((result: R[]) => {
          resolve(result[0]);
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  async delete(
    prismaWhereInput: any,
    tableName: string,
    trx?: Transaction
  ): Promise<number> {
    const base = trx ? trx : this.k;
    return base(`${this.props.schema}.${tableName}`)
      .where(this.whereBuilderSimple(prismaWhereInput, tableName))
      .del();
  }

  async updateOne<O>(
    prismaWhereInput: any,
    data: any,
    tableName: string,
    trx?: Transaction
  ): Promise<O> {
    const base = trx ? trx : this.k;
    const updateArray = await base(`${this.props.schema}.${tableName}`)
      .where(this.whereBuilderSimple(prismaWhereInput, tableName))
      .update(
        this.conditionUpdateDate(tableName, data),
        this.getReturnColumns(tableName)
      );
    return updateArray[0];
  }

  private conditionUpdateDate(tableName: string, data: object): object {
    const types = this.props.fieldTypes[tableName];
    const keys = Object.keys(types);
    const retVal: any = data; // same as original
    keys.forEach(key => {
      const type: IntrospectionFieldType = types[key] as IntrospectionFieldType;
      const curData = data[key];
      if (!(typeof curData === 'undefined')) {
        switch (type) {
          case 'DateTime':
            // truncate to seconds because Postgres makes it incredibly painful to deal with milliseconds
            // todo: add millisecond precision
            retVal[key] = curData.substring(0, 19);
            break;
          default:
          // same
        }
      }
    });
    return retVal;
  }

  private getReturnColumns(tableName: string): string[] {
    const retVal: string[] = [];
    const types = this.props.fieldTypes[tableName];
    const keys = Object.keys(types);
    keys.forEach(key => {
      const type: IntrospectionFieldType = types[key] as IntrospectionFieldType;
      switch (type) {
        case 'Relation':
        case 'Unknown':
          // ignore
          break;
        default:
          retVal.push(key);
      }
    });
    return retVal;
  }

  public expandFields(tableName: string, queryName: string = ''): string[] {
    const fields = this.props.fieldTypes[tableName];
    const keys = Object.keys(fields);
    const fieldArray: any[] = [];
    keys.forEach(key => {
      const type: IntrospectionFieldType = fields[
        key
      ] as IntrospectionFieldType;
      switch (type) {
        case 'DateTime':
          fieldArray.push(
            this.k.raw(
              `to_char(${
                queryName ? `"${queryName}".` : ''
              }"${key}", '${DATE_TEMPLATE}') as "${key}"`
            )
          );
          break;
        case 'Json':
          fieldArray.push(
            this.k.raw(
              `${queryName ? `"${queryName}"` + '.' : ''}"${key}"::json`
            )
          );
          break;
        case 'Unknown':
        case 'Relation':
          break; // skip
        default:
          if (queryName) {
            fieldArray.push(this.k.raw(`"${queryName}"."${key}"`));
          } else {
            fieldArray.push(key);
          }
      }
    });
    return fieldArray;
  }

  public toDate(dateString: string) {}

  public withSchema() {
    return this.k.withSchema(this.props.schema);
  }

  public schema(): string {
    return this.props.schema;
  }
}

export function prismaNow(): string {
  return new Date().toISOString();
}
