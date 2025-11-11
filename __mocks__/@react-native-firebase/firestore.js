/**
 * Mock for @react-native-firebase/firestore
 */

const mockDocumentSnapshot = {
  exists: true,
  data: jest.fn().mockReturnValue({
    username: 'testuser',
    email: 'test@example.com',
  }),
  id: 'test-doc-id',
};

const mockDocumentReference = {
  get: jest.fn().mockResolvedValue(mockDocumentSnapshot),
  set: jest.fn().mockResolvedValue(undefined),
  update: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

const mockCollectionReference = {
  doc: jest.fn(() => mockDocumentReference),
  add: jest.fn().mockResolvedValue(mockDocumentReference),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  get: jest.fn().mockResolvedValue({
    empty: false,
    docs: [mockDocumentSnapshot],
  }),
};

const mockFirestore = jest.fn(() => ({
  collection: jest.fn(() => mockCollectionReference),
  doc: jest.fn(() => mockDocumentReference),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn().mockResolvedValue(undefined),
  })),
}));

export default mockFirestore;
