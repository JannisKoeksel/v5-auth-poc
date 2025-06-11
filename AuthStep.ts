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


// should be an actual permission engine later 
function getAuthRules(resource: SQLIdentifierNode, uid: string): AuthRule {
  //@benji is that the correct way to get the identifier ?
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
    return details.indexMap(() => {
      return (qb: PgSelectQueryBuilder) => {
        // example uid -> should be taken from context
        const uid = "1";

        const rules = getAuthRules(qb.alias as SQLIdentifierNode, uid);

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
