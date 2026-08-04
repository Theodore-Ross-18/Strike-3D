class CloudSyncManager {
  constructor() {
    this.db = null;
    this.initialized = false;
    this.onlinePlayerCount = 1;
    this.mockCloudBases = [
      {
        username: 'Commander_Vanguard',
        faction: 'Plasma Vanguard',
        credits: 2400,
        plasma: 1800,
        buildings: [
          { typeId: 'HQ', x: 13, y: 13, level: 2 },
          { typeId: 'CREDIT_MINE', x: 9, y: 9, level: 2 },
          { typeId: 'PLASMA_SYNTH', x: 18, y: 9, level: 2 },
          { typeId: 'GATLING', x: 9, y: 17, level: 2 },
          { typeId: 'PLASMA_CANNON', x: 18, y: 17, level: 2 },
          { typeId: 'TESLA', x: 13, y: 9, level: 2 },
          { typeId: 'WALL', x: 11, y: 11, level: 1 },
          { typeId: 'WALL', x: 15, y: 11, level: 1 }
        ]
      }
    ];

    this.initFirebaseConfig();
  }

  initFirebaseConfig() {
    // User Production Firebase Firestore Config
    const firebaseConfig = {
      apiKey: "AIzaSyDRVGwxtSr6bKqRzHQVvq15AtkWV_A4YyI",
      authDomain: "strike-3d-d32fa.firebaseapp.com",
      projectId: "strike-3d-d32fa",
      storageBucket: "strike-3d-d32fa.firebasestorage.app",
      messagingSenderId: "870247038372",
      appId: "1:870247038372:web:26262429c7ac4c18351531",
      measurementId: "G-MXQG0T2VX4"
    };

    if (window.firebase) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.firestore();
        this.initialized = true;
        console.log('[Firebase Cloud] Connected to production database: strike-3d-d32fa');
        this.startActivePlayersListener();
      } catch (e) {
        console.warn('Firebase init warning:', e);
      }
    }
  }

  startActivePlayersListener(onCountUpdate = null) {
    if (!this.initialized || !this.db) return;

    try {
      this.db.collection('strike_bases').onSnapshot(snapshot => {
        this.onlinePlayerCount = Math.max(snapshot.size, 1);
        console.log(`[Firebase Cloud] Live active online players: ${this.onlinePlayerCount}`);
        if (onCountUpdate) onCountUpdate(this.onlinePlayerCount);
      });
    } catch (e) {
      console.warn('Error listening to active players snapshot', e);
    }
  }

  async publishBaseToCloud(profile, buildings, credits, plasma) {
    if (!profile || !profile.username) return;

    const baseData = {
      username: profile.username,
      faction: profile.faction || 'Cyber Syndicate',
      credits: credits,
      plasma: plasma,
      lastOnline: new Date().toISOString(),
      buildings: buildings.map(b => ({
        typeId: b.typeId,
        x: b.gridX,
        y: b.gridY,
        level: b.level
      }))
    };

    if (this.initialized && this.db) {
      try {
        await this.db.collection('strike_bases').doc(profile.username).set(baseData);
        console.log(`[Firebase Cloud] Successfully published 3D base for Commander ${profile.username}`);
        return true;
      } catch (e) {
        console.warn('Firebase publish error:', e);
      }
    }

    const idx = this.mockCloudBases.findIndex(b => b.username === profile.username);
    if (idx >= 0) {
      this.mockCloudBases[idx] = baseData;
    } else {
      this.mockCloudBases.push(baseData);
    }
    return true;
  }

  async fetchGlobalPlayerBases(currentUsername) {
    if (this.initialized && this.db) {
      try {
        const snapshot = await this.db.collection('strike_bases').get();
        const bases = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.username !== currentUsername) {
            bases.push(data);
          }
        });
        if (bases.length > 0) return bases;
      } catch (e) {
        console.warn('Firebase fetch error, loading fallback bases:', e);
      }
    }

    return this.mockCloudBases.filter(b => b.username !== currentUsername);
  }
}

window.CloudSyncManager = CloudSyncManager;
window.cloudSync = new CloudSyncManager();
