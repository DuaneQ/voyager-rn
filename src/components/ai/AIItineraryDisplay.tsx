/**
 * AI Itinerary Display Component for React Native
 * Displays detailed AI-generated itinerary matching PWA functionality with collapsible accordions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';
import { ShareAIItineraryModal } from '../modals/ShareAIItineraryModal';
import { db } from '../../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AIItineraryDisplayProps {
  itinerary: AIGeneratedItinerary;
}

export const AIItineraryDisplay: React.FC<AIItineraryDisplayProps> = ({ itinerary }) => {
  // Handle null/missing itinerary gracefully
  if (!itinerary) {
    return (
      <View style={styles.container}>
        <Text style={styles.noDataText}>No itinerary data available</Text>
      </View>
    );
  }

  // Accordion state management
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.has(sectionId);

  // Parse the AI assistant response (it's a JSON string)
  let parsedData: any = {};
  try {
    if (itinerary?.response?.data?.assistant) {
      parsedData = JSON.parse(itinerary.response.data.assistant);
    }
  } catch (error) {
    // Silently fail - UI will handle missing data gracefully
  }

  // Extract data from parsed response - MATCHING PWA EXACTLY
  // Transportation may be stored directly under response.data.transportation (preferred)
  // or under response.data.recommendations.transportation (older payloads). Check both.
  const rawTransport = (itinerary?.response?.data?.transportation ?? itinerary?.response?.data?.recommendations?.transportation) as any;
  
  // Normalize multiple possible shapes so tests and UI can rely on a single shape
  const transportation = rawTransport ? {
    mode: rawTransport.mode,
    // Accept either a pre-formatted string ("5h") or numeric hours (5)
    estimatedTime: rawTransport.estimatedTime ?? (rawTransport.estimated_duration_hours ? `${rawTransport.estimated_duration_hours}h` : null),
    estimatedDistance: rawTransport.estimatedDistance ?? (rawTransport.estimated_distance_miles ? `${rawTransport.estimated_distance_miles} miles` : null),
    // Accept either a simple number/string (estimated_cost_usd) or an object { amount, currency }
    estimatedCost: rawTransport.estimated_cost_usd ? (typeof rawTransport.estimated_cost_usd === 'number' ? `${rawTransport.estimated_cost_usd} USD` : String(rawTransport.estimated_cost_usd))
                   : (rawTransport.estimatedCost && typeof rawTransport.estimatedCost === 'object' ? `${rawTransport.estimatedCost.amount} ${rawTransport.estimatedCost.currency || 'USD'}` : (rawTransport.estimatedCost ? String(rawTransport.estimatedCost) : null)),
    // Providers may be a single provider string or an array of provider objects
    providers: rawTransport.providers && Array.isArray(rawTransport.providers) ? rawTransport.providers : (rawTransport.provider ? [{ name: rawTransport.provider }] : []),
    // Steps (ordered guidance) may be provided on transport
    steps: rawTransport.steps ? (Array.isArray(rawTransport.steps) ? rawTransport.steps : [String(rawTransport.steps)]) : [],
    // Tips may be a string or an array
    tips: rawTransport.tips ? (Array.isArray(rawTransport.tips) ? rawTransport.tips : [String(rawTransport.tips)]) : []
  } : null;

  // Also read any raw assumptions saved on the itinerary
  const assumptions = (itinerary as any)?.response?.data?.assumptions as any;
  
  // CRITICAL FIX: Read dailyPlans from the correct location matching PWA
  // Priority: response.data.itinerary.days -> response.data.itinerary.dailyPlans -> parsedData -> top-level
  const itineraryData = itinerary?.response?.data?.itinerary;
  const dailyPlans = itineraryData?.days || itineraryData?.dailyPlans || parsedData?.daily_itinerary || parsedData?.dailyPlans || (itinerary as any)?.dailyPlans;
  
  // Read recommendations from response.data.recommendations (primary) or parsedData (fallback)
  const recommendations = (itinerary?.response?.data?.recommendations) || parsedData?.recommendations || (itinerary as any)?.recommendations;
  
  // CRITICAL: Flight data source - MATCHING PWA EXACTLY
  // UI prefers itineraryData.flights first, then recommendations.flights, then top-level
  const flights = (itineraryData as any)?.flights || recommendations?.flights || (itinerary as any)?.flights || [];
  
  // Check if this is a flight-based itinerary
  const hasFlights = flights && flights.length > 0;
  
  // Determine if we should show the travel recommendations section
  const shouldShowRecommendations = Boolean(
    (transportation && transportation.mode !== 'flight') ||
    (assumptions && (
      (assumptions.providers && assumptions.providers.length > 0) ||
      (assumptions.steps && assumptions.steps.length > 0) ||
      (assumptions.tips && assumptions.tips.length > 0)
    ))
  );

  // Combine providers from transport and assumptions (dedupe by url/name) - MATCHING PWA
  const combinedProviders: any[] = (() => {
    const list: any[] = [];
    if (transportation?.providers && Array.isArray(transportation.providers)) list.push(...transportation.providers);
    if (assumptions?.providers && Array.isArray(assumptions.providers)) list.push(...assumptions.providers);
    
    const normalizeUrl = (p: any) => p?.url || p?.website || p?.link || p?.href || p?.site || null;
    const seen = new Set<string>();
    const out: any[] = [];
    
    for (const p of list) {
      const url = normalizeUrl(p);
      const key = url || p?.name || JSON.stringify(p);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...p, _normalizedUrl: url });
    }
    return out;
  })();

  // Combine tips from transport and assumptions - MATCHING PWA
  const combinedTips: string[] = (() => {
    const t: string[] = [];
    if (transportation?.tips && Array.isArray(transportation.tips)) t.push(...transportation.tips.map(String));
    if (assumptions?.tips) {
      if (Array.isArray(assumptions.tips)) t.push(...assumptions.tips.map(String));
      else t.push(String(assumptions.tips));
    }
    return t;
  })();

  // Combine steps from transport and assumptions - MATCHING PWA
  const combinedSteps: string[] = (() => {
    const s: string[] = [];
    if (transportation?.steps && Array.isArray(transportation.steps)) s.push(...transportation.steps.map(String));
    if (assumptions?.steps) {
      if (Array.isArray(assumptions.steps)) s.push(...assumptions.steps.map(String));
      else s.push(String(assumptions.steps));
    }
    return s;
  })();

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  // Share modal state
  const [isSharing, setIsSharing] = useState(false);

  // Share handler - EXACTLY matching PWA logic with direct Firestore access
  const handleShare = async () => {
    if (!itinerary || isSharing) return;

    setIsSharing(true);
    try {
      // Save directly to Firestore so the share page (which reads from Firestore)
      // can serve the itinerary. This matches PWA implementation exactly.
      const id = itinerary.id;
      
      if (!id) {
        console.error('❌ Cannot share itinerary: missing ID', itinerary);
        Alert.alert(
          'Share Error',
          'This itinerary cannot be shared yet. Please try generating it again.',
          [{ text: 'OK' }]
        );
        setIsSharing(false);
        return;
      }

      // Ensure we save the full itinerary structure including all nested data
      // (response.data.recommendations, response.data.metadata, etc.)
      const payload = {
        ...itinerary,
        id,
        createdAt: itinerary.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Explicitly preserve the response object to ensure recommendations and metadata are saved
        response: itinerary.response || {},
      } as any;

      const ref = doc(db, 'itineraries', id);
      // Use merge: false to ensure we write the complete document
      await setDoc(ref, payload, { merge: false });

      // Open share modal
      setShareModalOpen(true);
    } catch (err: any) {
      console.error('❌ Share error:', err);
      Alert.alert(
        'Share Error',
        'Unable to create a shareable link right now. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareClose = () => {
    setShareModalOpen(false);
  };

  // Accordion Header Component
  const AccordionHeader = ({ 
    title, 
    sectionId, 
    count 
  }: { 
    title: string; 
    sectionId: string; 
    count?: number;
  }) => {
    const isExpanded = isSectionExpanded(sectionId);
    return (
      <TouchableOpacity
        style={styles.accordionHeader}
        onPress={() => toggleSection(sectionId)}
        activeOpacity={0.7}
      >
        <Text style={styles.accordionTitle}>
          {title} {count !== undefined && `(${count})`}
        </Text>
        <Text style={styles.accordionIcon}>{isExpanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.destination}>{itinerary.destination}</Text>
            {itinerary.description && (
              <Text style={styles.description}>{itinerary.description}</Text>
            )}
          </View>
          <TouchableOpacity 
            onPress={handleShare} 
            style={styles.shareButton}
            activeOpacity={0.7}
            disabled={isSharing}
            testID="share-button"
          >
            <Ionicons name="share-outline" size={24} color={isSharing ? '#999' : '#1976d2'} />
          </TouchableOpacity>
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>📅 </Text>
          <Text style={styles.dateText}>
            {formatDate(itinerary.startDate)} - {formatDate(itinerary.endDate)}
          </Text>
        </View>
      </View>

      {/* Flight Options Accordion */}
      {hasFlights && (
        <View style={styles.accordionContainer}>
          <AccordionHeader 
            title="✈️ Flight Options" 
            sectionId="flights" 
            count={flights.length}
          />
          {isSectionExpanded('flights') && (
            <View style={styles.accordionContent}>
              {flights.map((flight: any, index: number) => (
                <View key={index} style={styles.card}>
                  {/* Flight Header with Airline and Route */}
                  <Text style={styles.flightAirline}>
                    {flight.airline || 'N/A'} {flight.flightNumber || ''}
                  </Text>
                  <Text style={styles.flightRoute}>{flight.route || 'N/A'}</Text>
                  
                  {/* Departure Time */}
                  {(flight.departure?.date && flight.departure?.time) && (
                    <Text style={styles.flightDepartureTime}>
                      Departure: {flight.departure.date} at {flight.departure.time}
                    </Text>
                  )}
                  
                  {/* Flight Details Row */}
                  <View style={styles.flightRow}>
                    <Text style={styles.flightDuration}>{flight.duration || 'N/A'}</Text>
                    <Text style={styles.flightStops}>
                      {flight.stops === 0 ? 'Direct' : flight.stops === undefined ? 'N/A' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                    </Text>
                  </View>
                  
                  {/* Price */}
                  {flight.price && (
                    <Text style={styles.flightPrice}>
                      ${flight.price?.amount || 'N/A'} {flight.price?.currency || 'USD'}
                    </Text>
                  )}
                  
                  {/* Cabin Class */}
                  {(flight.cabin || flight.class) && (
                    <Text style={styles.flightCabin}>
                      {flight.cabin || flight.class}
                    </Text>
                  )}
                  
                  {/* Return Flight Info (if round-trip) */}
                  {flight.return && (
                    <View style={styles.returnFlightContainer}>
                      <Text style={styles.returnFlightLabel}>Return Flight</Text>
                      <Text style={styles.flightAirline}>
                        {flight.return.airline || flight.airline} {flight.return.flightNumber || flight.flightNumber}
                      </Text>
                      <Text style={styles.flightRoute}>
                        {flight.return.route || `${flight.return.departure?.iata || ''} → ${flight.return.arrival?.iata || ''}`}
                      </Text>
                      {(flight.return.departure?.date && flight.return.departure?.time) && (
                        <Text style={styles.flightDepartureTime}>
                          Departure: {flight.return.departure.date} at {flight.return.departure.time}
                        </Text>
                      )}
                      <View style={styles.flightRow}>
                        <Text style={styles.flightDuration}>{flight.return.duration || 'N/A'}</Text>
                        <Text style={styles.flightStops}>
                          {flight.return.stops === 0 ? 'Direct' : flight.return.stops === undefined ? 'N/A' : `${flight.return.stops} stop${flight.return.stops > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Travel Recommendations Accordion - MATCHING PWA */}
      {shouldShowRecommendations && (
        <View style={styles.accordionContainer}>
          <AccordionHeader 
            title="🚗 Travel Recommendations" 
            sectionId="travel"
          />
          {isSectionExpanded('travel') && (
            <View style={styles.accordionContent}>
              <View style={styles.card}>
                {transportation?.mode && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Mode:</Text>
                    <Text style={styles.infoValue}>{transportation.mode}</Text>
                  </View>
                )}
                {transportation?.estimatedTime && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Estimated Duration:</Text>
                    <Text style={styles.infoValue}>{transportation.estimatedTime}</Text>
                  </View>
                )}
                {transportation?.estimatedDistance && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Estimated Distance:</Text>
                    <Text style={styles.infoValue}>{transportation.estimatedDistance}</Text>
                  </View>
                )}
                {transportation?.estimatedCost && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Estimated Cost:</Text>
                    <Text style={styles.infoValue}>{transportation.estimatedCost}</Text>
                  </View>
                )}
                
                {/* Combined Steps */}
                {combinedSteps.length > 0 && (
                  <View style={styles.stepsContainer}>
                    <Text style={styles.stepsTitle}>Steps:</Text>
                    {combinedSteps.map((step: string, index: number) => (
                      <Text key={index} style={styles.stepText}>
                        {index + 1}. {step}
                      </Text>
                    ))}
                  </View>
                )}
                
                {/* Combined Providers */}
                {combinedProviders.length > 0 && (
                  <View style={styles.providersContainer}>
                    <Text style={styles.providersTitle}>Providers:</Text>
                    {combinedProviders.map((provider: any, index: number) => (
                      <View key={index} style={styles.providerCard}>
                        <Text style={styles.providerName}>{provider.name}</Text>
                        {provider._normalizedUrl && (
                          <Text style={styles.providerUrl}>{provider._normalizedUrl}</Text>
                        )}
                        {provider.notes && (
                          <Text style={styles.providerNotes}>{provider.notes}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Combined Tips */}
                {combinedTips.length > 0 && (
                  <View style={styles.tipsContainer}>
                    <Text style={styles.tipsTitle}>💡 Tips:</Text>
                    {combinedTips.map((tip: string, index: number) => (
                      <Text key={index} style={styles.tipText}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}

      {/* Accommodation Recommendations Accordion */}
      {recommendations?.accommodations && recommendations.accommodations.length > 0 && (
        <View style={styles.accordionContainer}>
          <AccordionHeader 
            title="🏨 Accommodation Recommendations" 
            sectionId="accommodations" 
            count={recommendations.accommodations.length}
          />
          {isSectionExpanded('accommodations') && (
            <View style={styles.accordionContent}>
              {recommendations.accommodations.map((hotel: any, index: number) => {
                // Get hotel photo (matching PWA)
                const hotelPhoto = (() => {
                  if (!hotel) return null;
                  if (Array.isArray(hotel.photos) && hotel.photos.length > 0) {
                    const first = hotel.photos[0];
                    if (typeof first === 'string' && (first.startsWith('http') || first.startsWith('/'))) {
                      return first;
                    }
                  }
                  return null;
                })();
                
                // Get booking link (matching PWA)
                const bookingLink = hotel.bookingUrl || 
                                  hotel.website || 
                                  hotel.vendorRaw?.website || 
                                  (hotel.placeId ? `https://www.google.com/maps/place/?q=place_id:${hotel.placeId}` : null);
                
                // Format price (matching PWA)
                const formatPrice = (() => {
                  const amt = hotel?.pricePerNight?.amount ?? hotel?.price?.amount ?? hotel?.priceAmount;
                  if (typeof amt === 'number') {
                    return `$${amt}`;
                  }
                  if (hotel?.price_level || hotel?.priceLevel) {
                    const lvl = hotel.price_level ?? hotel.priceLevel;
                    return '$'.repeat(Math.max(1, Math.min(4, Number(lvl) || 1)));
                  }
                  return null;
                })();
                
                return (
                  <View key={index} style={styles.hotelCard}>
                    {/* Hotel Photo Background */}
                    {hotelPhoto ? (
                      <Image 
                        source={{ uri: hotelPhoto }} 
                        style={styles.hotelImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.hotelImageContainer}>
                        <Text style={styles.hotelImagePlaceholder}>🏨</Text>
                      </View>
                    )}
                    
                    {/* Hotel Info Overlay - Gradient from dark at bottom to transparent at top */}
                    <LinearGradient
                      colors={['rgba(0, 0, 0, 0.08)', 'rgba(0, 0, 0, 0.72)']}
                      style={[styles.hotelOverlay, !hotelPhoto && styles.hotelOverlayNoImage]}
                      locations={[0, 1]}
                    >
                      <Text style={styles.hotelName}>{hotel.name}</Text>
                      
                      {hotel.address && (
                        <Text style={styles.hotelAddress}>
                          {hotel.address || hotel.formatted_address || hotel.location?.address}
                        </Text>
                      )}
                      
                      {/* Rating, Reviews, Price */}
                      <View style={styles.hotelMetaRow}>
                        {hotel.rating && (
                          <View style={styles.hotelChip}>
                            <Text style={styles.hotelChipText}>⭐ {hotel.rating}</Text>
                          </View>
                        )}
                        {(hotel.userRatingsTotal || hotel.user_ratings_total) && (
                          <View style={styles.hotelChip}>
                            <Text style={styles.hotelChipText}>
                              {hotel.userRatingsTotal || hotel.user_ratings_total} reviews
                            </Text>
                          </View>
                        )}
                        {formatPrice && (
                          <View style={styles.hotelChip}>
                            <Text style={styles.hotelChipText}>{formatPrice}</Text>
                          </View>
                        )}
                      </View>
                      
                      {/* BOOK Button */}
                      {bookingLink && (
                        <TouchableOpacity 
                          style={styles.bookButton}
                          onPress={() => {
                            Linking.openURL(bookingLink).catch(err => 
                              console.error('Failed to open booking link:', err)
                            );
                          }}
                        >
                          <Text style={styles.bookButtonText}>BOOK</Text>
                        </TouchableOpacity>
                      )}
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Daily Activities Accordion */}
      {dailyPlans && dailyPlans.length > 0 && (
        <View style={styles.accordionContainer}>
          <AccordionHeader 
            title="📅 Daily Activities" 
            sectionId="dailyActivities" 
            count={dailyPlans.length}
          />
          {isSectionExpanded('dailyActivities') && (
            <View style={styles.accordionContent}>
              {dailyPlans.map((day: any, dayIndex: number) => (
                <View key={dayIndex} style={styles.dayCard}>
                  <Text style={styles.dayTitle}>Day {day.day}</Text>
                  {day.date && (
                    <Text style={styles.dayDate}>{formatDate(day.date)}</Text>
                  )}
                  
                  {/* Activities */}
                  {day.activities && day.activities.length > 0 && (
                    <View style={styles.daySection}>
                      <Text style={styles.daySectionTitle}>🎯 Activities</Text>
                      {day.activities.map((activity: any, actIndex: number) => (
                        <View key={actIndex} style={styles.activityCard}>
                          <Text style={styles.activityName}>{activity.name}</Text>
                          {activity.startTime && activity.endTime && (
                            <Text style={styles.activityTime}>
                              ⏰ {activity.startTime} - {activity.endTime}
                            </Text>
                          )}
                          {activity.description && (
                            <Text style={styles.activityDescription}>{activity.description}</Text>
                          )}
                          {activity.location && (
                            <Text style={styles.activityLocation}>
                              📍 {typeof activity.location === 'string' ? activity.location : activity.location.name}
                            </Text>
                          )}
                          {activity.rating && (
                            <Text style={styles.activityRating}>
                              ⭐ {activity.rating} ({activity.userRatingsTotal || 0} reviews)
                            </Text>
                          )}
                          {activity.phone && (
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${activity.phone}`)}>
                              <Text style={styles.activityLink}>
                                📞 {activity.phone}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {activity.website && (
                            <TouchableOpacity onPress={() => Linking.openURL(activity.website)}>
                              <Text style={styles.activityLink}>
                                🌐 {activity.website}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {(activity.estimatedCost || activity.cost || activity.price) && (
                            <Text style={styles.activityCost}>
                              💰 {
                                typeof activity.estimatedCost === 'object' 
                                  ? `$${activity.estimatedCost.amount}` 
                                  : activity.estimatedCost || activity.cost || activity.price
                              }
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {/* Meals */}
                  {day.meals && day.meals.length > 0 && (
                    <View style={styles.daySection}>
                      <Text style={styles.daySectionTitle}>🍽️ Meals</Text>
                      {day.meals.map((meal: any, mealIndex: number) => (
                        <View key={mealIndex} style={styles.activityCard}>
                          <Text style={styles.mealName}>{meal.name || meal.type}</Text>
                          {meal.time && (
                            <Text style={styles.mealTime}>⏰ {meal.time}</Text>
                          )}
                          {meal.restaurant && (
                            <View style={{ marginTop: 8 }}>
                              <Text style={styles.restaurantName}>{meal.restaurant.name}</Text>
                              {meal.restaurant.description && (
                                <Text style={styles.restaurantDescription}>{meal.restaurant.description}</Text>
                              )}
                              {meal.restaurant.location && (
                                <Text style={styles.activityLocation}>
                                  📍 {typeof meal.restaurant.location === 'string' 
                                      ? meal.restaurant.location 
                                      : meal.restaurant.location.address || meal.restaurant.location.name}
                                </Text>
                              )}
                              {meal.restaurant.rating && (
                                <Text style={styles.restaurantRating}>
                                  ⭐ {meal.restaurant.rating} ({meal.restaurant.userRatingsTotal || 0} reviews)
                                </Text>
                              )}
                              {meal.restaurant.phone && (
                                <TouchableOpacity onPress={() => Linking.openURL(`tel:${meal.restaurant.phone}`)}>
                                  <Text style={styles.activityLink}>
                                    📞 {meal.restaurant.phone}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {meal.restaurant.website && (
                                <TouchableOpacity onPress={() => Linking.openURL(meal.restaurant.website)}>
                                  <Text style={styles.activityLink}>
                                    🌐 {meal.restaurant.website}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              {(meal.cost || meal.restaurant.estimatedCost) && (
                                <Text style={styles.restaurantPrice}>
                                  💰 {
                                    typeof (meal.cost || meal.restaurant.estimatedCost) === 'object' 
                                      ? `$${(meal.cost || meal.restaurant.estimatedCost).amount}` 
                                      : meal.cost || meal.restaurant.estimatedCost
                                  }
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Alternative Activities Accordion */}
      {recommendations?.alternativeActivities && recommendations.alternativeActivities.length > 0 && (
        <View style={styles.accordionContainer}>
          <AccordionHeader 
            title="🎯 Alternative Activities" 
            sectionId="altActivities" 
            count={recommendations.alternativeActivities.length}
          />
          {isSectionExpanded('altActivities') && (
            <View style={styles.accordionContent}>
              {recommendations.alternativeActivities.map((activity: any, index: number) => (
                <View key={index} style={styles.card}>
                  <Text style={styles.activityName}>{activity.name}</Text>
                  {activity.description && (
                    <Text style={styles.activityDescription}>{activity.description}</Text>
                  )}
                  {activity.rating && (
                    <Text style={styles.activityRating}>⭐ {activity.rating}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Alternative Restaurants Accordion */}
      {recommendations?.alternativeRestaurants && recommendations.alternativeRestaurants.length > 0 && (
        <View style={styles.accordionContainer}>
          <AccordionHeader 
            title="🍽️ Alternative Restaurants" 
            sectionId="altRestaurants" 
            count={recommendations.alternativeRestaurants.length}
          />
          {isSectionExpanded('altRestaurants') && (
            <View style={styles.accordionContent}>
              {recommendations.alternativeRestaurants.map((restaurant: any, index: number) => (
                <View key={index} style={styles.card}>
                  <Text style={styles.restaurantName}>{restaurant.name}</Text>
                  {restaurant.description && (
                    <Text style={styles.restaurantDescription}>{restaurant.description}</Text>
                  )}
                  {restaurant.rating && (
                    <Text style={styles.restaurantRating}>⭐ {restaurant.rating}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Share Modal */}
      <ShareAIItineraryModal
        visible={shareModalOpen}
        onClose={handleShareClose}
        itinerary={itinerary}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  shareButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  destination: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 16,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  // Accordion Styles
  accordionContainer: {
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  accordionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  accordionIcon: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  accordionContent: {
    padding: 12,
    backgroundColor: '#F9F9F9',
  },
  // Transport Card (non-collapsible)
  transportCard: {
    marginBottom: 12,
    backgroundColor: '#FFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  transportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  card: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  // Flight Styles
  flightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  flightTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  flightDuration: {
    fontSize: 14,
    color: '#666',
  },
  flightStops: {
    fontSize: 14,
    color: '#666',
  },
  flightPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 4,
  },
  flightAirline: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  // Info Row Styles
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    width: 140,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  tipsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tipsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Hotel Styles
  hotelName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
    lineHeight: 22,
  },
  hotelPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  hotelRating: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  hotelAddress: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  // Day Card Styles
  dayCard: {
    backgroundColor: '#FFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  dayDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  daySection: {
    marginTop: 12,
  },
  daySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  activityItem: {
    marginBottom: 8,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    paddingLeft: 12,
  },
  activityRating: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mealItem: {
    marginBottom: 8,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  mealTime: {
    fontSize: 13,
    color: '#666',
    paddingLeft: 12,
  },
    restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  stepsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    paddingLeft: 8,
  },
  providersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  providersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  providerCard: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  providerUrl: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  providerNotes: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  tipsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    paddingLeft: 8,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  restaurantDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  restaurantRating: {
    fontSize: 14,
    color: '#666',
  },
  restaurantCuisine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  restaurantLocation: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  restaurantPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  hotelLocation: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  hotelAmenities: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  activityLocation: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  activityCost: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
  activityTime: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  daySubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  activitiesContainer: {
    marginTop: 8,
  },
  activityCard: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  // Hotel Card Styles (matching PWA photo background design)
  hotelCard: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 280,
    backgroundColor: '#111',
  },
  hotelImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  hotelImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotelImagePlaceholder: {
    fontSize: 48,
    opacity: 0.3,
  },
  hotelOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 16,
    // backgroundColor removed - using LinearGradient component instead
  },
  hotelOverlayNoImage: {
    position: 'relative',
    paddingTop: 16,
    backgroundColor: '#FFF',
  },
  hotelMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  hotelChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  hotelChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  activityLink: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
    textDecorationLine: 'underline',
  },
  // Additional Flight Styles
  flightRoute: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  flightDepartureTime: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  flightCabin: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  returnFlightContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  returnFlightLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
});
