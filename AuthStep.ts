import { condition, ExecutionDetails, ExecutionResults, Step } from "grafast";
import { PgSelectQueryBuilder, PgSelectStep } from "postgraphile/@dataplan/pg";
import { SQL, sql, SQLIdentifierNode } from "postgraphile/pg-sql2";

type AuthRule =
  | {
      allow: true;
      conditions: {
        field: string;
        operator: string;
        value: any;
      }[];
    }
  | {
      allow: false;
    };

function getAuthRules(resource: SQLIdentifierNode, uid: string): AuthRule {
  const identifier = sql.getIdentifierSymbol(resource)?.description;

  if (identifier == "users") {
    return {
      allow: true,
      conditions: [{ field: "id", operator: "=", value: uid }],
    };
  }

  if (identifier === "posts") {
    return {
      allow: true,
      conditions: [{ field: "user_id", operator: "=", value: uid }],
    };
  }

  return {
    allow: false,
  };
}

export class AuthStep extends Step {
  isSyncAndSafe = false;

  constructor($step: Step) {
    super();
  }

  execute(details: ExecutionDetails): ExecutionResults<any> {
    // 4. Return a callback for each execution that injects WHERE conditions into the query builder
    return details.indexMap(() => {
      return (qb: PgSelectQueryBuilder) => {
     
        // 1. Extract the user ID from context
        const uid = "1";
        
        const rules = getAuthRules(qb.alias as SQLIdentifierNode, uid);
        // 3. If not allowed, abort
        if (!rules.allow) {
          throw new Error("Access denied");
        }
        for (const cond of rules.conditions) {
          qb.where(
            sql`( ${sql.identifier(cond.field)} ${sql.raw(cond.operator)} ${sql.value(cond.value)} ) `
          );
        }
      };
    });
  }
}
