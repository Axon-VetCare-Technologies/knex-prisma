import { Prisma, prisma } from './generated/prisma-client';
import { IntrospectionObjectType } from 'graphql';

export type IntrospectionFieldType =
  | 'ID'
  | 'String'
  | 'Number'
  | 'DateTime'
  | 'ENUM'
  | 'Boolean'
  | 'Relation'
  | 'Json'
  | 'Unknown';

interface PPIntrospectionObject {
  readonly name: string;
  readonly fields: ReadonlyArray<PPIntrospectionField>;
  readonly inputFields: ReadonlyArray<PPIntrospectionField>;
  readonly objectType: PPObjectType;
}

interface PPIntrospectionField {
  readonly name: string;
  readonly fieldType: IntrospectionFieldType;
}

enum PPObjectType {
  Unknown,
  Table,
}
interface IntrospectionTypeResult {
  __type: IntrospectionObjectType;
}

interface IntrospectionSchemaResult {
  __schema: { types: IntrospectionObjectType[] };
}

interface IntrospectionTables {
  [name: string]: PPIntrospectionObject;
}

class KnexPrismaGenerator {
  private static objects: IntrospectionTables = {};
  constructor(private p: Prisma) {}

  /**
   * Call once at start up.  It introspects the Prisma GraphQL interface and stores results for later use
   */
  async initializeTables(): Promise<any> {
    const introspectionSchemaResult: IntrospectionSchemaResult = await this.p
      .$graphql(`
      query {
  __schema {
    types{
      name
      kind
      }
    }
}
      `);

    for (let i = 0; i < introspectionSchemaResult.__schema.types.length; i++) {
      const obj = introspectionSchemaResult.__schema.types[i];
      const def = await this.getTable(obj.name);
      if (obj.name === 'MessageWhereInputXX') {
        console.log(def);
      }
      KnexPrismaGenerator.objects[obj.name] = def;
    }
  }
  public generateConstants(
    importKnexPrismaDir: string = '../',
    importPrismaDir: string = './prisma-client'
  ): string {
    const resultLines: string[] = [];
    const imports: string[] = [];
    imports.push(
      `import { KnexPrismaUtil, IKnexPrismaUtilProps } from '${importKnexPrismaDir}/knex-prisma-util'`
    );
    imports.push(`import Knex = require('knex');`);
    imports.push(`import { QueryBuilder, Transaction } from 'knex'`);

    // Table Names
    resultLines.push('export const KnexPrismaTables = {');
    this.tables().forEach(tableName => {
      resultLines.push(`  ${tableName}: '${tableName}',`);
    });
    resultLines.push('};');
    resultLines.push('');
    // Field Names
    resultLines.push('export const KnexPrismaFields = {');
    this.tables().forEach(tableName => {
      resultLines.push(`  ${tableName}: {`);
      const table = KnexPrismaGenerator.objects[tableName];
      table.fields.forEach(f => {
        resultLines.push(`    ${f.name}: '${f.name}',`);
      });
      resultLines.push(`  },`);
    });
    resultLines.push('};');
    resultLines.push('');

    // FieldTypes
    resultLines.push('export const KnexPrismaFieldTypes = {');
    this.tables().forEach(tableName => {
      resultLines.push(`  ${tableName}: {`);
      const table = KnexPrismaGenerator.objects[tableName];
      table.fields.forEach(f => {
        resultLines.push(`    ${f.name}: '${f.fieldType}',`);
      });
      resultLines.push(`  },`);
    });
    resultLines.push('};');
    resultLines.push('');

    // QueryOne
    resultLines.push('export class KnexPrismaQueryOne {');
    resultLines.push(
      '    constructor(private knexPrismaUtil: KnexPrismaUtil) {}'
    );
    this.tables().forEach(tableName => {
      const typeName = `${tableName}${'WhereUniqueInput'}`;
      imports.push(`import { ${typeName} } from '${importPrismaDir}'`);
      resultLines.push(`
  async ${tableName}(
    obj: ${typeName},
    fields: string | string[] = '*',
    trx?: Transaction,
    builder?: QueryBuilder
  ): Promise<${tableName}> {
    let result = (builder
      ? builder.withSchema(this.knexPrismaUtil.schema())
      : this.knexPrismaUtil.withSchema());
    if (trx) {
      result = result.transacting(trx);
    }
    const rows = await result
      .select(
        ...(typeof fields === 'string'
          ? fields === '*'
            ? this.knexPrismaUtil.expandFields('${tableName}')
            : [fields]
          : fields)
      )
      .from('${tableName}')
      .where(this.knexPrismaUtil.whereBuilderSimple(obj, '${tableName}'));
    return rows[0];
  }
`);
    });
    resultLines.push('}');
    resultLines.push('');
    // QueryMany
    resultLines.push('export class KnexPrismaQueryMany {');
    resultLines.push(
      '    constructor(private knexPrismaUtil: KnexPrismaUtil) {}'
    );
    this.tables().forEach(tableName => {
      const typeName = `${tableName}${'WhereInput'}`;
      imports.push(`import { ${typeName} } from '${importPrismaDir}'`);
      resultLines.push(
        `
  ${tableName}(
    obj: ${typeName},
    fields: string | string[] = '*',
    trx?: Transaction,
    builder?: QueryBuilder
  ): QueryBuilder {
    let result = builder
      ? builder.withSchema(this.knexPrismaUtil.schema())
      : this.knexPrismaUtil.withSchema();
    if (trx) {
      result = result.transacting(trx);
    }
    result
      .select(
        ...(typeof fields === 'string'
          ? fields === '*'
            ? this.knexPrismaUtil.expandFields('${tableName}')
            : [fields]
          : fields)
      )
      .from('${tableName}')
      .where(this.knexPrismaUtil.whereBuilderSimple(obj, '${tableName}'));
    return result;
  }
`
      );
    });
    resultLines.push('}');
    resultLines.push('');

    // Insert
    resultLines.push(`
export class KnexPrismaInsert {
  constructor(private knexPrismaUtil: KnexPrismaUtil) {}`);
    this.tables().forEach(tableName => {
      const inputTypeName = `${tableName}CreateInput`;
      imports.push(`import { ${inputTypeName} } from '${importPrismaDir}'`);
      imports.push(`import { ${tableName} } from '${importPrismaDir}'`);
      resultLines.push(`  ${tableName}(
    input: ${inputTypeName},
    trx?: Transaction,
    id?: string ):Promise<${tableName}> {
     return this.knexPrismaUtil.insert<${tableName}>(input, '${tableName}', trx, id);
  }
`);
    });
    resultLines.push(`}`);
    resultLines.push(``);

    // UpdateOne
    resultLines.push(`
export class KnexPrismaUpdateOne {
  constructor(private knexPrismaUtil: KnexPrismaUtil) {}
    
    `);
    this.tables().forEach(tableName => {
      const inputTypeName = `${tableName}WhereInput`;
      const updateType = `${tableName}UpdateInput`;
      imports.push(`import { ${updateType} } from '${importPrismaDir}'`);
      resultLines.push(`  ${tableName}(
    whereUniqueInput: ${inputTypeName},
    data: ${updateType},
    trx?: Transaction
  ): Promise<${tableName}> {
    return this.knexPrismaUtil.updateOne(
      whereUniqueInput,
      data,
      '${tableName}',
      trx
    );
  }
`);
    });
    resultLines.push(`}`);
    resultLines.push(``);

    // Delete
    resultLines.push(`
export class KnexPrismaDelete {
  constructor(private knexPrismaUtil: KnexPrismaUtil) {}`);
    this.tables().forEach(tableName => {
      const inputTypeName = `${tableName}WhereInput`;
      resultLines.push(`  ${tableName}(
    where: ${inputTypeName},
    trx?: Transaction):Promise<number> {
     return this.knexPrismaUtil.delete(where, '${tableName}', trx);
  }
`);
    });
    resultLines.push(`}`);
    resultLines.push(``);

    resultLines.push(``);
    resultLines.push(`


export interface KnexPrismaBag {
  tables: typeof KnexPrismaTables;
  fields: typeof KnexPrismaFields;
  fieldTypes: typeof KnexPrismaFieldTypes;
  queryOne: KnexPrismaQueryOne;
  queryMany: KnexPrismaQueryMany;
  insert: KnexPrismaInsert;
  updateOne: KnexPrismaUpdateOne;
  delete: KnexPrismaDelete;
  util: KnexPrismaUtil;
  knex: Knex;
}

export function initializeKnexPrisma(
  props: IKnexPrismaUtilProps
): KnexPrismaBag {
  const knexPrismaUtil = new KnexPrismaUtil({
    fields: KnexPrismaFields,
    fieldTypes: KnexPrismaFieldTypes,
    ...props,
  });

  return {
    tables: KnexPrismaTables,
    fields: KnexPrismaFields,
    fieldTypes: KnexPrismaFieldTypes,
    queryOne: new KnexPrismaQueryOne(knexPrismaUtil),
    queryMany: new KnexPrismaQueryMany(knexPrismaUtil),
    insert: new KnexPrismaInsert(knexPrismaUtil),
    delete: new KnexPrismaDelete(knexPrismaUtil),
    updateOne: new KnexPrismaUpdateOne(knexPrismaUtil),
    util: knexPrismaUtil,
    knex: props.knex,
  };
}


`);

    imports.push('');
    imports.push('');

    return imports.join('\n') + resultLines.join('\n');
  }

