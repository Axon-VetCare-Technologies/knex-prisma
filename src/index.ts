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
