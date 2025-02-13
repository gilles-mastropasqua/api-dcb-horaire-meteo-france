import { makeSchema, objectType, queryType, stringArg, intArg, arg, asNexusMethod, enumType, inputObjectType, list, nonNull } from "nexus";
import { GraphQLJSON } from "graphql-scalars";
import { Prisma, PrismaClient } from "@prisma/client";
import { join } from "path";

const prisma = new PrismaClient();

export const JSONScalar = asNexusMethod(GraphQLJSON, "json");

// ✅ Enum for sorting (ascending/descending)
const SortOrder = enumType({
    name: "SortOrder",
    members: ["asc", "desc"],
});

// ✅ Auto-generate orderBy fields based on Prisma schema
const OrderByInput = inputObjectType({
    name: "OrderByInput",
    definition(t) {
        Object.keys(Prisma.PosteScalarFieldEnum).forEach((field) => {
            t.field(field, { type: SortOrder });
        });
    },
});


// ✅ Define `Poste` type dynamically based on Prisma model
const Poste = objectType({
    name: "Poste",
    definition(t) {
        Object.entries(Prisma.dmmf.datamodel.models.find(m => m.name === "Poste")?.fields || [])
            .forEach(([ , field]) => {
            if (field.type === "String") {
                if (field.isRequired) {
                    t.string(field.name);
                } else {
                    t.nullable.string(field.name);
                }
            } else if (field.type === "Int") {
                if (field.isRequired) {
                    t.int(field.name);
                } else {
                    t.nullable.int(field.name);
                }
            } else if (field.type === "Float") {
                if (field.isRequired) {
                    t.float(field.name);
                } else {
                    t.nullable.float(field.name);
                }
            } else if (field.type === "Boolean") {
                t.boolean(field.name);
            } else if (field.type === "DateTime") {
                if (field.isRequired) {
                    t.string(field.name);
                } else {
                    t.nullable.string(field.name);
                }
            }
        });
    },
});

// ✅ Function to dynamically build the `where` filter
const buildWhereClause = (filter: Record<string, unknown>): Record<string, unknown> => {
    const where: Record<string, unknown> = {};

    Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            if (typeof value === "string") {
                where[key] = { contains: value, mode: "insensitive" };
            } else if (typeof value === "object") {
                const conditions: Record<string, unknown> = {};
                if ("gte" in value) conditions.gte = value.gte;
                if ("lte" in value) conditions.lte = value.lte;
                if ("gt" in value) conditions.gt = value.gt;
                if ("lt" in value) conditions.lt = value.lt;

                if (Object.keys(conditions).length > 0) {
                    where[key] = conditions;
                }
            } else {
                where[key] = value;
            }
        }
    });

    return where;
};

// ✅ GraphQL Queries
const Query = queryType({
    definition(t) {
        t.list.field("postes", {
            type: Poste,
            args: {
                filter: arg({ type: "JSON" }),
                orderBy: list(nonNull(OrderByInput)),
                skip: intArg(),
                take: intArg(),
            },
            resolve: async (_, { filter = {}, orderBy = [], skip, take }) => {
                const where = buildWhereClause(filter);
                const takeValue = take === -1 || take === null ? undefined : take || 50;

                // ✅ Nettoie orderBy pour enlever les valeurs nulles
                const cleanOrderBy = (Array.isArray(orderBy) ? orderBy : [orderBy])
                    .map(order => {
                        const cleanOrder: Record<string, "asc" | "desc"> = {};
                        Object.entries(order || {}).forEach(([key, value]) => {
                            if (value === "asc" || value === "desc") {
                                cleanOrder[key] = value;
                            }
                        });
                        return cleanOrder;
                    })
                    .filter(order => Object.keys(order).length > 0); // Supprime les objets vides

                const results = await prisma.poste.findMany({
                    where,
                    orderBy: cleanOrderBy.length > 0 ? cleanOrderBy : undefined, // ✅ Vérifie que l'ordre de tri est valide
                    skip: skip || 0,
                    take: takeValue,
                });

                return results.map(poste => ({
                    ...poste,
                    dateOuverture: poste.dateOuverture ? poste.dateOuverture.toISOString() : null,
                    dateFermeture: poste.dateFermeture ? poste.dateFermeture.toISOString() : null,
                }));
            },
        });

        t.field("countPostes", {
            type: "Int",
            args: {
                filter: arg({ type: "JSON" }),
            },
            resolve: async (_, { filter = {} }) => {
                const where = buildWhereClause(filter);
                return prisma.poste.count({ where });
            },
        });

        t.field("poste", {
            type: Poste,
            args: { numPoste: stringArg() },
            resolve: async (_, { numPoste }) => {
                if (!numPoste) return null;

                const poste = await prisma.poste.findUnique({ where: { numPoste } });

                if (!poste) return null;

                return {
                    ...poste,
                    dateOuverture: poste.dateOuverture ? poste.dateOuverture.toISOString() : null,
                    dateFermeture: poste.dateFermeture ? poste.dateFermeture.toISOString() : null,
                };
            },
        });
    },
});

// ✅ Generate the GraphQL schema
export const schema = makeSchema({
    types: [Query, Poste, JSONScalar, SortOrder, OrderByInput],
    outputs: {
        schema: join(process.cwd(), "src/graphql/generated/schema.graphql"),
        typegen: join(process.cwd(), "src/graphql/generated/nexus-types.ts"),
    },
});
