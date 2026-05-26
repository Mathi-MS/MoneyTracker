import mongoose, { Schema, Document, Model } from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) throw new Error("MONGODB_URI is required");

mongoose.connect(MONGODB_URI).catch((err) => {
  console.error("MongoDB connection error:", err);
  process.exit(1);
});

// ── Users ──────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  username: string | null;
  password: string | null;
  updatedAt: Date;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    profileImageUrl: { type: String, default: null },
    username: { type: String, default: null },
    password: { type: String, default: null },
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// ── Sessions ───────────────────────────────────────────────────────────────
export interface ISession extends Document {
  sid: string;
  sess: Record<string, unknown>;
  expire: Date;
}

const SessionSchema = new Schema<ISession>({
  sid: { type: String, required: true, unique: true },
  sess: { type: Schema.Types.Mixed, required: true },
  expire: { type: Date, required: true },
});

export const SessionModel: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

// ── Categories ─────────────────────────────────────────────────────────────
export interface ICategory extends Document {
  id: number;
  userId: string;
  name: string;
  type: string;
  icon: string;
  color: string;
  createdAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    id: { type: Number, required: true, unique: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    icon: { type: String, default: "tag" },
    color: { type: String, default: "#6B7280" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const CategoryModel: Model<ICategory> = mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema);

// ── Persons ────────────────────────────────────────────────────────────────
export interface IPerson extends Document {
  id: number;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: Date;
}

const PersonSchema = new Schema<IPerson>(
  {
    id: { type: Number, required: true, unique: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, default: null },
    email: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PersonModel: Model<IPerson> = mongoose.models.Person || mongoose.model<IPerson>("Person", PersonSchema);

// ── Transactions ───────────────────────────────────────────────────────────
export interface ITransaction extends Document {
  id: number;
  userId: string;
  type: string;
  categoryId: number | null;
  personId: number | null;
  parentTransactionId: number | null;
  amount: string;
  date: Date;
  notes: string | null;
  paymentMethod: string | null;
  status: string | null;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    id: { type: Number, required: true, unique: true },
    userId: { type: String, required: true },
    type: { type: String, required: true },
    categoryId: { type: Number, default: null },
    personId: { type: Number, default: null },
    parentTransactionId: { type: Number, default: null },
    amount: { type: String, required: true },
    date: { type: Date, required: true },
    notes: { type: String, default: null },
    paymentMethod: { type: String, default: null },
    status: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const TransactionModel: Model<ITransaction> = mongoose.models.Transaction || mongoose.model<ITransaction>("Transaction", TransactionSchema);

// ── Auto-increment helper ──────────────────────────────────────────────────
const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export async function nextId(name: string): Promise<number> {
  try {
    const result = await Counter.findOneAndUpdate(
      { _id: name },
      { $inc: { seq: 1 } },
      { returnDocument: "after", upsert: true, new: true }
    );
    if (!result || typeof result.seq !== 'number') {
      throw new Error("Failed to increment counter");
    }
    return result.seq;
  } catch (error) {
    console.error(`Error incrementing counter for ${name}:`, error);
    throw new Error("Failed to increment counter");
  }
}

// ── db proxy (drizzle-like interface used in routes) ───────────────────────
// The routes use drizzle-orm style: db.select().from(table).where(...)
// We replace this with a simple MongoDB-backed db object.

type WhereCondition = Record<string, unknown>;

function buildMongoQuery(conditions: WhereCondition[]): Record<string, unknown> {
  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}

type TableToken<Name extends string = string> = { _name: Name; $inferSelect?: any } & Record<string, { _col: string }>;

function createTableToken<Name extends string>(name: Name): TableToken<Name> {
  return new Proxy({ _name: name } as TableToken<Name>, {
    get(target, prop) {
      if (typeof prop === "symbol") return (target as any)[prop];
      if (prop === "_name") return name;
      if (prop === "$inferSelect") return undefined;
      return { _col: String(prop) };
    },
  });
}

// Table tokens — used as identifiers in route imports
export const usersTable = createTableToken("users");
export const sessionsTable = createTableToken("sessions");
export const categoriesTable = createTableToken("categories");
export const personsTable = createTableToken("persons");
export const transactionsTable = createTableToken("transactions");

function modelFor(table: TableToken) {
  switch (table._name) {
    case "users": return UserModel;
    case "sessions": return SessionModel;
    case "categories": return CategoryModel;
    case "persons": return PersonModel;
    case "transactions": return TransactionModel;
  }
}

function docToPlain(doc: Document | null): Record<string, unknown> | null {
  if (!doc) return null;
  const obj = (doc as any).toObject({ virtuals: false });
  obj.id = obj.id ?? obj._id;
  delete obj._id;
  delete obj.__v;
  return obj;
}

// Minimal drizzle-like db shim
export const db = {
  insert(table: TableToken) {
    return {
      values: (data: Record<string, unknown>) => ({
        returning: async () => {
          const model = modelFor(table) as any;
          const id = await nextId(table._name);
          const doc = await model.create({ ...data, id });
          return [docToPlain(doc)];
        },
        onConflictDoUpdate: ({ target: _t, set }: { target: unknown; set: Record<string, unknown> }) => ({
          returning: async () => {
            const model = modelFor(table) as any;
            const existing = await model.findOne({ id: (data as any).id });
            if (existing) {
              Object.assign(existing, set);
              await existing.save();
              return [docToPlain(existing)];
            }
            const id = await nextId(table._name);
            const doc = await model.create({ ...data, id });
            return [docToPlain(doc)];
          },
        }),
      }),
    };
  },

  select(fields?: Record<string, unknown>) {
    let _table: TableToken;
    let _conditions: WhereCondition[] = [];
    let _orderBy: string | null = null;
    let _limitVal: number | null = null;
    let _offsetVal: number | null = null;
    let _leftJoins: Array<{ table: TableToken; localField: string; foreignField: string }> = [];

    const chain = {
      from(table: TableToken) { _table = table; return chain; },
      leftJoin(table: TableToken, on: unknown) {
        // Parse the join condition to extract field mapping
        // For now, we'll handle joins in-memory after fetching
        _leftJoins.push({ table, localField: '', foreignField: '' });
        return chain;
      },
      where(condition: WhereCondition | WhereCondition[]) {
        _conditions = Array.isArray(condition) ? condition : [condition];
        return chain;
      },
      orderBy(_col: unknown) { return chain; },
      limit(n: number) { _limitVal = n; return chain; },
      offset(n: number) { _offsetVal = n; return chain; },
      $dynamic() { return chain; },
      then(resolve: (v: Record<string, unknown>[]) => void, reject: (e: unknown) => void) {
        return chain._exec().then(resolve, reject);
      },
      async _exec(): Promise<Record<string, unknown>[]> {
        const model = modelFor(_table) as any;
        const query = buildMongoQuery(_conditions);
        let cursor = model.find(query);
        if (_limitVal) cursor = cursor.limit(_limitVal);
        if (_offsetVal) cursor = cursor.skip(_offsetVal);
        const docs = await cursor.exec();
        const results = docs.map((d: Document) => docToPlain(d)!);
        
        // Handle left joins by fetching related data
        if (_leftJoins.length > 0 && results.length > 0) {
          for (const result of results) {
            // Join with categories
            if (result.categoryId) {
              const catModel = CategoryModel;
              const cat = await catModel.findOne({ id: result.categoryId });
              result.category = cat ? docToPlain(cat) : null;
            } else {
              result.category = null;
            }
            
            // Join with persons
            if (result.personId) {
              const personModel = PersonModel;
              const person = await personModel.findOne({ id: result.personId });
              result.person = person ? docToPlain(person) : null;
            } else {
              result.person = null;
            }
          }
        }
        
        return results;
      },
    };
    return chain;
  },

  update(table: TableToken) {
    let _conditions: WhereCondition[] = [];
    return {
      set: (data: Record<string, unknown>) => ({
        where: (condition: WhereCondition | WhereCondition[]) => {
          _conditions = Array.isArray(condition) ? condition : [condition];
          return {
            returning: async () => {
              const model = modelFor(table) as any;
              const query = buildMongoQuery(_conditions);
              const doc = await model.findOneAndUpdate(query, { $set: data }, { new: true });
              return doc ? [docToPlain(doc)] : [];
            },
          };
        },
      }),
    };
  },

  delete(table: TableToken) {
    return {
      where: (condition: WhereCondition | WhereCondition[]) => {
        const conditions = Array.isArray(condition) ? condition : [condition];
        return {
          returning: async () => {
            const model = modelFor(table) as any;
            const query = buildMongoQuery(conditions);
            const doc = await model.findOneAndDelete(query);
            return doc ? [docToPlain(doc)] : [];
          },
        };
      },
    };
  },
};

// ── drizzle-orm operator shims ─────────────────────────────────────────────
export function eq(field: { _col: string } | any, value: unknown): WhereCondition {
  const col = field?._col ?? field?.name ?? String(field);
  return { [col]: value };
}

export function and(...conditions: WhereCondition[]): WhereCondition[] {
  return conditions.flat();
}

export function ilike(field: any, pattern: string): WhereCondition {
  const col = field?._col ?? field?.name ?? String(field);
  const escaped = pattern.replace(/%/g, "").replace(/_/g, ".");
  return { [col]: { $regex: escaped, $options: "i" } };
}

export function gte(field: any, value: unknown): WhereCondition {
  const col = field?._col ?? field?.name ?? String(field);
  return { [col]: { $gte: value } };
}

export function lte(field: any, value: unknown): WhereCondition {
  const col = field?._col ?? field?.name ?? String(field);
  return { [col]: { $lte: value } };
}

export function inArray(field: any, values: unknown[]): WhereCondition {
  const col = field?._col ?? field?.name ?? String(field);
  return { [col]: { $in: values } };
}

export function isNull(field: any): WhereCondition {
  const col = field?._col ?? field?.name ?? String(field);
  return { [col]: null };
}

export function isNotNull(field: any): WhereCondition {
  const col = field?._col ?? field?.name ?? String(field);
  return { [col]: { $ne: null } };
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return strings.raw[0];
}
