/**
 * AI Itinerary Display Component for React Native
 * Displays detailed AI-generated itinerary matching PWA functionality with collapsible accordions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AIGeneratedItinerary, useAIGeneratedItineraries } from '../../hooks/useAIGeneratedItineraries';
import { ShareAIItineraryModal } from '../modals/ShareAIItineraryModal';
import { db } from '../../config/firebaseConfig';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useUpdateItinerary } from '../../hooks/useUpdateItinerary';

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

  // Hooks for data management
  const { refreshItineraries } = useAIGeneratedItineraries();
  const { updateItinerary } = useUpdateItinerary();

  // Local itinerary state to immediately reflect saved changes
  const [localItinerary, setLocalItinerary] = useState<AIGeneratedItinerary>(itinerary);

  // Accordion state management
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  
  // Share modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Editing state management
  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState<AIGeneratedItinerary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Selection state for batch deletion
  const [selectedFlights, setSelectedFlights] = useState<Set<number>>(new Set());
  const [selectedAccommodations, setSelectedAccommodations] = useState<Set<number>>(new Set());
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  
  // Activity editing state (for inline editing of individual fields)
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  
  // Meal editing state (for inline editing of individual meal fields)
  const [editingMealId, setEditingMealId] = useState<string | null>(null);

  // Update local itinerary when prop changes (e.g., parent refreshes list)
  React.useEffect(() => {
    setLocalItinerary(itinerary);
  }, [itinerary]);

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

  // Selection handlers
  const toggleFlightSelection = (flightIndex: number) => {
    setSelectedFlights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(flightIndex)) {
        newSet.delete(flightIndex);
      } else {
        newSet.add(flightIndex);
      }
      return newSet;
    });
  };

  const toggleAccommodationSelection = (accommodationIndex: number) => {
    setSelectedAccommodations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accommodationIndex)) {
        newSet.delete(accommodationIndex);
      } else {
        newSet.add(accommodationIndex);
      }
      return newSet;
    });
  };

  const toggleActivitySelection = (dayIndex: number, activityIndex: number) => {
    const activityId = `${dayIndex}-${activityIndex}`;
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const clearAllSelections = () => {
    setSelectedFlights(new Set());
    setSelectedAccommodations(new Set());
    setSelectedActivities(new Set());
  };

  // Batch delete handlers
  const handleBatchDeleteFlights = () => {
    if (!editingData) return;
    
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const sortedIndices = Array.from(selectedFlights).sort((a, b) => b - a);
    
    // Determine the correct flight data source that UI uses
    const itineraryFlights = updatedData.response?.data?.itinerary?.flights;
    const recommendationFlights = updatedData.response?.data?.recommendations?.flights;
    
    // Delete from the primary data source (UI uses itinerary flights first, then recommendations)
    if (itineraryFlights && Array.isArray(itineraryFlights)) {
      sortedIndices.forEach(index => {
        updatedData.response.data.itinerary.flights.splice(index, 1);
      });
    } else if (recommendationFlights && Array.isArray(recommendationFlights)) {
      sortedIndices.forEach(index => {
        updatedData.response.data.recommendations.flights.splice(index, 1);
      });
    }
    
    setEditingData(updatedData);
    setSelectedFlights(new Set());
  };

  const handleBatchDeleteAccommodations = () => {
    if (!editingData) return;
    
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const sortedIndices = Array.from(selectedAccommodations).sort((a, b) => b - a);
    
    // Accommodations are only in recommendations, not in itinerary data
    const accommodations = updatedData.response?.data?.recommendations?.accommodations;
    
    if (accommodations && Array.isArray(accommodations)) {
      sortedIndices.forEach(index => {
        updatedData.response.data.recommendations.accommodations.splice(index, 1);
      });
    }
    
    setEditingData(updatedData);
    setSelectedAccommodations(new Set());
  };

  const handleBatchDeleteActivities = () => {
    if (!editingData) return;
    
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const dailyData = updatedData.response?.data?.itinerary?.days || updatedData.response?.data?.itinerary?.dailyPlans;
    
    // Delete activities from their respective days (need to sort by activityIndex desc to avoid index shifting)
    const sortedActivityIds = Array.from(selectedActivities).sort((a, b) => {
      const [, aActivityIndex] = a.split('-').map(Number);
      const [, bActivityIndex] = b.split('-').map(Number);
      return bActivityIndex - aActivityIndex;
    });
    
    sortedActivityIds.forEach(activityId => {
      const [dayIndex, activityIndex] = activityId.split('-').map(Number);
      if (dailyData && dailyData[dayIndex] && dailyData[dayIndex].activities) {
        dailyData[dayIndex].activities.splice(activityIndex, 1);
      }
    });
    
    setEditingData(updatedData);
    setSelectedActivities(new Set());
  };

  // Activity field update handlers for inline editing (matching PWA)
  const handleActivityFieldUpdate = (
    dayIndex: number,
    activityIndex: number,
    field: string,
    value: string
  ) => {
    if (!editingData) return;
    
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const dailyData = updatedData.response?.data?.itinerary?.days || updatedData.response?.data?.itinerary?.dailyPlans;
    
    if (dailyData && dailyData[dayIndex] && dailyData[dayIndex].activities && dailyData[dayIndex].activities[activityIndex]) {
      const activity = dailyData[dayIndex].activities[activityIndex];
      
      // Handle nested fields (e.g., 'location' might be string or object)
      if (field === 'location' && typeof activity.location === 'object') {
        activity.location = { ...activity.location, name: value };
      } else {
        activity[field] = value;
      }
      
      setEditingData(updatedData);
    }
  };

  const handleMealFieldUpdate = (
    dayIndex: number,
    mealIndex: number,
    field: string,
    value: string
  ) => {
    if (!editingData) return;
    
    const updatedData = JSON.parse(JSON.stringify(editingData));
    const dailyData = updatedData.response?.data?.itinerary?.days || updatedData.response?.data?.itinerary?.dailyPlans;
    
    if (dailyData && dailyData[dayIndex] && dailyData[dayIndex].meals && dailyData[dayIndex].meals[mealIndex]) {
      const meal = dailyData[dayIndex].meals[mealIndex];
      
      // Handle nested restaurant fields
      if (field.startsWith('restaurant.')) {
        const restaurantField = field.split('.')[1];
        if (!meal.restaurant) {
          meal.restaurant = {};
        }
        if (restaurantField === 'location' && typeof meal.restaurant.location === 'object') {
          meal.restaurant.location = { ...meal.restaurant.location, name: value };
        } else {
          meal.restaurant[restaurantField] = value;
        }
      } else {
        meal[field] = value;
      }
      
      setEditingData(updatedData);
    }
  };

  // Edit mode handlers
  const handleEditStart = () => {
    setIsEditing(true);
    setEditingData(JSON.parse(JSON.stringify(localItinerary)));
  };

  const handleCancel = () => {
    setIsEditing(false);
    clearAllSelections();
    setEditingData(null);
    setEditingActivityId(null);
    setEditingMealId(null);
  };

  const handleSave = async () => {
    if (!editingData || isSaving) return;

    setIsSaving(true);
    try {
      // Build the minimal updates object expected by the updateItinerary RPC
      const updatePayload: any = {
        response: editingData.response,
        updatedAt: new Date().toISOString(),
        destination: editingData.response?.data?.itinerary?.destination || editingData.destination,
        startDate: editingData.response?.data?.itinerary?.startDate || editingData.startDate,
        endDate: editingData.response?.data?.itinerary?.endDate || editingData.endDate
      };

      // CRITICAL FIX: Use currentItinerary (which is editingData in edit mode) for the ID
      const itineraryId = currentItinerary?.id || localItinerary.id;
      if (!itineraryId) {
        throw new Error('No itinerary ID found');
      }

      // Use the RPC-based updater (matches how non-AI itineraries are updated)
      await updateItinerary(itineraryId, updatePayload as any);

      // CRITICAL: Immediately update localItinerary with saved changes so UI reflects them
      setLocalItinerary({
        ...editingData,
        updatedAt: updatePayload.updatedAt
      });
      
      // Clear editing state
      setIsEditing(false);
      clearAllSelections();
      setEditingData(null);
      setEditingActivityId(null);

      // Refresh the list in background (doesn't affect current display)
      refreshItineraries().catch(err => {
        console.warn('Failed to refresh itineraries list:', err);
      });

      Alert.alert('Success', 'Changes saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(
        'Error',
        `Failed to save changes: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Parse the AI assistant response (it's a JSON string)
  let parsedData: any = {};
  try {
    if (itinerary?.response?.data?.assistant) {
      parsedData = JSON.parse(itinerary.response.data.assistant);
    }
  } catch (error) {
    // Silently fail - UI will handle missing data gracefully
  }

  // Use editingData when in edit mode, otherwise use localItinerary
  const currentItinerary = isEditing && editingData ? editingData : localItinerary;

  // Extract data from parsed response - MATCHING PWA EXACTLY
  // Transportation may be stored directly under response.data.transportation (preferred)
  // or under response.data.recommendations.transportation (older payloads). Check both.
  const rawTransport = (currentItinerary?.response?.data?.transportation ?? currentItinerary?.response?.data?.recommendations?.transportation) as any;
  
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
  const assumptions = (currentItinerary as any)?.response?.data?.assumptions as any;
  
  // CRITICAL FIX: Read dailyPlans from the correct location matching PWA
  // Priority: response.data.itinerary.days -> response.data.itinerary.dailyPlans -> parsedData -> top-level
  const itineraryData = currentItinerary?.response?.data?.itinerary;
  const dailyPlans = itineraryData?.days || itineraryData?.dailyPlans || parsedData?.daily_itinerary || parsedData?.dailyPlans || (currentItinerary as any)?.dailyPlans;
  
  // Read recommendations from response.data.recommendations (primary) or parsedData (fallback)
  const recommendations = (currentItinerary?.response?.data?.recommendations) || parsedData?.recommendations || (currentItinerary as any)?.recommendations;
  
  // CRITICAL: Flight data source - MATCHING PWA EXACTLY
  // UI prefers itineraryData.flights first, then recommendations.flights, then top-level
  const flights = (itineraryData as any)?.flights || recommendations?.flights || (currentItinerary as any)?.flights || [];
  
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
    if (!localItinerary || isSharing) return;

    setIsSharing(true);
    try {
      // Save directly to Firestore so the share page (which reads from Firestore)
      // can serve the itinerary. This matches PWA implementation exactly.
      const id = localItinerary.id;
      
      if (!id) {
        console.error('❌ Cannot share itinerary: missing ID', localItinerary);
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
        ...localItinerary,
        id,
        createdAt: localItinerary.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Explicitly preserve the response object to ensure recommendations and metadata are saved
        response: localItinerary.response || {},
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
            <Text style={styles.destination}>{currentItinerary.destination}</Text>
            {currentItinerary.description && (
              <Text style={styles.description}>{currentItinerary.description}</Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {!isEditing ? (
              <>
                <TouchableOpacity 
                  onPress={handleEditStart} 
                  style={styles.editButton}
                  activeOpacity={0.7}
                  testID="edit-button"
                >
                  <Ionicons name="create-outline" size={24} color="#1976d2" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleShare} 
                  style={styles.shareButton}
                  activeOpacity={0.7}
                  disabled={isSharing}
                  testID="share-button"
                >
                  <Ionicons name="share-outline" size={24} color={isSharing ? '#999' : '#1976d2'} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity 
                  onPress={handleSave} 
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  activeOpacity={0.7}
                  disabled={isSaving}
                  testID="save-button"
                >
                  {isSaving ? (
                    <>
                      <Ionicons name="hourglass-outline" size={24} color="#FFF" />
                      <Text style={styles.saveButtonText}>Saving...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="checkmark-outline" size={24} color="#FFF" />
                      <Text style={styles.saveButtonText}>Save</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleCancel} 
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                  disabled={isSaving}
                  testID="cancel-button"
                >
                  <Ionicons name="close-outline" size={24} color="#f44336" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        <View style={styles.dateRow}>
          <Text style={styles.dateLabel}>📅 </Text>
          <Text style={styles.dateText}>
            {formatDate(currentItinerary.startDate)} - {formatDate(currentItinerary.endDate)}
          </Text>
        </View>
      </View>

      {/* Edit Mode Instructions */}
      {isEditing && (
        <View style={styles.editModeInstructions}>
          <Text style={styles.editModeText}>
            💡 <Text style={styles.editModeBold}>Edit Mode:</Text> Tap on flights ✈️, hotels 🏨, and activities 🎯 to select them for deletion. Use batch delete buttons below to remove selected items.
          </Text>
        </View>
      )}

      {/* Batch Delete Controls */}
      {isEditing && (selectedFlights.size > 0 || selectedAccommodations.size > 0 || selectedActivities.size > 0) && (
        <View style={styles.batchDeleteContainer}>
          <Text style={styles.batchDeleteTitle}>🗑️ Batch Delete Actions</Text>
          <View style={styles.batchDeleteButtons}>
            {selectedFlights.size > 0 && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleBatchDeleteFlights()}
                activeOpacity={0.7}
                testID="delete-flights-button"
              >
                <Ionicons name="trash-outline" size={16} color="#FFF" />
                <Text style={styles.deleteButtonText}>
                  Delete {selectedFlights.size} Flight{selectedFlights.size > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
            {selectedAccommodations.size > 0 && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleBatchDeleteAccommodations()}
                activeOpacity={0.7}
                testID="delete-accommodations-button"
              >
                <Ionicons name="trash-outline" size={16} color="#FFF" />
                <Text style={styles.deleteButtonText}>
                  Delete {selectedAccommodations.size} Hotel{selectedAccommodations.size > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
            {selectedActivities.size > 0 && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleBatchDeleteActivities()}
                activeOpacity={0.7}
                testID="delete-activities-button"
              >
                <Ionicons name="trash-outline" size={16} color="#FFF" />
                <Text style={styles.deleteButtonText}>
                  Delete {selectedActivities.size} Activity{selectedActivities.size > 1 ? 'ies' : 'y'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllSelections}
              activeOpacity={0.7}
              testID="clear-selection-button"
            >
              <Text style={styles.clearButtonText}>Clear Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
              {flights.map((flight: any, index: number) => {
                const isSelected = selectedFlights.has(index);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.card,
                      isEditing && styles.selectableCard,
                      isSelected && styles.selectedCard
                    ]}
                    onPress={() => isEditing && toggleFlightSelection(index)}
                    activeOpacity={isEditing ? 0.7 : 1}
                    disabled={!isEditing}
                  >
                    {isEditing && (
                      <View style={styles.selectionIndicator}>
                        <Ionicons 
                          name={isSelected ? "checkbox" : "square-outline"} 
                          size={24} 
                          color={isSelected ? "#1976d2" : "#999"} 
                        />
                      </View>
                    )}
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
                  </TouchableOpacity>
                );
              })}
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
                // Priority: actual booking URL > website > Google Maps search
                // Note: place_id URL format doesn't work reliably, use name+address search instead
                const bookingLink = hotel.bookingUrl || 
                                  hotel.website || 
                                  hotel.vendorRaw?.website || 
                                  (hotel.name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotel.name + (hotel.address ? ' ' + hotel.address : ''))}` : null);
                
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
                
                const isSelected = selectedAccommodations.has(index);
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.hotelCard,
                      isEditing && styles.selectableCard,
                      isSelected && styles.selectedCard
                    ]}
                    onPress={() => isEditing && toggleAccommodationSelection(index)}
                    activeOpacity={isEditing ? 0.7 : 1}
                    disabled={!isEditing}
                  >
                    {isEditing && (
                      <View style={styles.selectionIndicator}>
                        <Ionicons 
                          name={isSelected ? "checkbox" : "square-outline"} 
                          size={24} 
                          color={isSelected ? "#1976d2" : "#999"} 
                        />
                      </View>
                    )}
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
                      pointerEvents="box-none"
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
                      
                      {/* BOOK Button - only show when not editing */}
                      {!isEditing && bookingLink && (
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
                  </TouchableOpacity>
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
                      {day.activities.map((activity: any, actIndex: number) => {
                        const activityId = `${dayIndex}-${actIndex}`;
                        const isSelected = selectedActivities.has(activityId);
                        
                        const isEditingThisActivity = editingActivityId === activityId;
                        
                        return (
                          <View
                            key={actIndex}
                            style={[
                              styles.activityCard,
                              isEditing && styles.selectableCard,
                              isSelected && styles.selectedCard
                            ]}
                          >
                            {isEditing && !isEditingThisActivity && (
                              <TouchableOpacity 
                                style={styles.selectionIndicator}
                                onPress={() => toggleActivitySelection(dayIndex, actIndex)}
                                activeOpacity={0.7}
                              >
                                <Ionicons 
                                  name={isSelected ? "checkbox" : "square-outline"} 
                                  size={24} 
                                  color={isSelected ? "#1976d2" : "#999"} 
                                />
                              </TouchableOpacity>
                            )}
                            
                            {/* Edit/Done button for inline editing */}
                            {isEditing && (
                              <TouchableOpacity 
                                style={styles.editActivityButton}
                                onPress={() => setEditingActivityId(isEditingThisActivity ? null : activityId)}
                                activeOpacity={0.7}
                              >
                                <Ionicons 
                                  name={isEditingThisActivity ? "checkmark-circle" : "create"} 
                                  size={24} 
                                  color={isEditingThisActivity ? "#4caf50" : "#1976d2"} 
                                />
                              </TouchableOpacity>
                            )}
                            
                            {/* Activity Name - editable in edit mode */}
                            {isEditingThisActivity ? (
                              <TextInput
                                style={styles.activityNameInput}
                                value={activity.name}
                                onChangeText={(text) => handleActivityFieldUpdate(dayIndex, actIndex, 'name', text)}
                                placeholder="Activity name"
                                placeholderTextColor="#999"
                              />
                            ) : (
                              <Text style={styles.activityName}>{activity.name}</Text>
                            )}
                            {/* Time - editable */}
                            {isEditingThisActivity ? (
                              <View style={styles.timeInputRow}>
                                <Text style={styles.timeLabel}>⏰ </Text>
                                <TextInput
                                  style={styles.timeInput}
                                  value={activity.startTime || ''}
                                  onChangeText={(text) => handleActivityFieldUpdate(dayIndex, actIndex, 'startTime', text)}
                                  placeholder="Start time"
                                  placeholderTextColor="#999"
                                />
                                <Text style={styles.timeSeparator}> - </Text>
                                <TextInput
                                  style={styles.timeInput}
                                  value={activity.endTime || ''}
                                  onChangeText={(text) => handleActivityFieldUpdate(dayIndex, actIndex, 'endTime', text)}
                                  placeholder="End time"
                                  placeholderTextColor="#999"
                                />
                              </View>
                            ) : (
                              (activity.startTime && activity.endTime) && (
                                <Text style={styles.activityTime}>
                                  ⏰ {activity.startTime} - {activity.endTime}
                                </Text>
                              )
                            )}
                            
                            {/* Description - editable */}
                            {isEditingThisActivity ? (
                              <TextInput
                                style={styles.activityDescriptionInput}
                                value={activity.description || ''}
                                onChangeText={(text) => handleActivityFieldUpdate(dayIndex, actIndex, 'description', text)}
                                placeholder="Activity description"
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={2}
                              />
                            ) : (
                              activity.description && (
                                <Text style={styles.activityDescription}>{activity.description}</Text>
                              )
                            )}
                            
                            {/* Location - editable */}
                            {isEditingThisActivity ? (
                              <View style={styles.locationInputRow}>
                                <Text style={styles.locationLabel}>📍 </Text>
                                <TextInput
                                  style={styles.locationInput}
                                  value={typeof activity.location === 'string' ? activity.location : activity.location?.name || ''}
                                  onChangeText={(text) => handleActivityFieldUpdate(dayIndex, actIndex, 'location', text)}
                                  placeholder="Location"
                                  placeholderTextColor="#999"
                                />
                              </View>
                            ) : (
                              activity.location && (
                                <Text style={styles.activityLocation}>
                                  📍 {typeof activity.location === 'string' ? activity.location : activity.location.name}
                                </Text>
                              )
                            )}
                            {activity.rating && (
                              <Text style={styles.activityRating}>
                                ⭐ {activity.rating} ({activity.userRatingsTotal || 0} reviews)
                              </Text>
                            )}
                            {!isEditing && activity.phone && (
                              <TouchableOpacity onPress={() => Linking.openURL(`tel:${activity.phone}`)}>
                                <Text style={styles.activityLink}>
                                  📞 {activity.phone}
                                </Text>
                              </TouchableOpacity>
                            )}
                            {!isEditing && activity.website && (
                              <TouchableOpacity onPress={() => Linking.openURL(activity.website)}>
                                <Text style={styles.activityLink}>
                                  🌐 {activity.website}
                                </Text>
                              </TouchableOpacity>
                            )}
                            
                            {/* AI-First: Google Maps link (replaces phone/website for AI-generated itineraries) */}
                            {!isEditing && activity.googleMapsUrl && (
                              <TouchableOpacity onPress={() => Linking.openURL(activity.googleMapsUrl)}>
                                <Text style={styles.googleMapsLink}>
                                  📍 View on Google Maps
                                </Text>
                              </TouchableOpacity>
                            )}
                            
                            {/* AI-First: "Why this fits you" personalized explanation */}
                            {!isEditing && activity.why_for_you && (
                              <View style={styles.whyForYouContainer}>
                                <Text style={styles.whyForYouLabel}>✨ Why this fits you:</Text>
                                <Text style={styles.whyForYouText}>{activity.why_for_you}</Text>
                              </View>
                            )}
                            
                            {/* AI-First: Insider tip */}
                            {!isEditing && activity.insider_tip && (
                              <View style={styles.insiderTipContainer}>
                                <Text style={styles.insiderTipLabel}>💡 Insider tip:</Text>
                                <Text style={styles.insiderTipText}>{activity.insider_tip}</Text>
                              </View>
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
                        );
                      })}
                    </View>
                  )}
                  
                  {/* Meals */}
                  {day.meals && day.meals.length > 0 && (
                    <View style={styles.daySection}>
                      <Text style={styles.daySectionTitle}>🍽️ Meals</Text>
                      {day.meals.map((meal: any, mealIndex: number) => {
                        const mealId = `${dayIndex}-meal-${mealIndex}`;
                        const isEditingThisMeal = isEditing && editingMealId === mealId;
                        
                        return (
                          <View key={mealIndex} style={styles.activityCard}>
                            {/* Edit/Done icon for inline editing in edit mode */}
                            {isEditing && (
                              <TouchableOpacity
                                style={styles.inlineEditButton}
                                onPress={() => setEditingMealId(editingMealId === mealId ? null : mealId)}
                                testID={isEditingThisMeal ? 'checkmark-circle' : 'create'}
                              >
                                <Ionicons
                                  name={isEditingThisMeal ? 'checkmark-circle' : 'create'}
                                  size={24}
                                  color={isEditingThisMeal ? '#4CAF50' : '#2196F3'}
                                />
                              </TouchableOpacity>
                            )}
                            
                            {/* Meal name/type - editable */}
                            {isEditingThisMeal ? (
                              <TextInput
                                style={styles.activityNameInput}
                                value={meal.name || meal.type || ''}
                                onChangeText={(text) => handleMealFieldUpdate(dayIndex, mealIndex, 'name', text)}
                                placeholder="Meal name or type"
                                placeholderTextColor="#999"
                              />
                            ) : (
                              <Text style={styles.mealName}>{meal.name || meal.type}</Text>
                            )}
                            
                            {/* Time - editable */}
                            {isEditingThisMeal ? (
                              <View style={styles.timeInputRow}>
                                <Text style={styles.timeLabel}>⏰ </Text>
                                <TextInput
                                  style={styles.timeInput}
                                  value={meal.time || ''}
                                  onChangeText={(text) => handleMealFieldUpdate(dayIndex, mealIndex, 'time', text)}
                                  placeholder="Time"
                                  placeholderTextColor="#999"
                                />
                              </View>
                            ) : (
                              meal.time && (
                                <Text style={styles.mealTime}>⏰ {meal.time}</Text>
                              )
                            )}
                            
                            {meal.restaurant && (
                              <View style={{ marginTop: 8 }}>
                                {/* Restaurant name - editable */}
                                {isEditingThisMeal ? (
                                  <TextInput
                                    style={styles.activityNameInput}
                                    value={meal.restaurant.name || ''}
                                    onChangeText={(text) => handleMealFieldUpdate(dayIndex, mealIndex, 'restaurant.name', text)}
                                    placeholder="Restaurant name"
                                    placeholderTextColor="#999"
                                  />
                                ) : (
                                  <Text style={styles.restaurantName}>{meal.restaurant.name}</Text>
                                )}
                                
                                {/* Restaurant description - editable */}
                                {isEditingThisMeal ? (
                                  <TextInput
                                    style={styles.activityDescriptionInput}
                                    value={meal.restaurant.description || ''}
                                    onChangeText={(text) => handleMealFieldUpdate(dayIndex, mealIndex, 'restaurant.description', text)}
                                    placeholder="Restaurant description"
                                    placeholderTextColor="#999"
                                    multiline
                                    numberOfLines={2}
                                  />
                                ) : (
                                  meal.restaurant.description && (
                                    <Text style={styles.restaurantDescription}>{meal.restaurant.description}</Text>
                                  )
                                )}
                                
                                {/* Restaurant location - editable */}
                                {isEditingThisMeal ? (
                                  <View style={styles.locationInputRow}>
                                    <Text style={styles.locationLabel}>📍 </Text>
                                    <TextInput
                                      style={styles.locationInput}
                                      value={typeof meal.restaurant.location === 'string' 
                                        ? meal.restaurant.location 
                                        : meal.restaurant.location?.address || meal.restaurant.location?.name || ''}
                                      onChangeText={(text) => handleMealFieldUpdate(dayIndex, mealIndex, 'restaurant.location', text)}
                                      placeholder="Location"
                                      placeholderTextColor="#999"
                                    />
                                  </View>
                                ) : (
                                  meal.restaurant.location && (
                                    <Text style={styles.activityLocation}>
                                      📍 {typeof meal.restaurant.location === 'string' 
                                          ? meal.restaurant.location 
                                          : meal.restaurant.location.address || meal.restaurant.location.name}
                                    </Text>
                                  )
                                )}
                                
                                {meal.restaurant.rating && (
                                  <Text style={styles.restaurantRating}>
                                    ⭐ {meal.restaurant.rating} ({meal.restaurant.userRatingsTotal || 0} reviews)
                                  </Text>
                                )}
                                {!isEditing && meal.restaurant.phone && (
                                  <TouchableOpacity onPress={() => Linking.openURL(`tel:${meal.restaurant.phone}`)}>
                                    <Text style={styles.activityLink}>
                                      📞 {meal.restaurant.phone}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                {!isEditing && meal.restaurant.website && (
                                  <TouchableOpacity onPress={() => Linking.openURL(meal.restaurant.website)}>
                                    <Text style={styles.activityLink}>
                                      🌐 {meal.restaurant.website}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                
                                {/* AI-First: Google Maps link for restaurant */}
                                {!isEditing && meal.restaurant.googleMapsUrl && (
                                  <TouchableOpacity onPress={() => Linking.openURL(meal.restaurant.googleMapsUrl)}>
                                    <Text style={styles.googleMapsLink}>
                                      📍 View on Google Maps
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                
                                {/* AI-First: "Why this fits you" for restaurant */}
                                {!isEditing && meal.restaurant.why_for_you && (
                                  <View style={styles.whyForYouContainer}>
                                    <Text style={styles.whyForYouLabel}>✨ Why this fits you:</Text>
                                    <Text style={styles.whyForYouText}>{meal.restaurant.why_for_you}</Text>
                                  </View>
                                )}
                                
                                {/* AI-First: Dietary fit explanation */}
                                {!isEditing && meal.restaurant.dietary_fit && (
                                  <View style={styles.dietaryFitContainer}>
                                    <Text style={styles.dietaryFitLabel}>🥗 Dietary fit:</Text>
                                    <Text style={styles.dietaryFitText}>{meal.restaurant.dietary_fit}</Text>
                                  </View>
                                )}
                                
                                {/* AI-First: Insider tip for restaurant */}
                                {!isEditing && meal.restaurant.insider_tip && (
                                  <View style={styles.insiderTipContainer}>
                                    <Text style={styles.insiderTipLabel}>💡 Insider tip:</Text>
                                    <Text style={styles.insiderTipText}>{meal.restaurant.insider_tip}</Text>
                                  </View>
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
                        );
                      })}
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
        itinerary={localItinerary}
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  shareButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4caf50',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
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
  // Editing Mode Styles
  editModeInstructions: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  editModeText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    textAlign: 'center',
  },
  editModeBold: {
    fontWeight: 'bold',
  },
  batchDeleteContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
  },
  batchDeleteTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  batchDeleteButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  clearButtonText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '600',
  },
  selectableCard: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedCard: {
    borderColor: '#1976d2',
    backgroundColor: 'rgba(25, 118, 210, 0.05)',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  editActivityButton: {
    position: 'absolute',
    top: 8,
    right: 48,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  // Inline editing styles
  inlineEditButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    padding: 4,
  },
  activityNameInput: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  activityDescriptionInput: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 13,
    color: '#666',
  },
  timeInput: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    backgroundColor: '#F0F0F0',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  timeSeparator: {
    fontSize: 13,
    color: '#666',
    marginHorizontal: 4,
  },
  locationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 13,
    color: '#666',
  },
  locationInput: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    backgroundColor: '#F0F0F0',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  
  // AI-First styles - personalized explanations and tips
  googleMapsLink: {
    fontSize: 14,
    color: '#1976d2',
    marginTop: 6,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  whyForYouContainer: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  whyForYouLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  whyForYouText: {
    fontSize: 13,
    color: '#1B5E20',
    lineHeight: 18,
  },
  insiderTipContainer: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  insiderTipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  insiderTipText: {
    fontSize: 13,
    color: '#BF360C',
    lineHeight: 18,
  },
  dietaryFitContainer: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  dietaryFitLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 4,
  },
  dietaryFitText: {
    fontSize: 13,
    color: '#0D47A1',
    lineHeight: 18,
  },
});
