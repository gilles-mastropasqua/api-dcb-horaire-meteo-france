export const playgroundQueries = [
    {
        name: 'List of Stations',
        endpoint: '/api/graphql',
        query: `query GetPostes {
  findManyPoste(
    skip: 15 # Optional
    take: 5 # Optional : default 50
  ) {
    nomUsuel
    numPoste
    commune
  }
}`,
    },
    {
        name: 'Station with Latest Observations',
        endpoint: '/api/graphql',
        query: `query GetPosteWithObservations {
  findUniquePoste(where: { numPoste: "01014002" }) {
    numPoste
    datferm
    datouvr
    observations(
      take: 10
      where: {
        dateObservation: {
          gte: "2024-01-01T02:00:00.000Z"
          lte: "2024-01-01T10:00:00.000Z"
        }
      }
    ) {
      dateObservation
      alti
      t
      u
    }
  }
}`,
    },
    {
        name: 'Search by City',
        endpoint: '/api/graphql',
        query: `query GetPostesByCommune {
  findManyPoste(
    where: { commune: { contains: "Paris", mode: insensitive } }
    take: 10
  ) {
    numPoste
    nomUsuel
    commune
  }
}`,
    },
    {
        name: 'Observations for the Last 7 Days',
        endpoint: '/api/graphql',
        query: `query GetWeeklyObservations {
  findUniquePoste(where: { numPoste: "01014002" }) {
    numPoste
    observations(
      take: 20
      where: {
        dateObservation: {
          gte: "2024-02-13T00:00:00.000Z"
          lte: "2024-02-20T23:59:59.000Z"
        }
      }
      orderBy: { dateObservation: desc }
    ) {
      dateObservation
      t
      u
    }
  }
}`,
    },
];
