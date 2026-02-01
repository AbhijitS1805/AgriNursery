// IndexedDB wrapper for offline storage
const DB_NAME = 'AgriNurseryOffline';
const DB_VERSION = 1;
const STORES = {
  SALES: 'offline_sales',
  PRODUCTS: 'offline_products',
  CUSTOMERS: 'offline_customers'
};

class OfflineStorage {
  constructor() {
    this.db = null;
  }

  // Initialize database
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains(STORES.SALES)) {
          const salesStore = db.createObjectStore(STORES.SALES, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          salesStore.createIndex('timestamp', 'timestamp', { unique: false });
          salesStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
          const productsStore = db.createObjectStore(STORES.PRODUCTS, { 
            keyPath: 'id' 
          });
          productsStore.createIndex('item_name', 'item_name', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.CUSTOMERS)) {
          const customersStore = db.createObjectStore(STORES.CUSTOMERS, { 
            keyPath: 'id' 
          });
          customersStore.createIndex('customer_name', 'customer_name', { unique: false });
        }

        console.log('IndexedDB stores created');
      };
    });
  }

  // Add offline sale
  async addOfflineSale(saleData) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.SALES], 'readwrite');
    const store = transaction.objectStore(STORES.SALES);

    const data = {
      data: saleData,
      timestamp: new Date().toISOString(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      const request = store.add(data);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending sales
  async getPendingSales() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.SALES], 'readonly');
    const store = transaction.objectStore(STORES.SALES);
    const index = store.index('synced');

    return new Promise((resolve, reject) => {
      const request = index.getAll(false);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Mark sale as synced
  async markSaleSynced(id) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.SALES], 'readwrite');
    const store = transaction.objectStore(STORES.SALES);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.synced = true;
          data.syncedAt = new Date().toISOString();
          const updateRequest = store.put(data);
          updateRequest.onsuccess = () => resolve(updateRequest.result);
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          reject(new Error('Sale not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Delete synced sale
  async deleteSyncedSale(id) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.SALES], 'readwrite');
    const store = transaction.objectStore(STORES.SALES);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cache products for offline access
  async cacheProducts(products) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.PRODUCTS], 'readwrite');
    const store = transaction.objectStore(STORES.PRODUCTS);

    // Clear existing products
    await this.clearStore(STORES.PRODUCTS);

    // Add new products
    return Promise.all(
      products.map(product => {
        return new Promise((resolve, reject) => {
          const request = store.add(product);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  }

  // Get cached products
  async getCachedProducts() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.PRODUCTS], 'readonly');
    const store = transaction.objectStore(STORES.PRODUCTS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache customers for offline access
  async cacheCustomers(customers) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.CUSTOMERS], 'readwrite');
    const store = transaction.objectStore(STORES.CUSTOMERS);

    // Clear existing customers
    await this.clearStore(STORES.CUSTOMERS);

    // Add new customers
    return Promise.all(
      customers.map(customer => {
        return new Promise((resolve, reject) => {
          const request = store.add(customer);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      })
    );
  }

  // Get cached customers
  async getCachedCustomers() {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([STORES.CUSTOMERS], 'readonly');
    const store = transaction.objectStore(STORES.CUSTOMERS);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear a specific store
  async clearStore(storeName) {
    if (!this.db) await this.init();

    const transaction = this.db.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get count of pending sales
  async getPendingSalesCount() {
    const pendingSales = await this.getPendingSales();
    return pendingSales.length;
  }
}

// Export singleton instance
const offlineStorage = new OfflineStorage();
export default offlineStorage;
