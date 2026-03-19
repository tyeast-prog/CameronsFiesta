// ================================================================
// Cameron's 50th Surprise Fiesta — Firebase Application Layer
// All data lives in Firestore; auth via Firebase Email/Password
// ================================================================
'use strict';

const DEFAULTS = {
  event: {
    guestOfHonor:    'Cameron',
    age:             50,
    heroSubtitle:    'The Big Five-Oh!',
    date:            'Saturday, [Date TBD]',
    time:            '6:00 PM',
    endTime:         '11:00 PM',
    venueName:       '[Venue Name]',
    venueAddress:    '[Street Address]',
    venueCity:       '[City, State ZIP]',
    venueNotes:      '',
    dressCode:       'Festive Semi-Formal',
    dressCodeNote:   'Think vibrant colors, elegant florals, or classic elegance with a festive flair',
    welcomeMessage:  "Join us for an elegant evening of authentic cuisine, vibrant music, and heartfelt celebration as we honor Cameron's milestone 50th birthday!",
    rsvpDeadline:    '[RSVP Deadline TBD]',
    contactEmail:    '',
    contactPhone:    '',
    surpriseMessage: 'Please keep this a SURPRISE! Do not mention this event to Cameron.'
  },
  menu: [
    {
      title: 'Antojitos', subtitle: 'To Start',
      items: [
        'Artisanal Guacamole with Handmade Tortilla Chips',
        'Elote en Vaso — Roasted Mexican Street Corn Cups',
        'Queso Fundido with Chorizo'
      ]
    },
    {
      title: 'Plato Fuerte', subtitle: 'Main Course',
      items: [
        'Carne Asada — Grilled Marinated Prime Beef',
        'Al Pastor — Slow-Roasted Marinated Pork',
        'Pollo en Mole — Chicken in Traditional Mole Sauce',
        'Warm Artisan Flour & Corn Tortillas',
        'Arroz Rojo · Frijoles de Olla · Assorted Salsas'
      ]
    },
    {
      title: 'Postres', subtitle: 'Desserts',
      items: [
        'Tres Leches Birthday Cake',
        'Churros with Mexican Hot Chocolate Dipping Sauce'
      ]
    },
    {
      title: 'Bebidas', subtitle: 'Beverages',
      items: [
        'Horchata & Agua de Jamaica',
        'Festive Margaritas — Cocktail Hour',
        'Beer, Wine & Aguas Frescas'
      ]
    }
  ],
  sideItems: [
    { name: 'Artisanal Guacamole',       description: 'Fresh homemade, serves 10–12',           needed: 3 },
    { name: 'Elote en Vaso (Street Corn)', description: 'Mexican street corn cups, 12 servings',   needed: 3 },
    { name: 'Queso Fundido',               description: 'With tortilla chips, serves 8–10',        needed: 2 },
    { name: 'Arroz Rojo (Spanish Rice)',   description: 'Large serving dish, 12+ servings',        needed: 3 },
    { name: 'Frijoles de Olla',            description: 'Slow-cooked pinto beans, large pot',      needed: 2 },
    { name: 'Pico de Gallo & Salsas',      description: 'Assorted fresh salsas, serves 20+',       needed: 4 },
    { name: 'Tres Leches Cake',            description: 'Serves 12–15 slices',                     needed: 2 },
    { name: 'Churros & Chocolate Sauce',   description: '4 dozen pieces with dipping sauce',       needed: 2 }
  ]
};

// ── Firebase Singleton ─────────────────────────────────────────
let _db   = null;
let _auth = null;
let _initialized = false;

