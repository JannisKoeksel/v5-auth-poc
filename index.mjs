/* @ts-check */
import express from "express";
import { createServer } from "node:http";
import { postgraphile } from "postgraphile";
import { TYPES } from "postgraphile/@dataplan/pg";
import { makePgService } from "postgraphile/adaptors/pg";
import { context, lambda, applyTransforms, each } from "postgraphile/grafast";
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
            // Users may only see themselves, or people in their own organization (or everyone if they are an admin)
            const { alias } = $step;
            const $userId = context().get("currentUserId");
            const sqlUserId = $step.placeholder($userId, TYPES.int);
            $step.where(sql`(
              (${alias}.id = ${sqlUserId})
              or (select is_admin from app_public.users where users.id = ${sqlUserId}) is true
              or (id in (
                select user_id
                from app_public.organization_memberships
                where organization_id in (
                  select organization_id
                  from app_public.organization_memberships
                  where user_id = ${sqlUserId}
                )
              ))
            )`);
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
    makeWrapPlansPlugin((build) => {
      const organizationMemberships =
        build.input.pgRegistry.pgResources.organization_memberships;
      /**
       * @param {() => import('postgraphile/@dataplan/pg').PgClassExpressionStep<any, any>} plan
       * @param {import('postgraphile/@dataplan/pg').PgSelectSingleStep} $user
       */
      function ifShareOrganization(plan, $user) {
        const $value = plan();
        const $theirMemberships = $user.manyRelation(
          "organizationMembershipsByTheirUserId",
        );
        /** @type {import('grafast').ExecutableStep<number[]>} */
        const $theirOrgIds = applyTransforms(
          each($theirMemberships, ($orgMembership) =>
            $orgMembership.get("organization_id"),
          ),
        );
        const $myUserId = context().get("currentUserId");
        const $myMemberships = organizationMemberships.find({
          user_id: $myUserId,
        });
        /** @type {import('grafast').ExecutableStep<number[]>} */
        const $myOrgIds = applyTransforms(
          each($myMemberships, ($orgMembership) =>
            $orgMembership.get("organization_id"),
          ),
        );
        const $allowed = lambda(
          [$theirOrgIds, $myOrgIds],
          ([theirOrgIds, myOrgIds]) =>
            theirOrgIds.some((id) => myOrgIds.includes(id)),
        );
        return lambda(
          [$value, $allowed],
          ([value, allowed]) => (allowed ? value : null),
          true,
        );
      }

      return {
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
          createdAt: ifShareOrganization,
          updatedAt: ifShareOrganization,
        },
      };
    }),
    makeChangeNullabilityPlugin({
      User: {
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ],
  grafast: {
    explain: true,
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
