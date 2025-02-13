import { makeSchema, objectType, queryType, stringArg, intArg, arg, asNexusMethod } from "nexus";
import { GraphQLJSON } from "graphql-scalars";
import { PrismaClient } from "@prisma/client";
import { join } from "path";

const prisma = new PrismaClient();

export const JSONScalar = asNexusMethod(GraphQLJSON, "json");

const Poste = objectType({
    name: "Poste",
    definition(t) {
        t.string("numPoste");
        t.string("nomUsuel");
        t.string("commune");
        t.nullable.string("lieuDit");
        t.nullable.string("dateOuverture");
        t.nullable.string("dateFermeture");
        t.boolean("posteOuvert");
        t.float("latitude");
        t.float("longitude");
        t.nullable.int("lambX");
        t.nullable.int("lambY");
        t.nullable.int("altitude");
        t.nullable.int("typePoste");
    },
});

const buildWhereClause = (filter: Record<string, unknown>): Record<string, unknown> => {
    const where: Record<string, unknown> = {};

    Object.entries(filter).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            where[key] =
                typeof value === "string"
                    ? { contains: value, mode: "insensitive" }
                    : value;
        }
    });

    return where;
};

const Query = queryType({
    definition(t) {
        t.list.field("postes", {
            type: Poste,
            args: {
                filter: arg({ type: "JSON" }),
                skip: intArg(),
                take: intArg(),
            },
            resolve: async (_, { filter = {}, skip, take }) => {
                const where = buildWhereClause(filter);

                const takeValue = take === -1 || take === null ? undefined : take || 50;

                const results = await prisma.poste.findMany({
                    where,
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

export const schema = makeSchema({
    types: [Query, Poste, JSONScalar],
    outputs: {
        schema: join(process.cwd(), "src/graphql/generated/schema.graphql"),
        typegen: join(process.cwd(), "src/graphql/generated/nexus-types.ts"),
    },
    shouldGenerateArtifacts: true,
    sourceTypes: {
        modules: [
            {
                module: "@prisma/client",
                alias: "prisma",
            },
        ],
    },
    contextType: {
        module: join(process.cwd(), "src/graphql/context.ts"),
        export: "Context",
    },
});
