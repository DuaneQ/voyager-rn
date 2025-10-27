import React, { useContext, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator, 
  ScrollView, 
  Dimensions, 
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePhotoUpload } from '../../hooks/photo/usePhotoUpload';
import { UserProfileContext } from '../../context/UserProfileContext';
import type { PhotoSlot } from '../../types/Photo';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - 48) / 3;

export const PhotoGrid: React.FC<any> = ({ isOwnProfile = true, onUploadSuccess, onDeleteSuccess }) => {
  const { userProfile } = useContext(UserProfileContext);
  const { uploadState, selectAndUploadPhoto, deletePhoto } = usePhotoUpload();
  const [isPickerLoading, setIsPickerLoading] = useState(false);
  const [enlargedPhoto, setEnlargedPhoto] = useState<{ url: string; slot: number } | null>(null);
  const [showPhotoMenu, setShowPhotoMenu] = useState<{ url: string; slot: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get all existing photos and find the next available slot
  const getNextAvailableSlot = (): number | null => {
    const photos = userProfile?.photos || {};
    for (let i = 1; i <= 9; i++) {
      const slotKey = `slot${i}`;
      if (!photos[slotKey]) {
        return i;
      }
    }
    return null; // All 9 slots full
  };

  const handleUpload = async () => {
    const nextSlot = getNextAvailableSlot();
    
    if (nextSlot === null) {
      Alert.alert('Limit Reached', 'You can only upload 9 photos. Please delete a photo first.');
      return;
    }

    const slot = `slot${nextSlot}` as PhotoSlot;
    
    try {
      // Show spinner while image picker opens
      setIsPickerLoading(true);
      
      const result = await selectAndUploadPhoto(slot);
      
      if (result?.url) {
        onUploadSuccess?.(slot, result.url);
      }
    } catch (error) {
      console.error('[PhotoGrid] Upload error:', error);
    } finally {
      setIsPickerLoading(false);
    }
  };

  const handlePhotoPress = (photoUrl: string, slot: number) => {
    if (!isOwnProfile) {
      // Just view if not own profile
      setEnlargedPhoto({ url: photoUrl, slot });
      return;
    }
    // Show menu for own profile
    setShowPhotoMenu({ url: photoUrl, slot });
  };

  const handleViewPhoto = () => {
    if (showPhotoMenu) {
      setEnlargedPhoto(showPhotoMenu);
      setShowPhotoMenu(null);
    }
  };

  const handleDeletePhoto = async () => {
    if (!showPhotoMenu) return;

    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const slotToDelete = `slot${showPhotoMenu.slot}` as PhotoSlot;
            setShowPhotoMenu(null);
            setIsDeleting(true);

            try {
              await deletePhoto(slotToDelete);
              onDeleteSuccess?.(slotToDelete);
            } catch (error) {
              console.error('[PhotoGrid] Delete error:', error);
              Alert.alert('Error', 'Failed to delete photo');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleCloseEnlarged = () => {
    setEnlargedPhoto(null);
  };

  const handleCloseMenu = () => {
    setShowPhotoMenu(null);
  };

  // Build photo list from slot1-slot9
  const photos = userProfile?.photos || {};
  const photoList = [];
  for (let i = 1; i <= 9; i++) {
    const url = (photos as any)[`slot${i}`];
    if (url) photoList.push({ slot: i, url });
  }

  const photoCount = photoList.length;
  const canUploadMore = photoCount < 9;

  return (
    <View style={styles.container}>
      {/* Upload Button */}
      {isOwnProfile && canUploadMore && (
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={handleUpload} 
          disabled={uploadState.loading || isPickerLoading}
        >
          {(uploadState.loading || isPickerLoading) ? (
            <>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.uploadButtonText}>
                {isPickerLoading ? 'Opening...' : `Uploading... ${Math.round(uploadState.progress)}%`}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.uploadButtonText}>Upload Photo ({photoCount}/9)</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Photo Grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {photoList.map((photo) => (
            <TouchableOpacity 
              key={photo.slot} 
              onPress={() => handlePhotoPress(photo.url, photo.slot)}
              activeOpacity={0.8}
            >
              <Image 
                source={{ uri: photo.url }} 
                style={styles.photo}
                resizeMode="cover"
              />
              {isDeleting && (
                <View style={styles.photoOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Empty State */}
      {photoCount === 0 && (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Tap camera to add photos</Text>
          <Text style={styles.emptySubtext}>Add up to 9 photos</Text>
        </View>
      )}

      {/* Enlarged Photo Modal */}
      <Modal
        visible={enlargedPhoto !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEnlarged}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            activeOpacity={1}
            onPress={handleCloseEnlarged}
          >
            <View style={styles.modalContent}>
              {enlargedPhoto && (
                <Image 
                  source={{ uri: enlargedPhoto.url }} 
                  style={styles.enlargedPhoto}
                  resizeMode="contain"
                />
              )}
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={handleCloseEnlarged}
              >
                <Ionicons name="close-circle" size={40} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Photo Menu Modal (View/Delete) */}
      <Modal
        visible={showPhotoMenu !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseMenu}
      >
        <TouchableWithoutFeedback onPress={handleCloseMenu}>
          <View style={styles.menuModalOverlay}>
            <View style={styles.menuContainer}>
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleViewPhoto}
              >
                <Ionicons name="eye-outline" size={24} color="#333" />
                <Text style={styles.menuItemText}>View Photo</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity 
                style={[styles.menuItem, styles.menuItemDelete]}
                onPress={handleDeletePhoto}
              >
                <Ionicons name="trash-outline" size={24} color="#f44336" />
                <Text style={[styles.menuItemText, styles.menuItemDeleteText]}>Delete Photo</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity 
                style={styles.menuItem}
                onPress={handleCloseMenu}
              >
                <Text style={styles.menuItemText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  uploadButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#1976d2', 
    padding: 16, 
    borderRadius: 8, 
    marginBottom: 16 
  },
  uploadButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { 
    width: PHOTO_SIZE, 
    height: PHOTO_SIZE, 
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  empty: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 60 
  },
  emptyText: { 
    marginTop: 16, 
    fontSize: 16, 
    color: '#999',
    fontWeight: '500',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#bbb',
  },
  // Enlarged Photo Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedPhoto: {
    width: '90%',
    height: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  // Menu Modal
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemDelete: {
    // Additional styling for delete button if needed
  },
  menuItemDeleteText: {
    color: '#f44336',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
});
