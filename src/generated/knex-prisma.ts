import { KnexPrismaUtil, IKnexPrismaUtilProps } from '..//knex-prisma-util'
import Knex = require('knex');
import { QueryBuilder, Transaction } from 'knex'
import { PostWhereUniqueInput } from './prisma-client'
import { UserWhereUniqueInput } from './prisma-client'
import { PostWhereInput } from './prisma-client'
import { UserWhereInput } from './prisma-client'
import { PostCreateInput } from './prisma-client'
import { Post } from './prisma-client'
import { UserCreateInput } from './prisma-client'
import { User } from './prisma-client'
import { PostUpdateInput } from './prisma-client'
import { UserUpdateInput } from './prisma-client'

export const KnexPrismaTables = {
  Post: 'Post',
  User: 'User',
};

export const KnexPrismaFields = {
  Post: {
    id: 'id',
    title: 'title',
    published: 'published',
    authorId: 'authorId',
  },
  User: {
    id: 'id',
    email: 'email',
    name: 'name',
    posts: 'posts',
  },
};

export const KnexPrismaFieldTypes = {
  Post: {
    id: 'ID',
    title: 'String',
    published: 'Boolean',
    authorId: 'ID',
  },
  User: {
    id: 'ID',
    email: 'String',
    name: 'String',
    posts: 'Relation',
  },
};

export class KnexPrismaQueryOne {
    constructor(private knexPrismaUtil: KnexPrismaUtil) {}

  async Post(
    obj: PostWhereUniqueInput,
    fields: string | string[] = '*',
    trx?: Transaction,
    builder?: QueryBuilder
  ): Promise<Post> {
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
            ? this.knexPrismaUtil.expandFields('Post')
            : [fields]
          : fields)
      )
      .from('Post')
      .where(this.knexPrismaUtil.whereBuilderSimple(obj, 'Post'));
    return rows[0];
  }


  async User(
    obj: UserWhereUniqueInput,
    fields: string | string[] = '*',
    trx?: Transaction,
    builder?: QueryBuilder
  ): Promise<User> {
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
            ? this.knexPrismaUtil.expandFields('User')
            : [fields]
          : fields)
      )
      .from('User')
      .where(this.knexPrismaUtil.whereBuilderSimple(obj, 'User'));
    return rows[0];
  }

}

export class KnexPrismaQueryMany {
    constructor(private knexPrismaUtil: KnexPrismaUtil) {}

  Post(
    obj: PostWhereInput,
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
            ? this.knexPrismaUtil.expandFields('Post')
            : [fields]
          : fields)
      )
      .from('Post')
      .where(this.knexPrismaUtil.whereBuilderSimple(obj, 'Post'));
    return result;
  }


  User(
    obj: UserWhereInput,
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
            ? this.knexPrismaUtil.expandFields('User')
            : [fields]
          : fields)
      )
      .from('User')
      .where(this.knexPrismaUtil.whereBuilderSimple(obj, 'User'));
    return result;
  }

}


export class KnexPrismaInsert {
  constructor(private knexPrismaUtil: KnexPrismaUtil) {}
  Post(
    input: PostCreateInput,
    trx?: Transaction,
    id?: string ):Promise<Post> {
     return this.knexPrismaUtil.insert<Post>(input, 'Post', trx, id);
  }

  User(
    input: UserCreateInput,
    trx?: Transaction,
    id?: string ):Promise<User> {
     return this.knexPrismaUtil.insert<User>(input, 'User', trx, id);
  }

}


export class KnexPrismaUpdateOne {
  constructor(private knexPrismaUtil: KnexPrismaUtil) {}
    
    
  Post(
    whereUniqueInput: PostWhereInput,
    data: PostUpdateInput,
    trx?: Transaction
  ): Promise<Post> {
    return this.knexPrismaUtil.updateOne(
      whereUniqueInput,
      data,
      'Post',
      trx
    );
  }

  User(
    whereUniqueInput: UserWhereInput,
    data: UserUpdateInput,
    trx?: Transaction
  ): Promise<User> {
    return this.knexPrismaUtil.updateOne(
      whereUniqueInput,
      data,
      'User',
      trx
    );
  }

}


export class KnexPrismaDelete {
  constructor(private knexPrismaUtil: KnexPrismaUtil) {}
  Post(
    where: PostWhereInput,
    trx?: Transaction):Promise<number> {
     return this.knexPrismaUtil.delete(where, 'Post', trx);
  }

  User(
    where: UserWhereInput,
    trx?: Transaction):Promise<number> {
     return this.knexPrismaUtil.delete(where, 'User', trx);
  }

}





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


