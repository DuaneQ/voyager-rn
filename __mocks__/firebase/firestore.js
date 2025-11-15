/**
 * Mock for firebase/firestore
 * Provides mock Firestore methods for unit tests
 */

const mockDocSnapshot = {
  exists: jest.fn(() => true),
  data: jest.fn(() => ({})),
  id: 'mock-doc-id',
  ref: {},
};

const mockQuerySnapshot = {
  docs: [],
  empty: false,
  size: 0,
  forEach: jest.fn(),
};

const mockDocRef = {
  id: 'mock-doc-id',
  path: 'mock/path',
  get: jest.fn(() => Promise.resolve(mockDocSnapshot)),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
  delete: jest.fn(() => Promise.resolve()),
  onSnapshot: jest.fn((callback) => {
    callback(mockDocSnapshot);
    return jest.fn(); // Unsubscribe function
  }),
};

const mockCollectionRef = {
  id: 'mock-collection-id',
  path: 'mock-path',
  doc: jest.fn(() => mockDocRef),
  add: jest.fn(() => Promise.resolve(mockDocRef)),
  get: jest.fn(() => Promise.resolve(mockQuerySnapshot)),
  where: jest.fn(() => mockQuery),
  orderBy: jest.fn(() => mockQuery),
  limit: jest.fn(() => mockQuery),
  onSnapshot: jest.fn((callback) => {
    callback(mockQuerySnapshot);
    return jest.fn(); // Unsubscribe function
  }),
};

const mockQuery = {
  get: jest.fn(() => Promise.resolve(mockQuerySnapshot)),
  where: jest.fn(() => mockQuery),
  orderBy: jest.fn(() => mockQuery),
  limit: jest.fn(() => mockQuery),
  onSnapshot: jest.fn((callback) => {
    callback(mockQuerySnapshot);
    return jest.fn(); // Unsubscribe function
  }),
};

const mockFirestore = {
  collection: jest.fn(() => mockCollectionRef),
  doc: jest.fn(() => mockDocRef),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  })),
  runTransaction: jest.fn((updateFunction) => Promise.resolve(updateFunction({
    get: jest.fn(() => Promise.resolve(mockDocSnapshot)),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }))),
};

export const getFirestore = jest.fn(() => mockFirestore);

export const collection = jest.fn((db, path) => mockCollectionRef);

export const doc = jest.fn((db, path) => mockDocRef);

export const getDoc = jest.fn(() => Promise.resolve(mockDocSnapshot));

export const getDocs = jest.fn(() => Promise.resolve(mockQuerySnapshot));

export const setDoc = jest.fn(() => Promise.resolve());

export const updateDoc = jest.fn(() => Promise.resolve());

export const deleteDoc = jest.fn(() => Promise.resolve());

export const addDoc = jest.fn(() => Promise.resolve(mockDocRef));

export const query = jest.fn(() => mockQuery);

export const where = jest.fn(() => mockQuery);

export const orderBy = jest.fn(() => mockQuery);

export const limit = jest.fn(() => mockQuery);

export const startAfter = jest.fn(() => mockQuery);

export const endBefore = jest.fn(() => mockQuery);

export const onSnapshot = jest.fn((ref, callback) => {
  callback(mockQuerySnapshot);
  return jest.fn(); // Unsubscribe function
});

export const serverTimestamp = jest.fn(() => new Date());

export const Timestamp = {
  now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  fromDate: jest.fn((date) => ({ seconds: date.getTime() / 1000, nanoseconds: 0 })),
  fromMillis: jest.fn((ms) => ({ seconds: ms / 1000, nanoseconds: 0 })),
};

export const arrayUnion = jest.fn((...elements) => ({ _methodName: 'FieldValue.arrayUnion', _elements: elements }));

export const arrayRemove = jest.fn((...elements) => ({ _methodName: 'FieldValue.arrayRemove', _elements: elements }));

export const increment = jest.fn((n) => ({ _methodName: 'FieldValue.increment', _operand: n }));

export const deleteField = jest.fn(() => ({ _methodName: 'FieldValue.delete' }));

export const writeBatch = jest.fn((db) => ({
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve()),
}));

export const runTransaction = jest.fn((db, updateFunction) => 
  Promise.resolve(updateFunction({
    get: jest.fn(() => Promise.resolve(mockDocSnapshot)),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }))
);
