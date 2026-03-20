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
    hostName:        '',
    contactEmail:    '',
    contactPhone:    '',
    surpriseMessage: 'Please keep this a SURPRISE! Do not mention this event to Cameron.'
  },
  menu: [
    {
      title: 'Antojitos', subtitle: 'Small Bites to Spark the Fiesta',
      items: [
        'Salsas de la Casa — Fresh, Smoky & Spicy',
        'Totopos Dorados — Crispy, Golden & Irresistible'
      ]
    },
    {
      title: 'Plato Fuerte', subtitle: 'Build Your Perfect Fiesta Bowl',
      items: [
        'Arroz Blanco — Fragrant Herb-Kissed Jasmine Rice',
        'Frijoles Negros — Slow-Simmered with Cumin & Garlic',
        'Pollo Desmenuzado — Tender Seasoned Shredded Chicken',
        'Jackfruit al Pastor — Slow-Braised with Bold Mexican Spices',
        'La Mesa de Toppings — Queso · Guacamole · Crisp Lettuce'
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
    { name: 'Artisanal Guacamole',        description: 'Serves 10–12 · Store-bought, new & sealed',                    needed: 3, unit: 'batches'  },
    { name: 'Elote en Vaso (Street Corn)', description: 'Mexican street corn cups, 12 servings · Store-bought, new & sealed', needed: 3, unit: 'batches'  },
    { name: 'Queso Fundido',              description: 'With tortilla chips, serves 8–10 · Store-bought, new & sealed', needed: 2, unit: 'dishes'   },
    { name: 'Arroz Rojo (Spanish Rice)',  description: 'Large serving dish, 12+ servings · Store-bought, new & sealed', needed: 3, unit: 'dishes'   },
    { name: 'Frijoles de Olla',           description: 'Large pot, 12+ servings · Store-bought, new & sealed',          needed: 2, unit: 'pots'     },
    { name: 'Pico de Gallo & Salsas',     description: 'Assorted fresh salsas, serves 20+ · Store-bought, new & sealed', needed: 4, unit: 'batches'  },
    { name: 'Tres Leches Cake',           description: 'Serves 12–15 slices · Store-bought, new & sealed',              needed: 2, unit: 'cakes'    },
    { name: 'Churros & Chocolate Sauce',  description: '4 dozen pieces with dipping sauce · Store-bought, new & sealed', needed: 2, unit: 'batches'  },
    { name: 'Aguas Frescas',             description: 'Horchata, jamaica, or your fave, serves 12+ · Store-bought, new & sealed', needed: 3, unit: 'batches' },
    { name: 'Sodas & Bottled Water',     description: 'Assorted sodas, sparkling water, or juice · Store-bought, new & sealed',   needed: 3, unit: 'packs'   }
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

  async addSideItem(name, description, needed, unit) {
    const snap = await _db.collection('sideItems').get();
    await _db.collection('sideItems').add({
      name:         name.trim(),
      description:  (description || '').trim(),
      needed:       parseInt(needed) || 1,
      unit:         (unit || '').trim(),
      claimedCount: 0,
      signups:      [],
      order:        snap.size
    });
  },

  async updateSideItem(id, name, description, needed, unit) {
    await _db.collection('sideItems').doc(id).update({
      name:        name.trim(),
      description: (description || '').trim(),
      needed:      parseInt(needed) || 1,
      unit:        (unit || '').trim()
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
    const qty = Math.max(1, parseInt(formData.sideItemQuantity) || 1);
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
      sideItemQuantity:      formData.contributionType === 'side_item' ? qty : 0,
      note:                 (formData.note                 || '').trim()
    };

    // Atomically claim side item quantity + create RSVP
    if (rsvp.contributionType === 'side_item' && rsvp.sideItemId) {
      const itemRef = _db.collection('sideItems').doc(rsvp.sideItemId);
      const rsvpRef = _db.collection('rsvps').doc();
      await _db.runTransaction(async tx => {
        const itemDoc = await tx.get(itemRef);
        if (!itemDoc.exists) throw new Error('Side item not found.');
        const item      = itemDoc.data();
        const remaining = (item.needed || 1) - (item.claimedCount || 0);
        if (remaining <= 0) {
          throw new Error('Sorry — that item is fully claimed. Please choose another!');
        }
        if (qty > remaining) {
          throw new Error(`Sorry — only ${remaining} still needed. Please adjust your quantity and try again.`);
        }
        tx.update(itemRef, {
          claimedCount: firebase.firestore.FieldValue.increment(qty),
          signups:      firebase.firestore.FieldValue.arrayUnion({
            rsvpId:   rsvpRef.id,
            name:     `${rsvp.firstName} ${rsvp.lastName}`.trim(),
            quantity: qty
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
      const qty     = rsvp.sideItemQuantity || 1; // backward compat: old RSVPs default to 1
      const itemRef = _db.collection('sideItems').doc(rsvp.sideItemId);
      await _db.runTransaction(async tx => {
        const itemDoc = await tx.get(itemRef);
        if (itemDoc.exists) {
          const item    = itemDoc.data();
          const signups = (item.signups || []).filter(s => s.rsvpId !== id);
          tx.update(itemRef, {
            claimedCount: Math.max(0, (item.claimedCount || qty) - qty),
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
                     'Dietary','Contribution','Side Item','Qty','Note','Submitted'];
    const rows = rsvps.map(r => {
      const found    = r.sideItemId ? (sideItems.find(i => i.id === r.sideItemId) || {}) : {};
      const sideItem = found.name || '';
      const sideQty  = r.sideItemQuantity || (r.sideItemId ? 1 : '');
      return [
        r.id, r.firstName, r.lastName, r.email, r.phone,
        r.attending, r.adults, r.children, r.dietaryRestrictions,
        r.contributionType, sideItem, sideQty, r.note,
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
