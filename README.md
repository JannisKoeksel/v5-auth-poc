# PostGraphile V5 Auth POC

Uses:

- `postgraphile.tags.json5` to completely hide a column from the schema
- `selectAuth` to limit the rows in a collection based on auth concerns
- `makeWrapPlansPlugin` to limit the attributes selected based on auth concerns
- `makeChangeNullabilityPlugin` to make fields nullable (due to auth limiting access)

## Usage

Clone this repo, and then run `yarn start`. The local database `v5_auth_poc`
will have the `app_public` schema replaced, and a server will start at
http://localhost:5678

Issue query:

```
{
  allUsers {
    nodes {
      rowId
      username
      email
    }
  }
}
```

You should get no results.

Set the headers (below the query area) to:

```json
{ "x-user-id": 2 }
```

You are pretending to be Bob (user 2) and should now see Alice, Bob and
Caroline, who are all members of organization 102.

If you instead query with

```json
{ "x-user-id": 4 }
```

you will only see Alice and Dave, who are the members of organization 101.

Querying with

```json
{ "x-user-id": 1 }
```

will return all users since Alice (user 1) is a member of both organizations.

Further note that you can only see the email of the user indicated via `x-user-id`.

## NOT SECURE

This authentication method is open to side-channel attacks, for example:

1. If you allow ordering by a field you're not allowed to retrieve, the value
   of the field could be extracted from a "cursor" if you have cursor-based
   pagination enabled (solution: don't allow ordering by protected fields)
2. If you allow advanced filters on a protected field, the value of the field
   could be determined via a dictionary attack (solution: don't allow advanced
   filtering by protected fields)
3. If you allow simple equality filtering on a protected field, the value of
   the field could be determined by a very dedicated attacker via a timing
   attack (solution: don't allow any filtering on protected fields)
4. If you implement aggregation, it's possible that the value could be
   exposed through aggregates

We strongly advise that you use trusted authentication methods such as
Postgres' own built in Row-Level Security which guarantees that your protected
data is not visible to anyone (although even this doesn't protect against all
classes of attack). However, this approach may be sufficient if your concerns
aren't really "security" so much as "business rules": hiding data from
customers unless they upgrade - in this case, a determined attacker may be
someone that you might consider offering a discount to as they're clearly keen
to use your enhanced features, but cannot afford to?

## Notes

When integrating with OSO, look at building `WHERE` clauses via "filtering":
https://www.osohq.com/docs/oss/guides/data_filtering.html