const APP = {

  // ── Initialization ─────────────────────────────────────────

  init() {
    if (_initialized) return;
    firebase.initializeApp(FIREBASE_CONFIG);
    _db   = firebase.firestore();
    _auth = firebase.auth();
    _initialized = true;
  },

  // ── Event Config ───────────────────────────────────────────

  async getEventData() {
    try {
      const doc = await _db.collection('config').doc('event').get();
      return doc.exists
        ? Object.assign({}, DEFAULTS.event, doc.data())
        : Object.assign({}, DEFAULTS.event);
    } catch (e) {
      console.error('getEventData:', e);
      return Object.assign({}, DEFAULTS.event);
    }
  },

  async saveEventData(data) {
    await _db.collection('config').doc('event').set(data, { merge: true });
  },

  // ── Menu ───────────────────────────────────────────────────

  async getMenu() {
    try {
      const doc = await _db.collection('config').doc('menu').get();
      return doc.exists ? doc.data().sections : JSON.parse(JSON.stringify(DEFAULTS.menu));
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS.menu));
    }
  },

  async saveMenu(sections) {
    await _db.collection('config').doc('menu').set({ sections });
  },

  // ── Side Items ─────────────────────────────────────────────

  async getSideItems() {
    try {
      const snap = await _db.collection('sideItems').orderBy('order', 'asc').get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error('getSideItems:', e);
      return [];
    }
  },

  async getAvailableSideItems() {
    const items = await this.getSideItems();
    return items
      .filter(i => (i.claimedCount || 0) < (i.needed || 1))
      .map(i => ({
        ...i,
        claimed:   i.claimedCount || 0,
        remaining: i.needed - (i.claimedCount || 0)
      }));
  },

  async addSideItem(name, description, needed) {
    const snap = await _db.collection('sideItems').get();
    await _db.collection('sideItems').add({
      name:         name.trim(),
      description:  (description || '').trim(),
      needed:       parseInt(needed) || 1,
      claimedCount: 0,
      signups:      [],
      order:        snap.size
    });
  },

  async updateSideItem(id, name, description, needed) {
    await _db.collection('sideItems').doc(id).update({
      name:        name.trim(),
      description: (description || '').trim(),
      needed:      parseInt(needed) || 1
    });
  },

  async deleteSideItem(id) {
    await _db.collection('sideItems').doc(id).delete();
  },

  /** Seeds the default 8 side dish items if the collection is empty. */
  async seedDefaultSideItems() {
    const snap = await _db.collection('sideItems').get();
    if (!snap.empty) return false;
    const batch = _db.batch();
    DEFAULTS.sideItems.forEach((item, idx) => {
      const ref = _db.collection('sideItems').doc();
      batch.set(ref, { ...item, claimedCount: 0, signups: [], order: idx });
    });
    await batch.commit();
    return true;
  },

  // ── RSVPs ──────────────────────────────────────────────────

  async submitRSVP(formData) {
    const rsvp = {
      timestamp:            firebase.firestore.FieldValue.serverTimestamp(),
      firstName:            (formData.firstName            || '').trim(),
      lastName:             (formData.lastName             || '').trim(),
      email:                (formData.email                || '').trim(),
      phone:                (formData.phone                || '').trim(),
      attending:             formData.attending            || 'yes',
      adults:                parseInt(formData.adults)     || 0,
      children:              parseInt(formData.children)   || 0,
      dietaryRestrictions:  (formData.dietaryRestrictions  || '').trim(),
      contributionType:      formData.contributionType     || 'none',
      sideItemId:            formData.sideItemId           || null,
      note:                 (formData.note                 || '').trim()
    };

    // Atomically claim side item slot + create RSVP
    if (rsvp.contributionType === 'side_item' && rsvp.sideItemId) {
      const itemRef = _db.collection('sideItems').doc(rsvp.sideItemId);
      const rsvpRef = _db.collection('rsvps').doc();
      await _db.runTransaction(async tx => {
        const itemDoc = await tx.get(itemRef);
        if (!itemDoc.exists) throw new Error('Side item not found.');
        const item = itemDoc.data();
        if ((item.claimedCount || 0) >= (item.needed || 1)) {
          throw new Error('Sorry — that item was just fully claimed. Please choose another!');
        }
        tx.update(itemRef, {
          claimedCount: firebase.firestore.FieldValue.increment(1),
          signups:      firebase.firestore.FieldValue.arrayUnion({
            rsvpId: rsvpRef.id,
            name:   `${rsvp.firstName} ${rsvp.lastName}`.trim()
          })
        });
        tx.set(rsvpRef, rsvp);
      });
      return rsvpRef.id;
    }

    const ref = await _db.collection('rsvps').add(rsvp);
    return ref.id;
  },

  async getRSVPs() {
    try {
      const snap = await _db.collection('rsvps').orderBy('timestamp', 'desc').get();
      return snap.docs.map(d => this._normalizeRSVP(d));
    } catch (e) {
      console.error('getRSVPs:', e);
      return [];
    }
  },

  /** Real-time listener — returns unsubscribe function. */
  onRSVPs(callback) {
    return _db.collection('rsvps').orderBy('timestamp', 'desc')
      .onSnapshot(snap => callback(snap.docs.map(d => this._normalizeRSVP(d))));
  },

  _normalizeRSVP(doc) {
    const d = doc.data();
    return {
      ...d,
      id:        doc.id,
      timestamp: d.timestamp ? d.timestamp.toMillis() : Date.now()
    };
  },

  async deleteRSVP(id) {
    const doc = await _db.collection('rsvps').doc(id).get();
    if (!doc.exists) return false;
    const rsvp = doc.data();

    if (rsvp.contributionType === 'side_item' && rsvp.sideItemId) {
      const itemRef = _db.collection('sideItems').doc(rsvp.sideItemId);
      await _db.runTransaction(async tx => {
        const itemDoc = await tx.get(itemRef);
        if (itemDoc.exists) {
          const item    = itemDoc.data();
          const signups = (item.signups || []).filter(s => s.rsvpId !== id);
          tx.update(itemRef, {
            claimedCount: Math.max(0, (item.claimedCount || 1) - 1),
            signups
          });
        }
        tx.delete(_db.collection('rsvps').doc(id));
      });
    } else {
      await _db.collection('rsvps').doc(id).delete();
    }
    return true;
  },

  // ── Stats (computed from already-fetched arrays) ────────────

  getStats(rsvps, sideItems) {
    const yes    = rsvps.filter(r => r.attending === 'yes');
    const maybe  = rsvps.filter(r => r.attending === 'maybe');
    const no     = rsvps.filter(r => r.attending === 'no');
    const coming = [...yes, ...maybe];

    const totalAdults   = coming.reduce((s, r) => s + (r.adults   || 0), 0);
    const totalChildren = coming.reduce((s, r) => s + (r.children || 0), 0);
    const sideNeeded    = sideItems.reduce((s, i) => s + (i.needed       || 0), 0);
    const sideClaimed   = sideItems.reduce((s, i) => s + (i.claimedCount || 0), 0);

    return {
      total:         rsvps.length,
      yes:           yes.length,
      maybe:         maybe.length,
      no:            no.length,
      totalGuests:   totalAdults + totalChildren,
      totalAdults,
      totalChildren,
      sideSignups:   rsvps.filter(r => r.contributionType === 'side_item').length,
      donations:     rsvps.filter(r => r.contributionType === 'donation').length,
      sideNeeded,
      sideClaimed,
      sideRemaining: Math.max(0, sideNeeded - sideClaimed)
    };
  },

  // ── Auth ───────────────────────────────────────────────────

  async signIn(email, password) {
    await _auth.signInWithEmailAndPassword(email.trim(), password);
  },

  async signOut() {
    await _auth.signOut();
  },

  isAuthenticated() {
    return !!(_auth && _auth.currentUser);
  },

  currentUserEmail() {
    return _auth && _auth.currentUser ? _auth.currentUser.email : null;
  },

  /** Calls callback with (user | null) immediately and on every change. */
  onAuthStateChanged(callback) {
    return _auth.onAuthStateChanged(callback);
  },

  // ── Export ─────────────────────────────────────────────────

  exportCSV(rsvps, sideItems) {
    const headers = ['ID','First','Last','Email','Phone','Attending','Adults','Children',
                     'Dietary','Contribution','Side Item','Note','Submitted'];
    const rows = rsvps.map(r => {
      const sideItem = r.sideItemId
        ? ((sideItems.find(i => i.id === r.sideItemId) || {}).name || '')
        : '';
      return [
        r.id, r.firstName, r.lastName, r.email, r.phone,
        r.attending, r.adults, r.children, r.dietaryRestrictions,
        r.contributionType, sideItem, r.note,
        r.timestamp ? new Date(r.timestamp).toLocaleString() : ''
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',');
    });
    const csv  = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'cameron-party-rsvps.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
};