  private tables(): string[] {
    const result: string[] = [];
    for (let objectKey in KnexPrismaGenerator.objects) {
      const object = KnexPrismaGenerator.objects[objectKey];
      if (object.objectType === PPObjectType.Table) {
        result.push(object.name);
      }
    }
    return result;
  }

  private async getTable(tableName: string): Promise<PPIntrospectionObject> {
    const cur = KnexPrismaGenerator.objects[tableName];
    if (cur) {
      return cur;
    }

    const introspectionResult: IntrospectionTypeResult = await this.p
      .$graphql(`query {
  __type(name: "${tableName}") {
    interfaces {name}
    name
    fields {
      name
      type {
        kind
        name
        ofType {kind,name}
        enumValues{name}
      }
    }
    inputFields {
      name
      type {
        kind
        name
        ofType {kind,name}
        enumValues{name}
      }
    }
  }
}`);
    const fields: PPIntrospectionField[] = [];
    if (tableName === 'EntityXXX') {
      console.log(JSON.stringify(introspectionResult, null, 2));
    }
    if (introspectionResult.__type.fields) {
      introspectionResult.__type.fields.forEach(f => {
        if (tableName === 'MessageXXX') {
          console.error(f);
        }
        let fieldType: IntrospectionFieldType = 'Unknown';
        // @ts-ignore
        const ofType: any = f.type.ofType;
        try {
          if (f.type.kind === 'NON_NULL') {
            if (ofType.kind === 'SCALAR') {
              fieldType = ofType.name;
            } else if (ofType.kind === 'ENUM') {
              fieldType = 'ENUM';
            } else if (!ofType.name) {
              fieldType = ofType.kind;
              // @ts-ignore
            } else if (!f.type.name) {
              fieldType = ofType.kind;
            }
          } else if (f.type.kind === 'LIST') {
            fieldType = 'Relation';
          } else {
            // @ts-ignore
            /*            if (
              f.type.kind === 'SCALAR' ||
              // @ts-ignore
              (f.type.enumValues || {}).length ||
              // @ts-ignore
              (f.type.ofType || {}).kind === 'SCALAR'
            ) {*/
            // @ts-ignore
            fieldType = f.type.name;
            //}
          }
        } catch (e) {
          console.error(e);
          console.error(
            `could not compute field type of ${JSON.stringify(f, null, 2)}`
          );
        }
        if (fieldType === 'Unknown') {
          console.error(
            `could not compute field type of ${JSON.stringify(f, null, 2)}`
          );
        }
        fields.push({
          fieldType: fieldType as IntrospectionFieldType,
          name: f.name,
        });
      });
    }
    const inputFields: PPIntrospectionField[] = [];
    // @ts-ignore - hmm types out of date?
    if (introspectionResult.__type.inputFields) {
      // @ts-ignore - hmm types out of date?
      introspectionResult.__type.inputFields.forEach(f => {
        if (f.type.kind === 'SCALAR') {
          inputFields.push({
            fieldType: f.type.name as IntrospectionFieldType,
            name: f.name,
          });
        }
      });
    }
    if (tableName === 'EntityXX') {
      console.log(JSON.stringify(introspectionResult, null, '  '));
    }
    let objectType: PPObjectType = PPObjectType.Unknown;
    if ((introspectionResult.__type.interfaces || ({} as any)).length) {
      if (introspectionResult.__type.interfaces[0].name === 'Node') {
        objectType = PPObjectType.Table;
      }
    }

    return {
      name: introspectionResult.__type.name,
      fields,
      inputFields,
      objectType,
    };
  }
}

async function generateConstants() {
  const kp = new KnexPrismaGenerator(prisma);

  await kp.initializeTables();

  process.stdout.write(kp.generateConstants());
}

generateConstants()
  .then(() => {
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
