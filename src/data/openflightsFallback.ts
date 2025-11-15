import { Airport } from '../types/Airport';

// Curated fallback list of major airports (subset of OpenFlights curated fallback)
// This list is intentionally small but includes common international/domestic hubs
const fallbackAirports: Airport[] = [
  { iataCode: 'JFK', name: 'John F Kennedy International Airport', city: 'New York', country: 'United States', coordinates: { lat: 40.6413, lng: -73.7781 }, isInternational: true },
  { iataCode: 'LGA', name: 'LaGuardia Airport', city: 'New York', country: 'United States', coordinates: { lat: 40.7769, lng: -73.8740 }, isInternational: true },
  { iataCode: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark', country: 'United States', coordinates: { lat: 40.6895, lng: -74.1745 }, isInternational: true },
  { iataCode: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', coordinates: { lat: 33.9425, lng: -118.4081 }, isInternational: true },
  { iataCode: 'SFO', name: 'San Francisco International Airport', city: 'San Francisco', country: 'United States', coordinates: { lat: 37.6213, lng: -122.3790 }, isInternational: true },
  { iataCode: 'ORD', name: "O'Hare International Airport", city: 'Chicago', country: 'United States', coordinates: { lat: 41.9786, lng: -87.9048 }, isInternational: true },
  { iataCode: 'ATL', name: 'Hartsfield Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', coordinates: { lat: 33.6367, lng: -84.4281 }, isInternational: true },
  { iataCode: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'United States', coordinates: { lat: 25.7932, lng: -80.2906 }, isInternational: true },
  { iataCode: 'SEA', name: 'Seattle Tacoma International Airport', city: 'Seattle', country: 'United States', coordinates: { lat: 47.4502, lng: -122.3088 }, isInternational: true },
  { iataCode: 'DEN', name: 'Denver International Airport', city: 'Denver', country: 'United States', coordinates: { lat: 39.8561, lng: -104.6737 }, isInternational: true },
  { iataCode: 'PHX', name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'United States', coordinates: { lat: 33.4343, lng: -112.0116 }, isInternational: true },
  { iataCode: 'BOS', name: 'Logan International Airport', city: 'Boston', country: 'United States', coordinates: { lat: 42.3656, lng: -71.0096 }, isInternational: true },
  { iataCode: 'PHL', name: 'Philadelphia International Airport', city: 'Philadelphia', country: 'United States', coordinates: { lat: 39.8729, lng: -75.2437 }, isInternational: true },
  { iataCode: 'CLT', name: 'Charlotte Douglas International Airport', city: 'Charlotte', country: 'United States', coordinates: { lat: 35.2144, lng: -80.9473 }, isInternational: true },
  { iataCode: 'MSP', name: 'Minneapolis–Saint Paul International Airport', city: 'Minneapolis', country: 'United States', coordinates: { lat: 44.8848, lng: -93.2223 }, isInternational: true },
  { iataCode: 'IAD', name: 'Washington Dulles International Airport', city: 'Dulles', country: 'United States', coordinates: { lat: 38.9531, lng: -77.4565 }, isInternational: true },
  { iataCode: 'DCA', name: 'Ronald Reagan Washington National Airport', city: 'Arlington', country: 'United States', coordinates: { lat: 38.8512, lng: -77.0402 }, isInternational: true },
  { iataCode: 'BWI', name: 'Baltimore/Washington International Thurgood Marshall Airport', city: 'Baltimore', country: 'United States', coordinates: { lat: 39.1754, lng: -76.6684 }, isInternational: true },
  { iataCode: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', coordinates: { lat: 51.4706, lng: -0.4619 }, isInternational: true },
  { iataCode: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', coordinates: { lat: 49.0097, lng: 2.5479 }, isInternational: true },
  { iataCode: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', coordinates: { lat: 35.7719, lng: 140.3929 }, isInternational: true },
  { iataCode: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan', coordinates: { lat: 35.5494, lng: 139.7798 }, isInternational: true }
];

export default fallbackAirports;
