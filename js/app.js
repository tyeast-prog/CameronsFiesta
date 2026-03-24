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
    // experimentalAutoDetectLongPolling improves reliability on mobile/cellular
    // networks where Firebase's default gRPC-web transport can silently fail
    // and misreport transport errors as "permission-denied"
    _db.settings({ experimentalAutoDetectLongPolling: true, merge: true });
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
    const rsvp = {
      timestamp:            firebase.firestore.FieldValue.serverTimestamp(),
      firstName:            (formData.firstName            || '').trim(),
      lastName:             (formData.lastName             || '').trim(),
      email:                (formData.email                || '').trim(),
      phone:                (formData.phone                || '').trim(),
      attending:             formData.attending            || 'yes',
      adults:                parseInt(formData.adults)     || 0,
      children:              parseInt(formData.children)   || 0,
      partyMembers:     Array.isArray(formData.partyMembers) ? formData.partyMembers : [],
      contributionType: formData.contributionType || 'none',
      sideItems:        Array.isArray(formData.sideItems) ? formData.sideItems : [],
      note:            (formData.note || '').trim()
    };

    // Atomically claim all selected side items + create RSVP
    if (rsvp.contributionType === 'side_item' && rsvp.sideItems.length > 0) {
      const rsvpRef  = _db.collection('rsvps').doc();
      const itemRefs = rsvp.sideItems.map(s => _db.collection('sideItems').doc(s.id));

      await _db.runTransaction(async tx => {
        // All reads must come before any writes in a transaction
        const itemDocs = await Promise.all(itemRefs.map(ref => tx.get(ref)));

        // Validate every selected item before writing anything
        for (let i = 0; i < itemDocs.length; i++) {
          if (!itemDocs[i].exists) throw new Error('One of the selected items was not found.');
          const item      = itemDocs[i].data();
          const s         = rsvp.sideItems[i];
          const remaining = (item.needed || 1) - (item.claimedCount || 0);
          if (remaining <= 0) {
            throw new Error(`Sorry — ${item.name} is fully claimed. Please deselect it and try again.`);
          }
          if (s.quantity > remaining) {
            throw new Error(`Sorry — only ${remaining} ${item.unit || ''} of ${item.name} still needed. Please adjust your quantity.`);
          }
        }

        // Write all updates (absolute value avoids Firebase increment(n>1) rule bug)
        const submitterName = `${rsvp.firstName} ${rsvp.lastName}`.trim();
        for (let i = 0; i < itemDocs.length; i++) {
          const item = itemDocs[i].data();
          const s    = rsvp.sideItems[i];
          tx.update(itemRefs[i], {
            claimedCount: item.claimedCount + s.quantity,
            signups: firebase.firestore.FieldValue.arrayUnion({
              rsvpId:   rsvpRef.id,
              name:     submitterName,
              quantity: s.quantity
            })
          });
        }
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

  /**
   * Update an existing RSVP. Atomically adjusts side-item claimedCounts / signups
   * to reflect any changes in contribution type or quantities.
   * Supports both new (sideItems[]) and legacy (sideItemId) formats for oldRsvp.
   */
  async updateRSVP(rsvpId, oldRsvp, formData) {
    const updated = {
      firstName:       (formData.firstName || '').trim(),
      lastName:        (formData.lastName  || '').trim(),
      email:           (formData.email     || '').trim(),
      phone:           (formData.phone     || '').trim(),
      attending:        formData.attending  || 'yes',
      adults:           parseInt(formData.adults)   || 0,
      children:         parseInt(formData.children) || 0,
      partyMembers:     Array.isArray(formData.partyMembers) ? formData.partyMembers : [],
      contributionType: formData.contributionType || 'none',
      sideItems:        Array.isArray(formData.sideItems)    ? formData.sideItems    : [],
      note:            (formData.note || '').trim()
    };

    // Normalise old side items (supports both new array and legacy single-item)
    const oldSideItems = [];
    if (Array.isArray(oldRsvp.sideItems) && oldRsvp.sideItems.length > 0) {
      oldRsvp.sideItems.forEach(s => oldSideItems.push({ id: s.id, quantity: s.quantity || 1 }));
    } else if (oldRsvp.contributionType === 'side_item' && oldRsvp.sideItemId) {
      oldSideItems.push({ id: oldRsvp.sideItemId, quantity: oldRsvp.sideItemQuantity || 1 });
    }

    const newSideItems = (updated.contributionType === 'side_item') ? updated.sideItems : [];

    // All unique side-item IDs that may need updating
    const touchedIds = [...new Set([...oldSideItems.map(i => i.id), ...newSideItems.map(i => i.id)])];

    if (touchedIds.length === 0) {
      // No side-item changes — plain document update
      await _db.collection('rsvps').doc(rsvpId).update(updated);
      return;
    }

    const sideRefs  = touchedIds.map(sid => _db.collection('sideItems').doc(sid));
    const rsvpRef   = _db.collection('rsvps').doc(rsvpId);
    const submitter = `${updated.firstName} ${updated.lastName}`.trim();

    await _db.runTransaction(async tx => {
      // All reads first
      const sideDocs = await Promise.all(sideRefs.map(ref => tx.get(ref)));
      const byId = {};
      touchedIds.forEach((sid, i) => { byId[sid] = { ref: sideRefs[i], doc: sideDocs[i] }; });

      // Validate new claims (account for old qty being freed)
      for (const ns of newSideItems) {
        const { doc } = byId[ns.id];
        if (!doc.exists) throw new Error('Selected item not found.');
        const data   = doc.data();
        const oldQty = (oldSideItems.find(o => o.id === ns.id) || {}).quantity || 0;
        const avail  = (data.needed || 1) - (data.claimedCount || 0) + oldQty;
        if (ns.quantity > avail) {
          throw new Error(`Only ${avail} of "${data.name}" available.`);
        }
      }

      // Write updates for every touched side item
      for (const sid of touchedIds) {
        const { ref, doc } = byId[sid];
        if (!doc.exists) continue;
        const data    = doc.data();
        const oldItem = oldSideItems.find(o => o.id === sid);
        const newItem = newSideItems.find(n => n.id === sid);
        const oldQty  = oldItem ? oldItem.quantity : 0;
        const newQty  = newItem ? newItem.quantity : 0;
        // Remove old signup entry; add new one if still claiming
        const filtered = (data.signups || []).filter(s => s.rsvpId !== rsvpId);
        const newSigns = newQty > 0
          ? [...filtered, { rsvpId, name: submitter, quantity: newQty }]
          : filtered;
        tx.update(ref, {
          claimedCount: Math.max(0, (data.claimedCount || 0) - oldQty + newQty),
          signups:      newSigns
        });
      }

      tx.update(rsvpRef, updated);
    });
  },

  async deleteRSVP(id) {
    const doc = await _db.collection('rsvps').doc(id).get();
    if (!doc.exists) return false;
    const rsvp = doc.data();

    // Build list of side items to decrement — support both new (sideItems[]) and old (sideItemId) formats
    const itemsToDecrement = [];
    if (Array.isArray(rsvp.sideItems) && rsvp.sideItems.length > 0) {
      rsvp.sideItems.forEach(s => itemsToDecrement.push({ id: s.id, qty: s.quantity || 1 }));
    } else if (rsvp.contributionType === 'side_item' && rsvp.sideItemId) {
      itemsToDecrement.push({ id: rsvp.sideItemId, qty: rsvp.sideItemQuantity || 1 });
    }

    if (itemsToDecrement.length > 0) {
      const itemRefs = itemsToDecrement.map(i => _db.collection('sideItems').doc(i.id));
      await _db.runTransaction(async tx => {
        const itemDocs = await Promise.all(itemRefs.map(ref => tx.get(ref)));
        for (let i = 0; i < itemDocs.length; i++) {
          if (itemDocs[i].exists) {
            const item    = itemDocs[i].data();
            const qty     = itemsToDecrement[i].qty;
            const signups = (item.signups || []).filter(s => s.rsvpId !== id);
            tx.update(itemRefs[i], {
              claimedCount: Math.max(0, (item.claimedCount || 0) - qty),
              signups
            });
          }
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
    const q = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;

    // ── Build headers ──────────────────────────────────────────
    // Figure out the most party members anyone has so we can emit
    // a fixed set of "Person N Name / Person N Dietary" columns.
    const maxMembers = rsvps.reduce((m, r) => {
      const len = Array.isArray(r.partyMembers) ? r.partyMembers.length : 0;
      return Math.max(m, len);
    }, 1);

    const memberHeaders = [];
    for (let i = 1; i <= maxMembers; i++) {
      memberHeaders.push(`Person ${i} Name`, `Person ${i} Dietary/Allergy`);
    }

    const headers = [
      'ID', 'First Name', 'Last Name', 'Email', 'Phone',
      'Attending', 'Adults', 'Children',
      ...memberHeaders,
      'Contribution', 'Items to Bring',
      'Note', 'Submitted'
    ];

    // ── Build rows ─────────────────────────────────────────────
    const rows = rsvps.map(r => {
      // Per-person dietary columns
      const memberCols = [];
      for (let i = 0; i < maxMembers; i++) {
        const m = Array.isArray(r.partyMembers) ? (r.partyMembers[i] || {}) : {};
        // Fall back to legacy single dietaryRestrictions string for person 0
        const name    = m.name    || (i === 0 ? `${r.firstName || ''} ${r.lastName || ''}`.trim() : '');
        const dietary = m.dietary || (i === 0 ? (r.dietaryRestrictions || '') : '');
        memberCols.push(name, dietary);
      }

      // Human-readable contribution
      let contribLabel = '';
      if (r.contributionType === 'donation') {
        contribLabel = 'Main Course Contribution';
      } else if (r.contributionType === 'side_item') {
        contribLabel = 'Side Dish';
      } else {
        contribLabel = 'None';
      }

      // Items to bring — supports new sideItems[] array and legacy sideItemId
      let itemsText = '';
      if (r.contributionType === 'side_item') {
        if (Array.isArray(r.sideItems) && r.sideItems.length > 0) {
          itemsText = r.sideItems.map(s => {
            const item = sideItems.find(i => i.id === s.id) || {};
            return (item.name || s.id) + (s.quantity > 1 ? ` ×${s.quantity}` : '');
          }).join('; ');
        } else if (r.sideItemId) {
          const item = sideItems.find(i => i.id === r.sideItemId) || {};
          const qty  = r.sideItemQuantity || 1;
          itemsText  = (item.name || r.sideItemId) + (qty > 1 ? ` ×${qty}` : '');
        }
      }

      return [
        r.id, r.firstName, r.lastName, r.email, r.phone,
        r.attending === 'yes' ? 'Yes' : r.attending === 'maybe' ? 'Maybe' : 'No',
        r.attending !== 'no' ? (r.adults   || 0) : '',
        r.attending !== 'no' ? (r.children || 0) : '',
        ...memberCols,
        contribLabel, itemsText,
        r.note || '',
        r.timestamp ? new Date(r.timestamp).toLocaleString() : ''
      ].map(q).join(',');
    });

    const csv  = [headers.map(q).join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'cameron-party-rsvps.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
};
