# knex-prisma

Experimental knex-prisma integration
## Related Github Issue
https://github.com/prisma/prisma/issues/4155
## Goals
### Short Term

- **Database query performance and flexibility:** Prisma query grammar is great, but it is not as
  expressive as SQL (e.g. no subqueries, complex joining etc).
  This causes developers to write lots of little queries which can lead to performance problems. With
  knex, you are no longer bound to the restrictions of Prisma's query grammar and you can implement optimal queries.
  Furthermore, when a microservice (e.g. a resolver) queries the Prisma server, the Prisma server queries the database and
  returns the results to the microservice. With knex, the database is queried directly from the microservice
  thus eliminating two hops.
- **Strong typing:** Knex generally uses strings for table and field names which is disappointing for anyone who has
  tried Prisma. We want to fully
  leverage Prisma's awesome typing
- **Address stability problems:** When the Prisma server gets over loaded, it crashes. Queries sent via knex are sent
  directly to the database, thus reducing the load on the Prisma server.
- **Real Transactions:** The Prisma transaction model requires the entire transaction be expressed a single statement. This
  is very limited when compared to the traditional commit and rollback model enjoyed by a direct database connection.
- **White box ids:** It's convenient for clients to generate their own ids in some use cases. This API, allows
  the client to provide ids or use default ids
- **Avoid Prisma's executeRaw** doing moderately complex dynamic SQL with Prisma's executeRaw becomes painful because
  you have to generate valid SQL syntax and worry about SQL injection attacks

### Medium Term

- **Eliminate Requirement for Prisma Server in Production:** For some use cases, the Prisma server adds unnecessary
  complexity. (E.g. if you are only hitting a Postgres database, it is a cleaner
  model for the microservice to simply query the database directly, rather than spending the additional human costs
  of configuring and supporting an addition tier and compute costs of another machine.) The vision is to
  eliminate the requirement for the Prisma server for these simpler use cases and to leverage Prisma's
  excellent development
  experience and database migration tools during development and deployment of apps

## How To Run the Experimental Code

- Clone this repo (Prisma and docker required)

```
npm install
docker-compose up -d
cp .env-developer-default .env
ts-node src/index.ts
```

- How to run the knex-prisma generator (e.g. after you update datamodel.prisma and run prisma deploy)

```
ts-node src/knex-prisma-generate.ts > ./src/generated/knex-prisma.ts
```

## Example Code (src/index.ts)

```typescript
import { knexPrismaBag as kp } from "./postgres";
import cuid = require("cuid");

// A `main` function so that we can use async/await
async function main() {
  // Create a new user called `Alice` with Prisma generated types
  const newUser = await kp.insert.User({ name: "Alice" });
  console.log(`Created new user: ${newUser.name} (ID: ${newUser.id})`);

  // Read a user from the database and print them to the console
  const aUser = await kp.queryOne.User({ id: newUser.id });
  console.log(aUser);

  // Read all users named Alice from the database and print them to the console
  const allUsers = await kp.queryMany.User({ name: "Alice" });
  console.log(allUsers);

  // Insert a Post - demos white box Ids
  const postId = cuid();
  const post = await kp.insert.Post(
    {
      authorId: newUser.id,
      title: "Hello world",
      published: true
    },
    undefined,
    postId
  );

  // Join showing "typed" table and field names
  const posts = await kp.util
    .withSchema()
    .select("*")
    .from(kp.tables.Post)
    .leftJoin(
      kp.tables.User,
      `${kp.tables.User}.${kp.fields.User.id}`,
      `${kp.tables.Post}.${kp.fields.Post.authorId}`
    );
  console.log(posts);

  // Update
  const updated = await kp.updateOne.Post({ id: post.id }, { title: "Alice" });
  console.log(updated);

  // Subquery - demos back to normal with flexibility of SQL
  const users = await kp.util
    .withSchema()
    .select("*")
    .from(kp.tables.User)
    .where(
      kp.util.whereBuilderInSelect(
        kp.fields.User.name,
        kp.queryMany.Post({ title: "Alice" }, kp.fields.Post.title)
      )
    );
  console.log(users);

  // Transactions, Prisma style strong typing with real Postgres Transactions
  let bobsId: string;
  kp.knex
    .transaction(trx => {
      return kp.insert.User({ name: "Bob" }, trx).then(bobUser => {
        bobsId = bobUser.id;
        console.log(`Bob created with id ${bobsId}`);
        throw new Error("oops");
      });
    })
    .catch(async e => {
      const bob = await kp.queryOne.User({ id: bobsId });
      console.log("Transaction canceled Bob is gone");
      console.log(bob);
    });
}

main().catch(e => console.error(e));
```
