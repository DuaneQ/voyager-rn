import ReactNativeAirportService from '../../services/ReactNativeAirportService';

describe('ReactNativeAirportService - classification checks', () => {
  const svc = new ReactNativeAirportService();

  const codes = ['LGA','JFK','EWR','CDG','LHR'];

  it('returns authoritative info for major airports', async () => {
    const results = await Promise.all(codes.map(async (c) => {
      const a = await svc.getAirportByIataCode(c);
      return { code: c, airport: a };
    }));

    // Print out for manual inspection in test output
    results.forEach(r => {
      // eslint-disable-next-line no-console
      console.log(`${r.code}:`, r.airport ? `${r.airport.name} | country=${r.airport.country} | isInternational=${r.airport.isInternational}` : 'NOT FOUND');
    });

    // Basic assertions: known airports should be found and flagged international
    results.forEach(r => {
      expect(r.airport).not.toBeNull();
      expect(typeof r.airport?.isInternational).toBe('boolean');
      expect(r.airport?.isInternational).toBe(true);
    });
  }, 10000);
});
