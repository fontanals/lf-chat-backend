import { IDataContext } from "../data/data-context";
import { User } from "../models/entities/user";
import { ArrayUtils } from "../utils/arrays";
import { NullablePartial } from "../utils/types";

export type UserFilters = NullablePartial<User>;

export interface IUserRepository {
  exists(filters: UserFilters): Promise<boolean>;
  findAll(filters?: UserFilters): Promise<User[]>;
  findOne(filters?: UserFilters): Promise<User | null>;
  create(user: User): Promise<void>;
  update(id: string, user: NullablePartial<User>): Promise<void>;
  delete(id: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  private readonly dataContext: IDataContext;

  constructor(dataContext: IDataContext) {
    this.dataContext = dataContext;
  }

  async exists(filters?: UserFilters): Promise<boolean> {
    let paramsCount = 0;

    const result = await this.dataContext.query(
      `SELECT 1
      FROM "user"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.name != null ? `name ILIKE $${++paramsCount} AND` : ""}
        ${
          filters?.email != null
            ? `lower(email) = lower($${++paramsCount}) AND`
            : ""
        }
        ${
          filters?.verificationToken != null
            ? `verification_token = $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.verificationToken === null
            ? "verification_token IS NULL AND"
            : ""
        }
        ${
          filters?.recoveryToken != null
            ? `recovery_token = $${++paramsCount} AND`
            : ""
        }
        ${filters?.recoveryToken === null ? "recovery_token IS NULL AND" : ""}
        ${
          filters?.isVerified != null
            ? `is_verified = $${++paramsCount} AND`
            : ""
        }
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.name != null ? `%${filters.name}%` : null,
        filters?.email,
        filters?.verificationToken,
        filters?.recoveryToken,
        filters?.isVerified,
      ].filter((param) => param != null)
    );

    const exists = !ArrayUtils.isNullOrEmpty(result.rows);

    return exists;
  }

  async findAll(filters?: UserFilters): Promise<User[]> {
    let paramsCount = 0;

    const result = await this.dataContext.query<User>(
      `SELECT
        id,
        name,
        email,
        password,
        display_name AS "displayName",
        custom_prompt AS "customPrompt",
        verification_token AS "verificationToken",
        recovery_token AS "recoveryToken",
        is_verified AS "isVerified",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "user"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.name != null ? `name ILIKE $${++paramsCount} AND` : ""}
        ${
          filters?.email != null
            ? `lower(email) = lower($${++paramsCount}) AND`
            : ""
        }
        ${
          filters?.verificationToken != null
            ? `verification_token = $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.verificationToken === null
            ? "verification_token IS NULL AND"
            : ""
        }
        ${
          filters?.recoveryToken != null
            ? `recovery_token = $${++paramsCount} AND`
            : ""
        }
        ${filters?.recoveryToken === null ? "recovery_token IS NULL AND" : ""}
        ${
          filters?.isVerified != null
            ? `is_verified = $${++paramsCount} AND`
            : ""
        }
        TRUE
      ORDER BY created_at;`,
      [
        filters?.id,
        filters?.name != null ? `%${filters.name}%` : null,
        filters?.email,
        filters?.verificationToken,
        filters?.recoveryToken,
        filters?.isVerified,
      ].filter((param) => param != null)
    );

    return result.rows;
  }

  async findOne(filters?: UserFilters): Promise<User | null> {
    let paramsCount = 0;

    const result = await this.dataContext.query<User>(
      `SELECT
        id,
        name,
        email,
        password,
        display_name AS "displayName",
        custom_prompt AS "customPrompt",
        verification_token AS "verificationToken",
        recovery_token AS "recoveryToken",
        is_verified AS "isVerified",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM "user"
      WHERE
        ${filters?.id != null ? `id = $${++paramsCount} AND` : ""}
        ${filters?.name != null ? `name ILIKE $${++paramsCount} AND` : ""}
        ${
          filters?.email != null
            ? `lower(email) = lower($${++paramsCount}) AND`
            : ""
        }
        ${
          filters?.verificationToken != null
            ? `verification_token = $${++paramsCount} AND`
            : ""
        }
        ${
          filters?.verificationToken === null
            ? "verification_token IS NULL AND"
            : ""
        }
        ${
          filters?.recoveryToken != null
            ? `recovery_token = $${++paramsCount} AND`
            : ""
        }
        ${filters?.recoveryToken === null ? "recovery_token IS NULL AND" : ""}
        ${
          filters?.isVerified != null
            ? `is_verified = $${++paramsCount} AND`
            : ""
        }
        TRUE
      LIMIT 1;`,
      [
        filters?.id,
        filters?.name != null ? `%${filters.name}%` : null,
        filters?.email,
        filters?.verificationToken,
        filters?.recoveryToken,
        filters?.isVerified,
      ].filter((param) => param != null)
    );

    const user = ArrayUtils.firstOrNull(result.rows);

    return user;
  }

  async create(user: User): Promise<void> {
    await this.dataContext.execute(
      `INSERT INTO "user" 
      (id, name, email, password, display_name, custom_prompt, verification_token, recovery_token, is_verified)
      VALUES 
      ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [
        user.id,
        user.name,
        user.email,
        user.password,
        user.displayName,
        user.customPrompt,
        user.verificationToken,
        user.recoveryToken,
        user.isVerified,
      ]
    );
  }

  async update(id: string, user: NullablePartial<User>): Promise<void> {
    let paramsCount = 0;

    await this.dataContext.execute(
      `UPDATE "user"
      SET
        ${user.name != null ? `name = $${++paramsCount},` : ""}
        ${user.email != null ? `email = $${++paramsCount},` : ""}
        ${user.password != null ? `password = $${++paramsCount},` : ""}
        ${user.displayName != null ? `display_name = $${++paramsCount},` : ""}
        ${user.customPrompt != null ? `custom_prompt = $${++paramsCount},` : ""}
        ${user.customPrompt === null ? "custom_prompt = NULL," : ""}
         ${
           user.verificationToken != null
             ? `verification_token = $${++paramsCount},`
             : ""
         }
        ${user.verificationToken === null ? "verification_token = NULL," : ""}
        ${
          user.recoveryToken != null
            ? `recovery_token = $${++paramsCount},`
            : ""
        }
        ${user.recoveryToken === null ? "recovery_token = NULL," : ""}
        ${user.isVerified != null ? `is_verified = $${++paramsCount},` : ""}
        id = id
      WHERE
        id = $${++paramsCount};`,
      [
        user.name,
        user.email,
        user.password,
        user.displayName,
        user.customPrompt,
        user.verificationToken,
        user.recoveryToken,
        user.isVerified,
        id,
      ].filter((param) => param != null)
    );
  }

  async delete(id: string): Promise<void> {
    await this.dataContext.execute(
      `DELETE FROM "user"
      WHERE id = $1;`,
      [id]
    );
  }
}
