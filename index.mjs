/* @ts-check */
import express from "express";
import { createServer } from "node:http";
import { postgraphile } from "postgraphile";
import { TYPES } from "postgraphile/@dataplan/pg";
import { makePgService } from "postgraphile/adaptors/pg";
import { context, lambda } from "postgraphile/grafast";
import { grafserv } from "postgraphile/grafserv/express/v4";
import { sql } from "postgraphile/pg-sql2";
import { PostGraphileAmberPreset } from "postgraphile/presets/amber";
import {
  makeChangeNullabilityPlugin,
  makePgSmartTagsFromFilePlugin,
  makeWrapPlansPlugin,
} from "postgraphile/utils";

/** @type {GraphileConfig.Plugin} */
const AuthPlugin = {
  name: "AuthPlugin",
  version: "0.0.0",

  gather: {
    hooks: {
      pgTables_PgResourceOptions(info, event) {
        if (event.pgClass.relname === "users") {
          event.resourceOptions.selectAuth = ($step) => {
            // Users may only see themselves, or people in their own organization
            const { alias } = $step;
            const $userId = context().get("currentUserId");
            const sqlUserId = $step.placeholder($userId, TYPES.int);
            $step.where(sql`(${alias}.id = ${sqlUserId}) or (id in (
              select user_id
              from app_public.organization_memberships
              where organization_id in (
                select organization_id
                from app_public.organization_memberships
                where user_id = ${sqlUserId}
              )
            ))`);
          };
        }
      },
    },
  },
};

/** @type {GraphileConfig.Preset} */
const preset = {
  extends: [PostGraphileAmberPreset],
  pgServices: [
    makePgService({
      connectionString: "postgres:///v5_auth_poc",
      schemas: ["app_public"],
    }),
  ],
  plugins: [
    makePgSmartTagsFromFilePlugin(),
    AuthPlugin,
    makeWrapPlansPlugin({
      User: {
        email(plan, $user) {
          const $email = plan();
          const $userId =
            /** @type {import('postgraphile/@dataplan/pg').PgSelectSingleStep} */ (
              $user
            ).get("id");
          const $currentUserId = context().get("currentUserId");
          return lambda(
            [$userId, $currentUserId, $email],
            ([userId, currentUserId, email]) =>
              userId === currentUserId ? email : null,
          );
        },
      },
    }),
    makeChangeNullabilityPlugin({
      User: {
        email: true,
      },
    }),
  ],
  grafast: {
    context(ctx) {
      const uid = ctx.expressv4?.req?.get("x-user-id");
      return {
        // This is obviously not secure; replace it with cookies or whatever
        currentUserId: uid ? parseInt(uid, 10) : undefined,
      };
    },
  },
};

const app = express();
const server = createServer(app);
server.on("error", (e) => {
  console.dir(e);
});
const pgl = postgraphile(preset);
const serv = pgl.createServ(grafserv);
await serv.addTo(app, server);
server.listen(5050, () => {
  console.log("Server listening at http://localhost:5050");
});
