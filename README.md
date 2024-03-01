# PostGraphile V5 Auth POC

Uses:

- `postgraphile.tags.json5` to completely hide a column from the schema
- `selectAuth` to limit the rows in a collection based on auth concerns
- `makeWrapPlansPlugin` to limit the attributes selected based on auth concerns
- `makeChangeNullabilityPlugin` to make fields nullable (due to auth limiting access)

## Notes

When integrating with OSO, look at building `WHERE` clauses via "filtering":
https://www.osohq.com/docs/oss/guides/data_filtering.html
